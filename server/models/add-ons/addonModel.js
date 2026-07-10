import { pool, query } from "../../config/database.js";

const getAddonsByClient = async (clientId, filters = {}) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        addon_id,
        client_id,
        items,
        amount,
        date,
        invoice_number,
        created_at,
        group_id,
        vat_applied,
        booking_ref,
        client_ref,
        vessel_number
      FROM public.add_ons 
      WHERE client_id = $1
    `;

    const queryParams = [clientId];
    let paramIndex = 2;

    if (filters.year) {
      queryText += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
      queryParams.push(filters.year);
      paramIndex++;
    }

    if (filters.month) {
      queryText += ` AND EXTRACT(MONTH FROM date) = $${paramIndex}`;
      queryParams.push(filters.month);
      paramIndex++;
    }

    queryText += ` ORDER BY date DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);
    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};


const createAddon = async (addonData) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    let invoiceNumber;

    // Handle custom invoice number or auto-generate
    if (addonData.invoice_number && addonData.invoice_number.trim()) {
      // Validate custom invoice number for duplicates
      const validation = await checkInvoiceNumberExists(addonData.invoice_number.trim());
      if (!validation.success) {
        return {
          success: false,
          message: "Failed to validate invoice number",
        };
      }
      if (validation.exists) {
        return {
          success: false,
          message: "Invoice number already exists. Please use a different number.",
        };
      }
      invoiceNumber = addonData.invoice_number.trim();
    } else {
      // Auto-generate invoice_number
      const seqQueryText = `
        SELECT COUNT(*) as count
        FROM public.add_ons
        WHERE invoice_number LIKE $1
      `;
      const seqResult = await query(seqQueryText, [`ADN-${dateStr}-%`]);
      const seqNum = Number.parseInt(seqResult.rows[0].count, 10) + 1;
      invoiceNumber = `ADN-${dateStr}-${String(seqNum).padStart(3, "0")}`;
    }

    // Generate group_id
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    const monthName = monthNames[currentMonth - 1];
    const groupId = `${addonData.client_id}-${monthName}${currentYear}`;

    // Calculate total amount from items
    const subtotal = addonData.items.reduce(
      (sum, item) => sum + Number(item.item_amount),
      0
    );
    const totalAmount = addonData.vat_applied ? subtotal * 1.15 : subtotal;

    // Insert into add_ons table
    const insertQueryText = `
      INSERT INTO public.add_ons (
        client_id, 
        items, 
        amount, 
        date, 
        invoice_number,
        group_id,
        created_at,
        vat_applied,
        booking_ref,
        client_ref,
        vessel_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING addon_id, items, amount, date, invoice_number, group_id, vat_applied, booking_ref, client_ref, vessel_number
    `;

    const result = await query(insertQueryText, [
      addonData.client_id,
      JSON.stringify(addonData.items),
      totalAmount,
      addonData.date,
      invoiceNumber,
      groupId,
      today,
      addonData.vat_applied,
      addonData.booking_ref,
      addonData.client_ref,
      addonData.vessel_number || null,
    ]);

    return {
      success: true,
      data: {
        addon_id: result.rows[0].addon_id,
        items: result.rows[0].items,
        amount: result.rows[0].amount,
        date: result.rows[0].date,
        invoice_number: result.rows[0].invoice_number,
        group_id: result.rows[0].group_id,
        client_id: addonData.client_id,
        vat_applied: result.rows[0].vat_applied,
        booking_ref: result.rows[0].booking_ref,
        client_ref: result.rows[0].client_ref,
        vessel_number: result.rows[0].vessel_number,
      },
    };
  } catch (error) {
    console.error("Error creating add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const getAddonById = async (addonId) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    const queryText = `
      SELECT 
        a.addon_id,
        a.client_id,
        a.items,
        a.amount,
        a.date,
        a.invoice_number,
        a.created_at,
        a.vat_applied,
        a.booking_ref,
        a.client_ref,
        a.vessel_number,
        c.client as client_name
      FROM public.add_ons a
      LEFT JOIN public.m5_client c ON a.client_id = c.m5clientkey
      WHERE a.addon_id = $1
    `;

    const result = await query(queryText, [addonId]);

    if (result.rows.length === 0) {
      return { success: false, message: "Add-on not found" };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const updateAddon = async (addonId, addonData) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    if (!addonId) {
      return {
        success: false,
        message: "Add-on ID is required",
      };
    }

    // Check if this is a partial update (only invoice_number and/or vessel_number)
    const isPartialUpdate = !addonData.items && (addonData.invoice_number !== undefined || addonData.vessel_number !== undefined);

    let queryText;
    let params;

    if (isPartialUpdate) {
      // Partial update - only update invoice_number and/or vessel_number
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (addonData.invoice_number !== undefined) {
        // Validate invoice number if it's being updated
        if (addonData.invoice_number && addonData.invoice_number.trim()) {
          const validation = await checkInvoiceNumberExists(addonData.invoice_number.trim(), addonId);
          if (!validation.success) {
            return {
              success: false,
              message: "Failed to validate invoice number",
            };
          }
          if (validation.exists) {
            return {
              success: false,
              message: "Invoice number already exists. Please use a different number.",
            };
          }
        }
        updates.push(`invoice_number = $${paramIndex}`);
        values.push(addonData.invoice_number ? addonData.invoice_number.trim() : null);
        paramIndex++;
      }

      if (addonData.vessel_number !== undefined) {
        updates.push(`vessel_number = $${paramIndex}`);
        values.push(addonData.vessel_number);
        paramIndex++;
      }

      values.push(addonId);

      queryText = `
        UPDATE public.add_ons 
        SET ${updates.join(', ')}
        WHERE addon_id = $${paramIndex}
        RETURNING addon_id, items, amount, date, invoice_number, vat_applied, booking_ref, client_ref, vessel_number
      `;
      params = values;
    } else {
      // Full update - validate invoice number if provided
      if (addonData.invoice_number && addonData.invoice_number.trim()) {
        const validation = await checkInvoiceNumberExists(addonData.invoice_number.trim(), addonId);
        if (!validation.success) {
          return {
            success: false,
            message: "Failed to validate invoice number",
          };
        }
        if (validation.exists) {
          return {
            success: false,
            message: "Invoice number already exists. Please use a different number.",
          };
        }
      }

      const subtotal = addonData.items.reduce(
        (sum, item) => sum + Number(item.item_amount),
        0
      );
      const totalAmount = addonData.vat_applied ? subtotal * 1.15 : subtotal;

      queryText = `
        UPDATE public.add_ons 
        SET items = $1, amount = $2, date = $3, vat_applied = $4, booking_ref = $5, client_ref = $6, invoice_number = $7, vessel_number = $8
        WHERE addon_id = $9
        RETURNING addon_id, items, amount, date, invoice_number, vat_applied, booking_ref, client_ref, vessel_number
      `;

      params = [
        JSON.stringify(addonData.items),
        totalAmount,
        addonData.date,
        addonData.vat_applied,
        addonData.booking_ref,
        addonData.client_ref,
        addonData.invoice_number ? addonData.invoice_number.trim() : null,
        addonData.vessel_number,
        addonId,
      ];
    }

    console.log("Executing update query:", queryText, "with params:", params);
    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Add-on not found",
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error updating add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const deleteAddon = async (addonId) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `DELETE FROM public.add_ons WHERE addon_id = $1`;
    const result = await query(queryText, [addonId]);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: "Add-on not found",
      };
    }

    return {
      success: true,
      message: "Add-on deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting add-on:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

const getCompanyInfo = async () => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    const queryText = `
      SELECT 
        companyname AS name,
        address,
        suburb AS city,
        cell_num AS phone,
        email,
        vat_reg_num,
        account_num,
        name_of_acc,
        bank,
        branch_code,
        swift_code
      FROM public.usertable 
      WHERE userid = 1 AND status = 'active'
    `;
    const result = await query(queryText);
    if (result.rows.length === 0) {
      return { success: false, message: "Company info not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching company info:", error);
    throw error;
  }
};

const checkInvoiceNumberExists = async (invoiceNumber, excludeAddonId = null) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT COUNT(*) as count
      FROM public.add_ons
      WHERE invoice_number = $1
    `;
    let queryParams = [invoiceNumber.trim()];

    if (excludeAddonId) {
      queryText += ` AND addon_id != $2`;
      queryParams.push(excludeAddonId);
    }

    const result = await query(queryText, queryParams);
    const exists = result.rows[0].count > 0;
    
    return {
      success: true,
      exists,
      message: exists ? "Invoice number already exists" : "Invoice number is available"
    };
  } catch (error) {
    console.error("Error checking invoice number:", error);
    return {
      success: false,
      message: "Failed to validate invoice number"
    };
  }
};

// Returns add-on invoices for a client that are NOT yet linked to any
// instruction (m1_controller.addon_id). Used to populate the invoice picker
// on the add-on instruction form. When instructionId is provided, the invoice
// currently linked to that instruction is also included so it shows as the
// selected option while editing.
const getUnlinkedAddonsByClient = async (clientId, instructionId = null) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `
      SELECT
        a.addon_id,
        a.client_id,
        a.amount,
        a.date,
        a.invoice_number,
        a.booking_ref,
        a.client_ref,
        a.vessel_number
      FROM public.add_ons a
      WHERE a.client_id = $1
        AND (
          NOT EXISTS (
            SELECT 1 FROM public.m1_controller m WHERE m.addon_id = a.addon_id
          )
          OR a.addon_id = (
            SELECT m2.addon_id FROM public.m1_controller m2 WHERE m2.m1key = $2
          )
        )
      ORDER BY a.date DESC
    `;

    const result = await query(queryText, [clientId, instructionId || null]);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error("Error fetching unlinked add-ons:", error);
    throw error;
  }
};

const getClientById = async (clientId) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    const queryText = `
      SELECT 
        client AS name,
        streetaddress AS address,
        city,
        cellnum AS telephone,
        email,
        vatregno AS vat_reg_num
      FROM public.m5_client
      WHERE m5clientkey = $1 AND status = true
    `;
    const result = await query(queryText, [clientId]);
    if (result.rows.length === 0) {
      return { success: false, message: "Client not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error("Error fetching client info:", error);
    throw error;
  }
};

export {
  getAddonsByClient,
  createAddon,
  getAddonById,
  updateAddon,
  deleteAddon,
  getCompanyInfo,
  getClientById,
  checkInvoiceNumberExists,
  getUnlinkedAddonsByClient,
};
