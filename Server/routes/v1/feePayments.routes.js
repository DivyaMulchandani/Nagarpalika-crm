import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { feeStatusLimiter } from "../../middlewares/securityHeaders.js";
import {
  getFeeStatus,
  getFeeReceipt,
  listFeePayments,
  reconciliation,
  manualVerification,
  searchFeePayments,
  getMyFeePayments,
  initiateEasyPayPayment,
  easyPayReturn,
  easyPayEnquiry,
} from "../../controllers/v1/feePayment.controller.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Throttled: the only input is a sequentially-issued Registration ID, so an
// open endpoint here is an enumeration surface over every candidate's fees.
router.post("/fee-payments/status", feeStatusLimiter, getFeeStatus);

// ── Candidate ─────────────────────────────────────────────────────────────────
router.get("/fee-payments/me", authMiddleware(["CANDIDATE"]), getMyFeePayments);
router.get(
  "/fee-payments/receipt/:payment_id",
  authMiddleware(["CANDIDATE"]),
  getFeeReceipt,
);

// ── Axis EasyPay ─────────────────────────────────────────────────────────────
router.post(
  "/fee-payments/easypay/initiate",
  authMiddleware(["CANDIDATE"]),
  initiateEasyPayPayment,
);

// Return URL (RTU). Deliberately unauthenticated: the bank redirects the user's
// browser here, and with sameSite=strict that cross-site request carries no
// session cookie. Authenticity comes from the response checksum, not the session.
// Both verbs are accepted — the spec says GET, gateways vary in practice.
router.get("/fee-payments/easypay/return", easyPayReturn);
router.post("/fee-payments/easypay/return", easyPayReturn);

router.get(
  "/fee-payments/easypay/enquiry/:payment_id",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  easyPayEnquiry,
);

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
