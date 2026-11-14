import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import {
  downloadDocument,
  getDocumentSignedUrl,
  downloadByToken,
} from "../../controllers/v1/document.controller.js";

const router = express.Router();

router.get("/documents/download", authMiddleware(["CANDIDATE", "ADMIN", "EMPLOYEE", "DEPT_ADMIN"]), requirePermission(["/candidates", "/applications"], "read"), downloadDocument);
router.get("/documents/signed-url", authMiddleware(["CANDIDATE", "ADMIN", "EMPLOYEE", "DEPT_ADMIN"]), requirePermission(["/candidates", "/applications"], "read"), getDocumentSignedUrl);
router.get("/documents/token/:token", downloadByToken);

export default router;
