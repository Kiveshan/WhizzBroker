import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
  generateSubcontractorStatementHandler,
  backfillSubcontractorStatementsHandler,
  authenticateScheduledJob,
} from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

// Existing routes (keep these)
router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", getStatementDetailsHandler);
router.get("/subcontractor/company-info", getCompanyInfoHandler);
router.get("/subcontractor/info", getSubcontractorInfoHandler);

// Update this route to use authenticateScheduledJob
router.post(
  "/subcontractor/generate-statement",
  authenticateScheduledJob,
  generateSubcontractorStatementHandler
);

router.post(
  "/subcontractor/backfill-statements",
  authenticateScheduledJob,
  backfillSubcontractorStatementsHandler
);

export default router;
