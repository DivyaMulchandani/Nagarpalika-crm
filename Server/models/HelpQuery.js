import mongoose from "mongoose";

const HelpQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    registration_id: { type: String, trim: true },
    category: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true },
);

export default mongoose.model("HelpQuery", HelpQuerySchema);
