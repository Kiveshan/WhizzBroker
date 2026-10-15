import express from "express";
import { MANAGEMENT_ROLES } from "../../config/roles.js";
import {
  checkClientEmailExistsHandler,
  getAllClientsHandler,
  getClientByIdHandler,
  createClientHandler,
  updateClientHandler,
  toggleClientStatusHandler,
  deleteClientHandler,
} from "../../controllers/manage/clientController.js";
import { verifyToken, requireRoles } from "../../middleware/auth.js";

const router = express.Router();

router.get(
  "/api/m5Clients/check-email-existence",
  verifyToken,
  checkClientEmailExistsHandler
);
router.get("/api/m5Clients", verifyToken, getAllClientsHandler);
router.get("/api/m5Clients/:id", verifyToken, getClientByIdHandler);
router.post("/api/m5Clients", verifyToken, requireRoles(...MANAGEMENT_ROLES), createClientHandler);
router.put("/api/m5Clients/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), updateClientHandler);
router.put(
  "/api/clients/:id/toggle-status",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  toggleClientStatusHandler
);
router.delete("/api/m5Clients/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteClientHandler);

export default router;
