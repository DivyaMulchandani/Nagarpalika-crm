import express from "express";
import { helpQueryLimiter } from "../../middlewares/securityHeaders.js";
import { submitHelpQuery } from "../../controllers/v1/helpQuery.controller.js";

const router = express.Router();

router.post("/help/query", helpQueryLimiter, submitHelpQuery);

export default router;
