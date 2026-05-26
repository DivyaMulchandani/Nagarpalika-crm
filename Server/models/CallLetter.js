import mongoose from "mongoose";

const CallLetterSchema = new mongoose.Schema(
  {
    registration_id: {
      type: String,
      required: true,
    },
    advt_no: {
      type: String,
      required: true,
    },
    roll_number: {
      type: String,
    },
    exam_date: {
      type: Date,
    },
    exam_time: {
      type: String,
    },
    venue: {
      type: String,
    },
    reporting_instructions: { type: String },
    enabled: { type: Boolean, default: false },
    available_from: { type: Date },
    downloaded_at: { type: Date },
  },
  { timestamps: true },
);

CallLetterSchema.index({ registration_id: 1, advt_no: 1 }, { unique: true });

export default mongoose.model("CallLetter", CallLetterSchema);
