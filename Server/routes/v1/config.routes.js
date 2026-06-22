import express from "express";
import { getPortalConfig } from "../../controllers/v1/portalConfig.controller.js";

const router = express.Router();

router.get("/config/portal", getPortalConfig);

export default router;
