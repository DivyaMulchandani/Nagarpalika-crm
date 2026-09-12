import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const FeePaymentSchema = new mongoose.Schema(
  {
    payment_id: {
      type: String,
      unique: true,
      default: uuidv4,
    },
    application_ref_no: {
      type: String,
      required: true,
    },
    registration_id: {
      type: String,
      required: true,
    },
    advt_no: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    gateway_txn_id: { type: String },

    // ── Axis EasyPay ──────────────────────────────────────────────────────
    // RID/CRN must be numeric and unique per transaction (gateway errors 424
    // and 424a reject reuse), so they can't reuse application_ref_no and every
    // retry needs a brand new pair.
    //
    // easypay_rid/crn are the CURRENT attempt. easypay_refs keeps every pair
    // ever issued, because a result can arrive against an older one: NEFT/RTGS
    // (PMD=NR) settles hours or days after the payer left the bank's page, by
    // which time they may well have retried. Looking up only the latest RID
    // would leave that late confirmation unmatched — a real payment the portal
    // can't see.
    easypay_rid: { type: String },
    easypay_crn: { type: String },
    easypay_refs: [
      {
        _id: false,
        rid: { type: String, required: true },
        crn: { type: String, required: true },
        issued_at: { type: Date, default: Date.now },
      },
    ],
    // Which attempt actually paid — lets a second attempt clearing afterwards
    // be recognised as a duplicate payment needing a refund, not a no-op.
    easypay_settled_rid: { type: String },
    bank_ref_no: { type: String }, // BRN
    gateway_status_code: { type: String }, // STC: 000 paid / 101 pending / 111 failed
    payment_mode_code: { type: String }, // PMD: AIB | OIB | CD | NR
    gateway_response: { type: mongoose.Schema.Types.Mixed },
    // Set by the scheduled sweep that chases payments the browser redirect
    // never reported back (closed tab, or a NEFT that settles days later).
    reconcile_attempts: { type: Number, default: 0 },
    last_reconciled_at: { type: Date },
    payment_mode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    receipt_path: { type: String },
    paid_at: { type: Date },
  },
  { timestamps: true },
);

// Sparse so pending payments (no gateway_txn_id) don't conflict
FeePaymentSchema.index({ gateway_txn_id: 1 }, { unique: true, sparse: true });

// The gateway requires RID and CRN to be unique — enforce that here rather
// than trusting the counter.
FeePaymentSchema.index({ easypay_rid: 1 }, { unique: true, sparse: true });
FeePaymentSchema.index({ easypay_crn: 1 }, { unique: true, sparse: true });

// The return handler resolves a payment from whichever RID the gateway quotes,
// current or historical. Unique across documents so one RID can only ever map
// to one payment; MongoDB permits repeats inside a single document's array.
FeePaymentSchema.index(
  { "easypay_refs.rid": 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("FeePayment", FeePaymentSchema);
