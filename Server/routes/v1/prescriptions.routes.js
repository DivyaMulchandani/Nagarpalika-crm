import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createPrescription,
  getPrescriptionById,
  getPrescriptionsByAppointment,
  getPrescriptionsByPatient,
  updatePrescription,
  deletePrescription,
} from "../../controllers/v1/prescription.controller.js";

const router = express.Router();

router.post(
  "/prescriptions",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  createPrescription,
);

router.get(
  "/prescriptions/appointment/:appointmentId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getPrescriptionsByAppointment,
);

router.get(
  "/prescriptions/patient/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getPrescriptionsByPatient,
);

router.get(
  "/prescriptions/:prescriptionId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getPrescriptionById,
);

router.put(
  "/prescriptions/:prescriptionId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  updatePrescription,
);

router.delete(
  "/prescriptions/:prescriptionId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  deletePrescription,
);

export default router;
