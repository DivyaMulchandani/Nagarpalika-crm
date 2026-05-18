/**
 * WhatsApp Service — Meta Cloud API Integration
 *
 * Reads all configuration from WhatsAppConfig collection in MongoDB.
 * Configurable entirely from the admin panel — no env vars required.
 */

import WhatsAppMessage from "../models/WhatsAppMessage.js";
import WhatsAppConfig from "../models/WhatsAppConfig.js";

// In-memory config cache (refreshed every 5 min or on demand)
let _cachedConfig = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the WhatsApp config from DB (cached)
 */
export const getWhatsAppConfig = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && _cachedConfig && (now - _cacheTimestamp) < CACHE_TTL) {
    return _cachedConfig;
  }
  // Fetch the single config doc (no org filter for single-tenant)
  const config = await WhatsAppConfig.findOne().lean();
  _cachedConfig = config;
  _cacheTimestamp = now;
  return config;
};

/**
 * Clear config cache (called after config update)
 */
export const clearConfigCache = () => {
  _cachedConfig = null;
  _cacheTimestamp = 0;
};

/**
 * Format phone number for WhatsApp API (requires country code, no +)
 */
const formatPhone = (phone, defaultCountryCode = "91") => {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  // If 10 digits, prepend country code
  if (cleaned.length === 10) cleaned = defaultCountryCode + cleaned;
  return cleaned;
};

/**
 * Send a template message via Meta Cloud API
 */
const sendTemplateMessage = async (to, templateName, languageCode, params = []) => {
  const config = await getWhatsAppConfig();

  if (!config || !config.isEnabled || !config.phoneNumberId || !config.accessToken) {
    console.log(`[WhatsApp] Disabled or not configured. Would send "${templateName}" to ${to}`);
    return { success: false, reason: "not_configured" };
  }

  const formattedPhone = formatPhone(to, config.defaultCountryCode || "91");
  if (!formattedPhone) {
    return { success: false, reason: "invalid_phone" };
  }

  const apiUrl = config.apiUrl || "https://graph.facebook.com/v21.0";

  const body = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode || config.templateLanguage || "en" },
    },
  };

  // Add template parameters if provided
  if (params.length > 0) {
    body.template.components = [
      {
        type: "body",
        parameters: params.map((p) => ({ type: "text", text: String(p) })),
      },
    ];
  }

  try {
    const response = await fetch(`${apiUrl}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.messages && data.messages.length > 0) {
      return {
        success: true,
        metaMessageId: data.messages[0].id,
        status: "sent",
      };
    } else {
      return {
        success: false,
        reason: "api_error",
        errorCode: data.error?.code?.toString(),
        errorMessage: data.error?.message || JSON.stringify(data),
      };
    }
  } catch (err) {
    return {
      success: false,
      reason: "network_error",
      errorMessage: err.message,
    };
  }
};

/**
 * Check if a specific trigger is enabled
 */
export const isTriggerEnabled = async (triggerName) => {
  const config = await getWhatsAppConfig();
  if (!config || !config.isEnabled) return false;
  return config.triggers?.[triggerName] !== false;
};

/**
 * Send and log a WhatsApp message
 */
export const sendWhatsAppMessage = async ({
  patientId,
  appointmentId,
  invoiceId,
  paymentId,
  recipientPhone,
  recipientName,
  triggerType,
  templateName,
  templateLanguage,
  templateParams = [],
  messageBody,
  organizationId,
  createdBy,
}) => {
  const config = await getWhatsAppConfig();

  // Use config template language if not explicitly provided
  const lang = templateLanguage || config?.templateLanguage || "en";

  // Create log entry first
  const logEntry = await WhatsAppMessage.create({
    patientId,
    appointmentId,
    invoiceId,
    paymentId,
    recipientPhone,
    recipientName,
    triggerType,
    templateName,
    templateLanguage: lang,
    templateParams,
    messageBody,
    deliveryStatus: "queued",
    maxRetries: config?.maxRetries || 3,
    organizationId,
    createdBy,
  });

  // Attempt to send
  const result = await sendTemplateMessage(
    recipientPhone,
    templateName,
    lang,
    templateParams
  );

  // Update log entry with result
  if (result.success) {
    logEntry.deliveryStatus = "sent";
    logEntry.metaMessageId = result.metaMessageId;
    logEntry.sentAt = new Date();
  } else {
    if (result.reason === "not_configured") {
      logEntry.deliveryStatus = "queued";
      logEntry.errorMessage = "WhatsApp not configured";
    } else {
      logEntry.deliveryStatus = "failed";
      logEntry.errorMessage = result.errorMessage;
      logEntry.errorCode = result.errorCode;
      logEntry.failedAt = new Date();

      // Schedule retry if under max
      const maxRetries = config?.maxRetries || 3;
      const backoffBase = config?.retryBackoffMinutes || 1;
      if (logEntry.retryCount < maxRetries) {
        const backoffMs = Math.pow(2, logEntry.retryCount) * backoffBase * 60 * 1000;
        logEntry.nextRetryAt = new Date(Date.now() + backoffMs);
      }
    }
  }

  await logEntry.save();
  return logEntry;
};

/**
 * Process delivery status webhook from Meta
 */
export const processStatusWebhook = async (metaMessageId, status, timestamp) => {
  const msg = await WhatsAppMessage.findOne({ metaMessageId });
  if (!msg) return null;

  const statusMap = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) return msg;

  msg.deliveryStatus = mappedStatus;
  if (status === "delivered") msg.deliveredAt = timestamp ? new Date(timestamp * 1000) : new Date();
  if (status === "read") msg.readAt = timestamp ? new Date(timestamp * 1000) : new Date();
  if (status === "failed") msg.failedAt = timestamp ? new Date(timestamp * 1000) : new Date();

  await msg.save();
  return msg;
};

// ============================================================
// Pre-built trigger functions
// ============================================================

// ── Recruitment Portal Trigger Functions (Phase 1) ───────────────────────────
// TODO Phase 1: Add these trigger functions when Candidate/Application models exist:
//   sendOtpMessage(recipientPhone, otp)
//   sendRegistrationIdIssued(candidate, registrationId)
//   sendApplicationSubmitted(candidate, applicationRefNo, postTitle)
//   sendFeePaymentReceipt(candidate, payment, advtNo)
//   sendCallLetterPublished(candidate, advtNo)
//   sendBulkExportReady(adminEmail, downloadLink)

/**
 * Send bulk broadcast message
 * recipients: [{ recipientPhone, recipientName, recipientId? }]
 */
export const sendBulkBroadcast = async (recipients, templateName, templateParams, messageBody, createdBy) => {
  const results = [];
  for (const recipient of recipients) {
    if (!recipient.recipientPhone) continue;
    try {
      const result = await sendWhatsAppMessage({
        recipientId: recipient.recipientId || null,
        recipientPhone: recipient.recipientPhone,
        recipientName: recipient.recipientName || "",
        triggerType: "bulk_broadcast",
        templateName,
        templateParams,
        messageBody,
        createdBy,
      });
      results.push(result);
      await new Promise((r) => setTimeout(r, 100)); // rate limiting
    } catch {
      // continue with next recipient
    }
  }
  return results;
};
