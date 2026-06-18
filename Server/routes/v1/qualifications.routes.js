import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createQualification,
  searchQualifications,
  getAllQualifications,
  getQualificationById,
  updateQualification,
  deleteQualification,
  listPublicQualifications,
} from "../../controllers/v1/qualification.controller.js";

const router = express.Router();

const adminAuth = authMiddleware(["ADMIN", "EMPLOYEE"]);

router.get("/qualifications/public", listPublicQualifications);
router.post("/qualifications/search", adminAuth, searchQualifications);
router.get("/qualifications", adminAuth, getAllQualifications);
router.post("/qualifications", adminAuth, createQualification);
router.get("/qualifications/:id", adminAuth, getQualificationById);
router.put("/qualifications/:id", adminAuth, updateQualification);
router.delete(
  "/qualifications/:id",
  authMiddleware(["ADMIN"]),
  deleteQualification,
);

export default router;
