import {
  getClientStatements,
  getStatementDetails,
} from "../../models/statements/statementModel.js";
import { freezeStatement } from "../../models/statements/statementExportModel.js";

// Client statements are derived on demand (models/statements/
// statementDerivation.js) — there is no generation or regeneration step, and no
// scheduled job, so this controller only reads.

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

    console.log(
      `Fetched statement ${statementId} with opening balance R${result.data.opening_balance}, ${result.data.invoices.length} invoices, and ${result.data.payments.length} payments`
    );

    // content_hash identifies exactly these figures. The page sends it back
    // when exporting, and the export is refused if the statement has changed
    // since — see createStatementExportHandler.
    const { contentHash } = freezeStatement(result.data);

    res.json({
      success: true,
      data: { ...result.data, content_hash: contentHash },
    });
  } catch (error) {
    console.error(`Error fetching statement ${req.params.statementId}:`, error);
    // A malformed statement key is the caller's error, not a server fault.
    const badKey = /Invalid statement key|Invalid period/.test(error.message);
    res.status(badKey ? 400 : 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export { getClientStatementsHandler, getStatementDetailsHandler };
