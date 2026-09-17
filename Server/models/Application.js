import mongoose from "mongoose";
import Counter from "./Counter.js";
import { APPLICATION_STATUSES } from "../constants/applicationStatus.js";

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
      enum: APPLICATION_STATUSES,
      default: "submitted",
    },
    // Scaffold fields — finalize with municipality before launch
    exam_centre: { type: String, trim: true },
    declaration_accepted: { type: Boolean, default: false },
    experience_years: { type: Number },
    additional_fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    documents: [
      {
        label: { type: String, required: true },
        file_path: { type: String, required: true },
        is_compulsory: { type: Boolean, default: false },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],

    edit_log: [
      {
        field: { type: String },
        old_value: { type: mongoose.Schema.Types.Mixed },
        new_value: { type: mongoose.Schema.Types.Mixed },
        reason: { type: String },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        changed_by_name: { type: String },
        changed_by_role: { type: String },
        changed_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ApplicationSchema.index({ registration_id: 1, advt_no: 1 }, { unique: true });

// Splits "ADV/2026/0014" into its year and sequence. The width is deliberately
// not fixed at 4 — ADVT_NO_RE allows 1 to 8 digits — so the sequence is padded
// afterwards rather than matched rigidly.
const ADVT_NO_PARTS = /^[A-Z]{2,6}\/(\d{4})\/(\d{1,8})$/;

/**
 * Application reference: APP-<year>-<advtSeq>-<serial>, e.g. APP-2026-0014-000001.
 *
 * The serial counts within ONE advertisement, so each post gets its own
 * contiguous run starting at 1. A single global sequence interleaved the posts,
 * which meant the number told you nothing about which recruitment it belonged
 * to, gave the exam controller no contiguous range per post, and leaked total
 * cross-post volume to every applicant.
 *
 * Year comes from the advertisement, NOT the clock: a post open across New Year
 * must not issue APP-2026-… and APP-2027-… within the same recruitment.
 *
 * Hyphens only. The reference goes straight into PDF download filenames
 * ("application-<ref>.pdf"), which a "/" would break.
 *
 * Counter.findOneAndUpdate with $inc is a single atomic MongoDB operation, so
 * concurrent saves each receive a unique seq. The unique indexes on
 * application_ref_no and on (registration_id, advt_no) are the final safety net.
 */
ApplicationSchema.pre("save", async function (next) {
  if (!this.application_ref_no) {
    try {
      const parts = ADVT_NO_PARTS.exec(this.advt_no || "");

      // Per-advertisement when advt_no parses, year-scoped global when it does
      // not. A malformed advertisement number must never block a submission —
      // the candidate would lose their application over our formatting.
      const key = parts
        ? `application_ref_no:${this.advt_no}`
        : `application_ref_no:${new Date().getFullYear()}`;

      const counter = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true },
      );
      const serial = String(counter.seq).padStart(6, "0");

      this.application_ref_no = parts
        ? `APP-${parts[1]}-${parts[2].padStart(4, "0")}-${serial}`
        : `APP-${new Date().getFullYear()}-${serial}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export default mongoose.model("Application", ApplicationSchema);
