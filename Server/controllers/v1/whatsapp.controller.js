import WhatsAppConfig from "../../models/WhatsAppConfig.js";
import WhatsAppMessage from "../../models/WhatsAppMessage.js";
import { testWhatsAppConnection, sendWhatsAppTemplate } from "../../services/whatsapp.service.js";

export const getConfig = async (req, res) => {
  try {
    let config = await WhatsAppConfig.findOne({ isActive: true });
    if (!config) config = { phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "", businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "", otpTemplateName: process.env.WHATSAPP_OTP_TEMPLATE || "otp_verification", isActive: true };
    const data = config.toObject ? config.toObject() : config;
    if (data.accessToken) data.accessToken = "••••••••";
    return res.status(200).json({ isOk: true, status: 200, data });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { phoneNumberId, businessAccountId, accessToken, otpTemplateName, isActive } = req.body;
    let config = await WhatsAppConfig.findOne({ isActive: true });
    if (!config) config = new WhatsAppConfig();
    if (phoneNumberId !== undefined) config.phoneNumberId = phoneNumberId;
    if (businessAccountId !== undefined) config.businessAccountId = businessAccountId;
    if (accessToken && accessToken !== "••••••••") config.accessToken = accessToken;
    if (otpTemplateName !== undefined) config.otpTemplateName = otpTemplateName;
    if (isActive !== undefined) config.isActive = isActive;
    config.updatedBy = req.user?.id;
    await config.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Config updated" });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const testConfig = async (req, res) => {
  try {
    const result = await testWhatsAppConnection();
    return res.status(result.ok ? 200 : 400).json({ isOk: result.ok, status: result.ok ? 200 : 400, message: result.message, data: result.data });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { skip = 0, per_page = 50, match, trigger, status, dateFrom, dateTo } = req.body;
    const filter = {};
    if (trigger) filter.trigger = trigger;
    if (status) filter.status = status;
    if (match) filter.recipient = { $regex: match, $options: "i" };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [total, data] = await Promise.all([
      WhatsAppMessage.countDocuments(filter),
      WhatsAppMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(per_page).lean(),
    ]);

    return res.status(200).json({ isOk: true, status: 200, data: [{ count: total, data }] });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ];
    const byStatus = await WhatsAppMessage.aggregate(pipeline);
    const stats = { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0 };
    byStatus.forEach((s) => {
      stats[s._id] = s.count;
      stats.total += s.count;
    });
    return res.status(200).json({ isOk: true, status: 200, data: stats });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const sendCustom = async (req, res) => {
  try {
    const { recipient, messageBody, templateName } = req.body;
    if (!recipient) return res.status(422).json({ isOk: false, status: 422, message: "recipient is required" });

    const result = templateName
      ? await sendWhatsAppTemplate({ to: recipient, templateName, variables: [messageBody || ""] })
      : await sendWhatsAppTemplate({ to: recipient, templateName: "custom_message", variables: [messageBody || ""] });

    const msg = await WhatsAppMessage.create({
      recipient,
      messageBody,
      templateName,
      trigger: "custom",
      status: result.ok ? "sent" : "failed",
      channel: "whatsapp",
      externalId: result.messageId,
      errorMessage: result.error,
      sentAt: result.ok ? new Date() : undefined,
    });

    return res.status(result.ok ? 200 : 500).json({ isOk: result.ok, status: result.ok ? 200 : 500, data: msg });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const { recipients = [], messageBody, templateName } = req.body;
    if (!recipients.length) return res.status(422).json({ isOk: false, status: 422, message: "recipients required" });

    const results = [];
    for (const recipient of recipients) {
      const result = await sendWhatsAppTemplate({ to: recipient, templateName: templateName || "custom_message", variables: [messageBody || ""] });
      await WhatsAppMessage.create({
        recipient,
        messageBody,
        templateName,
        trigger: "bulk_broadcast",
        status: result.ok ? "sent" : "failed",
        channel: "whatsapp",
        externalId: result.messageId,
        errorMessage: result.error,
        sentAt: result.ok ? new Date() : undefined,
      });
      results.push({ recipient, ok: result.ok });
    }
    return res.status(200).json({ isOk: true, status: 200, data: results });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};

export const retryFailed = async (req, res) => {
  try {
    const failed = await WhatsAppMessage.find({ status: "failed", channel: "whatsapp" }).limit(50);
    let retried = 0;
    for (const msg of failed) {
      const result = await sendWhatsAppTemplate({
        to: msg.recipient,
        templateName: msg.templateName || process.env.WHATSAPP_OTP_TEMPLATE,
        variables: ["000000"],
      });
      if (result.ok) {
        msg.status = "sent";
        msg.externalId = result.messageId;
        msg.sentAt = new Date();
        msg.errorMessage = undefined;
        await msg.save();
        retried += 1;
      }
    }
    return res.status(200).json({ isOk: true, status: 200, message: `Retried ${retried} messages` });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};
