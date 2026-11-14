import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import {
  getConfig,
  updateConfig,
  testConfig,
  searchMessages,
  getStats,
  sendCustom,
  sendBroadcast,
  retryFailed,
} from "../../controllers/v1/whatsapp.controller.js";

const router = express.Router();

router.get("/whatsapp/config", authMiddleware(["ADMIN"]), getConfig);
router.put("/whatsapp/config", authMiddleware(["ADMIN"]), updateConfig);
router.post("/whatsapp/config/test", authMiddleware(["ADMIN"]), testConfig);
router.post("/whatsapp/messages/search", authMiddleware(["ADMIN", "EMPLOYEE"]), requirePermission("/whatsapp", "read"), searchMessages);
router.get("/whatsapp/messages/stats", authMiddleware(["ADMIN", "EMPLOYEE"]), requirePermission("/whatsapp", "read"), getStats);
router.post("/whatsapp/send", authMiddleware(["ADMIN"]), sendCustom);
router.post("/whatsapp/broadcast", authMiddleware(["ADMIN"]), sendBroadcast);
router.post("/whatsapp/retry", authMiddleware(["ADMIN"]), retryFailed);

export default router;
