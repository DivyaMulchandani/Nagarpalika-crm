import WhatsAppMessage from "../models/WhatsAppMessage.js";
import { sendWhatsAppTemplate } from "./whatsapp.service.js";
import { sendSms } from "./sms.service.js";
import { sendEmail } from "./email.service.js";
import { otpSettings } from "../config/portal.config.js";

const logMessage = async (payload) => WhatsAppMessage.create(payload);

/**
 * Deliver OTP via configurable multi-channel strategy (WhatsApp, SMS, Email).
 * Never logs raw OTP values.
 */
export const deliverOtp = async ({
  mobile,
  email,
  otp,
  trigger = "otp_registration",
  preferredChannel,
}) => {
  const smsText = `Your Nagarpalika portal OTP is ${otp}. Valid for 10 minutes. Do not share.`;
  const emailSubject = "Your Nagarpalika Portal OTP Code";
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #1e3a8a;">Nagarpalika Recruitment Portal</h2>
      <p>Your One-Time Password (OTP) for verification is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2563eb; margin: 15px 0;">${otp}</div>
      <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
    </div>
  `;

  // Determine delivery attempt order based on preferredChannel + fallbackChain
  const defaultChain = otpSettings.fallbackChain || ["whatsapp", "sms", "email"];
  const initialChannel = (preferredChannel || otpSettings.primaryChannel || "whatsapp").toLowerCase();

  const channelsToTry = Array.from(
    new Set([initialChannel, ...defaultChain]),
  ).filter((ch) => ["whatsapp", "sms", "email"].includes(ch));

  let lastError = null;

  for (const channel of channelsToTry) {
    if (channel === "whatsapp") {
      if (!mobile) continue;

      const msg = await logMessage({
        recipient: mobile,
        messageBody: "[OTP REDACTED]",
        templateName: process.env.WHATSAPP_OTP_TEMPLATE || "otp_verification",
        trigger,
        status: "queued",
        channel: "whatsapp",
        metadata: { trigger, preferredChannel },
      });

      const waResult = await sendWhatsAppTemplate({
        to: mobile,
        templateName: process.env.WHATSAPP_OTP_TEMPLATE || "otp_verification",
        variables: [otp],
      });

      if (waResult.ok) {
        await WhatsAppMessage.findByIdAndUpdate(msg._id, {
          status: "sent",
          channel: "whatsapp",
          externalId: waResult.messageId,
          sentAt: new Date(),
        });
        return { ok: true, channel: "whatsapp", messageId: waResult.messageId };
      }

      await WhatsAppMessage.findByIdAndUpdate(msg._id, {
        status: "failed",
        errorMessage: waResult.error,
      });
      lastError = waResult.error;
    } else if (channel === "sms") {
      if (!mobile) continue;

      const smsResult = await sendSms({ to: mobile, message: smsText });
      if (smsResult.ok) {
        await logMessage({
          recipient: mobile,
          messageBody: "[OTP REDACTED]",
          trigger,
          status: "sent",
          channel: "sms",
          externalId: smsResult.messageId,
          sentAt: new Date(),
          metadata: { trigger, fallbackFrom: "whatsapp" },
        });
        return { ok: true, channel: "sms", messageId: smsResult.messageId };
      }
      lastError = smsResult.error;
    } else if (channel === "email") {
      if (!email) continue;

      try {
        const mailResult = await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
          text: `Your Nagarpalika portal OTP is ${otp}. Valid for 10 minutes.`,
        });

        await logMessage({
          recipient: email,
          messageBody: "[OTP REDACTED]",
          trigger,
          status: "sent",
          channel: "email",
          externalId: mailResult?.messageId,
          sentAt: new Date(),
          metadata: { trigger },
        });

        return {
          ok: true,
          channel: "email",
          messageId: mailResult?.messageId || `mail-${Date.now()}`,
        };
      } catch (err) {
        lastError = err.message;
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, channel: "dev", stub: true };
  }

  return { ok: false, channel: "none", error: lastError || "All notification channels failed" };
};
