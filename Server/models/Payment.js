import mongoose from "mongoose";

// TODO Phase 1: Rebuild as FeePayment model referencing Application + Candidate.
// Current schema is a minimal stub — HMS Invoice/Patient refs removed.

const PaymentSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true, index: true },
    // Phase 1: replace with applicationRefNo + candidateId refs
    amount: { type: Number, required: true, min: 0 },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    gatewayTransactionId: { type: String, trim: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    notes: { type: String, trim: true, maxlength: 2000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", PaymentSchema);
