import { pool, query } from "../config/database.js";

// ==================== DATE UTILITIES ====================
function calculateStatementDates() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const generationDate = new Date(currentYear, currentMonth, 1, 12, 0, 0);
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  const agingAsOfDate = new Date(generationDate);
  agingAsOfDate.setDate(agingAsOfDate.getDate() - 1);
  agingAsOfDate.setHours(23, 59, 59, 999);
  const formattedAgingAsOfDate = agingAsOfDate.toISOString().split("T")[0];

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const invoiceStartDate = new Date(previousYear, previousMonth, 1, 12, 0, 0);
  const invoiceEndDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0);
  const formattedInvoiceStartDate = invoiceStartDate.toISOString().split("T")[0];
  const formattedInvoiceEndDate = invoiceEndDate.toISOString().split("T")[0];

  // Payments and credit notes from previous month (for display only)
  const paymentStartDate = new Date(previousYear, previousMonth, 1, 12, 0, 0);
  const paymentEndDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0);
  const formattedPaymentStartDate = paymentStartDate.toISOString().split("T")[0];
  const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

  return {
    today,
    currentMonth,
    currentYear,
    previousMonth,
    previousYear,
    generationDate,
    agingAsOfDate,
    formattedGenDate,
    formattedAgingAsOfDate,
    formattedInvoiceStartDate,
    formattedInvoiceEndDate,
    formattedPaymentStartDate,
    formattedPaymentEndDate,
  };
}

function logDateInfo(dates) {
  console.log(`Today: ${dates.today.toISOString().split("T")[0]}`);
  console.log(`Generation Date: ${dates.formattedGenDate}`);
  console.log(`Aging based on outstanding instructions and add-ons as of ${dates.formattedAgingAsOfDate}`);
  console.log(`Fetching payments/credit notes from previous month (${dates.formattedPaymentStartDate} to ${dates.formattedPaymentEndDate}) for display only`);
}

// ==================== CLIENT UTILITIES ====================
async function fetchClients(specificClientId = null) {
  let clientsQuery = "SELECT m5clientkey, COALESCE(insurance, 0) AS insurance FROM m5_client";
  let clientsParams = [];

  if (specificClientId) {
    clientsQuery += " WHERE m5clientkey = $1";
    clientsParams = [specificClientId];
  }

  const clientsResult = await query(clientsQuery, clientsParams);
  return clientsResult.rows;
}

function validateClients(clients, specificClientId) {
  if (clients.length === 0) {
    const message = specificClientId
      ? `Client ${specificClientId} not found`
      : "No clients found";
    console.log(message);
    return { success: false, message };
  }
  return { success: true };
}

// ==================== PAYMENT AND CREDIT NOTE UTILITIES (FOR DISPLAY ONLY) ====================
async function fetchPaymentsMap(dbClient, start, end) {
  // Aggregate actual applied payments per client by exploding JSONB line_items
  const result = await dbClient.query(
    `SELECT
       p.clientid,
       SUM( (item->>'this_payment')::numeric ) AS total_payments
     FROM payment_m3 p
     CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS item
     WHERE (item->>'line_date')::date BETWEEN $1 AND $2
     GROUP BY p.clientid`,
    [start, end]
  );
  return new Map(
    result.rows.map((r) => [r.clientid, Number.parseFloat(r.total_payments) || 0])
  );
}

async function fetchCreditNotesMap(dbClient, start, end) {
  const result = await dbClient.query(
    `SELECT cn.client_id, SUM(cn_amount.amount) as total_credit_notes
     FROM credit_notes cn
     CROSS JOIN LATERAL unnest(cn.amount) AS cn_amount(amount)
     WHERE cn.creditnote_date BETWEEN $1 AND $2
     GROUP BY cn.client_id`,
    [start, end]
  );
  return new Map(result.rows.map(r => [r.client_id, Number.parseFloat(r.total_credit_notes) || 0]));
}

// ==================== STATEMENT UTILITIES ====================
async function checkExistingStatement(dbClient, clientId, formattedGenDate) {
  const result = await dbClient.query(
    "SELECT statement_key, agingid, groupid FROM statements WHERE clientid = $1 AND generation_date = $2",
    [clientId, formattedGenDate]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function fetchPreviousStatementAging(dbClient, clientId, formattedGenDate) {
  const prevResult = await dbClient.query(
    `SELECT s.agingid
     FROM statements s
     WHERE s.clientid = $1 AND s.generation_date < $2
     ORDER BY s.generation_date DESC
     LIMIT 1`,
    [clientId, formattedGenDate]
  );

  if (prevResult.rows.length === 0) {
    return { openingBalance: 0, agingData: null };
  }

  const agingResult = await dbClient.query(
    `SELECT current, "30days", "60days", "90days"
     FROM aging_analysis
     WHERE aging_key = $1`,
    [prevResult.rows[0].agingid]
  );

  if (agingResult.rows.length === 0) {
    return { openingBalance: 0, agingData: null };
  }

  const row = agingResult.rows[0];
  const openingBalance =
    (Number.parseFloat(row.current) || 0) +
    (Number.parseFloat(row["30days"]) || 0) +
    (Number.parseFloat(row["60days"]) || 0) +
    (Number.parseFloat(row["90days"]) || 0);

  return { openingBalance, agingData: row };
}

// ==================== NEW AGING CALCULATION FROM OUTSTANDING ITEMS ====================
async function calculateAgingBucketsFromOutstanding(dbClient, clientId, genDate) {
  // 1. Outstanding instructions (m1_controller)
  const instructionsQuery = `
    SELECT 
      i.date AS invoice_date,
      m1.total_cost,
      COALESCE(m1.vat, 0) AS vat,
      COALESCE(m1.paid_amount, 0) AS paid_amount
    FROM invoice i
    JOIN m1_controller m1 ON i.m1key = m1.m1key
    WHERE i.clientid = $1
      AND i.date <= $2
      AND m1.payment_status IN ('unpaid', 'partial')
  `;

  // 2. Outstanding add-ons
  const addonsQuery = `
    SELECT 
      date AS addon_date,
      amount,
      COALESCE(paid_amount, 0) AS paid_amount
    FROM add_ons
    WHERE client_id = $1
      AND date <= $2
      AND status IN ('unpaid', 'partial')
  `;

  const [instResult, addonResult] = await Promise.all([
    dbClient.query(instructionsQuery, [clientId, genDate]),
    dbClient.query(addonsQuery, [clientId, genDate])
  ]);

  let current = 0, _30days = 0, _60days = 0, _90days = 0;

  const genTimestamp = genDate.getTime();

  // Process instructions
  for (const row of instResult.rows) {
    const gross = row.total_cost * (1 + row.vat / 100);
    const remaining = gross - row.paid_amount;
    if (remaining <= 0) continue;

    const ageDays = Math.floor((genTimestamp - new Date(row.invoice_date).getTime()) / (1000 * 60 * 60 * 24));

    if (ageDays <= 30) current += remaining;
    else if (ageDays <= 60) _30days += remaining;
    else if (ageDays <= 90) _60days += remaining;
    else _90days += remaining;
  }

  // Process add-ons
  for (const row of addonResult.rows) {
    const remaining = row.amount - row.paid_amount;
    if (remaining <= 0) continue;

    const ageDays = Math.floor((genTimestamp - new Date(row.addon_date).getTime()) / (1000 * 60 * 60 * 24));

    if (ageDays <= 30) current += remaining;
    else if (ageDays <= 60) _30days += remaining;
    else if (ageDays <= 90) _60days += remaining;
    else _90days += remaining;
  }

  return {
    newCurrent: current,
    new30days: _30days,
    new60days: _60days,
    new90days: _90days
  };
}

// ==================== DATABASE OPERATIONS ====================
async function createAgingAnalysis(dbClient, clientId, current, _30days, _60days, _90days) {
  const result = await dbClient.query(
    `INSERT INTO aging_analysis (clientid, current, "30days", "60days", "90days")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING aging_key`,
    [clientId, current, _30days, _60days, _90days]
  );
  return result.rows[0].aging_key;
}

async function updateAgingAnalysis(dbClient, agingId, current, _30days, _60days, _90days) {
  await dbClient.query(
    `UPDATE aging_analysis
     SET current = $2, "30days" = $3, "60days" = $4, "90days" = $5
     WHERE aging_key = $1`,
    [agingId, current, _30days, _60days, _90days]
  );
}

// groupid can be null — we keep it for compatibility
async function createStatement(dbClient, groupid, genDate, clientId, agingId, openingBalance, insuranceAmount) {
  const result = await dbClient.query(
    `INSERT INTO statements (groupid, generation_date, clientid, agingid, opening_balance, insurance_amount)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING statement_key`,
    [groupid, genDate, clientId, agingId, openingBalance, insuranceAmount]
  );
  return result.rows[0].statement_key;
}

async function updateStatement(dbClient, statementKey, groupid, openingBalance, genDate, insuranceAmount) {
  await dbClient.query(
    `UPDATE statements
     SET groupid = $2, opening_balance = $3, generation_date = $4, insurance_amount = $5
     WHERE statement_key = $1`,
    [statementKey, groupid, openingBalance, genDate, insuranceAmount]
  );
}

// ==================== CLIENT PROCESSING ====================
async function processClient(dbClient, clientId, clientInsurance, dates, paymentsMap, creditNotesMap) {
  const {
    generationDate,
    agingAsOfDate,
    formattedGenDate,
    formattedPaymentStartDate,
    formattedPaymentEndDate
  } = dates;

  const existingStatement = await checkExistingStatement(dbClient, clientId, formattedGenDate);
  const isUpdate = existingStatement !== null;

  const insuranceAmount = Number.parseFloat(clientInsurance) || 0;

  // Always process — even with zero activity
  console.log(`Client ${clientId}: Generating${isUpdate ? ' (updating)' : ''} statement for ${formattedGenDate}`);

  // Calculate fresh aging buckets from outstanding items
  const { newCurrent, new30days, new60days, new90days } =
    await calculateAgingBucketsFromOutstanding(dbClient, clientId, agingAsOfDate);

  console.log(
    `Client ${clientId}: Aging - Current: R${newCurrent.toFixed(2)}, 30days: R${new30days.toFixed(2)}, 60days: R${new60days.toFixed(2)}, 90days: R${new90days.toFixed(2)}`
  );

  const { openingBalance } = await fetchPreviousStatementAging(dbClient, clientId, formattedGenDate);
  console.log(`Client ${clientId}: Opening balance: R${openingBalance.toFixed(2)}`);

  // groupid = null (we no longer rely on period groupid)
  const groupid = null;

  if (isUpdate) {
    await updateAgingAnalysis(dbClient, existingStatement.agingid, newCurrent, new30days, new60days, new90days);
    await updateStatement(dbClient, existingStatement.statement_key, groupid, openingBalance, formattedGenDate, insuranceAmount);
    console.log(`Client ${clientId}: Updated existing statement #${existingStatement.statement_key}`);
    return { processed: true, created: false, updated: true };
  } else {
    const agingId = await createAgingAnalysis(dbClient, clientId, newCurrent, new30days, new60days, new90days);
    const statementKey = await createStatement(dbClient, groupid, formattedGenDate, clientId, agingId, openingBalance, insuranceAmount);
    console.log(`Client ${clientId}: Created new statement #${statementKey}`);
    return { processed: true, created: true, updated: false };
  }
}

// ==================== MAIN FUNCTION ====================
async function generateMonthlyStatements(specificClientId = null) {
  console.log("Starting monthly statement generation process...");

  const dates = calculateStatementDates();
  logDateInfo(dates);

  let dbClient;
  try {
    dbClient = await pool.connect();
    await dbClient.query(
      `ALTER TABLE statements
       ADD COLUMN IF NOT EXISTS insurance_amount NUMERIC(12, 2) DEFAULT 0`
    );
    await dbClient.query("BEGIN");

    const clients = await fetchClients(specificClientId);

    const validation = validateClients(clients, specificClientId);
    if (!validation.success) return validation;

    // Fetch payments/credit notes for display only
    const [paymentsMap, creditNotesMap] = await Promise.all([
      fetchPaymentsMap(dbClient, dates.formattedPaymentStartDate, dates.formattedPaymentEndDate),
      fetchCreditNotesMap(dbClient, dates.formattedPaymentStartDate, dates.formattedPaymentEndDate)
    ]);

    let processedCount = 0, createdCount = 0, updatedCount = 0;

    for (const client of clients) {
      const clientId = client.m5clientkey;
      const result = await processClient(
        dbClient,
        clientId,
        client.insurance,
        dates,
        paymentsMap,
        creditNotesMap
      );

      if (result.processed) processedCount++;
      if (result.created) createdCount++;
      if (result.updated) updatedCount++;
    }

    await dbClient.query("COMMIT");

    const message = specificClientId
      ? `Statement processed for client ${specificClientId}. Created: ${createdCount}, Updated: ${updatedCount}`
      : `Monthly statement generation completed. Processed: ${processedCount}, Created: ${createdCount}, Updated: ${updatedCount}`;

    console.log(message);
    return {
      success: true,
      message,
      stats: { processed: processedCount, created: createdCount, updated: updatedCount }
    };
  } catch (error) {
    if (dbClient) await dbClient.query("ROLLBACK");
    console.error("Error generating monthly statements:", error);
    throw error;
  } finally {
    if (dbClient) dbClient.release();
  }
}

export { generateMonthlyStatements };