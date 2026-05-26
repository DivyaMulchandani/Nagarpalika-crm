import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const NoticeSchema = new mongoose.Schema(
  {
    notice_id: {
      type: String,
      unique: true,
      default: uuidv4,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
    },
    pdf_path: {
      type: String,
    },
    type: {
      type: String,
      enum: ["notice", "circular", "press", "recruitment", "tender"],
      required: true,
    },
    publish_date: {
      type: Date,
    },
    expiry_date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "published", "unpublished"],
      default: "draft",
    },
    is_important_instruction: {
      type: Boolean,
      default: false,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Notice", NoticeSchema);
