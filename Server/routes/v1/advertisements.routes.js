import crypto from "crypto";
import path from "path";
import fs from "fs";
import express from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleScope } from "../../middlewares/roleScope.js";
import {
  createAdvertisement,
  listAdvertisements,
  getAdvertisementById,
  getAdvertisementPdf,
  patchAdvertisement,
  patchAdvertisementStatus,
  uploadAdvertisementPdf,
  deleteAdvertisement,
  triggerZipExport,
  getZipExportStatus,
  downloadZipExport,
  searchAdvertisements,
} from "../../controllers/v1/advertisement.controller.js";

const router = express.Router();
const UPLOADS_ROOT = path.resolve("uploads");

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, "advertisements");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`);
  },
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

const handlePdfUpload = (req, res, next) => {
  pdfUpload.single("file")(req, res, (err) => {
    if (err)
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: err.message });
    next();
  });
};

const adminAuth = authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]);

// ── Public ────────────────────────────────────────────────────────────────────
router.get("/advertisements", listAdvertisements);
router.get("/advertisements/:id/pdf", getAdvertisementPdf);
router.get("/advertisements/:id", getAdvertisementById);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.post(
  "/advertisements",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  createAdvertisement,
);
router.patch("/advertisements/:id", adminAuth, roleScope, patchAdvertisement);
router.patch(
  "/advertisements/:id/status",
  adminAuth,
  roleScope,
  patchAdvertisementStatus,
);
router.post(
  "/advertisements/:id/pdf",
  adminAuth,
  roleScope,
  handlePdfUpload,
  uploadAdvertisementPdf,
);
router.delete(
  "/advertisements/:id",
  authMiddleware(["ADMIN"]),
  deleteAdvertisement,
);
router.get(
  "/advertisements/:id/zip-export",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  getZipExportStatus,
);
router.post(
  "/advertisements/:id/zip-export",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  triggerZipExport,
);
router.get(
  "/advertisements/:id/zip-export/download",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  downloadZipExport,
);

// ── Legacy ────────────────────────────────────────────────────────────────────
router.post(
  "/advertisements/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchAdvertisements,
);

export default router;
