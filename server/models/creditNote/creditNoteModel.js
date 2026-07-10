import { pool } from "../../config/database.js";

const getClientCreditNotes = async (clientId, { year, month }) => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    let queryText = `
      SELECT 
        cn.creditnote_id,
        cn.creditnote_date,
        cn.amount,
        COALESCE(STRING_AGG(c.containernum, ', '), '') AS containernum,
        cn.doc_no,
        cn.m1key
      FROM 
        credit_notes cn
      LEFT JOIN container c ON c.containerkey = ANY(cn.containerids)
      LEFT JOIN m1_controller m ON cn.m1key = m.m1key
      WHERE 
        cn.client_id = $1
    `;
    const queryParams = [clientId];
    let paramIndex = 2;

if (year) {
  queryText += ` AND EXTRACT(YEAR FROM cn.creditnote_date) = $${paramIndex}`;
  queryParams.push(year);
  paramIndex++;
}
if (month) {
  queryText += ` AND EXTRACT(MONTH FROM cn.creditnote_date) = $${paramIndex}`;
  queryParams.push(month);
  paramIndex++;
}


    queryText += ` GROUP BY cn.creditnote_id, cn.creditnote_date, cn.amount, cn.doc_no, cn.m1key ORDER BY cn.creditnote_date DESC`;

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getInstructions = async (clientId) => {
  let client;
  try {
    client = await pool.connect();

    const queryText = `
      SELECT m1key
      FROM m1_controller
      WHERE client = $1
      ORDER BY m1key ASC
    `;
    const queryParams = [clientId];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } finally {
    if (client) client.release();
  }
};


const getContainers = async (m1key) => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    const queryText = `
      SELECT containerkey, containernum
      FROM container
      WHERE m1key = $1
      ORDER BY containernum
    `;
    const queryParams = [m1key];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};
const getCompanyDetails = async () => {
  let client;
  try {
    if (!pool) {
      throw newError("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

const queryText = `
  SELECT 
    companyname,
    company_reg_num,
    address,
    cluster_box,
    email,
    cell_num,
    cell_num2,
    name_of_acc,
    bank,
    account_num,
    branch,
    branch_code
  FROM 
    usertable
  WHERE 
    status = 'active'
    AND roleid = 1;
`;


    const result = await client.query(queryText);
    return { success: true, data: result.rows[0] || {} }; // Return the first row or empty object
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};
const getClientDetails = async (clientId) => {
  let client;
  try {
    client = await pool.connect();

    const queryText = `
      SELECT 
        client, 
        companyaddress, 
        suburb,
        postalcode,
        vatregno,
        cellnum,
        email
      FROM m5_client
      WHERE m5clientkey = $1
    `;
    const queryParams = [clientId];

    const result = await client.query(queryText, queryParams);

    return { success: true, data: result.rows[0] || {} };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};
const getLatestDocumentNumber = async () => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    const queryText = `
      SELECT doc_no
      FROM credit_notes
      WHERE doc_no ~ '^CR-[0-9]+$'
      ORDER BY CAST(SUBSTRING(doc_no FROM '[0-9]+') AS INTEGER) DESC
      LIMIT 1;
    `;

    const result = await client.query(queryText);
    if (result.rows.length > 0) {
      const latestDocNo = result.rows[0].doc_no;
      const number = parseInt(latestDocNo.replace('CR-', '')) + 1;
      return { success: true, data: `CR-${number}` };
    }
    return { success: true, data: 'CR-1' }; // Default if no document numbers exist
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};


const getInstructionDetails = async (m1key) => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    const queryText = `
      SELECT dropoff, vessel_name, "clientFileRef", vat
      FROM m1_controller
      WHERE m1key = $1
    `;
    const queryParams = [m1key];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows[0] || {} };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const createCreditNote = async (creditNoteData) => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    // Wrap credit note creation and m1_controller updates in a transaction
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO credit_notes (client_id, creditnote_date, amount, containerids, doc_no, m1key, description, account_no)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING creditnote_id
    `;

    const insertParams = [
      creditNoteData.client_id,
      creditNoteData.creditnote_date || new Date().toISOString().split('T')[0], // Fallback to current date if not provided
      creditNoteData.amount,
      creditNoteData.containerids,
      creditNoteData.doc_no,
      creditNoteData.m1key,
      creditNoteData.description,
      creditNoteData.account_no,
    ];

    const insertResult = await client.query(insertQuery, insertParams);

    // Compute the credit note subtotal from the provided amount(s)
    let subTotal = 0;
    if (Array.isArray(creditNoteData.amount)) {
      subTotal = creditNoteData.amount.reduce(
        (sum, v) => sum + (Number(v) || 0),
        0
      );
    } else {
      subTotal = Number(creditNoteData.amount || 0);
    }

    // Fetch VAT and current paid_amount for the related instruction (m1_controller)
    const m1key = creditNoteData.m1key;
    if (!m1key) {
      throw new Error("m1key (instruction number) is required for credit notes");
    }

    const m1Query = `
      SELECT total_cost, COALESCE(vat, 0) AS vat, COALESCE(paid_amount, 0) AS paid_amount
      FROM m1_controller
      WHERE m1key = $1
    `;
    const m1Result = await client.query(m1Query, [m1key]);
    if (m1Result.rows.length === 0) {
      throw new Error("Instruction (m1_controller) not found for provided m1key");
    }

    const m1Row = m1Result.rows[0];
    const baseTotal = Number(m1Row.total_cost) || 0;
    const vatRate = Number(m1Row.vat) || 0;
    const totalWithVat = baseTotal + baseTotal * (vatRate / 100);

    // Credit note should be VAT inclusive just like payments
    const creditVat = subTotal * (vatRate / 100);
    const creditTotalWithVat = subTotal + creditVat;

    const currentPaid = Number(m1Row.paid_amount) || 0;
    const newPaid = currentPaid + creditTotalWithVat;

    const isPaid = newPaid >= totalWithVat - 0.01;
    const status = isPaid ? "paid" : newPaid > 0 ? "partial" : null;

    const updateM1Query = `
      UPDATE m1_controller
      SET paid_amount = $1,
          payment_status = $2
      WHERE m1key = $3
    `;
    await client.query(updateM1Query, [newPaid, status, m1key]);

    await client.query("COMMIT");

    return { success: true, data: insertResult.rows[0] };
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

const getCreditNoteById = async (creditNoteId) => {
  let client;
  try {
    if (!pool) {
      throw new Error("Database connection not established. Please try again later.");
    }
    client = await pool.connect();

    const queryText = `
  SELECT 
    cn.creditnote_id,
    cn.client_id,
    TO_CHAR(cn.creditnote_date, 'YYYY-MM-DD') AS creditnote_date,
    cn.amount,
    cn.containerids,
    cn.doc_no,
    cn.m1key,
    cn.description,
    cn.account_no,
    STRING_AGG(c.containernum, ', ') AS containernum
  FROM 
    credit_notes cn
  LEFT JOIN container c ON c.containerkey = ANY(cn.containerids)
  WHERE 
    cn.creditnote_id = $1
  GROUP BY cn.creditnote_id
`;
    const queryParams = [creditNoteId];

    const result = await client.query(queryText, queryParams);
    return { success: true, data: result.rows[0] || {} };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { 
  getClientCreditNotes, 
  getInstructions, 
  getContainers, 
  getCompanyDetails, 
  getClientDetails, 
  getLatestDocumentNumber,
  getInstructionDetails,
  createCreditNote,
  getCreditNoteById
};