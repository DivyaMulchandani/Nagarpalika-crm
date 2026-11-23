import mongoose from "mongoose";
import Counter from "./Counter.js";

const AdvertisementSchema = new mongoose.Schema(
  {
    advt_no: {
      type: String,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    post_title: {
      en: { type: String, required: true, trim: true },
      gu: { type: String, trim: true },
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    class: {
      type: String,
      enum: ["I", "II", "III", "IV"],
      required: true,
    },
    pay_scale: { type: String, trim: true },
    // Single total — category bifurcation (SC/ST/OBC/...) was removed.
    // Mixed (not Number) so legacy documents holding the old {total, general,
    // ...} object still load; normalizeVacancies() in the controller converts
    // any incoming value to a plain number.
    vacancies: { type: mongoose.Schema.Types.Mixed, default: 0 },
    age_limit: {
      min: { type: Number },
      max: { type: Number },
    },
    // Shown to candidates as the qualification description (e.g. "B.E. Civil
    // from a recognised university"). The enforced rule is min_education.
    qualification: { type: String, trim: true },
    // Lowest education a candidate must hold (an education entry with a level).
    // Candidates whose highest qualification ranks below it cannot apply.
    min_education: { type: mongoose.Schema.Types.ObjectId, ref: "Qualification" },
    required_qualifications: [
      {
        qualification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Qualification",
          required: true,
        },
        is_compulsory: { type: Boolean, default: true },
        // compulsory | optional upload; declaration = the candidate may instead
        // declare they will obtain it (e.g. CCC within the probation period).
        requirement: {
          type: String,
          enum: ["compulsory", "optional", "declaration"],
        },
        instruction: { type: String, trim: true, maxlength: 300 },
      },
    ],
    // Age is counted in completed years as on the last date of application.
    age_relaxation: {
      enabled: { type: Boolean, default: false },
      rules: [
        {
          group: {
            type: String,
            enum: ["SC", "ST", "OBC", "EWS", "Female", "PH", "ExServiceman"],
          },
          years: { type: Number, min: 0, max: 30 },
        },
      ],
      // add: relaxations for every group the candidate is in are added up;
      // highest: only the largest one applies.
      combine: { type: String, enum: ["add", "highest"], default: "add" },
      // Upper age after relaxation may not exceed this (blank = no cap).
      max_age_cap: { type: Number, min: 0, max: 100 },
      notes: { type: String, trim: true, maxlength: 1000 },
    },
    caste_certificate: {
      required: { type: Boolean, default: false },
      is_compulsory: { type: Boolean, default: false },
    },
    ph_description: { type: String, trim: true },
    experience_required: { type: String, trim: true },
    // Full fee — paid by unreserved (General) male candidates.
    application_fee: { type: Number, default: 0 },
    // Concessional fee — paid by everyone else (reserved categories and all
    // non-male candidates). Left unset means a single-fee advertisement where
    // everyone pays application_fee, so existing records need no migration.
    application_fee_concessional: { type: Number },
    start_date: { type: Date },
    end_date: { type: Date },
    probation_period: { type: String, trim: true },
    pdf_path: { type: String },
    other_conditions: { type: String },
    note: { type: String, trim: true },
    enforce_reservation_rules: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["Draft", "Published", "Closed", "Archived"],
      default: "Draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    zip_export: {
      status: {
        type: String,
        enum: ["idle", "processing", "ready", "failed"],
        default: "idle",
      },
      requested_at: { type: Date },
      ready_at: { type: Date },
      file_path: { type: String },
      expires_at: { type: Date },
    },
  },
  { timestamps: true },
);

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-");

AdvertisementSchema.pre("save", async function (next) {
  if (!this.advt_no) {
    const counter = await Counter.findOneAndUpdate(
      { key: "advt_no" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const year = new Date().getFullYear();
    this.advt_no = `ADV/${year}/${String(counter.seq).padStart(4, "0")}`;
  }
  if (!this.slug && this.post_title?.en) {
    const base = toSlug(this.post_title.en);
    const seq = this.advt_no
      ? this.advt_no.replace(/\//g, "-").toLowerCase()
      : String(Date.now());
    this.slug = `${base}-${seq}`;
  }
  next();
});

export default mongoose.model("Advertisement", AdvertisementSchema);
