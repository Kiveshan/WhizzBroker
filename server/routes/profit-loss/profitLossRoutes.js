import express from 'express';
import { generateProfitLossReport, getCompanyDetailsHandler } from '../../controllers/profit-loss/profitLossController.js';

const router = express.Router();
router.get('/profit-loss-report', generateProfitLossReport);
router.get('/company-details', getCompanyDetailsHandler);

export default router;