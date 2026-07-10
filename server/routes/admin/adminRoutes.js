import express from "express";
import {
  verifyAdmin,
  getPendingUsersAdmin,
  approveUserHandler,
  rejectUserHandler,
  updateUserStatusHandler,
  getCompanyListHandler,
  deactivateCompanyHandler,
  reactivateCompanyHandler,
  getAuditLogHandler,
} from "../../controllers/admin/adminController.js";
import { verifyToken, verifyAdminAccess } from "../../middleware/auth.js";

const router = express.Router();

// Admin routes with token and admin verification
router.get("/admin/verify", verifyToken, verifyAdmin);
router.get(
  "/admin/pending-users",
  verifyToken,
  verifyAdminAccess,
  getPendingUsersAdmin
);
router.post(
  "/admin/approve-user",
  verifyToken,
  verifyAdminAccess,
  approveUserHandler
);
router.post(
  "/admin/reject-user",
  verifyToken,
  verifyAdminAccess,
  rejectUserHandler
);
router.get(
  "/api/admin/company-list",
  verifyToken,
  verifyAdminAccess,
  getCompanyListHandler
);
router.post(
  "/api/company/deactivate",
  verifyToken,
  verifyAdminAccess,
  deactivateCompanyHandler
);
router.post(
  "/api/company/reactivate",
  verifyToken,
  verifyAdminAccess,
  reactivateCompanyHandler
);

router.get(
  "/api/admin/audit-log",
  verifyToken,
  verifyAdminAccess,
  getAuditLogHandler
);

// Legacy API route for backward compatibility
router.post("/api/admin/user-status", verifyToken, updateUserStatusHandler);

export default router;
