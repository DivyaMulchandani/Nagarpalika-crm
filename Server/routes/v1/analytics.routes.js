import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { doctorScope } from "../../middlewares/doctorScope.js";
import {
  getDashboardStats,
  getDoctorDashboardStats,
  getAppointmentSummaryReport,
  getRevenueReport,
  getPatientReport,
  getFollowUpReport,
  getDoctorUtilizationReport,
} from "../../controllers/v1/analytics.controller.js";

const router = express.Router();

// Dashboard
router.get("/analytics/dashboard", authMiddleware(["ADMIN", "EMPLOYEE"]), getDashboardStats);
router.get("/analytics/doctor-dashboard", authMiddleware(["DOCTOR"]), getDoctorDashboardStats);

// Reports (doctorScope auto-injects doctorId for DOCTOR role)
router.get("/analytics/reports/appointments", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), doctorScope, getAppointmentSummaryReport);
router.get("/analytics/reports/revenue", authMiddleware(["ADMIN", "EMPLOYEE"]), getRevenueReport);
router.get("/analytics/reports/patients", authMiddleware(["ADMIN", "EMPLOYEE"]), getPatientReport);
router.get("/analytics/reports/follow-ups", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), doctorScope, getFollowUpReport);
router.get("/analytics/reports/doctor-utilization", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), doctorScope, getDoctorUtilizationReport);

export default router;
