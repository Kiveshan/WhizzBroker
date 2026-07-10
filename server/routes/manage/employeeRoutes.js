import express from "express";
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
import { verifyToken } from "../../middleware/auth.js";
import { uploadEmployeeDocs } from "../../utils/s3Config.js";

const router = express.Router();

// IMPORTANT: More specific routes must come BEFORE parameterized routes
// Move all specific routes before the /:id route

router.get("/api/employees", verifyToken, getAllEmployeesHandler);
router.get(
  "/api/employees/check-email-existence",
  verifyToken,
  checkEmployeeEmailExistsHandler
);
router.post(
  "/api/employees",
  verifyToken,
  uploadEmployeeDocs.array("documents", 3),
  createEmployeeHandler
);
router.post(
  "/api/employees/delete-doc",
  verifyToken,
  deleteEmployeeDocumentHandler
);

// Parameterized routes should come AFTER specific routes
router.get("/api/employees/:id", getEmployeeBasicHandler);
router.get(
  "/api/employees/:id/details",
  verifyToken,
  getEmployeeDetailsHandler
);
router.put(
  "/api/employees/:id",
  verifyToken,
  uploadEmployeeDocs.array("documents", 3),
  updateEmployeeHandler
);
router.put(
  "/api/employees/:id/toggle-status",
  verifyToken,
  toggleEmployeeStatusHandler
);

export default router;
