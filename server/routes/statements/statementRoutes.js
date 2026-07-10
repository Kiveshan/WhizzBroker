import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getClientStatementsHandler,
  getStatementDetailsHandler,
  generateStatementsHandler,
  authenticateScheduledJob, // Add this import
} from "../../controllers/statements/statementController.js";

const router = express.Router();

// Existing routes (keep these)
router.get(
  "/api/statements/:clientId",
  verifyToken,
  getClientStatementsHandler
);
router.get(
  "/api/statement/:statementId",
  verifyToken,
  getStatementDetailsHandler
);

// Update this route to use authenticateScheduledJob instead of verifyToken
router.post(
  "/api/statements/generate",
  authenticateScheduledJob,
  generateStatementsHandler
);

export default router;
