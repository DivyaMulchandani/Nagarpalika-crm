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
  uploadProfilePhoto,
  uploadProfileSignature,
  uploadProfileCasteCert,
  findCandidate,
  getCandidateById,
  searchCandidates,
  exportCandidates,
  exportCandidatesZip,
} from "../../controllers/v1/candidate.controller.js";
import {
  initRegistration,
  verifyAadhaar,
  verifyMobile,
  saveStep,
  uploadPhoto,
  uploadSignature,
  uploadCasteCert,
  uploadUdidCert,
  submitRegistration,
  resumeRegistration,
} from "../../controllers/v1/candidateRegistration.controller.js";
import { uploadLimits } from "../../config/portal.config.js";

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
router.post("/candidates/verify/aadhaar", verifyAadhaar);
router.post("/candidates/verify/mobile", verifyMobile);
router.post("/candidates/register/init", initRegistration);
router.post("/candidates/register/step", saveStep);
router.post(
  "/candidates/register/photo",
  createSecureImageUpload({
    fieldName: "photo",
    destination: "uploads/candidates",
    maxSize: uploadLimits.photoMaxBytes,
  }),
  uploadPhoto,
);
router.post(
  "/candidates/register/signature",
  createSecureImageUpload({
    fieldName: "signature",
    destination: "uploads/candidates",
    maxSize: uploadLimits.signatureMaxBytes,
  }),
  uploadSignature,
);
router.post(
  "/candidates/register/caste-cert",
  createSecureUpload({
    fieldName: "caste_cert",
    destination: "uploads/candidates",
    maxSize: uploadLimits.documentMaxBytes,
  }),
  uploadCasteCert,
);
router.post(
  "/candidates/register/udid-cert",
  createSecureUpload({
    fieldName: "udid_cert",
    destination: "uploads/candidates",
    maxSize: uploadLimits.documentMaxBytes,
  }),
  uploadUdidCert,
);
router.post("/candidates/register/submit", submitRegistration);
router.get("/candidates/register/resume", resumeRegistration);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/candidates/me", authMiddleware(["CANDIDATE"]), getMyProfile);
router.patch("/candidates/me", authMiddleware(["CANDIDATE"]), editCandidate);
router.put("/candidates/me", authMiddleware(["CANDIDATE"]), updateMyProfile);
router.post(
  "/candidates/me/photo",
  authMiddleware(["CANDIDATE"]),
  createSecureImageUpload({
    fieldName: "photo",
    destination: "uploads/candidates",
    maxSize: uploadLimits.photoMaxBytes,
  }),
  uploadProfilePhoto,
);
router.post(
  "/candidates/me/signature",
  authMiddleware(["CANDIDATE"]),
  createSecureImageUpload({
    fieldName: "signature",
    destination: "uploads/candidates",
    maxSize: uploadLimits.signatureMaxBytes,
  }),
  uploadProfileSignature,
);
router.post(
  "/candidates/me/caste-cert",
  authMiddleware(["CANDIDATE"]),
  createSecureUpload({
    fieldName: "caste_cert",
    destination: "uploads/candidates",
    maxSize: uploadLimits.documentMaxBytes,
  }),
  uploadProfileCasteCert,
);

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
router.post(
  "/candidates/export-zip",
  authMiddleware(["ADMIN"]),
  exportCandidatesZip,
);
router.get(
  "/candidates/:id",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  getCandidateById,
);

export default router;
