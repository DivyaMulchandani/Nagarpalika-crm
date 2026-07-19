import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createLanguage,
  searchLanguages,
  getAllLanguages,
  getLanguageById,
  updateLanguage,
  deleteLanguage,
  listPublicLanguages,
} from "../../controllers/v1/language.controller.js";

const router = express.Router();

const adminAuth = authMiddleware(["ADMIN", "EMPLOYEE"]);

router.get("/languages/public", listPublicLanguages);
router.post("/languages/search", adminAuth, searchLanguages);
router.get("/languages", adminAuth, getAllLanguages);
router.post("/languages", adminAuth, createLanguage);
router.get("/languages/:id", adminAuth, getLanguageById);
router.put("/languages/:id", adminAuth, updateLanguage);
router.delete(
  "/languages/:id",
  authMiddleware(["ADMIN"]),
  deleteLanguage,
);

export default router;
