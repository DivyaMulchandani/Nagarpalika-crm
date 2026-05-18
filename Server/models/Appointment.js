import mongoose from "mongoose";

const VitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, trim: true },
    pulseRate: { type: Number },
    temperature: { type: Number },
    spO2: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bloodSugar: { type: Number },
  },
  { _id: false },
);

const DiagnosisSchema = new mongoose.Schema(
  {
    diagnosisId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const ProcedureSchema = new mongoose.Schema(
  {
    procedureId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    quantity: { type: Number, default: 1, min: 1 },
    cost: { type: Number, default: 0, min: 0 },
    toothNumber: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const PrescriptionSchema = new mongoose.Schema(
  {
    medicineName: { type: String, trim: true },
    dosage: { type: String, trim: true },
    dosageUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    frequencyId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    duration: { type: Number },
    durationUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    instructions: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const ClinicalNoteSchema = new mongoose.Schema(
  {
    noteTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    content: { type: String, trim: true, maxlength: 5000 },
  },
  { _id: false },
);

const AttachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true },
    filePath: { type: String, trim: true },
    fileType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AppointmentSchema = new mongoose.Schema(
  {
    // Scheduling
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, trim: true },
    slotDuration: { type: Number },

    // References
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
    parentAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    treatmentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreatmentPlan",
    },

    // Classification
    appointmentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    appointmentSourceId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    isEmergency: { type: Boolean, default: false },
    isWalkIn: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "arrived",
        "in_consultation",
        "completed",
        "checked_out",
        "follow_up_planned",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      default: "scheduled",
      required: true,
      index: true,
    },

    // Clinical Data
    chiefComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: "MasterData" }],
    vitals: { type: VitalsSchema, default: () => ({}) },
    diagnosis: { type: [DiagnosisSchema], default: [] },
    procedures: { type: [ProcedureSchema], default: [] },
    prescriptions: { type: [PrescriptionSchema], default: [] },
    clinicalNotes: { type: [ClinicalNoteSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },

    // Follow-Up Suggestion
    nextAppointmentDate: { type: Date },
    nextAppointmentReason: { type: String, trim: true, maxlength: 500 },
    nextAppointmentNotes: { type: String, trim: true, maxlength: 1000 },
    nextAppointmentUrgency: {
      type: String,
      enum: ["routine", "soon", "urgent"],
      default: "routine",
    },
    followUpStatus: {
      type: String,
      enum: ["pending", "confirmed", "rescheduled", "cancelled"],
    },

    // Billing
    totalCost: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ["percentage", "fixed", ""], default: "" },
    discountValue: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, default: 0, min: 0 },

    // Cancellation
    cancellationReasonId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    cancellationNotes: { type: String, trim: true, maxlength: 1000 },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    cancelledAt: { type: Date },

    // Transfer
    transferredToDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    transferReason: { type: String, trim: true, maxlength: 1000 },
    transferredAt: { type: Date },

    // Follow-Up Doctor Assignment
    nextAppointmentDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },

    // WhatsApp
    reminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date },
    reminderDeliveryStatus: { type: String, trim: true },

    // Audit
    isActive: { type: Boolean, default: true, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

AppointmentSchema.index({ appointmentDate: 1, doctorId: 1 });
AppointmentSchema.index({ patientId: 1, appointmentDate: -1 });
AppointmentSchema.index({ status: 1, appointmentDate: 1 });

export default mongoose.model("Appointment", AppointmentSchema);
