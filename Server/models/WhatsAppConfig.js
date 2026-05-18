import mongoose from "mongoose";

/**
 * WhatsApp Configuration — stored in DB, managed from admin panel.
 * Single document per organization (upsert pattern).
 */
const WhatsAppConfigSchema = new mongoose.Schema(
  {
    // Meta Cloud API credentials
    apiUrl: { type: String, default: "https://graph.facebook.com/v21.0" },
    phoneNumberId: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    businessAccountId: { type: String, default: "" },
    webhookVerifyToken: { type: String, default: "hms-whatsapp-verify" },

    // Master switch
    isEnabled: { type: Boolean, default: false },

    // Default country code for phone formatting
    defaultCountryCode: { type: String, default: "91" },

    // Automated trigger toggles
    triggers: {
      appointmentReminder: { type: Boolean, default: true },
      paymentConfirmation: { type: Boolean, default: true },
      followUpReminder: { type: Boolean, default: true },
      birthdayWish: { type: Boolean, default: true },
      anniversaryWish: { type: Boolean, default: false },
      noShowFollowUp: { type: Boolean, default: true },
    },

    // Reminder timing (hours before appointment)
    reminderHoursBefore: {
      type: [Number],
      default: [24, 2], // 24h and 2h before
    },

    // Template names (Meta-approved templates)
    templates: {
      appointmentReminder: { type: String, default: "appointment_reminder" },
      paymentConfirmation: { type: String, default: "payment_confirmation" },
      followUpReminder: { type: String, default: "follow_up_reminder" },
      birthdayWish: { type: String, default: "birthday_wish" },
      anniversaryWish: { type: String, default: "anniversary_wish" },
      noShowFollowUp: { type: String, default: "no_show_follow_up" },
    },

    // Template language
    templateLanguage: { type: String, default: "en" },

    // Retry settings
    maxRetries: { type: Number, default: 3 },
    retryBackoffMinutes: { type: Number, default: 1 }, // base backoff (exponential)

    // Organization
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  {
    timestamps: true,
  }
);

// Ensure single config per organization
WhatsAppConfigSchema.index({ organizationId: 1 }, { unique: true, sparse: true });

const WhatsAppConfig = mongoose.model("WhatsAppConfig", WhatsAppConfigSchema);
export default WhatsAppConfig;
