import WhatsAppMessage from "../../models/WhatsAppMessage.js";
import WhatsAppConfig from "../../models/WhatsAppConfig.js";
import Patient from "../../models/Patient.js";
import {
  sendWhatsAppMessage,
  sendBulkBroadcast,
  processStatusWebhook,
  getWhatsAppConfig,
  clearConfigCache,
} from "../../services/whatsapp.service.js";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

// ============================================================
// 1. Get message log (search / list)
// ============================================================
export const listMessages = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 50,
      triggerType,
      deliveryStatus,
      patientId,
      dateFrom,
      dateTo,
      match,
    } = req.body;

    const matchCondition = { isActive: { $ne: false } };
    if (triggerType) matchCondition.triggerType = triggerType;
    if (deliveryStatus) matchCondition.deliveryStatus = deliveryStatus;
    if (patientId) matchCondition.patientId = new ObjectId(patientId);
    if (dateFrom || dateTo) {
      matchCondition.createdAt = {};
      if (dateFrom) matchCondition.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z");
      if (dateTo) matchCondition.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
    ];

    // Text search on recipient name/phone
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { recipientName: { $regex: match, $options: "i" } },
            { recipientPhone: { $regex: match, $options: "i" } },
            { "patient.firstName": { $regex: match, $options: "i" } },
            { "patient.lastName": { $regex: match, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        count: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: Number(skip) },
          { $limit: Number(per_page) },
        ],
      },
    });

    const result = await WhatsAppMessage.aggregate(pipeline);

    return res.status(200).json({
      isOk: true,
      data: [
        {
          count: result[0]?.count[0]?.total || 0,
          data: result[0]?.data || [],
        },
      ],
      status: 200,
    });
  } catch (err) {
    console.error("listMessages error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 2. Get message stats (for dashboard widget)
// ============================================================
export const getMessageStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const match = { isActive: { $ne: false } };
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z");
      if (dateTo) match.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const [statusAgg, typeAgg] = await Promise.all([
      WhatsAppMessage.aggregate([
        { $match: match },
        { $group: { _id: "$deliveryStatus", count: { $sum: 1 } } },
      ]),
      WhatsAppMessage.aggregate([
        { $match: match },
        { $group: { _id: "$triggerType", count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = {};
    let total = 0;
    statusAgg.forEach((r) => { byStatus[r._id] = r.count; total += r.count; });

    const byType = {};
    typeAgg.forEach((r) => { byType[r._id] = r.count; });

    return res.status(200).json({
      isOk: true,
      data: { total, byStatus, byType },
      status: 200,
    });
  } catch (err) {
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 3. Send a custom/manual message
// ============================================================
export const sendCustomMessage = async (req, res) => {
  try {
    const { patientId, templateName, templateParams, messageBody } = req.body;

    if (!patientId) {
      return res.status(400).json({ isOk: false, message: "patientId is required", status: 400 });
    }

    const patient = await Patient.findOne({ _id: patientId, isDeleted: { $ne: true } });
    if (!patient) {
      return res.status(404).json({ isOk: false, message: "Patient not found", status: 404 });
    }
    if (!patient.mobileNumber) {
      return res.status(400).json({ isOk: false, message: "Patient has no mobile number", status: 400 });
    }

    const result = await sendWhatsAppMessage({
      patientId: patient._id,
      recipientPhone: patient.mobileNumber,
      recipientName: `${patient.firstName} ${patient.lastName}`.trim(),
      triggerType: "custom",
      templateName: templateName || "custom_message",
      templateParams: templateParams || [],
      messageBody,
      createdBy: req.user?.id,
    });

    return res.status(200).json({
      isOk: true,
      data: result,
      message: "Message queued successfully",
      status: 200,
    });
  } catch (err) {
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 4. Send bulk broadcast
// ============================================================
export const sendBroadcast = async (req, res) => {
  try {
    const { patientIds, templateName, templateParams, messageBody } = req.body;

    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ isOk: false, message: "patientIds array is required", status: 400 });
    }
    if (!templateName) {
      return res.status(400).json({ isOk: false, message: "templateName is required", status: 400 });
    }

    const patients = await Patient.find({
      _id: { $in: patientIds.map((id) => new ObjectId(id)) },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).select("_id firstName lastName mobileNumber");

    const results = await sendBulkBroadcast(
      patients,
      templateName,
      templateParams || [],
      messageBody,
      req.user?.id
    );

    return res.status(200).json({
      isOk: true,
      data: { sent: results.length, total: patientIds.length },
      message: `${results.length} messages queued`,
      status: 200,
    });
  } catch (err) {
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 5. Meta Webhook — verify (GET) and receive status updates (POST)
// ============================================================
export const webhookVerify = async (req, res) => {
  const config = await getWhatsAppConfig();
  const VERIFY_TOKEN = config?.webhookVerifyToken || "hms-whatsapp-verify";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

export const webhookReceive = async (req, res) => {
  try {
    const body = req.body;

    // Process status updates
    if (body?.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const statuses = change.value?.statuses || [];
          for (const status of statuses) {
            await processStatusWebhook(
              status.id,
              status.status,
              status.timestamp
            );
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.sendStatus(200); // Always respond 200 to Meta
  }
};

// ============================================================
// 6. Retry failed messages
// ============================================================
export const retryFailedMessages = async (req, res) => {
  try {
    const failedMessages = await WhatsAppMessage.find({
      deliveryStatus: "failed",
      retryCount: { $lt: 3 },
      nextRetryAt: { $lte: new Date() },
      isActive: { $ne: false },
    }).limit(50);

    let retried = 0;
    for (const msg of failedMessages) {
      msg.retryCount += 1;
      // Re-send
      const result = await sendWhatsAppMessage({
        patientId: msg.patientId,
        appointmentId: msg.appointmentId,
        invoiceId: msg.invoiceId,
        paymentId: msg.paymentId,
        recipientPhone: msg.recipientPhone,
        recipientName: msg.recipientName,
        triggerType: msg.triggerType,
        templateName: msg.templateName,
        templateLanguage: msg.templateLanguage,
        templateParams: msg.templateParams,
        messageBody: msg.messageBody,
      });
      // Mark original as superseded
      msg.deliveryStatus = "queued";
      msg.errorMessage = `Retried — new message ID: ${result._id}`;
      await msg.save();
      retried++;
    }

    return res.status(200).json({
      isOk: true,
      data: { retriedCount: retried },
      message: `${retried} messages retried`,
      status: 200,
    });
  } catch (err) {
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

const maskWhatsAppConfig = (config) => {
  const configObj = config.toObject ? config.toObject() : { ...config };
  if (configObj.accessToken) {
    const token = configObj.accessToken;
    configObj.accessTokenMasked = token.length > 6
      ? "•".repeat(token.length - 6) + token.slice(-6)
      : "•".repeat(token.length);
    configObj.hasAccessToken = true;
  } else {
    configObj.accessTokenMasked = "";
    configObj.hasAccessToken = false;
  }
  delete configObj.accessToken;
  return configObj;
};

// ============================================================
// 7. Get WhatsApp Configuration
// ============================================================
export const getConfig = async (req, res) => {
  try {
    let config = await WhatsAppConfig.findOne();
    if (!config) {
      // Create default config if none exists
      config = await WhatsAppConfig.create({});
    }

    return res.status(200).json({ isOk: true, data: maskWhatsAppConfig(config), status: 200 });
  } catch (err) {
    console.error("getConfig error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 8. Update WhatsApp Configuration
// ============================================================
export const updateConfig = async (req, res) => {
  try {
    const {
      apiUrl,
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookVerifyToken,
      isEnabled,
      defaultCountryCode,
      triggers,
      reminderHoursBefore,
      templates,
      templateLanguage,
      maxRetries,
      retryBackoffMinutes,
    } = req.body;

    const updateData = {};
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (phoneNumberId !== undefined) updateData.phoneNumberId = phoneNumberId;
    // Only update token if a new value is explicitly provided (not empty)
    if (accessToken && accessToken.trim()) updateData.accessToken = accessToken.trim();
    if (businessAccountId !== undefined) updateData.businessAccountId = businessAccountId;
    if (webhookVerifyToken !== undefined) updateData.webhookVerifyToken = webhookVerifyToken;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (defaultCountryCode !== undefined) updateData.defaultCountryCode = defaultCountryCode;
    if (triggers !== undefined) updateData.triggers = triggers;
    if (reminderHoursBefore !== undefined) updateData.reminderHoursBefore = reminderHoursBefore;
    if (templates !== undefined) updateData.templates = templates;
    if (templateLanguage !== undefined) updateData.templateLanguage = templateLanguage;
    if (maxRetries !== undefined) updateData.maxRetries = maxRetries;
    if (retryBackoffMinutes !== undefined) updateData.retryBackoffMinutes = retryBackoffMinutes;
    updateData.updatedBy = req.user?.id;

    const config = await WhatsAppConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    // Clear the in-memory cache so service picks up new values
    clearConfigCache();

    return res.status(200).json({
      isOk: true,
      data: maskWhatsAppConfig(config),
      message: "WhatsApp configuration updated successfully",
      status: 200,
    });
  } catch (err) {
    console.error("updateConfig error:", err);
    return res.status(500).json({ isOk: false, message: err.message, status: 500 });
  }
};

// ============================================================
// 9. Test WhatsApp Connection
// ============================================================
export const testConnection = async (req, res) => {
  try {
    const config = await getWhatsAppConfig(true); // force refresh

    if (!config || !config.phoneNumberId || !config.accessToken) {
      return res.status(200).json({
        isOk: true,
        data: { connected: false, error: "WhatsApp API credentials not configured" },
        status: 200,
      });
    }

    const apiUrl = config.apiUrl || "https://graph.facebook.com/v21.0";

    // Test by fetching the phone number details
    const response = await fetch(`${apiUrl}/${config.phoneNumberId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({
        isOk: true,
        data: {
          connected: true,
          phoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
          qualityRating: data.quality_rating,
          platformType: data.platform_type,
        },
        message: "Connection successful!",
        status: 200,
      });
    } else {
      return res.status(200).json({
        isOk: true,
        data: {
          connected: false,
          error: data.error?.message || "Failed to connect to WhatsApp API",
          errorCode: data.error?.code,
        },
        status: 200,
      });
    }
  } catch (err) {
    return res.status(200).json({
      isOk: true,
      data: { connected: false, error: err.message },
      status: 200,
    });
  }
};
