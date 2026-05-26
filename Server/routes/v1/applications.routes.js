import express from "express";
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
} from "../../controllers/v1/application.controller.js";

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
