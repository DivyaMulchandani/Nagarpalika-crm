import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  listMessages,
  getMessageStats,
  sendCustomMessage,
  sendBroadcast,
  webhookVerify,
  webhookReceive,
  retryFailedMessages,
  getConfig,
  updateConfig,
  testConnection,
} from "../../controllers/v1/whatsapp.controller.js";

const router = express.Router();

// Configuration (ADMIN only)
router.get("/whatsapp/config", authMiddleware(["ADMIN"]), getConfig);
router.put("/whatsapp/config", authMiddleware(["ADMIN"]), updateConfig);
router.post("/whatsapp/config/test", authMiddleware(["ADMIN"]), testConnection);

// Message log & stats
router.post("/whatsapp/messages/search", authMiddleware(["ADMIN", "EMPLOYEE"]), listMessages);
router.get("/whatsapp/messages/stats", authMiddleware(["ADMIN", "EMPLOYEE"]), getMessageStats);

// Send messages
router.post("/whatsapp/send", authMiddleware(["ADMIN", "EMPLOYEE"]), sendCustomMessage);
router.post("/whatsapp/broadcast", authMiddleware(["ADMIN"]), sendBroadcast);

// Retry failed
router.post("/whatsapp/retry", authMiddleware(["ADMIN"]), retryFailedMessages);

// Meta Webhook (no auth — Meta calls these directly)
router.get("/whatsapp/webhook", webhookVerify);
router.post("/whatsapp/webhook", webhookReceive);

export default router;
