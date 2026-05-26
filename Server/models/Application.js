import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const ApplicationSchema = new mongoose.Schema(
  {
    application_ref_no: {
      type: String,
      unique: true,
      default: uuidv4,
    },
    registration_id: {
      type: String,
      required: true,
    },
    advt_no: {
      type: String,
      required: true,
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "shortlisted",
        "rejected",
        "selected",
      ],
      default: "submitted",
    },
    // Scaffold fields — finalize with municipality before launch
    exam_centre: { type: String, trim: true },
    declaration_accepted: { type: Boolean, default: false },
    experience_years: { type: Number },
    additional_fields: { type: mongoose.Schema.Types.Mixed, default: {} },

    edit_log: [
      {
        field: { type: String },
        old_value: { type: mongoose.Schema.Types.Mixed },
        new_value: { type: mongoose.Schema.Types.Mixed },
        changed_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ApplicationSchema.index({ registration_id: 1, advt_no: 1 }, { unique: true });

export default mongoose.model("Application", ApplicationSchema);
