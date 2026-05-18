import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { getDashboardStats } from "../../controllers/v1/analytics.controller.js";

const router = express.Router();

router.get("/analytics/dashboard", authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]), getDashboardStats);

// TODO Phase 1: Add recruitment-specific report routes:
// router.get("/analytics/reports/applications",  authMiddleware([...]), getApplicationsReport);
// router.get("/analytics/reports/candidates",    authMiddleware([...]), getCandidatesReport);
// router.get("/analytics/reports/fee-collection",authMiddleware([...]), getFeeCollectionReport);

export default router;
