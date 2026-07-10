import { getClientInstructions } from "../../models/statement-invoice/clientInstructionModel.js";

const getClientInstructionsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month, type } = req.query;

    console.log(
      `Fetching instructions for client ${clientId} with filters:`,
      req.query
    );

    const result = await getClientInstructions(clientId, { year, month, type });
    console.log(
      `Query returned ${result.data.length} instructions for client ${clientId}`
    );

    // Process the results to format dates and add additional information
    const formattedResults = result.data.map((row) => ({
      ...row,
      pickupdate: row.pickupdate
        ? new Date(row.pickupdate).toISOString().split("T")[0]
        : null,
      invoice_date: row.invoice_date
        ? new Date(row.invoice_date).toISOString().split("T")[0]
        : null,
      has_invoice: !!row.ikey,
      has_statement: !!row.statement_id,
      total_cost: Number.parseFloat(row.total_cost || 0).toFixed(2),
      base_total_cost: Number.parseFloat(row.base_total_cost || 0).toFixed(2),
      vat_percentage: Number.parseFloat(row.vat_percentage || 0).toFixed(2),
    }));

    res.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error(
      `Error fetching instructions for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export { getClientInstructionsHandler };
