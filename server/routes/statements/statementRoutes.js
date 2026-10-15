import express from "express";
import { DEBTORS_ROLES } from "../../config/roles.js";
import { verifyToken, requireRoles } from "../../middleware/auth.js";
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
  requireRoles(...DEBTORS_ROLES),
  getClientStatementsHandler
);
router.get(
  "/api/statement/:statementId",
  verifyToken,
  requireRoles(...DEBTORS_ROLES),
  getStatementDetailsHandler
);

// The scheduled job authenticates with API_SECRET (requireRoles lets it through
// via req.isScheduledJob); UI users need a JWT and a debtors role.
router.post(
  "/api/statements/generate",
  authenticateScheduledJob,
  requireRoles(...DEBTORS_ROLES),
  generateStatementsHandler
);

export default router;
