import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    dosageUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    frequencyId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    duration: { type: Number },
    durationUnitId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    instructions: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const PrescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
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
    medicines: [MedicineSchema],
    notes: { type: String, trim: true, maxlength: 5000 },
    prescriptionDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  {
    timestamps: true,
  },
);

// Compound index for quick lookup by appointment
PrescriptionSchema.index({ appointmentId: 1, isActive: 1 });

const Prescription = mongoose.model("Prescription", PrescriptionSchema);

export default Prescription;
