import {
  getAddonsByClient,
  createAddon,
  getAddonById,
  updateAddon,
  deleteAddon,
  getCompanyInfo,
  getClientById,
  checkInvoiceNumberExists,
  getUnlinkedAddonsByClient,
} from "../../models/add-ons/addonModel.js";

const getClientAddonsHandler = async (req, res) => {
  try {
    console.log(
      "Received request for client add-ons with params:",
      req.params,
      "query:",
      req.query
    );

    const { clientId } = req.params;
    const { year, month } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    const result = await getAddonsByClient(clientId, { year, month });
    console.log(`Query returned ${result.data.length} add-ons`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching client add-ons:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};


const createAddonHandler = async (req, res) => {
  try {
    console.log("Creating add-on with data:", req.body);
    const { client_id, items, date, vat_applied, booking_ref, client_ref, vessel_number, invoice_number } = req.body;

    if (
      !client_id ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !date ||
      typeof vat_applied !== "boolean" ||
      !booking_ref ||
      !client_ref
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: client_id, items (non-empty array), date, vat_applied (boolean), booking_ref, client_ref",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.category || !item.description || !item.item_amount) {
        return res.status(400).json({
          success: false,
          message: "Each item must have category, description, and item_amount",
        });
      }
      const numAmount = Number.parseFloat(item.item_amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Item amount must be a positive number",
        });
      }
    }

    // Validate lengths
    if (String(booking_ref).trim().length > 50 || String(client_ref).trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "booking_ref and client_ref must be at most 50 characters",
      });
    }

    const result = await createAddon({
      client_id,
      items: items.map((item) => ({
        category: item.category.trim(),
        description: item.description.trim(),
        units: item.units != null ? Number.parseFloat(item.units) : null,
        rate: item.rate != null ? Number.parseFloat(item.rate) : null,
        item_amount: Number.parseFloat(item.item_amount),
      })),
      date,
      vat_applied,
      booking_ref: String(booking_ref).trim(),
      client_ref: String(client_ref).trim(),
      vessel_number: vessel_number ? String(vessel_number).trim() : null,
      invoice_number: invoice_number ? String(invoice_number).trim() : null,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error creating add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getAddonByIdHandler = async (req, res) => {
  try {
    console.log(
      "Received request for add-on details with ID:",
      req.params.addonId
    );
    const { addonId } = req.params;

    if (!addonId) {
      return res.status(400).json({
        success: false,
        message: "Add-on ID is required",
      });
    }

    const result = await getAddonById(addonId);
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
    console.error("Error fetching add-on details:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const updateAddonHandler = async (req, res) => {
  try {
    console.log(
      "Updating add-on with ID:",
      req.params.addonId,
      "data:",
      req.body
    );
    const { addonId } = req.params;
    const { items, date, vat_applied, booking_ref, client_ref, invoice_number, vessel_number } = req.body;

    // Support partial updates (e.g., just invoice_number)
    const isPartialUpdate = !items && (invoice_number !== undefined || vessel_number !== undefined);
    
    if (!isPartialUpdate) {
      // Full update validation
      if (
        !addonId ||
        !items ||
        !Array.isArray(items) ||
        items.length === 0 ||
        !date ||
        typeof vat_applied !== "boolean" ||
        !booking_ref ||
        !client_ref
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required: addonId, items (non-empty array), date, vat_applied (boolean), booking_ref, client_ref",
        });
      }

      // Validate each item
      for (const item of items) {
        if (!item.category || !item.description || !item.item_amount) {
          return res.status(400).json({
            success: false,
            message: "Each item must have category, description, and item_amount",
          });
        }
        const numAmount = Number.parseFloat(item.item_amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Item amount must be a positive number",
          });
        }
      }

      if (String(booking_ref).trim().length > 50 || String(client_ref).trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "booking_ref and client_ref must be at most 50 characters",
        });
      }
    }

    const updateData = isPartialUpdate 
      ? { invoice_number, vessel_number }
      : {
          items: items.map((item) => ({
            category: item.category.trim(),
            description: item.description.trim(),
            units: item.units != null ? Number.parseFloat(item.units) : null,
            rate: item.rate != null ? Number.parseFloat(item.rate) : null,
            item_amount: Number.parseFloat(item.item_amount),
          })),
          date,
          vat_applied,
          booking_ref: String(booking_ref).trim(),
          client_ref: String(client_ref).trim(),
          invoice_number,
          vessel_number,
        };

    const result = await updateAddon(addonId, updateData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: "Add-on updated successfully",
    });
  } catch (error) {
    console.error("Error updating add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const deleteAddonHandler = async (req, res) => {
  try {
    console.log("Deleting add-on with ID:", req.params.addonId);
    const { addonId } = req.params;

    if (!addonId) {
      return res.status(400).json({
        success: false,
        message: "Add-on ID is required",
      });
    }

    const result = await deleteAddon(addonId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "Add-on deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting add-on:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getCompanyInfoHandler = async (req, res) => {
  try {
    console.log("Received request for company info");
    const result = await getCompanyInfo();
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching company info:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getClientByIdHandler = async (req, res) => {
  try {
    console.log(
      "Received request for client info with ID:",
      req.params.clientId
    );
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    const result = await getClientById(clientId);
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
    console.error("Error fetching client info:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getUnlinkedAddonsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { instructionId } = req.query;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required",
      });
    }

    const result = await getUnlinkedAddonsByClient(clientId, instructionId);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching unlinked add-ons:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const checkInvoiceNumberHandler = async (req, res) => {
  try {
    console.log("Checking invoice number:", req.params.invoiceNumber);
    const { invoiceNumber } = req.params;
    const { excludeAddonId } = req.query;

    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required",
      });
    }

    const result = await checkInvoiceNumberExists(invoiceNumber, excludeAddonId);
    
    res.json({
      success: result.success,
      exists: result.exists,
      message: result.message,
    });
  } catch (error) {
    console.error("Error checking invoice number:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  getClientAddonsHandler,
  createAddonHandler,
  getAddonByIdHandler,
  updateAddonHandler,
  deleteAddonHandler,
  getCompanyInfoHandler,
  getClientByIdHandler,
  checkInvoiceNumberHandler,
  getUnlinkedAddonsHandler,
};
