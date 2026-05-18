import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  mongoIdValidator,
  handleValidationErrors,
  searchValidation,
} from "../../middlewares/inputValidator.js";
import {
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorById,
  listDoctors,
  listDoctorsByParams,
  resetDoctorPassword,
} from "../../controllers/v1/doctor.controller.js";

const router = express.Router();

const doctorIdParam = [mongoIdValidator("doctorId", "param"), handleValidationErrors];

router.post(
  "/doctors",
  authMiddleware(["ADMIN"]),
  createDoctor,
);

router.get(
  "/doctors",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  listDoctors,
);

router.get(
  "/doctors/:doctorId",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  doctorIdParam,
  getDoctorById,
);

router.put(
  "/doctors/:doctorId",
  authMiddleware(["ADMIN"]),
  doctorIdParam,
  updateDoctor,
);

router.delete(
  "/doctors/:doctorId",
  authMiddleware(["ADMIN"]),
  doctorIdParam,
  deleteDoctor,
);

router.post(
  "/doctors/search",
  authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]),
  searchValidation,
  listDoctorsByParams,
);

router.patch(
  "/doctors/:doctorId/reset-password",
  authMiddleware(["ADMIN"]),
  doctorIdParam,
  resetDoctorPassword,
);

export default router;
