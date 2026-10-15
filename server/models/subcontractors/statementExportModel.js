// Snapshot-on-export for subcontractor statements.
//
// The statement itself is derived data — every figure comes from legs_m2 and
// m1_controller.vat, and changes whenever a leg is corrected. This module
// freezes that derivation at the moment a document is produced, so there is a
// permanent record of what was handed to the subcontractor even after the live
// numbers move on.
//
// The server derives the payload itself and hands it back to the client to
// render. The client never tells the server what the amounts are — otherwise a
// forged POST would write forged money into the audit record.
import crypto from "crypto";
import { pool } from "../../config/database.js";
import {
  listStatementLegs,
  normalisePeriod,
  assertVatStatus,
} from "./statementDerivation.js";

// Money is NUMERIC and config/database.js parses NUMERIC through parseFloat, so
// every amount that has to be exact — hashed, summed, or stored — is carried as
// text out of Postgres and summed in integer cents here.
const toCents = (text) => Math.round(Number.parseFloat(text || "0") * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

/**
 * Canonical serialisation for hashing. Deliberately narrow: only the fields
 * that constitute the financial content, in a fixed order, at fixed precision.
 * Display-only fields (destination, description) are excluded so that renaming
 * a client does not read as a changed statement.
 */
const contentHash = ({ subeiRegNum, period, vatStatus, amountText, legs }) => {
  const canonical = [
    subeiRegNum,
    period,
    vatStatus,
    amountText,
    ...legs.map((leg) => `${leg.legkey}:${leg.driverrate_text}`),
  ].join("|");
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
};

/**
 * Re-derive a statement from the live legs. Returns the payload the document is
 * rendered from, plus the hash identifying this exact content.
 */
const deriveStatement = async (subeiRegNum, period, vatStatus) => {
  const normalisedPeriod = normalisePeriod(period);
  assertVatStatus(vatStatus);

  // Same query the statement list and detail page read through, so an exported
  // document can never disagree with the screen it was exported from.
  const rows = await listStatementLegs(subeiRegNum, normalisedPeriod, vatStatus);

  const legs = rows.map((row) => ({
    legkey: row.legkey,
    date: row.date,
    startingpoint: row.startingpoint,
    destination: row.destination,
    containernumber: row.containernumber,
    instruction_number: row.instruction_number,
    m1_description: row.m1_description,
    client_name: row.client_name,
    vat_percentage: Number.parseFloat(row.vat_percentage) || 0,
    base_rate: Number.parseFloat(row.base_rate_text),
    // VAT-inclusive and already rounded to cents by the shared query
    driverrate: Number.parseFloat(row.driverrate_text),
    driverrate_text: row.driverrate_text,
  }));

  const amountText = fromCents(
    legs.reduce((cents, leg) => cents + toCents(leg.driverrate_text), 0)
  );

  return {
    subeiRegNum,
    period: normalisedPeriod,
    vatStatus,
    legs,
    legCount: legs.length,
    amount: Number.parseFloat(amountText),
    amountText,
    contentHash: contentHash({
      subeiRegNum,
      period: normalisedPeriod,
      vatStatus,
      amountText,
      legs,
    }),
  };
};

const EXPORT_COLUMNS = `
  export_id, subbie_reg_num, period, vat_status, amount, leg_count, legs,
  content_hash, document_key, document_format, document_size, document_at,
  exported_at, exported_by, exported_by_name
`;

const DOCUMENT_FORMATS = new Set(["PDF", "XLSX"]);

const assertFormat = (format) => {
  if (!DOCUMENT_FORMATS.has(format)) {
    throw new Error(`Invalid format "${format}" — expected PDF or XLSX`);
  }
  return format;
};

/**
 * The most recent snapshot of this statement IN THIS FORMAT, used to decide
 * whether to insert. Format is part of the identity because a snapshot row
 * carries exactly one document: exporting the same unchanged statement as both
 * a PDF and a spreadsheet is two documents, so two rows, sharing a content_hash.
 */
const getLatestExport = async (subeiRegNum, period, vatStatus, format) => {
  const { rows } = await pool.query(
    `SELECT ${EXPORT_COLUMNS}
     FROM subcontractor_statement_exports
     WHERE subbie_reg_num = $1 AND period = $2 AND vat_status = $3
       AND document_format = $4
     ORDER BY exported_at DESC
     LIMIT 1`,
    [
      subeiRegNum,
      normalisePeriod(period),
      assertVatStatus(vatStatus),
      assertFormat(format),
    ]
  );
  return rows[0] || null;
};

// document_format is set when the snapshot is created, before the file exists —
// it records the format that was ASKED for. document_key stays NULL until the
// rendered file actually lands.
const insertExport = async (derived, format, actor) => {
  const { rows } = await pool.query(
    `INSERT INTO subcontractor_statement_exports
       (subbie_reg_num, period, vat_status, amount, leg_count, legs,
        content_hash, document_format, exported_by, exported_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${EXPORT_COLUMNS}`,
    [
      derived.subeiRegNum,
      derived.period,
      derived.vatStatus,
      derived.amountText,
      derived.legCount,
      JSON.stringify(derived.legs),
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
    `UPDATE subcontractor_statement_exports
     SET document_key = $2, document_size = $3, document_at = NOW()
     WHERE export_id = $1
       AND document_key IS NULL
       AND document_format = $4
     RETURNING ${EXPORT_COLUMNS}`,
    [exportId, key, size ?? null, assertFormat(format)]
  );
  return rows[0] || null;
};

/** Snapshot history for the viewer. Payload omitted — the list only needs headers. */
const listExports = async ({ subeiRegNum, period = null, vatStatus = null }) => {
  const { rows } = await pool.query(
    `SELECT export_id, subbie_reg_num, period, vat_status, amount, leg_count,
            content_hash, document_key, document_format, document_size,
            document_at, exported_at, exported_by, exported_by_name
     FROM subcontractor_statement_exports
     WHERE subbie_reg_num = $1
       AND ($2::date IS NULL OR period = $2::date)
       AND ($3::text IS NULL OR vat_status = $3::text)
     ORDER BY exported_at DESC`,
    [
      subeiRegNum,
      period ? normalisePeriod(period) : null,
      vatStatus ? assertVatStatus(vatStatus) : null,
    ]
  );
  return rows;
};

const getExportById = async (exportId) => {
  const { rows } = await pool.query(
    `SELECT ${EXPORT_COLUMNS}
     FROM subcontractor_statement_exports
     WHERE export_id = $1`,
    [exportId]
  );
  return rows[0] || null;
};

export {
  deriveStatement,
  getLatestExport,
  insertExport,
  attachDocument,
  listExports,
  getExportById,
  assertFormat,
};
