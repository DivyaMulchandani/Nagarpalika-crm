/**
 * Fee payment reconciliation.
 *
 * EasyPay has no webhook: the only push we get is the browser redirect to the
 * return URL. If the payer closes the tab before that redirect lands — or pays
 * by NEFT/RTGS, which settles hours or days later — the bank has the money and
 * our record still says "pending". This module is the pull side that closes
 * that gap, by asking the gateway directly what happened.
 *
 * Rule everywhere below: a reconciliation may only move a payment FORWARD to
 * paid, and only when the gateway's amount matches our own record. It must
 * never mark anything failed, because a transient gateway error is not proof
 * that a payment did not happen.
 */
import FeePayment from "../models/FeePayment.js";
import Candidate from "../models/Candidate.js";
import Advertisement from "../models/Advertisement.js";
import { generateReceiptPdf } from "./receiptPdf.service.js";
import { sendTemplatedEmail, pdfToBuffer } from "./email.service.js";
import * as easypay from "./easypay.service.js";

// Don't enquire until the redirect has had a fair chance to land.
const MIN_AGE_MS = 3 * 60 * 1000;
// Space out repeat enquiries on the same record.
const RETRY_INTERVAL_MS = 10 * 60 * 1000;
// Stop chasing eventually — NEFT is slow, but not this slow.
const GIVE_UP_AFTER_DAYS = Number(process.env.EASYPAY_RECONCILE_DAYS || 7);
// Cap per run so a backlog can't stall the scheduler or hammer the gateway.
const BATCH_SIZE = Number(process.env.EASYPAY_RECONCILE_BATCH || 25);

/**
 * Email the payer their receipt. Fire-and-forget: a mail failure must never
 * roll back a payment the bank has already confirmed.
 */
export const sendFeeReceiptEmail = async (fee) => {
  try {
    const [candidate, advt] = await Promise.all([
      Candidate.findOne({ registration_id: fee.registration_id })
        .select("email name registration_id")
        .lean(),
      Advertisement.findOne({ advt_no: fee.advt_no }).lean(),
    ]);
    if (!candidate?.email) return;

    const pdfBuffer = await pdfToBuffer(generateReceiptPdf, {
      fee: fee.toObject ? fee.toObject() : fee,
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
        // fee.amount is stored in rupees (advt.application_fee), not paise.
        AMOUNT: Number(fee.amount).toFixed(2),
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
  } catch (err) {
    console.error("[EMAIL] fee_receipt:", err.message);
  }
};

/**
 * Every RID/CRN pair ever issued for this payment, newest first and de-duped.
 * A NEFT begun on an earlier attempt clears against that attempt's RID, so
 * checking only the current one would miss it entirely.
 */
const collectRefs = (fee) => {
  const out = [];
  const seen = new Set();
  const push = (rid, crn) => {
    if (!rid || seen.has(String(rid))) return;
    seen.add(String(rid));
    out.push({ rid: String(rid), crn: String(crn ?? rid) });
  };

  push(fee.easypay_rid, fee.easypay_crn);
  for (const r of [...(fee.easypay_refs || [])].reverse()) push(r.rid, r.crn);
  return out;
};

/**
 * Ask the gateway about a payment and apply the answer.
 *
 * Every attempt is queried until one reports paid, so a late NEFT settlement
 * is found even after the candidate retried. BRN is deliberately not sent: it
 * belongs to one specific attempt and is optional for enquiry, so quoting the
 * wrong one would only confuse the lookup.
 *
 * @param {object} fee A FeePayment document (not lean — it gets saved).
 * @returns {Promise<{ok: boolean, changed: boolean, gatewayStatus?: string,
 *                    data?: object, rid?: string, error?: string}>}
 */
export const settleFromEnquiry = async (fee) => {
  const refs = collectRefs(fee);
  if (!refs.length)
    return { ok: false, changed: false, error: "Payment was not initiated through EasyPay" };

  fee.reconcile_attempts = (fee.reconcile_attempts || 0) + 1;
  fee.last_reconciled_at = new Date();

  let lastError = null;
  let lastOk = null; // most recent answer the gateway actually gave us

  for (const ref of refs) {
    let result;
    try {
      result = await easypay.enquire({ rid: ref.rid, crn: ref.crn });
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    if (!result.ok) {
      lastError = result.error;
      continue;
    }

    const { data } = result;
    const gatewayStatus = easypay.STATUS[String(data.STC)] || "failed";
    lastOk = { data, gatewayStatus, rid: ref.rid };

    if (gatewayStatus !== "paid") continue;

    if (Number(data.AMT) !== Number(fee.amount)) {
      console.error(
        `[RECONCILE] amount mismatch on ${fee.payment_id} (RID ${ref.rid}): expected ${fee.amount}, gateway says ${data.AMT} — left untouched for manual review`,
      );
      continue;
    }

    if (fee.status === "paid") {
      // Another attempt already settled this fee — two real payments.
      if (fee.easypay_settled_rid && fee.easypay_settled_rid !== ref.rid)
        console.error(
          `[RECONCILE] DUPLICATE PAYMENT on ${fee.payment_id} (${fee.application_ref_no}): ` +
            `settled by RID ${fee.easypay_settled_rid}, RID ${ref.rid} also reports paid ` +
            `(BRN ${data.BRN}, TRN ${data.TRN}) — refund required`,
        );
      break;
    }

    fee.status = "paid";
    fee.paid_at = fee.paid_at || new Date();
    fee.bank_ref_no = data.BRN;
    fee.payment_mode_code = data.PMD;
    fee.gateway_status_code = data.STC;
    fee.gateway_response = data;
    fee.easypay_settled_rid = ref.rid;
    if (data.TRN) fee.gateway_txn_id = data.TRN;

    await fee.save();
    sendFeeReceiptEmail(fee).catch(() => {});
    return { ok: true, changed: true, gatewayStatus: "paid", data, rid: ref.rid };
  }

  // Persist the attempt counter so a permanently failing record backs off.
  await fee.save().catch(() => {});

  if (lastOk)
    return {
      ok: true,
      changed: false,
      gatewayStatus: lastOk.gatewayStatus,
      data: lastOk.data,
      rid: lastOk.rid,
    };

  return { ok: false, changed: false, error: lastError || "Gateway gave no usable answer" };
};

/**
 * Sweep pending EasyPay payments and settle any the gateway now reports paid.
 * Safe to call on a timer; does nothing when EasyPay isn't configured.
 */
export const reconcilePendingEasyPayPayments = async () => {
  if (!easypay.isConfigured()) return { checked: 0, settled: 0, skipped: "not configured" };

  const now = Date.now();
  const candidates = await FeePayment.find({
    status: "pending",
    easypay_rid: { $exists: true, $ne: null },
    createdAt: {
      $lte: new Date(now - MIN_AGE_MS),
      $gte: new Date(now - GIVE_UP_AFTER_DAYS * 24 * 60 * 60 * 1000),
    },
    $or: [
      { last_reconciled_at: { $exists: false } },
      { last_reconciled_at: null },
      { last_reconciled_at: { $lte: new Date(now - RETRY_INTERVAL_MS) } },
    ],
  })
    .sort({ last_reconciled_at: 1, createdAt: 1 })
    .limit(BATCH_SIZE);

  let settled = 0;
  for (const fee of candidates) {
    try {
      const res = await settleFromEnquiry(fee);
      if (res.changed) {
        settled += 1;
        console.log(
          `[RECONCILE] ${fee.payment_id} (${fee.application_ref_no}) settled as paid via enquiry`,
        );
      }
    } catch (err) {
      console.error(`[RECONCILE] ${fee.payment_id} failed:`, err.message);
    }
  }

  if (candidates.length)
    console.log(
      `[RECONCILE] checked ${candidates.length} pending payment(s), settled ${settled}`,
    );

  return { checked: candidates.length, settled };
};
