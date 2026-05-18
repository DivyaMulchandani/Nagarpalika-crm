import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { doctorScope } from "../../middlewares/doctorScope.js";
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  deleteAppointment,
  listAppointmentsByParams,
  getTodaysAppointments,
  getFollowUpQueue,
  getPatientAppointments,
  getDoctorSlots,
  transferAppointment,
} from "../../controllers/v1/appointment.controller.js";

const router = express.Router();

router.post(
  "/appointments",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  createAppointment,
);

router.get(
  "/appointments/today",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  doctorScope,
  getTodaysAppointments,
);

router.get(
  "/appointments/follow-up-queue",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  doctorScope,
  getFollowUpQueue,
);

router.get(
  "/appointments/doctor-slots",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getDoctorSlots,
);

router.get(
  "/appointments/patient/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getPatientAppointments,
);

router.get(
  "/appointments/:appointmentId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  getAppointmentById,
);

router.put(
  "/appointments/:appointmentId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  updateAppointment,
);

router.patch(
  "/appointments/:appointmentId/status",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  updateAppointmentStatus,
);

router.post(
  "/appointments/:appointmentId/transfer",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  transferAppointment,
);

router.delete(
  "/appointments/:appointmentId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  deleteAppointment,
);

router.post(
  "/appointments/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  doctorScope,
  listAppointmentsByParams,
);

export default router;
