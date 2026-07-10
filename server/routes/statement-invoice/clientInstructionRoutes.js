import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { getClientInstructionsHandler } from "../../controllers/statement-invoice/clientInstructionController.js";

const router = express.Router();

router.get(
  "/api/client-instructions/:clientId",
  verifyToken,
  getClientInstructionsHandler
);

export default router;
