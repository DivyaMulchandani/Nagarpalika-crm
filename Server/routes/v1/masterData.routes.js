import express from "express";
import {
  createMasterData,
  getMasterData,
  getGroupedMasterData,
  getMasterDataById,
  updateMasterData,
  deleteMasterData,
  reorderMasterData,
  validateMasterData,
} from "../../controllers/MasterDataController.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();


// Get all grouped master data (useful for initial load of all dropdowns)
router.get("/grouped", authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), getGroupedMasterData);
router.put("/reorder", authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), reorderMasterData);
router.get("/", authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), getMasterData);
router.post("/", validateMasterData, authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), createMasterData);
router.get("/:id", authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), getMasterDataById);
router.put("/:id", validateMasterData, authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), updateMasterData);
router.delete("/:id", authMiddleware(["ADMIN", "EMPLOYEE","DOCTOR"]), deleteMasterData);

export default router;
