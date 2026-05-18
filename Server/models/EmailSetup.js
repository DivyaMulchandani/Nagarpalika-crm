import mongoose from "mongoose";

const EmailSetupSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    appPassword: {
      type: String,
      required: true,
      select: false,
    },
    SSL: {
      type: Boolean,
      default: true,
      required: true,
    },
    port: {
      type: Number,
      required: true,
    },
    host: {
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

EmailSetupSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.appPassword;
    return ret;
  },
});

export default mongoose.model("EmailSetup", EmailSetupSchema);
