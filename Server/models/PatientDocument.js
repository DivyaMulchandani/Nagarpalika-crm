import mongoose from "mongoose";

const PatientDocumentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    storedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    mimeType: { type: String, trim: true, maxlength: 100 },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("PatientDocument", PatientDocumentSchema);
