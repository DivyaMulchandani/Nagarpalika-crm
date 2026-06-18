import crypto from "crypto";
import path from "path";
import fs from "fs";
import express from "express";
import { uploadLimits } from "../../config/portal.config.js";
import multer from "multer";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
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

const handleDocUpload = (req, res, next) => {
  docUpload.single("file")(req, res, (err) => {
    if (err) return res.status(422).json({ isOk: false, message: err.message });
    next();
  });
};

const router = express.Router();

// ── Candidate ─────────────────────────────────────────────────────────────────
router.post("/applications", authMiddleware(["CANDIDATE"]), submitApplication);
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
  listApplications,
);
router.get(
  "/applications/admin/:ref",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  getApplicationForAdmin,
);
router.post(
  "/applications/export",
  authMiddleware(["ADMIN"]),
  exportApplications,
);

// ── Legacy ────────────────────────────────────────────────────────────────────
router.put(
  "/applications/:id/status",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  updateApplicationStatus,
);
router.post(
  "/applications/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchApplications,
);

export default router;
