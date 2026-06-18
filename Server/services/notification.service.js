import WhatsAppMessage from "../models/WhatsAppMessage.js";
import { sendWhatsAppTemplate } from "./whatsapp.service.js";
import { sendSms } from "./sms.service.js";

const SMS_FALLBACK_MS = 30_000;

const logMessage = async (payload) => WhatsAppMessage.create(payload);

/**
 * Deliver OTP via WhatsApp template, with SMS fallback after 30s on failure.
 * Never logs the OTP value.
 */
export const deliverOtp = async ({ mobile, otp, trigger = "otp_registration", email }) => {
  const smsText = `Your Nagarpalika portal OTP is ${otp}. Valid for 10 minutes. Do not share.`;

  const msg = await logMessage({
    recipient: mobile,
    messageBody: "[OTP REDACTED]",
    templateName: process.env.WHATSAPP_OTP_TEMPLATE || "otp_verification",
    trigger,
    status: "queued",
    channel: "whatsapp",
    metadata: { trigger },
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
    return { channel: "whatsapp", messageId: waResult.messageId };
  }

  await WhatsAppMessage.findByIdAndUpdate(msg._id, {
    status: "failed",
    errorMessage: waResult.error,
  });

  // Immediate SMS attempt first, then delayed retry if configured
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
      metadata: { fallbackFrom: "whatsapp" },
    });
    return { channel: "sms", messageId: smsResult.messageId };
  }

  // Schedule delayed SMS fallback (fire-and-forget)
  setTimeout(async () => {
    const retry = await sendSms({ to: mobile, message: smsText });
    if (retry.ok) {
      await logMessage({
        recipient: mobile,
        messageBody: "[OTP REDACTED]",
        trigger,
        status: "sent",
        channel: "sms",
        externalId: retry.messageId,
        sentAt: new Date(),
        metadata: { fallbackFrom: "whatsapp", delayed: true },
      });
    }
  }, SMS_FALLBACK_MS);

  if (process.env.NODE_ENV !== "production") {
    return { channel: "dev", stub: true };
  }

  return { channel: "none", error: waResult.error || smsResult.error };
};
