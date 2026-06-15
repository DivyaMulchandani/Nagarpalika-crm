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
    qualification: { type: String, trim: true },
    required_qualifications: [
      {
        qualification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Qualification",
          required: true,
        },
        is_compulsory: { type: Boolean, default: true },
      },
    ],
    caste_certificate: {
      required: { type: Boolean, default: false },
      is_compulsory: { type: Boolean, default: false },
    },
    ph_description: { type: String, trim: true },
    experience_required: { type: String, trim: true },
    application_fee: { type: Number, default: 0 },
    start_date: { type: Date },
    end_date: { type: Date },
    probation_period: { type: String, trim: true },
    pdf_path: { type: String },
    other_conditions: { type: String },
    note: { type: String, trim: true },
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
