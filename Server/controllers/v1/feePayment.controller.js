import crypto from "crypto";
import FeePayment from "../../models/FeePayment.js";
import Application from "../../models/Application.js";
import Advertisement from "../../models/Advertisement.js";
import Candidate from "../../models/Candidate.js";
import Counter from "../../models/Counter.js";
import * as easypay from "../../services/easypay.service.js";
import {
  sendFeeReceiptEmail,
  settleFromEnquiry,
} from "../../services/feeReconciliation.service.js";
import { resolveApplicationFee } from "../../services/feeCalculator.service.js";
import { generateReceiptPdf } from "../../services/receiptPdf.service.js";
import { escapeRegex } from "../../utils/escapeRegex.js";

const hashAadhaar = (raw) =>
  crypto.createHash("sha256").update(raw.replace(/\s/g, "")).digest("hex");

// Receipt delivery and enquiry-settlement live in the reconciliation service so
// the scheduled sweep and these handlers apply exactly the same rules.

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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

// ── Candidate ─────────────────────────────────────────────────────────────────

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
        .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

// ── Axis EasyPay (URL redirection) ───────────────────────────────────────────

// How many past RID/CRN pairs to retain per payment. Generous enough to cover
// any realistic retry sequence, bounded so the document can't grow without end.
const MAX_EASYPAY_REFS = 20;

/**
 * Numeric reference pair for the gateway. RID must be 6–20 digits and CRN
 * 10–20, both unique per transaction — the timestamp keeps them unique even if
 * the counter is ever reset, and the counter keeps concurrent calls apart.
 * Using one value for both matches the vendor's own worked example.
 */
const nextEasyPayRefs = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: "easypay_ref" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  const ref = `${String(Date.now()).slice(-10)}${String(counter.seq % 1e6).padStart(6, "0")}`;
  return { rid: ref, crn: ref };
};

const portalUrl = () => (process.env.PORTAL_URL || "").replace(/\/$/, "");

const redirectToPortal = (res, path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const base = portalUrl();
  if (!base) {
    // Nowhere to send the browser — say so plainly rather than 302 to "/?...".
    return res.status(200).json({
      isOk: params.status === "paid",
      status: 200,
      message: "Payment processed, but PORTAL_URL is not configured for redirect",
      data: params,
    });
  }
  return res.redirect(`${base}${path}${qs ? `?${qs}` : ""}`);
};

/**
 * Create an EasyPay order and hand the browser the encrypted payload to POST.
 * The amount always comes from the advertisement record, never from the client.
 */
export const initiateEasyPayPayment = async (req, res) => {
  try {
    if (!easypay.isConfigured())
      return res.status(503).json({
        isOk: false,
        status: 503,
        message: "Online payment is temporarily unavailable",
      });

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

    if (await FeePayment.findOne({ application_ref_no, status: "paid" }))
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

    // Fee tier is resolved from the stored candidate record, never from the
    // request — a candidate must not be able to choose which fee they pay.
    const candidate = await Candidate.findOne({ registration_id })
      .select("category gender")
      .lean();
    const fees = resolveApplicationFee(advt, candidate);
    const amount = fees.amount;

    if (!(amount > 0))
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No application fee is configured for this advertisement",
      });

    // Reuse the pending row on a retry instead of piling up new ones, but issue
    // a fresh RID/CRN — the gateway rejects a reference it has already seen.
    const { rid, crn } = await nextEasyPayRefs();
    const fee =
      (await FeePayment.findOne({ application_ref_no, status: "pending" })) ||
      new FeePayment({
        application_ref_no,
        registration_id,
        advt_no: app.advt_no,
        amount,
      });

    fee.amount = amount;
    fee.easypay_rid = rid;
    fee.easypay_crn = crn;
    // Keep every pair: a NEFT started on an earlier attempt can still clear
    // days later, and it will quote that older RID. Bounded so a rapidly
    // clicked Pay button can't grow the document without limit.
    fee.easypay_refs = [
      ...(fee.easypay_refs || []),
      { rid, crn, issued_at: new Date() },
    ].slice(-MAX_EASYPAY_REFS);
    await fee.save();

    const { url, i } = easypay.buildPaymentRequest({
      rid,
      crn,
      amount,
      extra: { RE2: registration_id, RE3: app.advt_no },
    });

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Payment request created",
      // The browser must POST `i` to `url` as a form — this is a redirect
      // integration, not a JS SDK.
      data: {
        url,
        i,
        payment_id: fee.payment_id,
        amount,
        fee_tier: fees.tier,
        fee_reason: fees.reason,
      },
    });
  } catch (error) {
    console.error("[easypay] initiate error:", error.message);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

/**
 * Return URL (RTU). The bank redirects the user's browser here, so this is a
 * cross-site request with NO session cookie (sameSite=strict) — the payment is
 * identified solely from the checksum-verified payload.
 */
export const easyPayReturn = async (req, res) => {
  try {
    const i = req.query?.i ?? req.body?.i;
    if (!i)
      return redirectToPortal(res, "/fee/failure", { reason: "missing_response" });

    const parsed = easypay.parseGatewayResponse(i, "payment");
    if (!parsed.ok) {
      // Includes checksum failure — i.e. a forged or tampered result.
      console.error("[easypay] rejected return payload:", parsed.error);
      return redirectToPortal(res, "/fee/failure", { reason: "invalid_response" });
    }

    const { data } = parsed;
    const rid = String(data.RID);
    // Match on the current attempt OR any earlier one — a NEFT begun before a
    // retry still quotes the RID it was started with.
    const fee = await FeePayment.findOne({
      $or: [{ easypay_rid: rid }, { "easypay_refs.rid": rid }],
    });
    if (!fee) {
      console.error(`[easypay] no payment matches RID ${rid}`);
      return redirectToPortal(res, "/fee/failure", { reason: "unknown_reference" });
    }

    // Already settled — a browser refresh must not re-process or downgrade it.
    if (fee.status === "paid") {
      // A *different* attempt clearing after one already paid means the
      // candidate has been charged twice (e.g. paid by card, then the earlier
      // NEFT landed). Never silently swallow that — it needs a refund.
      if (
        String(data.STC) === "000" &&
        fee.easypay_settled_rid &&
        fee.easypay_settled_rid !== rid
      )
        console.error(
          `[easypay] DUPLICATE PAYMENT on ${fee.payment_id} (${fee.application_ref_no}): ` +
            `already settled by RID ${fee.easypay_settled_rid}, now RID ${rid} also reports paid ` +
            `(BRN ${data.BRN}, TRN ${data.TRN}, AMT ${data.AMT}) — refund required`,
        );
      return redirectToPortal(res, "/fee/success", { ref: fee.application_ref_no });
    }

    // The signed amount must equal what we asked for. Compare numerically so
    // "2.00" and 2 agree, while the checksum above used the verbatim string.
    if (Number(data.AMT) !== Number(fee.amount)) {
      console.error(
        `[easypay] amount mismatch on ${fee.payment_id}: expected ${fee.amount}, got ${data.AMT}`,
      );
      fee.status = "failed";
      fee.gateway_response = data;
      await fee.save();
      return redirectToPortal(res, "/fee/failure", { reason: "amount_mismatch" });
    }

    fee.status = parsed.status; // paid | pending | failed
    fee.gateway_status_code = data.STC;
    fee.bank_ref_no = data.BRN;
    fee.payment_mode_code = data.PMD;
    fee.gateway_response = data;
    if (data.TRN) fee.gateway_txn_id = data.TRN;
    if (parsed.status === "paid") {
      fee.paid_at = new Date();
      fee.easypay_settled_rid = rid;
    }
    await fee.save();

    if (parsed.status === "paid") {
      sendFeeReceiptEmail(fee).catch(() => {});
      return redirectToPortal(res, "/fee/success", { ref: fee.application_ref_no });
    }
    if (parsed.status === "pending")
      // "/fee" is the status page; there is no "/fee/status" route and the
      // SPA catch-all would silently bounce it to "/".
      return redirectToPortal(res, "/fee", {
        ref: fee.application_ref_no,
        reason: "pending",
      });

    return redirectToPortal(res, "/fee/failure", {
      reason: "declined",
      ref: fee.application_ref_no,
    });
  } catch (error) {
    console.error("[easypay] return handler error:", error.message);
    return redirectToPortal(res, "/fee/failure", { reason: "server_error" });
  }
};

/**
 * Admin reconciliation: ask the gateway directly what happened to a payment.
 * Authoritative when a user closed the browser before being redirected back.
 */
export const easyPayEnquiry = async (req, res) => {
  try {
    const fee = await FeePayment.findOne({ payment_id: req.params.payment_id });
    if (!fee)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Payment not found" });
    if (!fee.easypay_rid)
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "This payment was not initiated through EasyPay",
      });

    const result = await settleFromEnquiry(fee);

    if (!result.ok)
      return res
        .status(502)
        .json({ isOk: false, status: 502, message: result.error });

    const { data } = result;
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: {
        payment_id: fee.payment_id,
        local_status: fee.status,
        gateway_status: result.gatewayStatus,
        updated: result.changed,
        status_code: data.STC,
        remark: data.RMK,
        bank_ref_no: data.BRN,
        gateway_txn_id: data.TRN,
        amount: data.AMT,
        transacted_at: data.TET,
      },
    });
  } catch (error) {
    console.error("[easypay] enquiry error:", error.message);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
    fee.gateway_response = {
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
            { registration_id: { $regex: escapeRegex(match), $options: "i" } },
            { payment_id: { $regex: escapeRegex(match), $options: "i" } },
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
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
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};
