import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  getFeeStatus,
  initiateFeePayment,
  getFeeReceipt,
  razorpayWebhook,
  listFeePayments,
  reconciliation,
  manualVerification,
  searchFeePayments,
  getMyFeePayments,
} from "../../controllers/v1/feePayment.controller.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post("/fee-payments/status", getFeeStatus);

// ── Candidate ─────────────────────────────────────────────────────────────────
router.post(
  "/fee-payments/initiate",
  authMiddleware(["CANDIDATE"]),
  initiateFeePayment,
);
router.get("/fee-payments/me", authMiddleware(["CANDIDATE"]), getMyFeePayments);
router.get(
  "/fee-payments/receipt/:payment_id",
  authMiddleware(["CANDIDATE"]),
  getFeeReceipt,
);

// ── Webhook — HMAC only, no session ──────────────────────────────────────────
router.post("/webhooks/razorpay", razorpayWebhook);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  "/fee-payments",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  listFeePayments,
);
router.get(
  "/fee-payments/reconciliation",
  authMiddleware(["ADMIN"]),
  reconciliation,
);
router.patch(
  "/fee-payments/:id/manual",
  authMiddleware(["ADMIN"]),
  manualVerification,
);

// ── Legacy ────────────────────────────────────────────────────────────────────
router.post(
  "/fee-payments/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchFeePayments,
);

export default router;
