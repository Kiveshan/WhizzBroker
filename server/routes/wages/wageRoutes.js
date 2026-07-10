import express from "express";
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
router.get("/api/stored-wage-data/:employeeId", getStoredWageDataHandler);
router.get("/all-employees", getAllEmployeesHandler);
router.post("/api/save-wage-data", saveWageDataHandler);
router.get("/api/check-wage-slip", checkWageSlipHandler);
router.get(
  "/api/employee-deductions/:employeeId",
  getEmployeeDeductionsHandler
);
router.put(
  "/api/employee-deductions/:employeeId",
  updateEmployeeDeductionsHandler
);
router.get(
  "/wage-details/driver/:driverId/instruction/:instructionId",
  getDriverWageDetailsByInstructionHandler
);
router.get("/wage-details/driver/:driverId", getDriverWageDetailsHandler);
router.get("/api/driver-instructions/:driverId", getDriverInstructionsHandler);
router.get(
  "/api/all-driver-legs/:driverId/by-month",
  getDriverLegsByMonthHandler
);
router.get("/api/base-salary-history/:employeeId", getBaseSalaryHistoryHandler);
router.get("/api/roles", getAllRolesHandler);
router.get("/api/roles/exclude-six", getAllRolesExcludingSixHandler);

export default router;
