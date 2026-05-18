import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    procedureId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    procedureName: { type: String, trim: true },
    estimatedCost: { type: Number, default: 0, min: 0 },
    suggestedDate: { type: Date },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "skipped"],
      default: "pending",
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
);

const TreatmentPlanSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ["proposed", "accepted", "in_progress", "completed", "rejected"],
      default: "proposed",
      required: true,
      index: true,
    },
    milestones: { type: [MilestoneSchema], default: [] },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },
    totalActualCost: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("TreatmentPlan", TreatmentPlanSchema);
