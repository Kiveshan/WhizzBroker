import express from "express";
import { MANAGEMENT_ROLES } from "../../config/roles.js";
import {
  getEmployeeBasicHandler,
  getAllEmployeesHandler,
  checkEmployeeEmailExistsHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  toggleEmployeeStatusHandler,
  getEmployeeDetailsHandler,
  deleteEmployeeDocumentHandler,
} from "../../controllers/manage/employeeController.js";
import { verifyToken, requireRoles } from "../../middleware/auth.js";
import { uploadEmployeeDocs } from "../../utils/s3Config.js";

const router = express.Router();

// IMPORTANT: More specific routes must come BEFORE parameterized routes
// Move all specific routes before the /:id route

router.get("/api/employees", verifyToken, requireRoles(...MANAGEMENT_ROLES), getAllEmployeesHandler);
router.get(
  "/api/employees/check-email-existence",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  checkEmployeeEmailExistsHandler
);
router.post(
  "/api/employees",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  uploadEmployeeDocs.array("documents", 3),
  createEmployeeHandler
);
router.post(
  "/api/employees/delete-doc",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  deleteEmployeeDocumentHandler
);

// Parameterized routes should come AFTER specific routes
router.get("/api/employees/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), getEmployeeBasicHandler);
router.get(
  "/api/employees/:id/details",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  getEmployeeDetailsHandler
);
router.put(
  "/api/employees/:id",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  uploadEmployeeDocs.array("documents", 3),
  updateEmployeeHandler
);
router.put(
  "/api/employees/:id/toggle-status",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  toggleEmployeeStatusHandler
);

export default router;
