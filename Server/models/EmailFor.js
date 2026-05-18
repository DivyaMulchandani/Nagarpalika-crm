import mongoose from "mongoose";

const EmailForSchema = new mongoose.Schema(
  {
    emailFor: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("EmailFor", EmailForSchema);
