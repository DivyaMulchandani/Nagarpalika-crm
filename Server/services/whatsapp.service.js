import WhatsAppConfig from "../models/WhatsAppConfig.js";

const GRAPH_API = "https://graph.facebook.com/v21.0";

const getConfig = async () => {
  const dbConfig = await WhatsAppConfig.findOne({ isActive: true }).lean();
  if (dbConfig?.phoneNumberId && dbConfig?.accessToken) return dbConfig;
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE || "otp_verification",
    };
  }
  return null;
};

const formatPhone = (mobile) => {
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export const sendWhatsAppTemplate = async ({ to, templateName, variables = [] }) => {
  const config = await getConfig();
  if (!config)
    return { ok: false, channel: "whatsapp", error: "WhatsApp not configured" };

  const phone = formatPhone(to);
  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName || config.otpTemplateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: variables.map((v) => ({ type: "text", text: String(v) })),
        },
      ],
    },
  };

  try {
    const res = await fetch(`${GRAPH_API}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok)
      return { ok: false, channel: "whatsapp", error: data.error?.message || res.statusText };
    return {
      ok: true,
      channel: "whatsapp",
      messageId: data.messages?.[0]?.id,
    };
  } catch (err) {
    return { ok: false, channel: "whatsapp", error: err.message };
  }
};

export const testWhatsAppConnection = async () => {
  const config = await getConfig();
  if (!config) return { ok: false, message: "WhatsApp not configured" };
  try {
    const res = await fetch(`${GRAPH_API}/${config.phoneNumberId}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.error?.message || "Connection failed" };
    return { ok: true, message: "Connection successful", data };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

export { getConfig };
