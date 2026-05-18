import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 2000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", PaymentSchema);
