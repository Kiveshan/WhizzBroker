import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { creditNoteCreateSchema } from "../../validation/financialSchemas.js";
import {
  getClientCreditNotesHandler,
  getInstructionsHandler,
  getContainersHandler,
  getCompanyDetailsHandler,
  getClientDetailsHandler,
  getLatestDocumentNumberHandler,
  getInstructionDetailsHandler,
  createCreditNoteHandler,
  getCreditNoteByIdHandler,
} from "../../controllers/creditNote/creditNoteController.js";

const router = express.Router();

router.get(
  "/api/credit-notes/:clientId",
  verifyToken,
  getClientCreditNotesHandler
);
router.get(
  "/api/credit-notes/instructions/:clientId",
  verifyToken,
  getInstructionsHandler
);
router.get("/api/containers/:m1key", verifyToken, getContainersHandler);
router.get("/api/company/ksm", verifyToken, getCompanyDetailsHandler);
router.get("/clients/:clientId", verifyToken, getClientDetailsHandler);
router.get(
  "/api/latest-document-number",
  verifyToken,
  getLatestDocumentNumberHandler
);
router.get(
  "/api/instruction-details/:m1key",
  verifyToken,
  getInstructionDetailsHandler
);
router.post("/api/credit-notes", verifyToken, validate(creditNoteCreateSchema), createCreditNoteHandler);
router.get(
  "/api/credit-notes/by-id/:creditNoteId",
  verifyToken,
  getCreditNoteByIdHandler
);

export default router;
