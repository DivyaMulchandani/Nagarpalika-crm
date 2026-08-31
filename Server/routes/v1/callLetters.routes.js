import express from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  checkEligibility,
  listCallLetters,
  downloadCallLetter,
  getCallLetterSettings,
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

// ── Legacy Search ─────────────────────────────────────────────────────────────
router.post(
  "/call-letters/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchCallLetters,
);

// ── Sub-path actions with multi-segment advt_no support (e.g. ADV/2026/0019) ─
router.post("/call-letters/:advt_no(*)/download", downloadCallLetter);
router.post(
  "/call-letters/:advt_no(*)/roll-numbers",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  csvUpload.single("file"),
  uploadRollNumbers,
);
router.post(
  "/call-letters/:advt_no(*)/preview",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  previewCallLetter,
);

// ── Admin settings CRUD for advt_no ───────────────────────────────────────────
router.get(
  "/call-letters/:advt_no(*)",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  getCallLetterSettings,
);
router.patch(
  "/call-letters/:advt_no(*)",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patchCallLetter,
);

export default router;
