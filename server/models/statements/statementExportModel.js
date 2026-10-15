// Snapshot-on-export for client statements.
//
// The server derives the statement, freezes it, and hands the payload back for
// the browser to render. The client never tells the server what the amounts are
// — otherwise a forged POST would write forged money into the audit record.
//
// It calls the same getStatementDetails() the statement page reads through, so
// an exported document and the screen it was exported from cannot disagree.
// The snapshot still matters even though statements are derived: a back-dated
// invoice or payment changes what a past month derives to, and this row is the
// record of what the client was actually sent.
import crypto from "crypto";
import { pool } from "../../config/database.js";
import { getStatementDetails } from "./statementModel.js";

const DOCUMENT_FORMATS = new Set(["PDF", "XLSX"]);

const assertFormat = (format) => {
  if (!DOCUMENT_FORMATS.has(format)) {
    throw new Error(`Invalid format "${format}" — expected PDF or XLSX`);
  }
  return format;
};

// Money is NUMERIC and config/database.js parses NUMERIC through parseFloat, so
// anything that must be exact — hashed, summed, or stored — is handled in
// integer cents here rather than in floating point.
const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

/**
 * statements.generation_date is the 1st of the month AFTER the one the statement
 * covers. The period recorded here is the covered month itself, so the stored
 * row does not inherit that off-by-one.
 */
const periodFromGenerationDate = (generationDate) => {
  const d = new Date(generationDate);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid generation_date "${generationDate}"`);
  }
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed; the covered month is this minus 1
  const covered = new Date(Date.UTC(year, month - 1, 1));
  return covered.toISOString().slice(0, 10);
};

/**
 * Canonical serialisation for hashing. Only the fields that constitute the
 * financial content, in a fixed order at fixed precision — display-only fields
 * (addresses, bank details, descriptions) are excluded so that correcting a
 * client's address does not read as a changed statement.
 */
const contentHash = ({ statementKey, period, totals, aging, lines }) =>
  crypto
    .createHash("sha256")
    .update(
      [
        statementKey,
        period,
        totals.openingBalance,
        totals.invoicedAmount,
        totals.paymentsAmount,
        totals.creditNotesAmount,
        totals.insuranceAmount,
        totals.balanceDue,
        `aging:${aging.current}|${aging["30days"]}|${aging["60days"]}|${aging["90days"]}`,
        ...lines.map((l) => `${l.kind}:${l.id}:${l.amount}`),
      ].join("|"),
      "utf8"
    )
    .digest("hex");

/**
 * Freeze a statement. Returns the payload the document renders from, the totals
 * as exact decimal strings, and the hash identifying this exact content.
 *
 * The totals mirror ClientStatement.jsx exactly:
 *   balanceDue = openingBalance - (payments + creditNotes + insurance) + invoiced
 * If that formula ever changes on the page it must change here too, or a
 * document will disagree with its own archived record.
 */
const deriveStatement = async (statementId, detailOverrides = null) => {
  const result = await getStatementDetails(statementId);
  if (!result?.success) {
    throw new Error(result?.message || `Statement ${statementId} not found`);
  }
  return freezeStatement(result.data, detailOverrides);
};

/**
 * The pure half of deriveStatement(), for data already loaded. The statement
 * page is served through this too, so it receives the same content_hash an
 * export would compute and can prove, when it exports, that it is showing the
 * current figures.
 */
const freezeStatement = (data, detailOverrides = null) => {

  const invoices = data.invoices || [];
  const addons = data.addons || [];
  const payments = data.payments || [];
  const creditNotes = data.credit_notes || [];

  const sumCents = (rows) =>
    rows.reduce((cents, row) => cents + toCents(row.amount), 0);

  const openingCents = toCents(data.opening_balance);
  const invoicedCents = sumCents(invoices) + sumCents(addons);
  const paymentsCents = sumCents(payments);
  const creditNotesCents = sumCents(creditNotes);
  const insuranceCents = toCents(data.insurance_amount);
  const balanceCents =
    openingCents -
    (paymentsCents + creditNotesCents + insuranceCents) +
    invoicedCents;

  const totals = {
    openingBalance: fromCents(openingCents),
    invoicedAmount: fromCents(invoicedCents),
    paymentsAmount: fromCents(paymentsCents),
    creditNotesAmount: fromCents(creditNotesCents),
    insuranceAmount: fromCents(insuranceCents),
    balanceDue: fromCents(balanceCents),
  };

  const aging = {
    current: fromCents(toCents(data.aging?.current)),
    "30days": fromCents(toCents(data.aging?.["30days"])),
    "60days": fromCents(toCents(data.aging?.["60days"])),
    "90days": fromCents(toCents(data.aging?.["90days"])),
  };

  // Flat, ordered list used only for hashing — the stored payload keeps the
  // original grouped shape the page expects.
  const lines = [
    ...invoices.map((r) => ({ kind: "invoice", id: r.ikey, amount: fromCents(toCents(r.amount)) })),
    ...addons.map((r) => ({ kind: "addon", id: r.addon_id, amount: fromCents(toCents(r.amount)) })),
    ...payments.map((r) => ({ kind: "payment", id: r.paykey, amount: fromCents(toCents(r.amount)) })),
    ...creditNotes.map((r) => ({ kind: "credit_note", id: r.creditnote_id, amount: fromCents(toCents(r.amount)) })),
  ].sort((a, b) => `${a.kind}${a.id}`.localeCompare(`${b.kind}${b.id}`));

  // Free-text "Details" edits made on the page. Stored so the archived payload
  // matches the document that was produced, but deliberately OUTSIDE the content
  // hash: they are presentational, and a reworded description is not a changed
  // statement. Clipped so a client cannot push arbitrary volume into the record.
  const payload = { ...data };
  if (Array.isArray(detailOverrides) && detailOverrides.length) {
    payload.detail_overrides = detailOverrides
      .slice(0, 500)
      .map((entry) => String(entry ?? "").slice(0, 300));
  }

  // Derived statements carry their covered month directly; the fallback keeps
  // working for any payload that still only has a generation date.
  const period = data.period || periodFromGenerationDate(data.generation_date);

  return {
    statementKey: data.statement_key,
    clientId: data.client?.id,
    period,
    totals,
    aging,
    lineItemCount: lines.length,
    payload,
    contentHash: contentHash({
      statementKey: data.statement_key,
      period,
      totals,
      aging,
      lines,
    }),
  };
};

const EXPORT_COLUMNS = `
  export_id, statement_key, clientid, period, opening_balance, invoiced_amount,
  payments_amount, credit_notes_amount, insurance_amount, balance_due, aging,
  line_item_count, content_hash, document_key, document_format, document_size,
  document_at, exported_at, exported_by, exported_by_name
`;

/**
 * The most recent snapshot of this statement IN THIS FORMAT. Format is part of
 * the identity because a snapshot row carries exactly one document: exporting
 * the same statement as both a PDF and a spreadsheet is two documents, so two
 * rows sharing a content_hash.
 */
const getLatestExport = async (statementKey, format) => {
  const { rows } = await pool.query(
    `SELECT ${EXPORT_COLUMNS}
     FROM client_statement_exports
     WHERE statement_key = $1 AND document_format = $2
     ORDER BY exported_at DESC
     LIMIT 1`,
    [statementKey, assertFormat(format)]
  );
  return rows[0] || null;
};

// document_format is set when the snapshot is created, before the file exists —
// it records the format that was ASKED for. document_key stays NULL until the
// rendered file actually lands.
const insertExport = async (derived, format, actor) => {
  const { rows } = await pool.query(
    `INSERT INTO client_statement_exports
       (statement_key, clientid, period, opening_balance, invoiced_amount,
        payments_amount, credit_notes_amount, insurance_amount, balance_due,
        aging, line_items, line_item_count, content_hash, document_format,
        exported_by, exported_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING ${EXPORT_COLUMNS}`,
    [
      derived.statementKey,
      derived.clientId,
      derived.period,
      derived.totals.openingBalance,
      derived.totals.invoicedAmount,
      derived.totals.paymentsAmount,
      derived.totals.creditNotesAmount,
      derived.totals.insuranceAmount,
      derived.totals.balanceDue,
      JSON.stringify(derived.aging),
      JSON.stringify(derived.payload),
      derived.lineItemCount,
      derived.contentHash,
      assertFormat(format),
      actor?.id ?? null,
      actor?.name ?? null,
    ]
  );
  return rows[0];
};

/**
 * Attach the rendered document to a snapshot. Only ever fills a NULL key — a
 * snapshot's document is written once and never replaced, so a re-upload against
 * an already-documented row is refused rather than overwriting history. The
 * format guard means a snapshot created for a PDF can never be filled with a
 * spreadsheet, so document_format always describes the bytes actually stored.
 */
const attachDocument = async (exportId, { key, format, size }) => {
  const { rows } = await pool.query(
    `UPDATE client_statement_exports
     SET document_key = $2, document_size = $3, document_at = NOW()
     WHERE export_id = $1
       AND document_key IS NULL
       AND document_format = $4
     RETURNING ${EXPORT_COLUMNS}`,
    [exportId, key, size ?? null, assertFormat(format)]
  );
  return rows[0] || null;
};

/** Snapshot history. Payload omitted — the list only needs headers. */
const listExports = async ({ statementKey = null, clientId = null }) => {
  const { rows } = await pool.query(
    `SELECT ${EXPORT_COLUMNS}
     FROM client_statement_exports
     WHERE ($1::text IS NULL OR statement_key = $1::text)
       AND ($2::int  IS NULL OR clientid = $2::int)
     ORDER BY exported_at DESC`,
    [statementKey, clientId]
  );
  return rows;
};

const getExportById = async (exportId) => {
  const { rows } = await pool.query(
    `SELECT ${EXPORT_COLUMNS}, line_items
     FROM client_statement_exports
     WHERE export_id = $1`,
    [exportId]
  );
  return rows[0] || null;
};

export {
  deriveStatement,
  freezeStatement,
  getLatestExport,
  insertExport,
  attachDocument,
  listExports,
  getExportById,
  assertFormat,
  periodFromGenerationDate,
};
