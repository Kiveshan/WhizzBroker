import { pool } from "../../config/database.js";

// ---------------------------------------------------------------------------
// Group-aware invoice helpers.
//
// An invoice is either legacy (invoice.m1key set: one child instruction) or a
// combined group invoice (invoice.m1key IS NULL, invoice.instruction_group_id
// set: every m1_controller row in that group). Paid state lives only on the
// children (m1_controller.paid_amount / payment_status), because statements,
// credit notes and analytics all read it per child. A group invoice's total is
// SUM(child total_cost * (1 + vat/100)) and its paid amount SUM(child
// paid_amount), so a credit note posted against any one child reduces the
// group invoice's balance automatically.
//
// Spreading a payment over children: fill in order. Children are taken in
// m1key order and each is paid up to its own outstanding gross before the next
// one receives anything, so earlier children become "paid" and at most one is
// "partial". The exact per-child split is stored on the payment line item as
// child_allocations [{ m1key, amount }], and reversal subtracts exactly those
// amounts, so it undoes the allocation even if credit notes or other payments
// touched the children in between.
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const statusFor = (paid, gross) => {
  if (paid <= 0.01) return "unpaid";
  if (paid >= gross - 0.01) return "paid";
  return "partial";
};

// Loads an invoice and its child instruction(s), locking the children for the
// rest of the transaction. Returns null if the invoice is not this client's.
const loadInvoiceChildren = async (client, invoiceId, clientId) => {
  const invoiceResult = await client.query(
    `SELECT ikey AS invoice_id, invoice_num, date, m1key, instruction_group_id
     FROM invoice
     WHERE ikey = $1 AND clientid = $2`,
    [invoiceId, clientId]
  );
  if (invoiceResult.rows.length === 0) return null;
  const invoice = invoiceResult.rows[0];
  const isGroup = invoice.m1key == null;
  if (isGroup && invoice.instruction_group_id == null) return null;

  const childrenResult = await client.query(
    `SELECT
       m1key,
       COALESCE(total_cost, 0) AS total_cost,
       COALESCE(vat, 0) AS vat,
       COALESCE(paid_amount, 0) AS paid_amount
     FROM m1_controller
     WHERE ${isGroup ? "instruction_group_id = $1" : "m1key = $1"}
     ORDER BY m1key
     FOR UPDATE`,
    [isGroup ? invoice.instruction_group_id : invoice.m1key]
  );
  if (childrenResult.rows.length === 0) return null;

  const children = childrenResult.rows.map((r) => {
    const base = Number(r.total_cost) || 0;
    const vatRate = Number(r.vat) || 0;
    return {
      m1key: r.m1key,
      gross: base + base * (vatRate / 100),
      paid: Number(r.paid_amount) || 0,
    };
  });

  return {
    invoice_id: invoice.invoice_id,
    invoice_num: invoice.invoice_num,
    is_group: isGroup,
    m1key: invoice.m1key,
    children,
    total_with_vat: children.reduce((s, c) => s + c.gross, 0),
    current_paid: children.reduce((s, c) => s + c.paid, 0),
  };
};

// Splits amount across children, filling each child's outstanding gross in
// m1key order. Any rounding remainder (bounded by the 0.01 overpay tolerance
// in createPayment) lands on the last child that received money.
const allocateToChildren = (children, amount) => {
  const allocations = [];
  let left = round2(amount);
  for (const child of children) {
    if (left <= 0) break;
    const room = round2(child.gross - child.paid);
    if (room <= 0) continue;
    const take = round2(Math.min(room, left));
    allocations.push({ m1key: child.m1key, amount: take });
    left = round2(left - take);
  }
  if (left > 0) {
    if (allocations.length > 0) {
      const last = allocations[allocations.length - 1];
      last.amount = round2(last.amount + left);
    } else {
      allocations.push({ m1key: children[children.length - 1].m1key, amount: left });
    }
  }
  return allocations;
};

// Applies signed per-child deltas (+ for allocation, - for reversal) and
// recomputes each touched child's payment_status.
const applyChildDeltas = async (client, children, deltas) => {
  for (const { m1key, amount } of deltas) {
    const child = children.find((c) => String(c.m1key) === String(m1key));
    if (!child) continue;
    const newPaid = Math.max(round2(child.paid + amount), 0);
    child.paid = newPaid;
    await client.query(
      `UPDATE m1_controller SET paid_amount = $1, payment_status = $2 WHERE m1key = $3`,
      [newPaid, statusFor(newPaid, child.gross), m1key]
    );
  }
};

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
        // Load invoice + child instruction(s) (legacy or group) to compute the
        // VAT-inclusive total and amount due
        if (processedItems.some((p) => p.type === "Invoice" && String(p.invoice_id) === String(id))) {
          throw new Error("The same invoice cannot appear twice in one payment");
        }
        const row = await loadInvoiceChildren(client, id, clientId);
        if (!row) {
          throw new Error("Invoice not found for this client");
        }
        const totalWithVat = row.total_with_vat;
        const currentPaid = row.current_paid;
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
          is_group: row.is_group,
          children: row.children,
          child_allocations: allocateToChildren(row.children, numericAmount),
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
          return p.type === "Invoice" && String(p.invoice_id) === String(id);
        }
        if (type === "Add-on") {
          return p.type === "Add-on" && String(p.addon_id) === String(id);
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
          // Server-computed per-child split; deletePayment reverses exactly this
          child_allocations: processed.child_allocations,
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
        await applyChildDeltas(client, item.children, item.child_allocations);
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
      -- Combined group invoices (invoice.m1key IS NULL): totals summed over
      -- every child instruction in the group. vat is reported only when all
      -- children share one rate.
      SELECT
        'Invoice' AS type,
        i.ikey AS id,
        i.invoice_num,
        i.date,
        SUM(m.total_cost) AS total_cost,
        CASE WHEN MIN(COALESCE(m.vat, 0)) = MAX(COALESCE(m.vat, 0))
             THEN MIN(COALESCE(m.vat, 0)) ELSE NULL END AS vat,
        SUM(COALESCE(m.paid_amount, 0)) AS paid_amount,
        SUM(m.total_cost * (1 + COALESCE(m.vat, 0)::numeric / 100)) AS total,
        (SUM(m.total_cost * (1 + COALESCE(m.vat, 0)::numeric / 100)) - SUM(COALESCE(m.paid_amount, 0))) AS amount_due
      FROM invoice i
      JOIN m1_controller m ON m.instruction_group_id = i.instruction_group_id
      WHERE i.clientid = $1
        AND i.m1key IS NULL
      GROUP BY i.ikey, i.invoice_num, i.date
      HAVING (SUM(m.total_cost * (1 + COALESCE(m.vat, 0)::numeric / 100)) - SUM(COALESCE(m.paid_amount, 0))) > 0.005
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
        // Load invoice + child instruction(s) (legacy or group)
        const row = await loadInvoiceChildren(client, id, clientId);
        if (!row) {
          // If the invoice is gone, skip reversing for this line
          continue;
        }

        // Undo exactly the per-child split recorded at allocation time.
        // Payments made before child_allocations existed were always legacy
        // single-child invoices: take the whole amount off that child. A group
        // line without a recorded split (not expected) is unwound in reverse
        // fill order, last child first.
        let reversal;
        if (Array.isArray(item.child_allocations) && item.child_allocations.length > 0) {
          reversal = item.child_allocations.map((a) => ({
            m1key: Number(a.m1key),
            amount: -round2(a.amount),
          }));
        } else if (!row.is_group) {
          reversal = [{ m1key: row.children[0].m1key, amount: -round2(numericAmount) }];
        } else {
          reversal = [];
          let left = round2(numericAmount);
          for (const child of [...row.children].reverse()) {
            if (left <= 0) break;
            const take = round2(Math.min(child.paid, left));
            if (take <= 0) continue;
            reversal.push({ m1key: child.m1key, amount: -take });
            left = round2(left - take);
          }
        }
        await applyChildDeltas(client, row.children, reversal);
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
