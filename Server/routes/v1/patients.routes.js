import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createPatient,
  quickCreatePatient,
  updatePatient,
  deletePatient,
  restorePatient,
  getPatientById,
  listPatients,
  listPatientsByParams,
  duplicateCheck,
} from "../../controllers/v1/patient.controller.js";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
} from "../../controllers/v1/patientDocument.controller.js";
import {
  createPatientValidation,
  updatePatientValidation,
  quickCreatePatientValidation,
  patientSearchValidation,
  patientIdParamValidation,
  documentIdParamValidation,
  duplicateCheckValidation,
  documentUploadFieldValidation,
  allowOnlyFields,
  allowedPatientFields,
  allowedQuickPatientFields,
  allowedPatientSearchFields,
} from "../../middlewares/inputValidator.js";
import {
  createSecureUpload,
  ALLOWED_MIMES,
  ALLOWED_EXTENSIONS,
  FILE_SIZE_LIMITS,
} from "../../middlewares/secureUpload.js";

const router = express.Router();

const patientDocumentUpload = createSecureUpload({
  destination: "uploads/patients",
  fieldName: "document",
  maxSize: FILE_SIZE_LIMITS.document,
  allowedMimes: ALLOWED_MIMES.all,
  allowedExts: ALLOWED_EXTENSIONS.all,
});

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Create a new patient (full intake)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Patient created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/patients",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  allowOnlyFields(allowedPatientFields),
  createPatientValidation,
  createPatient,
);

/**
 * @swagger
 * /patients/quick:
 *   post:
 *     summary: Quick create patient (name + mobile + gender)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Patient created (status=partial)
 */
router.post(
  "/patients/quick",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  allowOnlyFields(allowedQuickPatientFields),
  quickCreatePatientValidation,
  quickCreatePatient,
);

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: List active patients (lightweight)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.get("/patients", authMiddleware(["ADMIN", "EMPLOYEE"]), listPatients);

/**
 * @swagger
 * /patients/search:
 *   post:
 *     summary: Search patients with pagination, supports isDeleted filter (Trash)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/patients/search",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  allowOnlyFields(allowedPatientSearchFields),
  patientSearchValidation,
  listPatientsByParams,
);

/**
 * @swagger
 * /patients/duplicate-check:
 *   get:
 *     summary: Check for duplicate patient by mobile + name
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/patients/duplicate-check",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  duplicateCheckValidation,
  duplicateCheck,
);

/**
 * @swagger
 * /patients/{patientId}:
 *   get:
 *     summary: Get patient by ID (full populate + computed age)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/patients/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParamValidation,
  getPatientById,
);

/**
 * @swagger
 * /patients/{patientId}:
 *   put:
 *     summary: Update patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/patients/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  allowOnlyFields(allowedPatientFields),
  updatePatientValidation,
  updatePatient,
);

/**
 * @swagger
 * /patients/{patientId}:
 *   delete:
 *     summary: Soft-delete patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/patients/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParamValidation,
  deletePatient,
);

/**
 * @swagger
 * /patients/{patientId}/restore:
 *   post:
 *     summary: Restore a soft-deleted patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/patients/:patientId/restore",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParamValidation,
  restorePatient,
);

/**
 * @swagger
 * /patients/{patientId}/documents:
 *   get:
 *     summary: List patient documents
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/patients/:patientId/documents",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParamValidation,
  listDocuments,
);

/**
 * @swagger
 * /patients/{patientId}/documents:
 *   post:
 *     summary: Upload a patient document (PDF or image)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/patients/:patientId/documents",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientDocumentUpload,
  documentUploadFieldValidation,
  uploadDocument,
);

/**
 * @swagger
 * /patients/documents/{documentId}:
 *   delete:
 *     summary: Soft-delete a patient document
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/patients/documents/:documentId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  documentIdParamValidation,
  deleteDocument,
);

export default router;
