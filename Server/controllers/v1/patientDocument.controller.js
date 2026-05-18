import fs from "fs";
import path from "path";
import Patient from "../../models/Patient.js";
import PatientDocument from "../../models/PatientDocument.js";
import MasterData from "../../models/MasterData.js";
import mongoose from "mongoose";

const safeUnlink = (relOrAbs) => {
  try {
    const abs = path.isAbsolute(relOrAbs)
      ? relOrAbs
      : path.join(process.cwd(), relOrAbs);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error("Failed to unlink file:", err);
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { categoryId } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "No file uploaded",
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      isDeleted: false,
    });
    if (!patient) {
      safeUnlink(req.file.path);
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Patient not found",
      });
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        safeUnlink(req.file.path);
        return res.status(400).json({
          isOk: false,
          status: 400,
          message: "categoryId is not a valid id",
        });
      }
      const cat = await MasterData.findById(categoryId).lean();
      if (!cat || cat.category !== "FILE_UPLOAD_CATEGORY") {
        safeUnlink(req.file.path);
        return res.status(400).json({
          isOk: false,
          status: 400,
          message: "categoryId must reference FILE_UPLOAD_CATEGORY",
        });
      }
    }

    const doc = await PatientDocument.create({
      patientId,
      categoryId: categoryId || undefined,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      filePath: req.file.path.replace(/\\/g, "/"),
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?.id || null,
    });

    const populated = await PatientDocument.findById(doc._id)
      .populate("categoryId")
      .populate("uploadedBy", "employeeName emailOffice");

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Document uploaded successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    if (req.file) safeUnlink(req.file.path);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;

    const docs = await PatientDocument.find({
      patientId,
      isDeleted: false,
    })
      .populate("categoryId")
      .populate("uploadedBy", "employeeName emailOffice")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: docs,
    });
  } catch (error) {
    console.error("Error in listDocuments:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: error.message,
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const doc = await PatientDocument.findOne({
      _id: documentId,
      isDeleted: false,
    });
    if (!doc) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Document not found",
      });
    }

    doc.isDeleted = true;
    await doc.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Document removed successfully",
    });
  } catch (error) {
    console.error("Error in deleteDocument:", error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
    });
  }
};
