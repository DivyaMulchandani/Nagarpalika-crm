import mongoose from "mongoose";

const WhatsAppConfigSchema = new mongoose.Schema(
  {
    phoneNumberId: { type: String, trim: true },
    businessAccountId: { type: String, trim: true },
    accessToken: { type: String },
    otpTemplateName: { type: String, default: "otp_verification" },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true },
);

export default mongoose.model("WhatsAppConfig", WhatsAppConfigSchema);
