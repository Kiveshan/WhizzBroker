import {
  createPayment,
  getPayment,
  getClientPayments,
  getClientInvoices,
  deletePayment,
} from "../../models/payments/paymentModel.js";
import { auditFromReq } from "../../utils/auditLogger.js";

const createPaymentHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { fileupload, reference, line_items } = req.body;

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one payment line item is required",
      });
    }
    
    // Create payment record with optional reference and line allocations
    const payment = await createPayment(clientId, {
      // fileupload is now optional; the model will treat it as a generation date
      fileupload,
      reference: reference ? reference.trim() : null,
      line_items,
    });

    auditFromReq(req, {
      actionType: "PAYMENT_CREATED",
      entityType: "payment",
      targetId: payment.data?.paymentId,
      targetName: `client ${clientId}`,
      details: `Payment created for client ${clientId} (${line_items.length} line item(s), ref: ${reference || "none"})`,
    });

    res.json({
      success: true,
      data: payment.data,
    });
  } catch (error) {
    console.error(
      `Error creating payment for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getPaymentHandler = async (req, res) => {
  try {
    const { clientId, paymentId } = req.params;
    console.log(`Fetching payment ${paymentId} for client ${clientId}`);

    const result = await getPayment(clientId, paymentId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching payment ${req.params.paymentId} for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientPaymentsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(
      `Fetching payments for client ${clientId} with query:`,
      req.query
    );

    const result = await getClientPayments(clientId, { year, month });
    console.log(
      `Query returned ${result.data.length} payments for client ${clientId}`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching payments for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientInvoicesHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`Fetching invoices and add-ons for client ${clientId}`);

    const result = await getClientInvoices(clientId);
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching invoices and add-ons for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const deletePaymentHandler = async (req, res) => {
  try {
    const { clientId, paymentId } = req.params;

    await deletePayment(clientId, paymentId);

    auditFromReq(req, {
      actionType: "PAYMENT_DELETED",
      entityType: "payment",
      targetId: paymentId,
      targetName: `client ${clientId}`,
      details: `Payment ${paymentId} deleted for client ${clientId}`,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      `Error deleting payment ${req.params.paymentId} for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
  getClientInvoicesHandler,
  deletePaymentHandler,
};
