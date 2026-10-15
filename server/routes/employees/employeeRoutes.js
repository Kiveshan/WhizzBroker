import express from "express";
import { PAYROLL_ROLES } from "../../config/roles.js";
import { requireRoles } from "../../middleware/auth.js";
import { getEmployeeHandler } from "../../controllers/employees/employeeController.js";

const router = express.Router();

router.get("/api/employee/:id", requireRoles(...PAYROLL_ROLES), getEmployeeHandler);

export default router;
