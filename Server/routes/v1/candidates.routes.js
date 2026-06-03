import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createSecureImageUpload,
  createSecureUpload,
} from "../../middlewares/secureUpload.js";
import {
  loginCandidate,
  logoutCandidate,
  resetCandidatePassword,
  getMyProfile,
  editCandidate,
  updateMyProfile,
  findCandidate,
  getCandidateById,
  searchCandidates,
  exportCandidates,
} from "../../controllers/v1/candidate.controller.js";
import {
  initRegistration,
  saveStep,
  uploadPhoto,
  uploadSignature,
  uploadCasteCert,
  uploadUdidCert,
  submitRegistration,
  resumeRegistration,
} from "../../controllers/v1/candidateRegistration.controller.js";

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/candidates/auth/login", loginCandidate);
router.post(
  "/candidates/auth/logout",
  authMiddleware(["CANDIDATE"]),
  logoutCandidate,
);
router.post("/candidates/auth/password/reset", resetCandidatePassword);

// ── Registration (multi-step) ─────────────────────────────────────────────────
router.post("/candidates/register/init", initRegistration);
router.post("/candidates/register/step", saveStep);
router.post(
  "/candidates/register/photo",
  createSecureImageUpload({
    fieldName: "photo",
    destination: "uploads/candidates",
  }),
  uploadPhoto,
);
router.post(
  "/candidates/register/signature",
  createSecureImageUpload({
    fieldName: "signature",
    destination: "uploads/candidates",
  }),
  uploadSignature,
);
router.post(
  "/candidates/register/caste-cert",
  createSecureUpload({
    fieldName: "caste_cert",
    destination: "uploads/candidates",
  }),
  uploadCasteCert,
);
router.post(
  "/candidates/register/udid-cert",
  createSecureUpload({
    fieldName: "udid_cert",
    destination: "uploads/candidates",
  }),
  uploadUdidCert,
);
router.post("/candidates/register/submit", submitRegistration);
router.get("/candidates/register/resume", resumeRegistration);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/candidates/me", authMiddleware(["CANDIDATE"]), getMyProfile);
router.patch("/candidates/me", authMiddleware(["CANDIDATE"]), editCandidate);
router.put("/candidates/me", authMiddleware(["CANDIDATE"]), updateMyProfile);

// ── Find (public — enumeration-safe) ─────────────────────────────────────────
router.post("/candidates/find", findCandidate);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  "/candidates",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchCandidates,
);
router.post(
  "/candidates/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  searchCandidates,
);
router.post("/candidates/export", authMiddleware(["ADMIN"]), exportCandidates);
router.get(
  "/candidates/:id",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  getCandidateById,
);

export default router;
