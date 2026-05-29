import express from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  checkEligibility,
  listCallLetters,
  downloadCallLetter,
  patchCallLetter,
  uploadRollNumbers,
  previewCallLetter,
  searchCallLetters,
} from "../../controllers/v1/callLetter.controller.js";

const router = express.Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ── Public ────────────────────────────────────────────────────────────────────
router.post("/call-letters/list", listCallLetters);
router.post("/call-letters/check", checkEligibility);

// ── Token-gated download (no session) ────────────────────────────────────────
router.post("/call-letters/:advt_no/download", downloadCallLetter);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch(
  "/call-letters/:advt_no",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patchCallLetter,
);
router.post(
  "/call-letters/:advt_no/roll-numbers",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  csvUpload.single("file"),
  uploadRollNumbers,
);
router.get(
  "/call-letters/:advt_no/preview",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  previewCallLetter,
);

// ── Legacy ────────────────────────────────────────────────────────────────────
router.post(
  "/call-letters/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchCallLetters,
);

export default router;
