import express from "express";
import { MANAGEMENT_ROLES } from "../../config/roles.js";
import { getCompanyHandler, updateCompanyHandler } from "../../controllers/manage/companyController.js";
import { verifyToken, requireRoles } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/companies", verifyToken, getCompanyHandler);
router.put("/api/companies", verifyToken, requireRoles(...MANAGEMENT_ROLES), updateCompanyHandler);

export default router;