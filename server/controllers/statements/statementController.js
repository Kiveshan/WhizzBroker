import {
  getClientStatements,
  getStatementDetails,
} from "../../models/statements/statementModel.js";
import { generateMonthlyStatements } from "../../utils/statementGenerator.js";
import { authenticateScheduledJob } from "../../middleware/auth.js";

const getClientStatementsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(
      `Fetching statements for client ${clientId} with query:`,
      req.query
    );

    const result = await getClientStatements(clientId, { year, month });
    console.log(
      `Query returned ${result.data.length} statements for client ${clientId}`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching statements for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getStatementDetailsHandler = async (req, res) => {
  try {
    const { statementId } = req.params;
    console.log(`Fetching statement details for statement ${statementId}`);

    const result = await getStatementDetails(statementId);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    const generationDate = new Date(result.data.generation_date);
    const statementMonth =
      generationDate.getMonth() === 0 ? 11 : generationDate.getMonth() - 1;
    const statementYear =
      generationDate.getMonth() === 0
        ? generationDate.getFullYear() - 1
        : generationDate.getFullYear();
    const statementStartDate = new Date(
      statementYear,
      statementMonth,
      1,
      12,
      0,
      0
    );
    const statementEndDate = new Date(
      statementYear,
      statementMonth + 1,
      0,
      12,
      0,
      0
    );
    const formattedStatementStartDate = statementStartDate
      .toISOString()
      .split("T")[0];
    const formattedStatementEndDate = statementEndDate
      .toISOString()
      .split("T")[0];

    console.log(
      `Statement period (invoices): ${formattedStatementStartDate} to ${formattedStatementEndDate}`
    );

    const paymentMonth = statementMonth === 0 ? 11 : statementMonth - 1;
    const paymentYear =
      statementMonth === 0 ? statementYear - 1 : statementYear;
    const paymentStartDate = new Date(paymentYear, paymentMonth, 1, 12, 0, 0);
    const paymentEndDate = new Date(paymentYear, paymentMonth + 1, 0, 12, 0, 0);
    const formattedPaymentStartDate = paymentStartDate
      .toISOString()
      .split("T")[0];
    const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

    console.log(
      `Payment period: ${formattedPaymentStartDate} to ${formattedPaymentEndDate}`
    );

    console.log(
      `Fetched statement ${statementId} with opening balance R${result.data.opening_balance}, ${result.data.invoices.length} invoices, and ${result.data.payments.length} payments`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching statement ${req.params.statementId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const generateStatementsHandler = async (req, res) => {
  try {
    const { clientId, specificClient } = req.body;

    console.log(
      `Manual statement generation requested${
        specificClient ? ` for client ${clientId}` : " for all clients"
      }`
    );

    // Validate input for specific client generation
    if (specificClient && !clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required for specific client generation",
      });
    }

    // Call the statement generation function
    const result = await generateMonthlyStatements(
      specificClient ? clientId : null
    );

    console.log(`Statement generation completed: ${result.message}`);

    res.json(result);
  } catch (error) {
    console.error("Error in manual statement generation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during statement generation",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  getClientStatementsHandler,
  getStatementDetailsHandler,
  generateStatementsHandler,
  authenticateScheduledJob,
};
