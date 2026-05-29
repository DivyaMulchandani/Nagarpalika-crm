import mongoose from "mongoose";

const masterDataSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category is required"],
      index: true,
      // e.g., 'GENDER', 'BLOOD_GROUP', 'DIAGNOSIS', 'PROCEDURE', 'PAYMENT_METHOD'
    },
    code: {
      type: String,
      required: [true, "Code is required"],
      uppercase: true,
      trim: true,
      // e.g., 'MALE', 'A_POS', 'ROOT_CANAL'
    },
    label: {
      type: String,
      required: [true, "Label is required"],
      // e.g., 'Male', 'A+', 'Root Canal Treatment'
    },
    description: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      // Used for category-specific fields, e.g.:
      // { defaultCost: 500 } for Procedures
      // { taxRate: 18 } for Tax Rates
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  {
    timestamps: true,
  }
);

// Ensure code is unique within a category
masterDataSchema.index({ category: 1, code: 1 }, { unique: true });

const MasterData = mongoose.model("MasterData", masterDataSchema);

export default MasterData;
