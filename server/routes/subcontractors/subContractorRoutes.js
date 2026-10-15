import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
} from "../../controllers/subcontractors/subContractorController.js";
import {
  createStatementExportHandler,
  attachStatementExportDocumentHandler,
  listStatementExportsHandler,
  getStatementExportHandler,
} from "../../controllers/subcontractors/statementExportController.js";
import { requireRoles } from "../../middleware/auth.js";
import { CREDITORS_ROLES } from "../../config/roles.js";
import { uploadStatementDocument } from "../../utils/s3-config.js";

const router = express.Router();

// Creditors screens only (routeRoles.js: 8, 1, 4); admin always passes.
const verifySubcontractorStatementAccess = requireRoles(...CREDITORS_ROLES);

// Existing routes (keep these)
router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", verifySubcontractorStatementAccess, getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", verifySubcontractorStatementAccess, getStatementDetailsHandler);
router.get("/subcontractor/company-info", getCompanyInfoHandler);
router.get("/subcontractor/info", getSubcontractorInfoHandler);

// --- Statement export snapshots -------------------------------------------
// This router is mounted below the global verifyToken guard in routes/index.js,
// so these are authenticated already; the extra guard narrows them to the roles
// that own the Creditors section (mirrors routeRoles.js: 8, 1, 4).
//
// Two-step by design: the export route derives and freezes the figures
// server-side, then the client uploads the document it rendered from them.
router.post(
  "/subcontractor/statements/export",
  verifySubcontractorStatementAccess,
  createStatementExportHandler
);

router.post(
  "/subcontractor/statements/exports/:exportId/document",
  verifySubcontractorStatementAccess,
  uploadStatementDocument.single("document"),
  attachStatementExportDocumentHandler
);

router.get(
  "/subcontractor/statements/exports",
  verifySubcontractorStatementAccess,
  listStatementExportsHandler
);

router.get(
  "/subcontractor/statements/exports/:exportId",
  verifySubcontractorStatementAccess,
  getStatementExportHandler
);

export default router;
