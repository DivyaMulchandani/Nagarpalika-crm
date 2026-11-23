import crypto from "crypto";
import path from "path";
import fs from "fs";
import express from "express";
import { uploadLimits } from "../../config/portal.config.js";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import {
  submitApplication,
  getMyApplications,
  getMyApplication,
  editApplication,
  getApplicationPdf,
  listApplications,
  getApplicationForAdmin,
  exportApplications,
  updateApplicationStatus,
  searchApplications,
  uploadApplicationDocument,
  stageApplicationDocument,
  getMyEligibility,
} from "../../controllers/v1/application.controller.js";

const UPLOADS_ROOT = path.resolve("uploads");

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimits.documentMaxBytes },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase()))
      cb(null, true);
    else cb(new Error("Only PDF, JPG, and PNG files are allowed"));
  },
});

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ALLOWED_MIME_MAGIC = new Set(["application/pdf", "image/jpeg", "image/png"]);

const handleDocUpload = async (req, res, next) => {
  docUpload.single("file")(req, res, async (err) => {
    if (err) return res.status(422).json({ isOk: false, message: err.message });
    if (!req.file) return next();
    // Magic byte validation — catch renamed files (e.g. malware.php → malware.pdf)
    try {
      const type = await fileTypeFromBuffer(req.file.buffer);
      if (!type || !ALLOWED_MIME_MAGIC.has(type.mime)) {
        return res.status(422).json({
          isOk: false,
          message: "Invalid file content. Only PDF, JPG, and PNG files are permitted.",
        });
      }
    } catch {
      return res.status(422).json({ isOk: false, message: "Could not validate file type." });
    }
    next();
  });
};

const router = express.Router();

// ── Candidate ─────────────────────────────────────────────────────────────────
router.post("/applications", authMiddleware(["CANDIDATE"]), submitApplication);
// Age / education check for the apply page (the submit enforces the same).
router.get(
  "/applications/eligibility/:id",
  authMiddleware(["CANDIDATE"]),
  getMyEligibility,
);
// Document picked on the apply page — stored now, attached when the form is submitted.
router.post(
  "/applications/documents/stage",
  authMiddleware(["CANDIDATE"]),
  handleDocUpload,
  stageApplicationDocument,
);
router.get(
  "/applications/me",
  authMiddleware(["CANDIDATE"]),
  getMyApplications,
);
// Static routes before /:ref to avoid capture
router.get(
  "/applications/:ref/pdf",
  authMiddleware(["CANDIDATE"]),
  getApplicationPdf,
);
router.get(
  "/applications/:ref",
  authMiddleware(["CANDIDATE"]),
  getMyApplication,
);
router.patch(
  "/applications/:ref",
  authMiddleware(["CANDIDATE"]),
  editApplication,
);
router.post(
  "/applications/:ref/documents",
  authMiddleware(["CANDIDATE"]),
  handleDocUpload,
  uploadApplicationDocument,
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  "/applications",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  requirePermission("/applications", "read"),
  listApplications,
);
router.get(
  "/applications/admin/:ref",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  requirePermission("/applications", "read"),
  getApplicationForAdmin,
);
router.post(
  "/applications/export",
  authMiddleware(["ADMIN"]),
  exportApplications,
);

router.put(
  "/applications/:id/status",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  requirePermission("/applications", "edit"),
  updateApplicationStatus,
);
router.post(
  "/applications/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  requirePermission("/applications", "read"),
  searchApplications,
);

export default router;
