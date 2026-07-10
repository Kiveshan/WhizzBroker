// Add this to your invoice routes file (invoiceRoutes.js)
import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { invoiceCreateSchema } from "../../validation/financialSchemas.js";
import {
  getCompletedInvoicesHandler,
  getInvoiceDetailsHandler,
  checkInvoiceExistsHandler,
  createInvoiceHandler,
  updateInstructionDetailsHandler,
  generateInvoicePreviewHandler, // New handler
} from "../../controllers/invoices/invoiceController.js";

const router = express.Router();

router.get("/api/invoices/completed", verifyToken, getCompletedInvoicesHandler);
router.get("/api/invoices/:id", verifyToken, getInvoiceDetailsHandler);
router.get("/api/invoice/check/:m1key", checkInvoiceExistsHandler);
router.post("/api/invoice/create", verifyToken, validate(invoiceCreateSchema), createInvoiceHandler);
router.put(
  "/api/invoice/update-instruction",
  verifyToken,
  updateInstructionDetailsHandler
);

// NEW: Preview endpoint
router.post("/api/invoices/preview/:instructionId", verifyToken, generateInvoicePreviewHandler);

export default router;