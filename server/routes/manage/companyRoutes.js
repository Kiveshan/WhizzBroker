import express from "express";
import { getCompanyHandler, updateCompanyHandler } from "../../controllers/manage/companyController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/companies", verifyToken, getCompanyHandler);
router.put("/api/companies", verifyToken, updateCompanyHandler);

export default router;