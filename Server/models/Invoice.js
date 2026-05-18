import mongoose from "mongoose";

const LineItemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    taxable: { type: Boolean, default: false },
    taxRate: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    treatmentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreatmentPlan",
      index: true,
    },
    lineItems: { type: [LineItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ["percentage", "fixed", ""], default: "" },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "issued", "paid", "partially_paid", "overdue", "cancelled"],
      default: "draft",
      required: true,
      index: true,
    },
    dueDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("Invoice", InvoiceSchema);
