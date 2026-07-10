import express from "express";
import { getEmployeeHandler } from "../../controllers/employees/employeeController.js";

const router = express.Router();

router.get("/api/employee/:id", getEmployeeHandler);

export default router;
