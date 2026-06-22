/**
 * SMS gateway integration for OTP fallback delivery.
 */
export const sendSms = async ({ to, message }) => {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "NAGPAL";

  if (!apiUrl || !apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS STUB] to=${to} message length=${message?.length}`);
      return { ok: true, channel: "sms", stub: true, messageId: `stub-${Date.now()}` };
    }
    return { ok: false, channel: "sms", error: "SMS gateway not configured" };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to, message, sender: senderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, channel: "sms", error: data.message || res.statusText };
    return { ok: true, channel: "sms", messageId: data.messageId || data.id || String(Date.now()) };
  } catch (err) {
    return { ok: false, channel: "sms", error: err.message };
  }
};
