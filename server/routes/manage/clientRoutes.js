import express from "express";
import {
  checkClientEmailExistsHandler,
  getAllClientsHandler,
  getClientByIdHandler,
  createClientHandler,
  updateClientHandler,
  toggleClientStatusHandler,
  deleteClientHandler,
} from "../../controllers/manage/clientController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get(
  "/api/m5Clients/check-email-existence",
  verifyToken,
  checkClientEmailExistsHandler
);
router.get("/api/m5Clients", verifyToken, getAllClientsHandler);
router.get("/api/m5Clients/:id", verifyToken, getClientByIdHandler);
router.post("/api/m5Clients", verifyToken, createClientHandler);
router.put("/api/m5Clients/:id", verifyToken, updateClientHandler);
router.put(
  "/api/clients/:id/toggle-status",
  verifyToken,
  toggleClientStatusHandler
);
router.delete("/api/m5Clients/:id", verifyToken, deleteClientHandler);

export default router;
