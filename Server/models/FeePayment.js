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
    razorpay_order_id: { type: String },
    gateway_txn_id: { type: String },
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
    webhook_payload: { type: mongoose.Schema.Types.Mixed },
    paid_at: { type: Date },
  },
  { timestamps: true },
);

// Sparse so pending payments (no gateway_txn_id) don't conflict
FeePaymentSchema.index({ gateway_txn_id: 1 }, { unique: true, sparse: true });

export default mongoose.model("FeePayment", FeePaymentSchema);
