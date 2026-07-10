import { pool, query } from "../../config/database.js";

const getClientStatements = async (clientId, { year, month }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        statement_key,
        generation_date
      FROM 
        statements
      WHERE 
        clientid = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

    if (year) {
      // Filter by the year of generation_date - 1 day so statements generated
      // on the 1st of a month are grouped under the previous month/year.
      queryText += ` AND EXTRACT(YEAR FROM (generation_date - INTERVAL '1 day')) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }
    if (month) {
      // Filter by the month of generation_date - 1 day
      queryText += ` AND EXTRACT(MONTH FROM (generation_date - INTERVAL '1 day')) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY generation_date DESC`;

    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

const getStatementDetails = async (statementId) => {
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
      s.statement_key,
      s.generation_date,
      s.clientid,
      s.opening_balance,
      s.groupid,
      COALESCE(s.insurance_amount, 0) AS insurance_amount,
      c.client AS client_name,
      c.companyaddress AS client_address,
      c.cellnum AS client_phone,
      c.email AS client_email,
      c.suburb AS client_suburb,
      c.representative AS client_representative,
      a.current,
      a."30days",
      a."60days",
      a."90days",
      i.ikey,
      i.date AS invoice_date,
      m1.total_cost AS invoice_amount,
      m1.vat AS invoice_vat,
      m1."ksmFileRef" AS invoice_task,
      m1.pickup,
      m1.dropoff,
      i.invoice_num,
      a2.addon_id,
      a2.date AS addon_date,
      a2.amount AS addon_amount,
      a2.items AS addon_items,
      a2.invoice_number AS addon_num,
      ut.companyname,
      ut.cluster_box,
      ut.vat_reg_num,
      ut.address,
      ut.suburb,
      ut.branch_code,
      ut.bank,
      ut.name_of_acc,
      ut.swift_code,
      ut.account_num,
      COALESCE(ut.cell_num, ut.cell_num2) AS phonenumber
    FROM statements s
    JOIN m5_client c ON s.clientid = c.m5clientkey
    JOIN aging_analysis a ON s.agingid = a.aging_key
    LEFT JOIN invoice i 
      ON i.clientid = s.clientid
      AND i.date >= DATE_TRUNC('month', s.generation_date - INTERVAL '1 month')
      AND i.date < s.generation_date
    LEFT JOIN m1_controller m1 ON i.m1key = m1.m1key
    LEFT JOIN add_ons a2 
      ON a2.client_id = s.clientid
      AND a2.date >= DATE_TRUNC('month', s.generation_date - INTERVAL '1 month')
      AND a2.date < s.generation_date
    INNER JOIN usertable ut ON ut.roleid = 1 AND ut.status = 'active'
    WHERE s.statement_key = $1
  `;
    const result = await query(queryText, [statementId]);

    if (result.rows.length === 0) {
      return { success: false, message: "Statement not found" };
    }

    const clientId = result.rows[0].clientid;
    const generationDate = new Date(result.rows[0].generation_date);
    // Invoices/add-ons are for the month immediately BEFORE generation_date
    const statementMonth =
      generationDate.getMonth() === 0 ? 11 : generationDate.getMonth() - 1;
    const statementYear =
      generationDate.getMonth() === 0
        ? generationDate.getFullYear() - 1
        : generationDate.getFullYear();

    // Payments and credit notes should use the SAME month as invoices/add-ons
    const paymentStartDate = new Date(
      statementYear,
      statementMonth,
      1,
      12,
      0,
      0
    );
    const paymentEndDate = new Date(
      statementYear,
      statementMonth + 1,
      0,
      12,
      0,
      0
    );
    const formattedPaymentStartDate = paymentStartDate
      .toISOString()
      .split("T")[0];
    const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

    const paymentsQuery = `
      SELECT 
        p.paykey,
        (item->>'line_date')::date AS date,
        (item->>'this_payment')::numeric AS amount,
        item->>'line_reference' AS reference,
        item->>'invoice_num' AS invoice_num
      FROM 
        payment_m3 p
      CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS item
      WHERE 
        p.clientid = $1
        AND (item->>'line_date')::date BETWEEN $2 AND $3
    `;
    const creditNotesQuery = `
      SELECT 
        cn.creditnote_id,
        cn.creditnote_date AS date,
        SUM(cn_amount.amount) AS amount,
        cn.doc_no AS reference,
        cn.description
      FROM 
        credit_notes cn
      CROSS JOIN LATERAL unnest(cn.amount) AS cn_amount(amount)
      WHERE 
        cn.client_id = $1
        AND cn.creditnote_date BETWEEN $2 AND $3
      GROUP BY 
        cn.creditnote_id,
        cn.creditnote_date,
        cn.doc_no,
        cn.description
    `;
    const [paymentsResult, creditNotesResult] = await Promise.all([
      query(paymentsQuery, [
        clientId,
        formattedPaymentStartDate,
        formattedPaymentEndDate,
      ]),
      query(creditNotesQuery, [
        clientId,
        formattedPaymentStartDate,
        formattedPaymentEndDate,
      ]),
    ]);

    const payments = paymentsResult.rows.map((row) => ({
      paykey: row.paykey,
      date: row.date,
      amount: Number.parseFloat(row.amount || 0),
      reference: row.reference || "",
      invoice_num: row.invoice_num || "",
    }));

    const creditNotes = creditNotesResult.rows.map((row) => ({
      creditnote_id: row.creditnote_id,
      date: row.date,
      amount: Number.parseFloat(row.amount || 0),
      reference: row.doc_no || "",
      description: row.description || "",
    }));

    console.log(
      `Fetched ${payments.length} payments for client ${clientId} between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
    );
    console.log(
      `Fetched ${creditNotes.length} credit notes for client ${clientId} between ${formattedPaymentStartDate} and ${formattedPaymentEndDate}`
    );

    if (payments.length > 0) {
      console.log("Sample payment data:", JSON.stringify(payments[0], null, 2));
    }
    if (creditNotes.length > 0) {
      console.log(
        "Sample credit note data:",
        JSON.stringify(creditNotes[0], null, 2)
      );
    }

    // Deduplicate invoices and add-ons because the combined LEFT JOINs can
    // produce duplicate invoice/add_on rows (cartesian effect between tables).
    const invoiceMap = new Map();
    const addonMap = new Map();

    for (const row of result.rows) {
      if (row.ikey !== null && Number.parseFloat(row.invoice_amount || 0) > 0) {
        if (!invoiceMap.has(row.ikey)) {
          const netAmount = Number.parseFloat(row.invoice_amount || 0);
          const rawVat = Number(row.invoice_vat);
          const vatRate = Number.isNaN(rawVat) ? 0 : rawVat;
          const vatMultiplier = 1 + vatRate / 100;
          const grossAmount = Number((netAmount * vatMultiplier).toFixed(2));

          invoiceMap.set(row.ikey, {
            ikey: row.ikey,
            date: row.invoice_date,
            amount: grossAmount,
            task: row.invoice_task,
            invoice_num: row.invoice_num,
            pickup: row.pickup,
            dropoff: row.dropoff,
          });
        }
      }

      if (row.addon_id !== null) {
        if (!addonMap.has(row.addon_id)) {
          addonMap.set(row.addon_id, {
            addon_id: row.addon_id,
            date: row.addon_date,
            amount: Number.parseFloat(row.addon_amount || 0),
            items: row.addon_items,
            addon_num: row.addon_num,
          });
        }
      }
    }

    const statementData = {
      statement_key: result.rows[0].statement_key,
      groupid: result.rows[0].groupid,
      generation_date: result.rows[0].generation_date,
      opening_balance: Number.parseFloat(result.rows[0].opening_balance || 0),
      insurance_amount: Number.parseFloat(result.rows[0].insurance_amount || 0),
      company_name: result.rows[0].companyname,
      cluster_box: result.rows[0].cluster_box,
      vat_reg_num: result.rows[0].vat_reg_num,
      address: result.rows[0].address,
      suburb: result.rows[0].suburb,
      branch_code: result.rows[0].branch_code,
      bank: result.rows[0].bank,
      name_of_acc: result.rows[0].name_of_acc,
      swift_code: result.rows[0].swift_code,
      account_num: result.rows[0].account_num,
      phonenumber: result.rows[0].phonenumber,
      client: {
        id: result.rows[0].clientid,
        name: result.rows[0].client_name,
        representative: result.rows[0].client_representative,
        email: result.rows[0].client_email,
        phone: result.rows[0].client_phone,
        address: result.rows[0].client_address,
        suburb: result.rows[0].client_suburb,
      },
      aging: {
        current: Number.parseFloat(result.rows[0].current || 0),
        "30days": Number.parseFloat(result.rows[0]["30days"] || 0),
        "60days": Number.parseFloat(result.rows[0]["60days"] || 0),
        "90days": Number.parseFloat(result.rows[0]["90days"] || 0),
      },
      invoices: Array.from(invoiceMap.values()),
      addons: Array.from(addonMap.values()),
      payments: payments,
      credit_notes: creditNotes,
    };

    return { success: true, data: statementData };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { getClientStatements, getStatementDetails };
