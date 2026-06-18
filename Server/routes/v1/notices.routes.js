import crypto from "crypto";
import express from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createNotice,
  listNotices,
  getNoticeById,
  getNoticePdf,
  patchNotice,
  patchNoticeStatus,
  uploadNoticePdf,
  deleteNotice,
  searchNotices,
} from "../../controllers/v1/notice.controller.js";

const router = express.Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
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

// ── Public ────────────────────────────────────────────────────────────────────
router.get("/notices", listNotices);
router.get("/notices/:id/pdf", getNoticePdf);
router.get("/notices/:id", getNoticeById);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.post("/notices", authMiddleware(["ADMIN", "EMPLOYEE"]), createNotice);
router.patch(
  "/notices/:id",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patchNotice,
);
router.patch(
  "/notices/:id/status",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patchNoticeStatus,
);
router.post(
  "/notices/:id/pdf",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  handlePdfUpload,
  uploadNoticePdf,
);
router.delete("/notices/:id", authMiddleware(["ADMIN"]), deleteNotice);

// ── Legacy ────────────────────────────────────────────────────────────────────
router.post(
  "/notices/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchNotices,
);

export default router;
