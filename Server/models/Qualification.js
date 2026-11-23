import mongoose from "mongoose";

const QualificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    // education  — shown in OTR "Highest Qualification"; ranked by level
    // certificate — CCC, typing, licences… asked for per advertisement only
    // document    — any other paper an advertisement may ask for
    type: {
      type: String,
      enum: ["education", "certificate", "document"],
      default: "education",
    },
    // Education only: higher number = higher qualification (set by the admin
    // as instructed by the authority, e.g. 10th = 1, 12th = 2, Graduation = 3).
    // Eligibility compares these numbers.
    level: { type: Number, min: 0, max: 99 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("Qualification", QualificationSchema);
