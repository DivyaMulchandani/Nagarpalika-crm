import mongoose from "mongoose";

const WhatsAppMessageSchema = new mongoose.Schema(
  {
    // Generic recipient reference (Phase 1: will ref Candidate model)
    recipientId: { type: mongoose.Schema.Types.ObjectId, default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // Recipient
    recipientPhone: { type: String, required: true },
    recipientName: { type: String },

    // Message Details
    triggerType: {
      type: String,
      required: true,
      enum: [
        "otp_aadhaar",
        "otp_phone",
        "otp_email",
        "registration_id_issued",
        "application_submitted",
        "fee_payment_receipt",
        "call_letter_published",
        "bulk_export_ready",
        "custom",
        "bulk_broadcast",
      ],
    },
    templateName: { type: String }, // Meta-approved template name
    templateLanguage: { type: String, default: "en" },
    templateParams: [{ type: String }], // Template variable values
    messageBody: { type: String }, // Rendered or freeform message content

    // Meta API Response
    metaMessageId: { type: String }, // wamid from Meta API
    deliveryStatus: {
      type: String,
      enum: ["queued", "sent", "delivered", "read", "failed"],
      default: "queued",
    },
    errorMessage: { type: String },
    errorCode: { type: String },

    // Timestamps from Meta webhooks
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },

    // Retry tracking
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: { type: Date },

    // Opt-out
    isOptedOut: { type: Boolean, default: false },

    // Organization
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

WhatsAppMessageSchema.index({ recipientId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ deliveryStatus: 1 });
WhatsAppMessageSchema.index({ triggerType: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ metaMessageId: 1 });

const WhatsAppMessage = mongoose.model("WhatsAppMessage", WhatsAppMessageSchema);
export default WhatsAppMessage;
