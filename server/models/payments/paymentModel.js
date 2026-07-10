import { pool } from "../../config/database.js";

const createPayment = async (
  clientId,
  { fileupload, reference, line_items }
) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    if (!Array.isArray(line_items) || line_items.length === 0) {
      throw new Error("At least one payment line item is required");
    }

    // Wrap everything in a transaction so payment and allocations stay in sync
    await client.query("BEGIN");

    // Fetch client name
    const clientQuery = `SELECT client FROM m5_client WHERE m5clientkey = $1`;
    const clientResult = await client.query(clientQuery, [clientId]);
    if (clientResult.rows.length === 0) {
      throw new Error("Client not found");
    }

    // Resolve and validate each line item (invoice/add-on), computing amount due
    const processedItems = [];
    for (const item of line_items) {
      const { type, id, amount_to_pay, line_date } = item;
      if (!type || !id) {
        throw new Error("Each line item must include a type and id");
      }
      const numericAmount = Number(amount_to_pay);
      if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error(
          "Each line item must have a positive numeric amount_to_pay"
        );
      }

      // Require a valid date per line item
      if (!line_date) {
        throw new Error("Each line item must include a payment date");
      }
      const parsedLineDate = new Date(line_date);
      if (Number.isNaN(parsedLineDate.getTime())) {
        throw new Error("Each line item must have a valid payment date");
      }

      if (type === "Invoice") {
        // Load invoice + controller to compute VAT-inclusive total and amount due
        const invoiceQuery = `
          SELECT 
            i.ikey AS invoice_id,
            i.invoice_num,
            i.date,
            m.m1key,
            m.total_cost,
            COALESCE(m.vat, 0) AS vat,
            COALESCE(m.paid_amount, 0) AS paid_amount
          FROM invoice i
          JOIN m1_controller m ON i.m1key = m.m1key
          WHERE i.ikey = $1 AND i.clientid = $2
        `;
        const invoiceResult = await client.query(invoiceQuery, [id, clientId]);
        if (invoiceResult.rows.length === 0) {
          throw new Error("Invoice not found for this client");
        }
        const row = invoiceResult.rows[0];
        const baseTotal = Number(row.total_cost) || 0;
        const vatRate = Number(row.vat) || 0;
        const vatAmount = baseTotal * (vatRate / 100);
        const totalWithVat = baseTotal + vatAmount;
        const currentPaid = Number(row.paid_amount) || 0;
        const amountDue = totalWithVat - currentPaid;
        if (amountDue <= 0) {
          throw new Error(
            `Invoice ${row.invoice_num} has no outstanding balance`
          );
        }
        if (numericAmount > amountDue + 0.01) {
          throw new Error(
            `Payment amount for invoice ${row.invoice_num} exceeds amount due`
          );
        }

        processedItems.push({
          type: "Invoice",
          invoice_id: row.invoice_id,
          invoice_num: row.invoice_num,
          m1key: row.m1key,
          amount_to_pay: numericAmount,
          current_paid: currentPaid,
          total_with_vat: totalWithVat,
          amount_due: amountDue,
          line_date: parsedLineDate.toISOString(),
        });
      } else if (type === "Add-on") {
        // Load add-on to compute amount due
        const addonQuery = `
          SELECT 
            addon_id,
            invoice_number,
            amount,
            COALESCE(paid_amount, 0) AS paid_amount
          FROM add_ons
          WHERE addon_id = $1 AND client_id = $2
        `;
        const addonResult = await client.query(addonQuery, [id, clientId]);
        if (addonResult.rows.length === 0) {
          throw new Error("Add-on not found for this client");
        }
        const row = addonResult.rows[0];
        const total = Number(row.amount) || 0;
        const currentPaid = Number(row.paid_amount) || 0;
        const amountDue = total - currentPaid;
        if (amountDue <= 0) {
          throw new Error(
            `Add-on ${row.invoice_number} has no outstanding balance`
          );
        }
        if (numericAmount > amountDue + 0.01) {
          throw new Error(
            `Payment amount for add-on ${row.invoice_number} exceeds amount due`
          );
        }

        processedItems.push({
          type: "Add-on",
          addon_id: row.addon_id,
          invoice_num: row.invoice_number,
          amount_to_pay: numericAmount,
          current_paid: currentPaid,
          total: total,
          amount_due: amountDue,
          line_date: parsedLineDate.toISOString(),
        });
      } else {
        throw new Error(
          "Line item type must be either 'Invoice' or 'Add-on'"
        );
      }
    }

    // Compute overall payment amount
    const totalAmount = processedItems.reduce(
      (sum, item) => sum + item.amount_to_pay,
      0
    );

    // Build enriched line items JSON that includes invoice/add-on numbers, totals, and per-line dates
    const enrichedLineItems = line_items.map((item) => {
      const { type, id } = item;
      const processed = processedItems.find((p) => {
        if (type === "Invoice") {
          return p.type === "Invoice" && p.invoice_id === id;
        }
        if (type === "Add-on") {
          return p.type === "Add-on" && p.addon_id === id;
        }
        return false;
      });

      if (!processed) {
        // Fallback: return original item if for some reason it wasn't processed
        return item;
      }

      if (processed.type === "Invoice") {
        const total = processed.total_with_vat;
        const paidAmount = processed.current_paid + processed.amount_to_pay;
        const remainingDue = Math.max(total - paidAmount, 0);
        return {
          ...item,
          invoice_num: processed.invoice_num,
          total,
          paid_amount: paidAmount,
          amount_due: remainingDue,
          line_date: processed.line_date,
          // Additional keys that mirror UI labels for clarity
          paid_to_date: paidAmount,
          balance_after_payment: remainingDue,
          this_payment: item.amount_to_pay,
          payment_ref: item.line_reference || "",
        };
      }

      // Add-on
      const total = processed.total;
      const paidAmount = processed.current_paid + processed.amount_to_pay;
      const remainingDue = Math.max(total - paidAmount, 0);
      return {
        ...item,
        invoice_num: processed.invoice_num,
        total,
        paid_amount: paidAmount,
        amount_due: remainingDue,
        line_date: processed.line_date,
        // Additional keys that mirror UI labels for clarity
        paid_to_date: paidAmount,
        balance_after_payment: remainingDue,
        this_payment: item.amount_to_pay,
        payment_ref: item.line_reference || "",
      };
    });

    // For backwards compatibility, set a primary invoice/add-on id from the first item
    let primaryInvoiceId = null;
    let primaryAddonId = null;
    if (processedItems.length > 0) {
      if (processedItems[0].type === "Invoice") {
        primaryInvoiceId = processedItems[0].invoice_id;
      } else if (processedItems[0].type === "Add-on") {
        primaryAddonId = processedItems[0].addon_id;
      }
    }

    // Determine a generation date for the payment header (fileupload).
    // If fileupload was not supplied, default to now. If supplied, use it as-is.
    const headerDate = fileupload ? new Date(fileupload) : new Date();

    const insertQuery = `
      INSERT INTO payment_m3 (clientid, amount, reference, fileupload, invoiceid, addon_id, line_items)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING *
    `;
    const insertParams = [
      clientId,
      totalAmount,
      reference,
      headerDate,
      primaryInvoiceId,
      primaryAddonId,
      JSON.stringify(enrichedLineItems),
    ];

    const insertResult = await client.query(insertQuery, insertParams);

    // Apply allocations back to invoices/add-ons
    for (const item of processedItems) {
      if (item.type === "Invoice") {
        const newPaid = item.current_paid + item.amount_to_pay;
        const isPaid = newPaid >= item.total_with_vat - 0.01;
        const status = isPaid ? "paid" : "partial";
        const updateInvoiceQuery = `
          UPDATE m1_controller
          SET paid_amount = $1, payment_status = $2
          FROM invoice i
          WHERE i.m1key = m1_controller.m1key
            AND i.ikey = $3
            AND i.clientid = $4
        `;
        await client.query(updateInvoiceQuery, [
          newPaid,
          status,
          item.invoice_id,
          clientId,
        ]);
      } else if (item.type === "Add-on") {
        const newPaid = item.current_paid + item.amount_to_pay;
        const isPaid = newPaid >= item.total - 0.01;
        const status = isPaid ? "paid" : "partial";
        const updateAddonQuery = `
          UPDATE add_ons
          SET paid_amount = $1, status = $2
          WHERE addon_id = $3 AND client_id = $4
        `;
        await client.query(updateAddonQuery, [
          newPaid,
          status,
          item.addon_id,
          clientId,
        ]);
      }
    }

    await client.query("COMMIT");

    // For compatibility with existing consumers, return primary invoice_num if available
    const primaryItem = processedItems[0];
    const invoiceNum = primaryItem ? primaryItem.invoice_num : null;

    return {
      success: true,
      data: {
        ...insertResult.rows[0],
        clientname: clientResult.rows[0].client,
        invoice_num: invoiceNum,
      },
    };
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getPayment = async (clientId, paymentId) => {
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
        p.paykey,
        p.fileupload,
        p.amount,
        p.reference,
        p.invoiceid,
        p.addon_id,
        p.line_items,
        COALESCE(i.invoice_num, a.invoice_number) AS invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN add_ons a ON p.addon_id = a.addon_id
      LEFT JOIN m5_client c ON p.clientid = c.m5clientkey
      WHERE 
        p.clientid = $1 AND p.paykey = $2
    `;
    const queryParams = [clientId, paymentId];

    const result = await client.query(queryText, queryParams);
    if (result.rows.length === 0) {
      return { success: false, message: "Payment not found" };
    }

    return { success: true, data: result.rows[0] };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getClientPayments = async (clientId, { year, month }) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    let queryText = `
      SELECT 
        p.paykey,
        p.fileupload,
        p.amount,
        p.reference,
        p.invoiceid,
        p.addon_id,
        p.line_items,
        COALESCE(i.invoice_num, a.invoice_number) AS invoice_num,
        c.client
      FROM 
        payment_m3 p
      LEFT JOIN invoice i ON p.invoiceid = i.ikey
      LEFT JOIN add_ons a ON p.addon_id = a.addon_id
      LEFT JOIN m5_client c ON p.clientid = c.m5clientkey
      WHERE 
        p.clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM p.fileupload) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM p.fileupload) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY p.fileupload DESC`;

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getClientInvoices = async (clientId) => {
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
        'Invoice' AS type,
        i.ikey AS id,
        i.invoice_num,
        i.date,
        m.total_cost,
        COALESCE(m.vat, 0) AS vat,
        COALESCE(m.paid_amount, 0) AS paid_amount,
        (m.total_cost + (m.total_cost * (COALESCE(m.vat, 0)::numeric / 100))) AS total,
        (m.total_cost + (m.total_cost * (COALESCE(m.vat, 0)::numeric / 100)) - COALESCE(m.paid_amount, 0)) AS amount_due
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE i.clientid = $1
        AND (m.total_cost + (m.total_cost * (COALESCE(m.vat, 0)::numeric / 100)) - COALESCE(m.paid_amount, 0)) > 0
      UNION ALL
      SELECT 
        'Add-on' AS type,
        a.addon_id AS id,
        a.invoice_number AS invoice_num,
        a.date,
        a.amount AS total_cost,
        0 AS vat,
        COALESCE(a.paid_amount, 0) AS paid_amount,
        a.amount AS total,
        (a.amount - COALESCE(a.paid_amount, 0)) AS amount_due
      FROM add_ons a
      WHERE a.client_id = $1
        AND (a.amount - COALESCE(a.paid_amount, 0)) > 0
      ORDER BY date DESC
    `;
    const queryParams = [clientId];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const deletePayment = async (clientId, paymentId) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    await client.query("BEGIN");

    // Load the payment and its line_items
    const paymentQuery = `
      SELECT paykey, line_items
      FROM payment_m3
      WHERE clientid = $1 AND paykey = $2
      FOR UPDATE
    `;
    const paymentResult = await client.query(paymentQuery, [clientId, paymentId]);
    if (paymentResult.rows.length === 0) {
      throw new Error("Payment not found");
    }

    const paymentRow = paymentResult.rows[0];
    let lineItems = [];
    if (paymentRow.line_items) {
      if (Array.isArray(paymentRow.line_items)) {
        lineItems = paymentRow.line_items;
      } else {
        // line_items is stored as jsonb; in some drivers it's already parsed, but guard just in case
        try {
          lineItems = JSON.parse(paymentRow.line_items);
        } catch (_) {
          lineItems = [];
        }
      }
    }

    // Reverse allocations for each line item
    for (const item of lineItems) {
      const { type, id, amount_to_pay } = item;
      const numericAmount = Number(amount_to_pay) || 0;
      if (!type || !id || !numericAmount) continue;

      if (type === "Invoice") {
        // Load invoice + controller to recompute totals and current paid
        const invoiceQuery = `
          SELECT 
            i.ikey AS invoice_id,
            m.m1key,
            m.total_cost,
            COALESCE(m.vat, 0) AS vat,
            COALESCE(m.paid_amount, 0) AS paid_amount
          FROM invoice i
          JOIN m1_controller m ON i.m1key = m.m1key
          WHERE i.ikey = $1 AND i.clientid = $2
        `;
        const invoiceResult = await client.query(invoiceQuery, [id, clientId]);
        if (invoiceResult.rows.length === 0) {
          // If the invoice is gone, skip reversing for this line
          continue;
        }

        const row = invoiceResult.rows[0];
        const baseTotal = Number(row.total_cost) || 0;
        const vatRate = Number(row.vat) || 0;
        const vatAmount = baseTotal * (vatRate / 100);
        const totalWithVat = baseTotal + vatAmount;
        const currentPaid = Number(row.paid_amount) || 0;

        // Reverse this payment's contribution
        const newPaidRaw = currentPaid - numericAmount;
        const newPaid = newPaidRaw < 0 ? 0 : newPaidRaw;

        let status = null;
        if (newPaid <= 0 + 0.01) {
          status = "unpaid";
        } else if (newPaid >= totalWithVat - 0.01) {
          status = "paid";
        } else {
          status = "partial";
        }

        const updateInvoiceQuery = `
          UPDATE m1_controller
          SET paid_amount = $1, payment_status = $2
          FROM invoice i
          WHERE i.m1key = m1_controller.m1key
            AND i.ikey = $3
            AND i.clientid = $4
        `;
        await client.query(updateInvoiceQuery, [
          newPaid,
          status,
          row.invoice_id,
          clientId,
        ]);
      } else if (type === "Add-on") {
        // Load add-on to recompute totals and current paid
        const addonQuery = `
          SELECT 
            addon_id,
            amount,
            COALESCE(paid_amount, 0) AS paid_amount
          FROM add_ons
          WHERE addon_id = $1 AND client_id = $2
        `;
        const addonResult = await client.query(addonQuery, [id, clientId]);
        if (addonResult.rows.length === 0) {
          continue;
        }

        const row = addonResult.rows[0];
        const total = Number(row.amount) || 0;
        const currentPaid = Number(row.paid_amount) || 0;

        const newPaidRaw = currentPaid - numericAmount;
        const newPaid = newPaidRaw < 0 ? 0 : newPaidRaw;

        let status = null;
        if (newPaid <= 0 + 0.01) {
          status = "unpaid";
        } else if (newPaid >= total - 0.01) {
          status = "paid";
        } else {
          status = "partial";
        }

        const updateAddonQuery = `
          UPDATE add_ons
          SET paid_amount = $1, status = $2
          WHERE addon_id = $3 AND client_id = $4
        `;
        await client.query(updateAddonQuery, [
          newPaid,
          status,
          row.addon_id,
          clientId,
        ]);
      }
    }

    // Hard delete the payment row
    const deleteQuery = `
      DELETE FROM payment_m3
      WHERE clientid = $1 AND paykey = $2
    `;
    await client.query(deleteQuery, [clientId, paymentId]);

    await client.query("COMMIT");

    return { success: true };
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { createPayment, getPayment, getClientPayments, getClientInvoices, deletePayment };
