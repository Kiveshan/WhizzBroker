import express from "express";
import { PAYROLL_ROLES } from "../../config/roles.js";
import { requireRoles } from "../../middleware/auth.js";
import {
  saveWageDataHandler,
  checkWageSlipHandler,
  getEmployeeDeductionsHandler,
  updateEmployeeDeductionsHandler,
  getDriverWageDetailsByInstructionHandler,
  getDriverWageDetailsHandler,
  getDriverInstructionsHandler,
  getDriverLegsByMonthHandler,
  getStoredWageDataHandler,
  getBaseSalaryHistoryHandler,
  getAllEmployeesHandler,
  getAllRolesHandler,getAllRolesExcludingSixHandler
} from "../../controllers/wages/wageController.js";

const router = express.Router();
router.get("/api/stored-wage-data/:employeeId", requireRoles(...PAYROLL_ROLES), getStoredWageDataHandler);
router.get("/all-employees", requireRoles(...PAYROLL_ROLES), getAllEmployeesHandler);
router.post("/api/save-wage-data", requireRoles(...PAYROLL_ROLES), saveWageDataHandler);
router.get("/api/check-wage-slip", requireRoles(...PAYROLL_ROLES), checkWageSlipHandler);
router.get(
  "/api/employee-deductions/:employeeId",
  requireRoles(...PAYROLL_ROLES),
  getEmployeeDeductionsHandler
);
router.put(
  "/api/employee-deductions/:employeeId",
  requireRoles(...PAYROLL_ROLES),
  updateEmployeeDeductionsHandler
);
router.get(
  "/wage-details/driver/:driverId/instruction/:instructionId",
  requireRoles(...PAYROLL_ROLES),
  getDriverWageDetailsByInstructionHandler
);
router.get("/wage-details/driver/:driverId", requireRoles(...PAYROLL_ROLES), getDriverWageDetailsHandler);
router.get("/api/driver-instructions/:driverId", requireRoles(...PAYROLL_ROLES), getDriverInstructionsHandler);
router.get(
  "/api/all-driver-legs/:driverId/by-month",
  requireRoles(...PAYROLL_ROLES),
  getDriverLegsByMonthHandler
);
router.get("/api/base-salary-history/:employeeId", requireRoles(...PAYROLL_ROLES), getBaseSalaryHistoryHandler);
router.get("/api/roles", requireRoles(...PAYROLL_ROLES), getAllRolesHandler);
router.get("/api/roles/exclude-six", requireRoles(...PAYROLL_ROLES), getAllRolesExcludingSixHandler);

export default router;
