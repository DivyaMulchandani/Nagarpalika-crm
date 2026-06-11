import mongoose from "mongoose";
import Counter from "./Counter.js";

const ApplicationSchema = new mongoose.Schema(
  {
    application_ref_no: {
      type: String,
      unique: true,
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

// Generated in the same style as Advertisement.advt_no (ADV/<year>/<seq>).
// Counter key is year-scoped and distinct from the advt_no counter, so the
// two sequences can never collide. Counter.findOneAndUpdate with $inc is a
// single atomic MongoDB operation, so concurrent saves each receive a unique
// seq. The unique indexes on application_ref_no and on
// (registration_id, advt_no) are the final safety net against duplicates.
ApplicationSchema.pre("save", async function (next) {
  if (!this.application_ref_no) {
    try {
      const year = new Date().getFullYear();
      const counter = await Counter.findOneAndUpdate(
        { key: `application_ref_no:${year}` },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
      );
      this.application_ref_no = `APP/${year}/${String(counter.seq).padStart(6, "0")}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export default mongoose.model("Application", ApplicationSchema);
