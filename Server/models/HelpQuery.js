import mongoose from "mongoose";

const HelpQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registration_id: { type: String, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "MasterData" },
    description: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true },
);

export default mongoose.model("HelpQuery", HelpQuerySchema);
