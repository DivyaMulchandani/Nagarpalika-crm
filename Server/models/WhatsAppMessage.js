import mongoose from "mongoose";

const WhatsAppMessageSchema = new mongoose.Schema(
  {
    // References
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // Recipient
    recipientPhone: { type: String, required: true },
    recipientName: { type: String },

    // Message Details
    triggerType: {
      type: String,
      required: true,
      enum: [
        "appointment_reminder",
        "payment_confirmation",
        "follow_up_reminder",
        "birthday_wish",
        "anniversary_wish",
        "no_show_follow_up",
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

WhatsAppMessageSchema.index({ patientId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ deliveryStatus: 1 });
WhatsAppMessageSchema.index({ triggerType: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ metaMessageId: 1 });

const WhatsAppMessage = mongoose.model("WhatsAppMessage", WhatsAppMessageSchema);
export default WhatsAppMessage;
