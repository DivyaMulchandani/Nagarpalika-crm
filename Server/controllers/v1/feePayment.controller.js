import crypto from "crypto";
import FeePayment from "../../models/FeePayment.js";
import Application from "../../models/Application.js";
import Advertisement from "../../models/Advertisement.js";
import Candidate from "../../models/Candidate.js";
import {
  createOrder,
  verifyWebhookSignature,
} from "../../services/razorpay.service.js";
import { generateReceiptPdf } from "../../services/receiptPdf.service.js";
import {
  sendTemplatedEmail,
  pdfToBuffer,
} from "../../services/email.service.js";

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

// ── Public ────────────────────────────────────────────────────────────────────

// Lookup fee status by registration_id+advt_no or aadhaar+advt_no
export const getFeeStatus = async (req, res) => {
  try {
    const { registration_id, aadhaar, advt_no } = req.body;
    if ((!registration_id && !aadhaar) || !advt_no)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "Provide (registration_id or aadhaar) and advt_no",
      });

    let reg_id = registration_id;
    if (!reg_id && aadhaar) {
      const candidate = await Candidate.findOne({
        aadhaar_hash: hashAadhaar(aadhaar),
      }).select("registration_id");
      if (!candidate)
        return res
          .status(200)
          .json({ isOk: true, status: 200, data: { status: "not_found" } });
      reg_id = candidate.registration_id;
    }

    const fee = await FeePayment.findOne({
      registration_id: reg_id,
      advt_no,
    }).select("status payment_id paid_at advt_no application_ref_no");

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: fee
        ? {
            status: fee.status,
            payment_id: fee.payment_id,
            paid_at: fee.paid_at,
          }
        : { status: "not_found" },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Candidate ─────────────────────────────────────────────────────────────────

export const initiateFeePayment = async (req, res) => {
  try {
    const { application_ref_no } = req.body;
    const registration_id = req.user.registration_id;

    if (!application_ref_no)
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "application_ref_no is required",
      });

    const app = await Application.findOne({ application_ref_no });
    if (!app)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Application not found" });
    if (app.registration_id !== registration_id)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });

    // Block duplicate payment initiation if already paid
    const existingPaid = await FeePayment.findOne({
      application_ref_no,
      status: "paid",
    });
    if (existingPaid)
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Fee already paid for this application",
      });

    const advt = await Advertisement.findOne({ advt_no: app.advt_no });
    if (!advt)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Advertisement not found" });

    // Amount always from DB — never from client
    const amountInPaise = Math.round((advt.application_fee || 0) * 100);
    const { orderId, amount, currency, key } = await createOrder(
      application_ref_no,
      amountInPaise,
    );

    const fee = new FeePayment({
      application_ref_no,
      registration_id,
      advt_no: app.advt_no,
      amount: advt.application_fee,
      razorpay_order_id: orderId,
    });
    await fee.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Payment order created",
      data: { payment_id: fee.payment_id, orderId, amount, currency, key },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getFeeReceipt = async (req, res) => {
  try {
    const fee = await FeePayment.findOne({
      payment_id: req.params.payment_id,
    }).lean();
    if (!fee)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Payment not found" });
    if (fee.registration_id !== req.user.registration_id)
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });
    if (fee.status !== "paid")
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Receipt only available for paid payments",
      });

    const [candidate, advt] = await Promise.all([
      Candidate.findOne({ registration_id: fee.registration_id })
        .select("-password -aadhaar_hash -login_attempts -lockout_until")
        .lean(),
      Advertisement.findOne({ advt_no: fee.advt_no })
        .populate("department", "name")
        .lean(),
    ]);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${fee.payment_id}.pdf"`,
    );

    await generateReceiptPdf({ fee, candidate, advertisement: advt }, res);
  } catch (error) {
    if (!res.headersSent)
      return res
        .status(500)
        .json({ isOk: false, status: 500, message: error.message });
  }
};

// ── Webhook — HMAC-verified, session-bypassed ─────────────────────────────────

export const razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  // HMAC check first — before any DB access
  if (!verifyWebhookSignature(req.rawBody, signature))
    return res
      .status(401)
      .json({ isOk: false, status: 401, message: "Invalid signature" });

  // Acknowledge immediately — Razorpay retries on non-2xx
  res.status(200).json({ ok: true });

  try {
    const event = req.body;
    if (event.event !== "payment.captured") return;

    const payment = event.payload?.payment?.entity;
    if (!payment) return;

    const {
      id: gateway_txn_id,
      order_id: razorpay_order_id,
      amount: webhookAmountPaise,
    } = payment;

    // Idempotency — skip if already processed
    const already = await FeePayment.findOne({ gateway_txn_id });
    if (already) return;

    const fee = await FeePayment.findOne({ razorpay_order_id });
    if (!fee) return;

    // Amount validation — webhook amount must match advt.application_fee
    const advt = await Advertisement.findOne({ advt_no: fee.advt_no });
    if (!advt) return;
    const expectedPaise = Math.round((advt.application_fee || 0) * 100);
    if (webhookAmountPaise !== expectedPaise) {
      console.error(
        `[WEBHOOK] Amount mismatch: expected ${expectedPaise}, got ${webhookAmountPaise} for ${fee.payment_id}`,
      );
      return;
    }

    fee.status = "paid";
    fee.gateway_txn_id = gateway_txn_id;
    fee.paid_at = new Date();
    fee.webhook_payload = event;
    await fee.save();

    // Send receipt email with PDF attachment (non-blocking)
    try {
      const [candidate, advt] = await Promise.all([
        Candidate.findOne({ registration_id: fee.registration_id })
          .select("email name registration_id")
          .lean(),
        Advertisement.findOne({ advt_no: fee.advt_no }).lean(),
      ]);
      if (candidate?.email) {
        const pdfBuffer = await pdfToBuffer(generateReceiptPdf, {
          fee: fee.toObject(),
          candidate,
          advertisement: advt,
        });
        await sendTemplatedEmail(
          "fee_receipt",
          candidate.email,
          {
            NAME: candidate.name,
            REGISTRATION_ID: candidate.registration_id,
            ADVT_NO: fee.advt_no,
            AMOUNT: (fee.amount / 100).toFixed(2),
            RECEIPT_NO: fee.payment_id,
            PORTAL_URL: process.env.PORTAL_URL || "",
          },
          [
            {
              filename: `receipt-${fee.payment_id}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        );
      }
    } catch (emailErr) {
      console.error("[EMAIL] fee_receipt:", emailErr.message);
    }
  } catch (err) {
    console.error("[WEBHOOK] Processing error:", err.message);
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const listFeePayments = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 20,
      status,
      advt_no,
      from,
      to,
      sorton,
      sortdir,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (advt_no) filter.advt_no = advt_no;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const limit = Math.min(Number(per_page) || 20, 100);
    const [total, data] = await Promise.all([
      FeePayment.countDocuments(filter),
      FeePayment.find(filter)
        .select(
          "payment_id registration_id advt_no amount status paid_at gateway_txn_id createdAt",
        )
        .sort({ [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 })
        .skip(Number(skip))
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({ isOk: true, status: 200, total, data });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const reconciliation = async (req, res) => {
  try {
    const { from, to, advt_no } = req.query;

    const matchStage = { status: "paid" };
    if (advt_no) matchStage.advt_no = advt_no;
    if (from || to) {
      matchStage.paid_at = {};
      if (from) matchStage.paid_at.$gte = new Date(from);
      if (to) matchStage.paid_at.$lte = new Date(to);
    }

    const result = await FeePayment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$advt_no",
          total_collected: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const grand_total = result.reduce((sum, r) => sum + r.total_collected, 0);
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: { grand_total, by_advt: result },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Feature-flagged manual override — Super Admin only
export const manualVerification = async (req, res) => {
  try {
    if (process.env.ENABLE_MANUAL_PAYMENT_OVERRIDE !== "true")
      return res.status(403).json({
        isOk: false,
        status: 403,
        message: "Manual payment override is disabled",
      });

    const { gateway_txn_id, notes } = req.body;
    const fee = await FeePayment.findById(req.params.id);
    if (!fee)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Payment not found" });

    fee.status = "paid";
    fee.paid_at = fee.paid_at || new Date();
    if (gateway_txn_id) fee.gateway_txn_id = gateway_txn_id;
    fee.webhook_payload = {
      manual_override: true,
      notes,
      overridden_by: req.user.id,
      overridden_at: new Date(),
    };
    await fee.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Payment manually verified",
      data: fee,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

// Legacy — kept for backward compat
export const searchFeePayments = async (req, res) => {
  try {
    const {
      skip = 0,
      per_page = 10,
      match,
      status,
      advt_no,
      sorton,
      sortdir,
    } = req.body;
    const matchCond = {};
    if (status) matchCond.status = status;
    if (advt_no) matchCond.advt_no = advt_no;

    const pipeline = [];
    if (match) {
      pipeline.push({
        $match: {
          $or: [
            { registration_id: { $regex: match, $options: "i" } },
            { payment_id: { $regex: match, $options: "i" } },
          ],
        },
      });
    }
    pipeline.push({ $match: matchCond });
    pipeline.push({
      $sort: { [sorton || "createdAt"]: sortdir === "asc" ? 1 : -1 },
    });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: skip }, { $limit: per_page }],
      },
    });
    pipeline.push({
      $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" },
    });

    const result = await FeePayment.aggregate(pipeline);
    return res.status(200).json({ isOk: true, status: 200, data: result });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const getMyFeePayments = async (req, res) => {
  try {
    const list = await FeePayment.find({
      registration_id: req.user.registration_id,
    })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
