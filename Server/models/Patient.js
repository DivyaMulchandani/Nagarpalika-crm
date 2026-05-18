import mongoose from "mongoose";

const AllergySchema = new mongoose.Schema(
  {
    allergyTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false },
);

const AddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, maxlength: 255 },
    line2: { type: String, trim: true, maxlength: 255 },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    pincode: { type: String, trim: true, maxlength: 10 },
  },
  { _id: false },
);

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    relationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    phone: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const PatientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    titleId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: { type: String, trim: true, maxlength: 100 },
    dateOfBirth: { type: Date },
    genderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
      required: true,
    },
    bloodGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    maritalStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    occupationId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    alternateMobile: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    address: { type: AddressSchema, default: () => ({}) },
    idProofTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    idProofNumber: { type: String, trim: true, maxlength: 50 },
    allergies: { type: [AllergySchema], default: [] },
    medicalHistory: { type: String, maxlength: 5000 },
    currentMedications: { type: String, maxlength: 5000 },
    weddingAnniversary: { type: Date },
    emergencyContact: { type: EmergencyContactSchema, default: () => ({}) },
    referralSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    referredByPatient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    referredByDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    registrationDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["partial", "active", "inactive"],
      default: "partial",
      required: true,
    },
    notes: { type: String, maxlength: 5000 },
    isActive: { type: Boolean, default: true, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

PatientSchema.index({ mobileNumber: 1, isDeleted: 1 });

export default mongoose.model("Patient", PatientSchema);
