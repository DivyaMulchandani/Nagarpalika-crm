/**
 * SMS gateway integration for OTP delivery.
 *
 * The active gateway is chosen with SMS_PROVIDER:
 *   startmessaging → template-based OTP API (X-API-Key header, POST /otp/send)
 *   generic        → Bearer token + a free-text message body
 *
 * Adding a gateway means adding one entry to PROVIDERS — nothing else changes.
 */
import { otpSettings } from "../config/portal.config.js";

const TIMEOUT_MS = 10_000;

/**
 * Normalise a recipient number to E.164.
 * "9876543210" → "+919876543210" (country code from SMS_COUNTRY_CODE).
 * Anything already carrying a "+" is passed through untouched.
 */
export const toE164 = (raw) => {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");

  const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;

  const cc = (process.env.SMS_COUNTRY_CODE || "+91").trim();
  const ccDigits = cc.replace(/\D/g, "");

  // Already country-coded but missing the "+" — don't prefix it twice.
  if (ccDigits && digits.length > 10 && digits.startsWith(ccDigits))
    return `+${digits}`;

  return `+${ccDigits}${digits}`;
};

const readError = (data, res) =>
  data?.message || data?.error || data?.detail || res.statusText;

const PROVIDERS = {
  /** StartMessaging — DLT-registered template, variables filled server-side. */
  startmessaging: async ({ phone, otp, expiry }) => {
    const base = (process.env.SMS_API_URL || "").replace(/\/+$/, "");
    const templateId = process.env.SMS_TEMPLATE_ID;
    if (!templateId)
      return { ok: false, error: "SMS_TEMPLATE_ID is not set" };

    const variables = { otp: String(otp), expiry: String(expiry) };
    // Only sent when the selected template actually has an {{appName}} slot —
    // switching to a branded template is then a one-line env change.
    if (process.env.SMS_APP_NAME)
      variables.appName = process.env.SMS_APP_NAME;

    const res = await fetch(`${base}/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.SMS_API_KEY,
      },
      body: JSON.stringify({ phoneNumber: phone, templateId, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: readError(data, res) };
    // The API docs don't pin which field carries the id — accept either.
    return { ok: true, messageId: data.id ?? data.messageId ?? `sms-${Date.now()}` };
  },

  /** Free-text gateway: Bearer auth, { to, message, sender } body. */
  generic: async ({ phone, otp, expiry, message }) => {
    const text =
      message ||
      `Your Nagarpalika portal OTP is ${otp}. Valid for ${expiry} minutes. Do not share.`;

    const res = await fetch(process.env.SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SMS_API_KEY}`,
      },
      body: JSON.stringify({
        to: phone,
        message: text,
        sender: process.env.SMS_SENDER_ID || "NAGPAL",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: readError(data, res) };
    return { ok: true, messageId: data.messageId ?? data.id ?? `sms-${Date.now()}` };
  },
};

/**
 * Send an OTP by SMS.
 * @param {object}  args
 * @param {string}  args.to             Recipient mobile (10-digit or E.164)
 * @param {string}  args.otp            The one-time code
 * @param {number} [args.expiryMinutes] Validity window shown to the user
 * @param {string} [args.message]       Free-text override (generic provider only)
 */
export const sendSms = async ({ to, otp, expiryMinutes, message }) => {
  const providerName = (process.env.SMS_PROVIDER || "generic").trim().toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider)
    return {
      ok: false,
      channel: "sms",
      error: `Unknown SMS_PROVIDER "${providerName}" (expected: ${Object.keys(PROVIDERS).join(" | ")})`,
    };

  if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY) {
    // Explicit opt-in stub. NODE_ENV is deliberately NOT consulted here: an
    // unconfigured gateway used to report success on any non-production
    // server, which made an undelivered OTP look exactly like a delivered one.
    if (process.env.ENABLE_DEV_OTP === "true") {
      console.log(`[SMS STUB] would send OTP to ${to}`);
      return { ok: true, channel: "sms", stub: true, messageId: `stub-${Date.now()}` };
    }
    return { ok: false, channel: "sms", error: "SMS gateway not configured" };
  }

  const phone = toE164(to);
  if (!phone)
    return { ok: false, channel: "sms", error: "Recipient mobile number is missing" };

  const expiry = expiryMinutes ?? otpSettings.expireMinutes;

  try {
    const result = await provider({ phone, otp, expiry, message });
    return { ...result, channel: "sms" };
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      channel: "sms",
      error: timedOut
        ? `SMS gateway timed out after ${TIMEOUT_MS / 1000}s`
        : err.message,
    };
  }
};
