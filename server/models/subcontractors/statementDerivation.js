// The single definition of what a subcontractor statement IS.
//
// A statement is not stored data — it is an aggregate over legs_m2, grouped by
// subcontractor, the month the legs were driven, and whether the leg's
// instruction carries VAT. The list, the detail page and the export snapshot all
// read through this module so the same statement cannot show three different
// totals depending on which screen you are on.
//
// Two column types drive the SQL and neither is what you would expect:
//   legs_m2.driverrate    is DOUBLE PRECISION, so it must be cast before any
//                         rounding — ROUND(double precision, integer) does not
//                         exist in Postgres.
//   m1_controller.vat     is an INTEGER percentage, not a rate.
//
// BROKER: a group-assignment leg leaves legs_m2.containernumber empty and
// claims its containers via container.legkey, so the statement lists those
// claimed container numbers for it (LEG_CONTAINERS).
//
// Rounding basis: each leg is rounded to cents BEFORE the total is summed, so a
// document's line items add up to the total printed on it. The retired generator
// summed unrounded floats and rounded once at the end, which could leave a
// statement a cent or two out from its own rows.
import { pool } from "../../config/database.js";

const VAT_STATUSES = new Set(["VAT", "NON_VAT"]);

// VAT-inclusive rate for one leg, rounded to cents. Referenced everywhere rather
// than retyped — the old code had this expression in three places and they had
// already drifted.
const LEG_RATE = `
  ROUND(
    COALESCE(l.driverrate, 0)::numeric * (1 + COALESCE(m1.vat, 0)::numeric / 100),
    2
  )
`;

const LEG_CONTAINERS = `
  COALESCE(
    NULLIF(TRIM(l.containernumber), ''),
    (SELECT string_agg(cc.containernum::text, ', ' ORDER BY cc.containerkey)
       FROM container cc WHERE cc.legkey = l.legkey)
  )
`;

const VAT_BUCKET = `
  CASE WHEN COALESCE(m1.vat, 0) > 0 THEN 'VAT' ELSE 'NON_VAT' END
`;

// Split from the predicate below so the detail query can add its own join for
// the client name without having to restate the source tables.
const SUBBIE_FROM = `
  FROM m5_employee e
  JOIN legs_m2 l             ON l.driverid = e.userid
  LEFT JOIN m1_controller m1 ON m1.m1key = l.m1key
`;

// A subcontractor is an employee carrying a registration number. NOTE: the
// analytics commission report instead uses roleid = 6; if those two populations
// ever diverge, the statements and that report will disagree.
const IS_SUBBIE = `
  e.subei_reg_num IS NOT NULL AND e.subei_reg_num <> ''
`;

/**
 * Statement identity, replacing the retired subcontractor_statements.sub_state_id
 * serial. Derived data has no serial to offer, so the key is the three things
 * that define the statement: "2026-08-VAT", "2026-08-NON_VAT".
 *
 * Documents issued before this change carry the old numeric id; those live on in
 * their export snapshots and are unaffected.
 */
const buildStatementKey = (period, vatStatus) =>
  `${String(period).slice(0, 7)}-${vatStatus}`;

const KEY_SHAPE = /^(\d{4})-(\d{2})-(VAT|NON_VAT)$/;

const parseStatementKey = (statementKey) => {
  const match = KEY_SHAPE.exec(String(statementKey || "").trim());
  if (!match) {
    throw new Error(
      `Invalid statement key "${statementKey}" — expected YYYY-MM-VAT or YYYY-MM-NON_VAT`
    );
  }
  const [, year, month, vatStatus] = match;
  if (Number(month) < 1 || Number(month) > 12) {
    throw new Error(`Invalid statement key "${statementKey}" — month out of range`);
  }
  return { period: `${year}-${month}-01`, vatStatus };
};

/** Accepts YYYY-MM or YYYY-MM-DD; normalises to the first of that month. */
const normalisePeriod = (period) => {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(String(period || "").trim());
  if (!match) {
    throw new Error(`Invalid period "${period}" — expected YYYY-MM`);
  }
  const [, year, month] = match;
  if (Number(month) < 1 || Number(month) > 12) {
    throw new Error(`Invalid period "${period}" — month out of range`);
  }
  return `${year}-${month}-01`;
};

const assertVatStatus = (vatStatus) => {
  if (!VAT_STATUSES.has(vatStatus)) {
    throw new Error(`Invalid vat_status "${vatStatus}" — expected VAT or NON_VAT`);
  }
  return vatStatus;
};

/**
 * Every statement for one subcontractor, optionally narrowed to a year and/or
 * month. `period` is the month the legs were driven — the statement is filed
 * under the work, not under the month it happened to be generated, so the
 * "subtract a day from the generation date" correction every caller used to
 * apply is gone.
 *
 * `amount` is money and comes back as a JS number (config/database.js parses
 * NUMERIC through parseFloat); `amount_text` is the same value as exact decimal
 * text, for hashing and for anything that must not touch a float.
 */
const listStatements = async (subeiRegNum, { year = null, month = null } = {}) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
      SELECT
        to_char(date_trunc('month', l.date), 'YYYY-MM-DD')  AS period,
        ${VAT_BUCKET}                                       AS vat_status,
        COUNT(*)::int                                       AS leg_count,
        SUM(${LEG_RATE})                                    AS amount,
        to_char(SUM(${LEG_RATE}), 'FM9999999990.00')        AS amount_text,
        jsonb_agg(
          jsonb_build_object(
            'legkey', l.legkey,
            'driverrate', ${LEG_RATE},
            'vatPercentage', COALESCE(m1.vat, 0)
          )
          ORDER BY l.date, l.legkey
        )                                                   AS legids
      ${SUBBIE_FROM}
      WHERE ${IS_SUBBIE}
        AND e.subei_reg_num = $1
        AND ($2::int IS NULL OR EXTRACT(YEAR  FROM l.date) = $2::int)
        AND ($3::int IS NULL OR EXTRACT(MONTH FROM l.date) = $3::int)
      GROUP BY date_trunc('month', l.date), ${VAT_BUCKET}
      HAVING SUM(${LEG_RATE}) > 0
      ORDER BY date_trunc('month', l.date) DESC, ${VAT_BUCKET} ASC
      `,
      [
        subeiRegNum,
        year ? Number.parseInt(year, 10) : null,
        month ? Number.parseInt(month, 10) : null,
      ]
    );

    return rows.map((row) => ({
      ...row,
      subbie_reg_num: subeiRegNum,
      statement_key: buildStatementKey(row.period, row.vat_status),
    }));
  } finally {
    client.release();
  }
};

/**
 * The legs behind one statement, with the display columns the statement page
 * and the exported documents render. Same rate expression as the list, so the
 * line items always sum to the list's total.
 */
const listStatementLegs = async (subeiRegNum, period, vatStatus) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
      SELECT
        l.legkey,
        l.date,
        l.startingpoint,
        l.destination,
        ${LEG_CONTAINERS}                    AS containernumber,
        l.m1key                              AS instruction_number,
        m1.description                       AS m1_description,
        c.client                             AS client_name,
        COALESCE(m1.vat, 0)::numeric         AS vat_percentage,
        ${LEG_RATE}                          AS driverrate,
        to_char(${LEG_RATE}, 'FM9999999990.00')                       AS driverrate_text,
        to_char(ROUND(COALESCE(l.driverrate, 0)::numeric, 2), 'FM9999999990.00')
                                             AS base_rate_text
      ${SUBBIE_FROM}
      LEFT JOIN m5_client c ON c.m5clientkey = m1.client
      WHERE ${IS_SUBBIE}
        AND e.subei_reg_num = $1
        AND l.date >= $2::date
        AND l.date <  ($2::date + INTERVAL '1 month')
        AND ${VAT_BUCKET} = $3
      ORDER BY l.date, l.legkey
      `,
      [subeiRegNum, normalisePeriod(period), assertVatStatus(vatStatus)]
    );

    return rows;
  } finally {
    client.release();
  }
};

export {
  listStatements,
  listStatementLegs,
  buildStatementKey,
  parseStatementKey,
  normalisePeriod,
  assertVatStatus,
};
