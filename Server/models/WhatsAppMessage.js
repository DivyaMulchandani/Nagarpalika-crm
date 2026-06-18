import mongoose from "mongoose";

const WhatsAppMessageSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, trim: true },
    messageBody: { type: String },
    templateName: { type: String },
    trigger: {
      type: String,
      enum: [
        "otp_registration",
        "otp_login",
        "otp_password_reset",
        "custom",
        "bulk_broadcast",
        "appointment_reminder",
        "payment_confirmation",
        "follow_up_reminder",
        "birthday_wish",
        "anniversary_wish",
        "no_show_follow_up",
      ],
      default: "custom",
    },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "read", "failed"],
      default: "queued",
    },
    channel: { type: String, enum: ["whatsapp", "sms", "email"], default: "whatsapp" },
    externalId: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

WhatsAppMessageSchema.index({ createdAt: -1 });
WhatsAppMessageSchema.index({ status: 1, trigger: 1 });

export default mongoose.model("WhatsAppMessage", WhatsAppMessageSchema);
