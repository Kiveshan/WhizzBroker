import express from "express";
import { DEBTORS_ROLES } from "../../config/roles.js";
import { verifyToken, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { paymentCreateSchema } from "../../validation/financialSchemas.js";
import {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
  getClientInvoicesHandler,
  deletePaymentHandler,
} from "../../controllers/payments/paymentController.js";

const router = express.Router();

router.post(
  "/api/payments/:clientId/upload",
  verifyToken,
  requireRoles(...DEBTORS_ROLES),
  validate(paymentCreateSchema),
  createPaymentHandler
);
router.get(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  requireRoles(...DEBTORS_ROLES),
  getPaymentHandler
);
router.delete(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  requireRoles(...DEBTORS_ROLES),
  deletePaymentHandler
);
router.get("/api/payments/:clientId", verifyToken, requireRoles(...DEBTORS_ROLES), getClientPaymentsHandler);
router.get(
  "/api/payment_invoices/:clientId",
  verifyToken,
  requireRoles(...DEBTORS_ROLES),
  getClientInvoicesHandler
);

export default router;
