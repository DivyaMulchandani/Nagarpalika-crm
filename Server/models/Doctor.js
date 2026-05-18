import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema(
  {
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorCode: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
    },
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    qualifications: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
    },
    consultationFee: {
      type: Number,
      default: 0,
    },
    followUpFee: {
      type: Number,
      default: 0,
    },
    slotDurationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterData",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Doctor", DoctorSchema);
