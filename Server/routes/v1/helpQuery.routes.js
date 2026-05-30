import express from "express";
import { helpQueryLimiter } from "../../middlewares/securityHeaders.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  submitHelpQuery,
  getHelpQueries,
  updateHelpQueryStatus,
} from "../../controllers/v1/helpQuery.controller.js";

const router = express.Router();

router.post("/help/query", helpQueryLimiter, submitHelpQuery);
router.get(
  "/help/queries",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  getHelpQueries,
);
router.patch(
  "/help/queries/:id/status",
  authMiddleware(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]),
  updateHelpQueryStatus,
);

export default router;
