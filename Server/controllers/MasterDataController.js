import MasterData from "../models/MasterData.js";
import { body, validationResult, param, query } from "express-validator";

export const validateMasterData = [
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .matches(/^[A-Z_]+$/)
    .withMessage("Category must be uppercase letters and underscores only"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Code is required")
    .matches(/^[A-Z0-9_]+$/)
    .withMessage(
      "Code must be uppercase alphanumeric characters and underscores only"
    ),
  body("label").trim().notEmpty().withMessage("Label is required"),
  body("description").optional().trim(),
  body("order").optional().isInt().withMessage("Order must be an integer"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("metadata").optional().isObject().withMessage("Metadata must be an object"),
];

// 1. Get all Master Data (with optional filtering)
export const getMasterData = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;

    const filter = {};
    if (category) filter.category = category.toUpperCase();
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { label: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const masterData = await MasterData.find(filter)
      .sort({ category: 1, order: 1, label: 1 })
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    res.status(200).json({
      isOk: true,
      data: masterData,
      message: "Master data retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error retrieving master data",
      error: error.message,
    });
  }
};

// 2. Get active Master Data grouped by category (for frontend dropdowns)
export const getGroupedMasterData = async (req, res) => {
  try {
    // Only get active items for dropdowns
    const masterData = await MasterData.find({ isActive: true }).sort({
      category: 1,
      order: 1,
      label: 1,
    });

    // Group by category
    const grouped = masterData.reduce((acc, curr) => {
      const cat = curr.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        _id: curr._id,
        code: curr.code,
        label: curr.label,
        metadata: curr.metadata,
      });
      return acc;
    }, {});

    res.status(200).json({
      isOk: true,
      data: grouped,
      message: "Grouped master data retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getGroupedMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error retrieving grouped master data",
      error: error.message,
    });
  }
};

// 3. Get single Master Data entry
export const getMasterDataById = async (req, res) => {
  try {
    const { id } = req.params;

    const masterData = await MasterData.findById(id)
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    if (!masterData) {
      return res.status(404).json({
        isOk: false,
        message: "Master data not found",
      });
    }

    res.status(200).json({
      isOk: true,
      data: masterData,
      message: "Master data retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getMasterDataById:", error);
    res.status(500).json({
      isOk: false,
      message: "Error retrieving master data",
      error: error.message,
    });
  }
};

// 4. Create new Master Data
export const createMasterData = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ isOk: false, errors: errors.array() });
  }

  try {
    const { category, code, label, description, order, isActive, metadata } =
      req.body;

    const uppercaseCategory = category.toUpperCase();
    const uppercaseCode = code.toUpperCase();

    // Check if code already exists in this category
    const existing = await MasterData.findOne({
      category: uppercaseCategory,
      code: uppercaseCode,
    });

    if (existing) {
      return res.status(400).json({
        isOk: false,
        message: `Code '${uppercaseCode}' already exists in category '${uppercaseCategory}'`,
      });
    }

    const userId = req.user?.userId; // Assuming authMiddleware sets req.user

    const newMasterData = new MasterData({
      category: uppercaseCategory,
      code: uppercaseCode,
      label,
      description,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      metadata: metadata || {},
      createdBy: userId,
      updatedBy: userId,
    });

    const savedMasterData = await newMasterData.save();

    res.status(201).json({
      isOk: true,
      data: savedMasterData,
      message: "Master data created successfully",
    });
  } catch (error) {
    console.error("Error in createMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error creating master data",
      error: error.message,
    });
  }
};

// 5. Update Master Data
export const updateMasterData = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ isOk: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { category, code, label, description, order, isActive, metadata } =
      req.body;

    const uppercaseCategory = category.toUpperCase();
    const uppercaseCode = code.toUpperCase();

    // Check if updating to a code that already exists (and isn't this document)
    const existing = await MasterData.findOne({
      category: uppercaseCategory,
      code: uppercaseCode,
      _id: { $ne: id },
    });

    if (existing) {
      return res.status(400).json({
        isOk: false,
        message: `Code '${uppercaseCode}' already exists in category '${uppercaseCategory}'`,
      });
    }

    const userId = req.user?.userId;

    const updatedMasterData = await MasterData.findByIdAndUpdate(
      id,
      {
        category: uppercaseCategory,
        code: uppercaseCode,
        label,
        description,
        order,
        isActive,
        metadata,
        updatedBy: userId,
      },
      { new: true, runValidators: true }
    );

    if (!updatedMasterData) {
      return res.status(404).json({
        isOk: false,
        message: "Master data not found",
      });
    }

    res.status(200).json({
      isOk: true,
      data: updatedMasterData,
      message: "Master data updated successfully",
    });
  } catch (error) {
    console.error("Error in updateMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error updating master data",
      error: error.message,
    });
  }
};

// 6. Delete Master Data
export const deleteMasterData = async (req, res) => {
  try {
    const { id } = req.params;
    
    // We do a hard delete here, but typically you might want a soft delete
    // For now, let's stick to what's common in this CMS unless specified otherwise
    const deletedMasterData = await MasterData.findByIdAndDelete(id);

    if (!deletedMasterData) {
      return res.status(404).json({
        isOk: false,
        message: "Master data not found",
      });
    }

    res.status(200).json({
      isOk: true,
      message: "Master data deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error deleting master data",
      error: error.message,
    });
  }
};

// 7. Reorder Master Data
export const reorderMasterData = async (req, res) => {
  try {
    // Expects an array of objects: [{ _id: '...', order: 1 }, { _id: '...', order: 2 }]
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        isOk: false,
        message: "Items must be an array of objects with _id and order",
      });
    }

    const userId = req.user?.userId;

    // Bulk update
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: item.order, updatedBy: userId } },
      },
    }));

    await MasterData.bulkWrite(bulkOps);

    res.status(200).json({
      isOk: true,
      message: "Master data reordered successfully",
    });
  } catch (error) {
    console.error("Error in reorderMasterData:", error);
    res.status(500).json({
      isOk: false,
      message: "Error reordering master data",
      error: error.message,
    });
  }
};
