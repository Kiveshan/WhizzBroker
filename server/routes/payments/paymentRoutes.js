import express from "express";
import { verifyToken } from "../../middleware/auth.js";
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
  validate(paymentCreateSchema),
  createPaymentHandler
);
router.get(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  getPaymentHandler
);
router.delete(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  deletePaymentHandler
);
router.get("/api/payments/:clientId", verifyToken, getClientPaymentsHandler);
router.get(
  "/api/payment_invoices/:clientId",
  verifyToken,
  getClientInvoicesHandler
);

export default router;
