import mongoose from "mongoose";

const EmailTemplateSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: true,
    },
    emailFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailSetup",
      required: true,
    },
    emailFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailFor",
      required: true,
    },
    mailerName: {
      type: String,
      required: true,
    },
    emailCC: {
      type: String,
      required: false,
      default: "",
    },
    emailBCC: {
      type: String,
      required: false,
      default: "",
    },
    emailSubject: {
      type: String,
      required: true,
    },
    emailSignature: {
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

export default mongoose.model("EmailTemplate", EmailTemplateSchema);
