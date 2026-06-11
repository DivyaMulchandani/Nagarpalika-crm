import mongoose from "mongoose";
import Counter from "./Counter.js";

const addressFields = {
  line1: { type: String, trim: true },
  line2: { type: String, trim: true },
  taluka: { type: String, trim: true },
  district: { type: String, trim: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
  pincode: { type: String, trim: true },
};

const CandidateSchema = new mongoose.Schema(
  {
    registration_id: {
      type: String,
      unique: true,
    },
    aadhaar_hash: {
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    father_husband_name: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, trim: true },
    category: { type: String, trim: true },
    nationality: { type: String, trim: true },
    religion: { type: String, trim: true },
    address_permanent: {
      type: new mongoose.Schema(addressFields, { _id: false }),
    },
    address_current: {
      type: new mongoose.Schema(
        {
          same_as_permanent: { type: Boolean, default: false },
          ...addressFields,
        },
        { _id: false },
      ),
    },
    mobile: { type: String, trim: true },
    mobile_verified: { type: Boolean, default: false },
    alternate_mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    email_verified: { type: Boolean, default: false },
    marital_status: { type: String, trim: true },
    ph_status: { type: Boolean, default: false },
    ph_type: { type: String, trim: true },
    ph_percentage: { type: Number },
    ex_serviceman: { type: Boolean, default: false },
    qualification: { type: String, trim: true },
    languages: [
      {
        language: { type: String, trim: true },
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false },
        speak: { type: Boolean, default: false },
      },
    ],
    mother_tongue: { type: String, trim: true },
    photo_path: { type: String },
    signature_path: { type: String },
    caste_cert_no: { type: String, trim: true },
    caste_cert_path: { type: String },
    udid_cert_path: { type: String },
    password: { type: String, required: true },
    otr_status: {
      type: String,
      enum: ["incomplete", "complete"],
      default: "incomplete",
    },
    edit_window_expires_at: { type: Date },
    login_attempts: { type: Number, default: 0 },
    lockout_until: { type: Date },
  },
  { timestamps: true },
);

CandidateSchema.index({ aadhaar_hash: 1 }, { unique: true });
CandidateSchema.index({ mobile: 1 }, { unique: true, sparse: true });

CandidateSchema.pre("save", async function (next) {
  if (!this.registration_id) {
    const counter = await Counter.findOneAndUpdate(
      { key: "registration_id" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const year = new Date().getFullYear();
    this.registration_id = `OTR${year}${String(counter.seq).padStart(7, "0")}`;
  }
  next();
});

export default mongoose.model("Candidate", CandidateSchema);
