import express from "express";
import {
  getFuelExpensesController,
  getTurnoverPerMonthController,
  getAllClientsController,
  getAllSubcontractorsController,
  getAllTrucksController,
  getAgingAnalysisController,
  getDebtorAgeAnalysisPerClientController,
  getTurnoverVsDieselCostController,
  getAllExpensesController,
  getTurnoverPerTruckController,
  getSubcontractorTurnoverPerMonthController,
  getSubcontractorVsTurnoverController,
  getWagesVsExpensesController,
  getTurnoverVsSubbieExpenseController,
  getTurnoverVsFuelPerTruckController,
  getPaymentsReceivedPerMonthController,
  getPaymentClientsController,
  getClientSubbieCommissionReportController,
} from "../../controllers/analytics/analyticsController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/fuel-expenses", verifyToken, getFuelExpensesController);
router.get("/api/turnover-per-month", verifyToken, getTurnoverPerMonthController);
router.get("/api/aging-analysis", verifyToken, getAgingAnalysisController);
router.get("/api/debtor-age-analysis", verifyToken, getDebtorAgeAnalysisPerClientController);
router.get("/api/get-clients", verifyToken, getAllClientsController);
router.get("/api/get-subcontractors", verifyToken, getAllSubcontractorsController);
router.get("/api/get-trucks", verifyToken, getAllTrucksController);
router.get(
  "/api/turnover-vs-diesel-cost",
  verifyToken,
  getTurnoverVsDieselCostController
);
router.get("/api/all-expenses", verifyToken, getAllExpensesController);
router.get("/api/turnover-per-truck", verifyToken, getTurnoverPerTruckController);
router.get("/api/subcontractor-turnover-per-month", verifyToken,
  getSubcontractorTurnoverPerMonthController);
router.get("/api/subcontractor-vs-turnover", verifyToken,
  getSubcontractorVsTurnoverController);
router.get("/api/wages-vs-expenses", verifyToken,
  getWagesVsExpensesController);
router.get("/api/turnover-vs-subbie-expense", verifyToken,
  getTurnoverVsSubbieExpenseController);
router.get("/api/turnover-vs-fuel-per-truck", verifyToken,
  getTurnoverVsFuelPerTruckController);
router.get("/api/payments-received-per-month", verifyToken, getPaymentsReceivedPerMonthController);
router.get("/api/payment-clients", verifyToken, getPaymentClientsController);
router.get(
  "/api/client-subbie-commission",
  verifyToken,
  getClientSubbieCommissionReportController
);

export default router;