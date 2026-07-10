import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getClientAddonsHandler,
  createAddonHandler,
  getAddonByIdHandler,
  updateAddonHandler,
  deleteAddonHandler,
  getCompanyInfoHandler,
  getClientByIdHandler,
  checkInvoiceNumberHandler,
  getUnlinkedAddonsHandler,
} from "../../controllers/add-ons/addonController.js";

const router = express.Router();

// Get all add-ons for a specific client
router.get("/api/addons/client/:clientId", verifyToken, getClientAddonsHandler);

// Get add-on invoices for a client that are not yet linked to an instruction
// (optionally include the one currently linked to ?instructionId= for editing)
router.get("/api/addons/unlinked/client/:clientId", verifyToken, getUnlinkedAddonsHandler);

// Create a new add-on
router.post("/api/addons", verifyToken, createAddonHandler);

// Get a specific add-on by ID
router.get("/api/addons/:addonId", verifyToken, getAddonByIdHandler);

// Update an add-on
router.put("/api/addons/:addonId", verifyToken, updateAddonHandler);

// Delete an add-on
router.delete("/api/addons/:addonId", verifyToken, deleteAddonHandler);

// Get company info
router.get("/api/companyinfo", verifyToken, getCompanyInfoHandler);

// Get client info by ID
router.get("/api/add-on/client/:clientId", verifyToken, getClientByIdHandler);

// Check invoice number availability
router.get("/api/addons/check-invoice/:invoiceNumber", verifyToken, checkInvoiceNumberHandler);

export default router;
