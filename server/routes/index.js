import express from "express";
import authroutes from "./auth/authRoutes.js";
import adminroutes from "./admin/adminRoutes.js";
import testroutes from "./test/testRoutes.js";
import manageEmployeeRoutes from "./manage/employeeRoutes.js";
import manageClientRoutes from "./manage/clientRoutes.js";
import manageTruckRoutes from "./manage/truckRoutes.js";
import manageDriverRatesRoutes from "./manage/driverRatesRoutes.js";
import manageSubbieRoutes from "./manage/subbieRoutes.js";
import manageTrailerRoutes from "./manage/trailerRoutes.js";
import supplierRoutes from "./manage/supplierRoutes.js";
import expenseTypeRoutes from "./manage/expenseTypeRoutes.js";
import manageClientRateRoutes from "./manage/clientRateRoutes.js";
import manageCompanyRoutes from "./manage/companyRoutes.js";
import paymentRoutes from "./payments/paymentRoutes.js";
import clientRoutes from "./clients/clientRoutes.js";
import invoiceRoutes from "./invoices/invoiceRoutes.js";
import statementRoutes from "./statements/statementRoutes.js";
import statementInvoiceRoutes from "./statement-invoice/clientInstructionRoutes.js";
import wagesRoutes from "./wages/wageRoutes.js";
import analyticsRoutes from "./analytics/analyticsRoutes.js";
import employeeRoutes from "./employees/employeeRoutes.js";
import driverRoutes from "./drivers/driverRoutes.js";
import documentRoutes from "./assignments/documentRoutes.js";
import fuelSlipRoutes from "./fuel/expensesRoutes.js";
import fuelRoutes from "./fuel/fuelRoutes.js";
import purchaseOrderRoutes from "./purchaseOrder/purchaseOrderRoutes.js";
import instructionRoutes from "./instructions/instructionRoutes.js";
import assignmentRoutes from "./assignments/assignmentRoutes.js";
import subcontractorsRoutes from "./subcontractors/subContractorRoutes.js";
import addonRoutes from "./add-ons/addonRoutes.js";
import creditNoteRoutes from "./creditNote/creditNoteRoutes.js";
import profitLossRoutes from "./profit-loss/profitLossRoutes.js";
import vatReconRoutes from "./vat-recon/vat-reconRoutes.js";
import landingRoutes from "./landing/landingRoutes.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// Public / self-authenticating routes — mounted BEFORE the global auth guard.
// ---------------------------------------------------------------------------
// authRoutes: /login, /register, /check-email, /logout are public;
//             /user-info and /api/user-role self-guard with verifyToken.
router.use(authroutes);
// landingRoutes: /api/landing/stats powers the public (pre-login) landing page.
router.use(landingRoutes);
// testRoutes: /test-connection health check.
router.use(testroutes);
// statementRoutes: /api/statements/generate authenticates the scheduled job via
//   API_SECRET (and falls back to verifyToken for UI users); its GET routes
//   self-guard with verifyToken. Must sit before the global guard so the
//   non-JWT API_SECRET token is not rejected by it.
router.use(statementRoutes);

// ---------------------------------------------------------------------------
// Global authentication guard — every route mounted below requires a valid JWT.
// ---------------------------------------------------------------------------
router.use(verifyToken);

router.use(creditNoteRoutes);
router.use(adminroutes);
router.use(manageEmployeeRoutes);
router.use(manageClientRoutes);
router.use(manageTruckRoutes);
router.use(manageDriverRatesRoutes);
router.use(manageSubbieRoutes);
router.use(manageTrailerRoutes);
router.use(manageClientRateRoutes);
router.use(manageCompanyRoutes);
router.use(supplierRoutes);
router.use(expenseTypeRoutes);
router.use(invoiceRoutes);
router.use(paymentRoutes);
router.use(clientRoutes);
router.use(statementInvoiceRoutes);
router.use(wagesRoutes);
router.use(analyticsRoutes);
router.use(employeeRoutes);
router.use(driverRoutes);
router.use("/documents", documentRoutes);
router.use("/expenses", fuelSlipRoutes);
router.use(fuelRoutes);
router.use(purchaseOrderRoutes);
router.use("/api/instructions", instructionRoutes);
router.use(assignmentRoutes);
router.use(subcontractorsRoutes);
router.use(addonRoutes);
router.use(profitLossRoutes);
router.use(vatReconRoutes);

export default router;
