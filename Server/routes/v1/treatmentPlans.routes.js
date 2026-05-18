import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  mongoIdValidator,
  handleValidationErrors,
  searchValidation,
} from "../../middlewares/inputValidator.js";
import {
  createTreatmentPlan,
  updateTreatmentPlan,
  acceptTreatmentPlan,
  getTreatmentPlanById,
  deleteTreatmentPlan,
  listTreatmentPlansByParams,
  getPatientTreatmentPlans,
} from "../../controllers/v1/treatmentPlan.controller.js";

const router = express.Router();

const planIdParam = [mongoIdValidator("planId", "param"), handleValidationErrors];
const patientIdParam = [mongoIdValidator("patientId", "param"), handleValidationErrors];

router.post(
  "/treatment-plans",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  createTreatmentPlan,
);

router.get(
  "/treatment-plans/patient/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParam,
  getPatientTreatmentPlans,
);

router.get(
  "/treatment-plans/:planId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  planIdParam,
  getTreatmentPlanById,
);

router.put(
  "/treatment-plans/:planId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  planIdParam,
  updateTreatmentPlan,
);

router.patch(
  "/treatment-plans/:planId/accept",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  planIdParam,
  acceptTreatmentPlan,
);

router.delete(
  "/treatment-plans/:planId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  planIdParam,
  deleteTreatmentPlan,
);

router.post(
  "/treatment-plans/search",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  searchValidation,
  listTreatmentPlansByParams,
);

export default router;
