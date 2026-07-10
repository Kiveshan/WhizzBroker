import {
  getCompletedInvoices,
  getInvoiceDetails,
  checkInvoiceExists,
  createInvoice,
  updateInstructionDetails,
  getInstructionDetailsForPreview,
} from "../../models/invoices/invoiceModel.js";
import { auditFromReq } from "../../utils/auditLogger.js";

const getCompletedInvoicesHandler = async (req, res) => {
  try {
    console.log(
      "Received request for completed invoices with query:",
      req.query
    );

    const { year, month, type, clientId } = req.query;
    const result = await getCompletedInvoices({ year, month, type, clientId });
    console.log(`Query returned ${result.data.length} rows`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching completed instructions:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getInvoiceDetailsHandler = async (req, res) => {
  try {
    console.log("Received request for invoice details with ID:", req.params.id);
    const { id } = req.params;

    const result = await getInvoiceDetails(id);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    let containers = result.data.containers;
    if (containers.length === 0 && result.data.num_containers > 0) {
      console.log(
        `Creating ${result.data.num_containers} dummy containers for invoice ID ${id}`
      );
      containers = Array.from(
        { length: result.data.num_containers },
        (_, i) => ({
          container_number: `CONT${String(i + 1).padStart(6, "0")}`,
          weight: `${Math.floor(Math.random() * 5000) + 10000} kg`,
        })
      );
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        containers,
      },
    });
  } catch (error) {
    console.error("Error fetching instruction for invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Handler to check if an m1key exists in the invoice table
const checkInvoiceExistsHandler = async (req, res) => {
  try {
    const { m1key } = req.params;
    console.log(`Checking if invoice exists for m1key: ${m1key}`);

    if (!m1key) {
      return res.status(400).json({
        success: false,
        message: "m1key parameter is required",
      });
    }

    const result = await checkInvoiceExists(m1key);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      exists: result.exists,
    });
  } catch (error) {
    console.error("Error checking if invoice exists:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Handler to create a new invoice for an instruction
const createInvoiceHandler = async (req, res) => {
  try {
    const { m1key, clientId } = req.body;
    console.log(`Creating invoice for m1key: ${m1key}, clientId: ${clientId}`);

    if (!m1key || !clientId) {
      return res.status(400).json({
        success: false,
        message: "m1key and clientId are required",
      });
    }

    const result = await createInvoice({ m1key, clientId });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    auditFromReq(req, {
      actionType: "INVOICE_CREATED",
      entityType: "invoice",
      targetId: m1key,
      targetName: `client ${clientId}`,
      details: `Invoice created for instruction ${m1key}, client ${clientId}`,
    });

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Handler to update instruction details
// In invoiceController.js - Update the updateInstructionDetailsHandler function
const updateInstructionDetailsHandler = async (req, res) => {
  try {
    const { m1key, dropoff, rate, invoice_num, additional_destination_info, date } = req.body; // Add new field
    console.log(`Updating instruction details for m1key: ${m1key}`, {
      dropoff,
      rate,
      invoice_num,
      additional_destination_info, // Log the new field
      date,
    });

    if (!m1key) {
      return res.status(400).json({
        success: false,
        message: "m1key is required",
      });
    }

    // Validate rate if provided
    if (rate !== undefined) {
      const numRate = Number.parseFloat(rate);
      if (isNaN(numRate) || numRate < 0) {
        return res.status(400).json({
          success: false,
          message: "Rate must be a positive number",
        });
      }
    }

    // Validate invoice_num if provided
    if (
      invoice_num !== undefined &&
      (!invoice_num || typeof invoice_num !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoice number must be a non-empty string",
      });
    }

    // Validate additional_destination_info if provided
    if (
      additional_destination_info !== undefined &&
      (additional_destination_info === "" || typeof additional_destination_info !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Additional destination info must be a valid string",
      });
    }

    // Validate date if provided
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Date must be a valid date string",
        });
      }
    }

    const result = await updateInstructionDetails({
      m1key,
      dropoff,
      rate,
      invoice_num,
      additional_destination_info, // Pass the new field
      date,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    auditFromReq(req, {
      actionType: "INVOICE_UPDATED",
      entityType: "invoice",
      targetId: m1key,
      targetName: invoice_num || `instruction ${m1key}`,
      details: `Invoice/instruction ${m1key} updated${rate !== undefined ? ` (rate: ${rate})` : ""}${invoice_num ? ` (invoice_num: ${invoice_num})` : ""}`,
    });

    res.json({
      success: true,
      data: result.data,
      message: "Instruction and/or invoice updated successfully",
    });
  } catch (error) {
    console.error("Error updating instruction details:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// Add this to your invoiceController.js
const generateInvoicePreviewHandler = async (req, res) => {
  try {
    const { instructionId } = req.params;
    const { clientId, shipmentType, preview } = req.body;
    
    console.log(`Generating invoice preview for instruction: ${instructionId}`, {
      clientId,
      shipmentType,
      preview
    });

    // Previously blocked preview when an invoice already existed. We now allow preview regardless.
    // const existsCheck = await checkInvoiceExists(instructionId);
    // if (existsCheck.exists) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invoice already exists for this instruction. Cannot preview."
    //   });
    // }

    // Get instruction details for preview
    const instructionDetails = await getInstructionDetailsForPreview(instructionId);
    
    if (!instructionDetails.success) {
      return res.status(400).json({
        success: false,
        message: instructionDetails.message || "Failed to load instruction details"
      });
    }

    // Generate temporary invoice number for preview
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const previewInvoiceNum = `PREVIEW-${dateStr}-${instructionId}`;

    // Mirror invoice date logic: use earliest leg 1 date if available
    const previewInvoiceDate = instructionDetails.data.preview_invoice_date
      ? new Date(instructionDetails.data.preview_invoice_date)
      : today;

    // Create preview invoice data
    const previewData = {
      ...instructionDetails.data,
      invoice_num: previewInvoiceNum,
      date: previewInvoiceDate,
      additional_destination_info: instructionDetails.data.additional_destination_info || "",
      // Add preview flag
      is_preview: true,
      preview_instruction_id: instructionId,
      // Ensure containers are processed
      containers: instructionDetails.data.containers || []
    };

    console.log(`Invoice preview generated successfully for instruction ${instructionId}`);

    res.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    console.error("Error generating invoice preview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice preview",
      error: process.env.NODE_ENV === "production" ? null : error.stack
    });
  }
};



export {
  getCompletedInvoicesHandler,
  getInvoiceDetailsHandler,
  checkInvoiceExistsHandler,
  createInvoiceHandler,
  updateInstructionDetailsHandler,
  generateInvoicePreviewHandler, // Export the new handler
};
