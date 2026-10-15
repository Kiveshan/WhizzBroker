// The single definition of what a client statement IS.
//
// A statement is an aggregate over live data, not a stored record: the invoices
// and add-ons raised in a month, the payments and credit notes applied in it,
// the balance carried in from before it, and the aging of whatever is still
// outstanding at the end of it. Opening a statement computes it — there is no
// generation step.
//
// WHY THIS IS POSSIBLE, when the retired generator's numbers were not
// reproducible: that generator read m1_controller.payment_status / paid_amount
// as they stood WHEN IT RAN, so its output was a snapshot of the present, not of
// the statement's month. Payments, however, are individually dated — every
// payment_m3.line_items entry carries line_date and this_payment and is keyed to
// invoice.ikey — so "paid as at date D" is a sum with a date filter, and a
// genuine as-at figure can be computed for any past month.
//
// Two consequences, both intended:
//   * Figures for past months can differ from what the old table stored. The old
//     values were not as-at figures in the first place.
//   * An invoice entered late, back-dated into a closed month, will appear in
//     that month. `invoice` has no creation timestamp, so there is no way to
//     exclude it — and it is genuinely part of that month's trading.
// What was actually SENT to a client is preserved by the export snapshots
// (client_statement_exports), which is the record that matters.
//
// BROKER: ported from Whizz-Away and made group-aware. Every new invoice is a
// group invoice (invoice.m1key NULL, instruction_group_id set) covering all of
// a group's child instructions, so nothing here joins invoice to m1_controller
// on m1key alone. INVOICE_CHILDREN maps each invoice to the instructions it
// bills; an invoice's value is the sum over them, and a credit note (keyed to
// one child m1key) lands on whichever invoice billed that child.
import { pool } from "../../config/database.js";

/** Accepts YYYY-MM or YYYY-MM-DD; normalises to the first of that month. */
const normalisePeriod = (period) => {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(String(period || "").trim());
  if (!match) throw new Error(`Invalid period "${period}" — expected YYYY-MM`);
  const [, year, month] = match;
  if (Number(month) < 1 || Number(month) > 12) {
    throw new Error(`Invalid period "${period}" — month out of range`);
  }
  return `${year}-${month}-01`;
};

/**
 * Statement identity, replacing the retired statements.statement_key serial.
 * Derived data has no serial to offer, so the key is the two things that define
 * the statement: "7-2026-08".
 */
const buildStatementKey = (clientId, period) =>
  `${clientId}-${String(period).slice(0, 7)}`;

const KEY_SHAPE = /^(\d+)-(\d{4})-(\d{2})$/;

const parseStatementKey = (statementKey) => {
  const match = KEY_SHAPE.exec(String(statementKey || "").trim());
  if (!match) {
    throw new Error(
      `Invalid statement key "${statementKey}" — expected <clientId>-YYYY-MM`
    );
  }
  const [, clientId, year, month] = match;
  return {
    clientId: Number.parseInt(clientId, 10),
    period: normalisePeriod(`${year}-${month}`),
  };
};

// A credit note's value as it was applied. credit_notes.amount holds the
// VAT-EXCLUSIVE line amounts, but creditNoteModel adds the instruction's VAT
// before crediting m1_controller.paid_amount — so the gross is what actually
// came off the invoice, and the only figure that reconciles with it.
const CREDIT_NOTES_GROSS = `
  SELECT
    cn.creditnote_id,
    cn.client_id,
    cn.m1key,
    cn.creditnote_date,
    cn.doc_no,
    cn.description,
    ROUND((SUM(amt.amount)::numeric * (1 + COALESCE(m1.vat, 0)::numeric / 100)), 2) AS gross,
    SUM(amt.amount)::numeric AS net
  FROM credit_notes cn
  CROSS JOIN LATERAL unnest(cn.amount) AS amt(amount)
  LEFT JOIN m1_controller m1 ON m1.m1key = cn.m1key
  GROUP BY cn.creditnote_id, m1.vat
`;

// Each invoice and the child instruction(s) it bills: a legacy invoice bills its
// own m1key, a group invoice bills every child of its instruction_group. An
// instruction reachable by both (an old single invoice and a later group
// invoice for the same work) is attributed to ONE invoice, the group one, so a
// credit note against it is never counted twice.
const INVOICE_CHILDREN = `
  SELECT DISTINCT ON (x.m1key) x.ikey, x.clientid, x.date, x.m1key
  FROM (
    SELECT i.ikey, i.clientid, i.date, i.m1key, 0 AS is_group
    FROM invoice i
    WHERE i.m1key IS NOT NULL
    UNION ALL
    SELECT i.ikey, i.clientid, i.date, m1.m1key, 1 AS is_group
    FROM invoice i
    JOIN m1_controller m1 ON m1.instruction_group_id = i.instruction_group_id
    WHERE i.m1key IS NULL
  ) x
  ORDER BY x.m1key, x.is_group DESC, x.ikey DESC
`;

// One row per invoice with its VAT-inclusive value summed over its children.
// net is kept so a blended VAT factor can be derived for ex-VAT aging.
const INVOICE_TOTALS = `
  SELECT ic.ikey, ic.clientid, ic.date,
         ROUND(SUM(m1.total_cost * (1 + COALESCE(m1.vat, 0)::numeric / 100))::numeric, 2) AS gross,
         SUM(m1.total_cost)::numeric AS net
  FROM (${INVOICE_CHILDREN}) ic
  JOIN m1_controller m1 ON m1.m1key = ic.m1key
  GROUP BY ic.ikey, ic.clientid, ic.date
`;

// Every item for a client (or, with $1 NULL, for every client) as at a date,
// with what was settled against it ON OR BEFORE that date — payments by their
// line_date, credit notes by their creditnote_date. This is the whole trick: both
// ledgers are dated, so the past is answerable. Age is computed here in whole
// days so no JS Date / timezone conversion touches it.
const ITEMS_AS_AT = `
  WITH paid AS (
    SELECT
      p.clientid,
      item->>'type'                           AS item_type,
      (item->>'id')::int                      AS item_id,
      SUM((item->>'this_payment')::numeric)   AS paid
    FROM payment_m3 p
    CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS item
    WHERE ($1::int IS NULL OR p.clientid = $1::int)
      AND (item->>'line_date')::date <= $2::date
    GROUP BY 1, 2, 3
  ),
  credited AS (
    SELECT ic.ikey, SUM(cn.gross) AS credited
    FROM (${CREDIT_NOTES_GROSS}) cn
    JOIN (${INVOICE_CHILDREN}) ic ON ic.m1key = cn.m1key AND ic.clientid = cn.client_id
    WHERE ($1::int IS NULL OR cn.client_id = $1::int)
      AND cn.creditnote_date <= $2::date
    GROUP BY 1
  )
  SELECT
    it.clientid                             AS client_id,
    it.gross                                AS gross,
    COALESCE(pd.paid, 0) + COALESCE(cr.credited, 0) AS settled,
    ($2::date - it.date)                    AS age_days,
    CASE WHEN COALESCE(it.net, 0) > 0 THEN it.gross / it.net ELSE 1 END AS vat_factor
  FROM (${INVOICE_TOTALS}) it
  LEFT JOIN paid pd
    ON pd.clientid = it.clientid AND pd.item_type = 'Invoice' AND pd.item_id = it.ikey
  LEFT JOIN credited cr
    ON cr.ikey = it.ikey
  WHERE ($1::int IS NULL OR it.clientid = $1::int)
    AND it.date <= $2::date

  UNION ALL

  SELECT
    a.client_id,
    ROUND(a.amount::numeric, 2),
    COALESCE(pd.paid, 0),
    ($2::date - a.date),
    CASE WHEN COALESCE(a.vat_applied, true) THEN 1.15 ELSE 1 END
  FROM add_ons a
  LEFT JOIN paid pd
    ON pd.clientid = a.client_id AND pd.item_type = 'Add-on' AND pd.item_id = a.addon_id
  WHERE ($1::int IS NULL OR a.client_id = $1::int)
    AND a.date <= $2::date
`;

// Credit notes that cannot be matched to an invoice in the as-at item set: no
// m1key (older rows), or an instruction whose invoice is not on the books yet
// at that date. They still reduce what the client owes; ageOpenItems() applies
// them to the oldest debt.
const UNALLOCATED_CREDITS_AS_AT = `
  SELECT cn.client_id, SUM(cn.gross) AS credit, SUM(cn.net) AS credit_ex
  FROM (${CREDIT_NOTES_GROSS}) cn
  WHERE ($1::int IS NULL OR cn.client_id = $1::int)
    AND cn.creditnote_date <= $2::date
    AND NOT EXISTS (
      SELECT 1 FROM (${INVOICE_CHILDREN}) ic
      WHERE ic.m1key = cn.m1key
        AND ic.clientid = cn.client_id
        AND ic.date <= $2::date
    )
  GROUP BY 1
`;

const BUCKETS = ["current", "30days", "60days", "90days"];

const bucketFor = (ageDays) => {
  if (ageDays <= 30) return "current";
  if (ageDays <= 60) return "30days";
  if (ageDays <= 90) return "60days";
  return "90days";
};

// Integer cents throughout so the buckets sum to the total exactly.
const toCents = (value) => Math.round((Number(value) || 0) * 100);

/**
 * Age one client's items. The buckets always sum to the total: any credit not
 * sitting on a specific item — unallocated credit notes, or an item settled
 * beyond its value — is applied to the oldest debt first, and whatever is left
 * over is money the client is in credit by, shown as a negative `current`.
 */
const ageOpenItems = (items, unallocatedCredit = 0) => {
  const cents = { current: 0, "30days": 0, "60days": 0, "90days": 0 };
  let credit = toCents(unallocatedCredit);

  for (const row of items) {
    const outstanding = toCents(row.gross) - toCents(row.settled);
    if (outstanding < 0) credit -= outstanding;
    else cents[bucketFor(Number(row.age_days))] += outstanding;
  }

  for (const bucket of [...BUCKETS].reverse()) {
    const applied = Math.min(cents[bucket], credit);
    cents[bucket] -= applied;
    credit -= applied;
  }
  cents.current -= credit;

  const buckets = Object.fromEntries(BUCKETS.map((b) => [b, cents[b] / 100]));
  const total = BUCKETS.reduce((sum, b) => sum + cents[b], 0) / 100;
  return { total, buckets };
};

// With { exVat: true } items are aged on their VAT-exclusive values: each
// item's gross and what settled it divided by that item's VAT factor (payments
// and credits against an item carry its rate), and unallocated credits at
// their net. Statements always use the default, VAT-inclusive, figures.
const itemsFor = (rows, exVat) =>
  exVat
    ? rows.map((row) => ({
        ...row,
        gross: Number(row.gross) / Number(row.vat_factor || 1),
        settled: Number(row.settled) / Number(row.vat_factor || 1),
      }))
    : rows;
const creditFor = (row, exVat) => (exVat ? row?.credit_ex : row?.credit);

/**
 * Outstanding and aging as at a date for every client at once — two queries
 * regardless of client count. Returns Map<clientId, { total, buckets }>; a
 * client with nothing on the books is simply absent.
 */
const agingForAllClients = async (db, asAt, { exVat = false } = {}) => {
  const [items, credits] = await Promise.all([
    db.query(ITEMS_AS_AT, [null, asAt]),
    db.query(UNALLOCATED_CREDITS_AS_AT, [null, asAt]),
  ]);

  const itemsByClient = new Map();
  for (const row of itemsFor(items.rows, exVat)) {
    if (!itemsByClient.has(row.client_id)) itemsByClient.set(row.client_id, []);
    itemsByClient.get(row.client_id).push(row);
  }
  const creditByClient = new Map(
    credits.rows.map((row) => [row.client_id, creditFor(row, exVat)])
  );

  const result = new Map();
  for (const clientId of new Set([...itemsByClient.keys(), ...creditByClient.keys()])) {
    result.set(
      clientId,
      ageOpenItems(itemsByClient.get(clientId) || [], creditByClient.get(clientId))
    );
  }
  return result;
};

const lastDayOf = (period) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const dayBefore = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Outstanding, and its aging buckets, for one client as at a date. */
const outstandingAsAt = async (db, clientId, asAt, { exVat = false } = {}) => {
  const [items, credits] = await Promise.all([
    db.query(ITEMS_AS_AT, [clientId, asAt]),
    db.query(UNALLOCATED_CREDITS_AS_AT, [clientId, asAt]),
  ]);
  return ageOpenItems(itemsFor(items.rows, exVat), creditFor(credits.rows[0], exVat));
};

/** Every month in which this client invoiced, paid, or was credited. */
const ACTIVITY_MONTHS = `
  SELECT DISTINCT to_char(date_trunc('month', d)::date, 'YYYY-MM-DD') AS period
  FROM (
    SELECT i.date AS d FROM invoice i WHERE i.clientid = $1
    UNION ALL
    SELECT a.date FROM add_ons a WHERE a.client_id = $1
    UNION ALL
    SELECT (item->>'line_date')::date
      FROM payment_m3 p CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS item
      WHERE p.clientid = $1
    UNION ALL
    SELECT cn.creditnote_date FROM credit_notes cn WHERE cn.client_id = $1
  ) AS activity
  WHERE d IS NOT NULL
  ORDER BY 1
`;

/** The first of the current month, in UTC, as YYYY-MM-01. */
const currentMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

/** Inclusive run of month-firsts from one period to another. */
const monthsBetween = (from, to) => {
  const out = [];
  let [year, month] = from.split("-").map(Number);
  while (`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01` <= to) {
    out.push(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`);
    if (++month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
};

/**
 * Every month this client has a statement for, newest first.
 *
 * A month qualifies if it had activity (an invoice, add-on, payment or credit
 * note) OR it closed with money still owed. The second case is why the series
 * is built month by month rather than taken straight from the ledgers: a client
 * who paid nothing and bought nothing in a month still has a statement, because
 * everything outstanding aged by that month — 60 days becomes 90 — and that
 * movement is the whole point of sending one. The run extends to the current
 * month for the same reason, so the month just ended is always there to open,
 * export and send.
 *
 * A month with no activity and nothing owed is skipped: there is genuinely
 * nothing to say, and a dormant client should not accumulate empty statements.
 */
const listStatementPeriods = async (clientId, { year = null, month = null } = {}) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(ACTIVITY_MONTHS, [clientId]);
    if (rows.length === 0) return [];

    const activity = new Set(rows.map((row) => row.period));
    const first = rows[0].period;
    const last = rows[rows.length - 1].period;
    const series = monthsBetween(first, last > currentMonth() ? last : currentMonth());

    const periods = [];
    // Every ledger that moves the balance also makes a month an activity month,
    // so across a run of quiet months the balance cannot change — only its
    // aging does. One balance query per run of quiet months, not per month.
    let quietRunOwes = null;
    for (const period of series) {
      if (activity.has(period)) {
        quietRunOwes = null;
      } else {
        if (quietRunOwes === null) {
          const { total } = await outstandingAsAt(client, clientId, lastDayOf(period));
          quietRunOwes = Math.abs(total) >= 0.005;
        }
        if (!quietRunOwes) continue;
      }
      periods.push(period);
    }

    return periods
      .filter((period) => {
        if (year && Number(period.slice(0, 4)) !== Number.parseInt(year, 10)) return false;
        if (month && Number(period.slice(5, 7)) !== Number.parseInt(month, 10)) return false;
        return true;
      })
      .reverse()
      .map((period) => ({
        statement_key: buildStatementKey(clientId, period),
        clientid: clientId,
        period,
        // Kept for the pages that still label a statement by its generation
        // date: the 1st of the month AFTER the covered one, as the old table
        // stored.
        generation_date: new Date(
          Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1)
        )
          .toISOString()
          .slice(0, 10),
      }));
  } finally {
    client.release();
  }
};


// Company / banking details shown on every statement. roleid 1 + active is the
// operating company record, exactly as the retired query selected it.
const COMPANY_SQL = `
  SELECT companyname, cluster_box, vat_reg_num, address, suburb, branch_code,
         bank, name_of_acc, swift_code, account_num,
         COALESCE(cell_num, cell_num2) AS phonenumber
  FROM usertable
  WHERE roleid = 1 AND status = 'active'
  LIMIT 1
`;

const CLIENT_SQL = `
  SELECT m5clientkey, client, companyaddress, cellnum, email, suburb,
         representative, COALESCE(insurance, 0) AS insurance
  FROM m5_client
  WHERE m5clientkey = $1
`;

/**
 * A complete statement for one client and month, computed from live data.
 *
 * Shape matches what the old stored query returned so the pages stay
 * recognisable, with two deliberate breaks: `statement_key` is the derived
 * "<clientId>-YYYY-MM" key rather than a serial, and `period` is the month the
 * statement covers rather than the following month the old rows were dated by.
 */
const deriveStatement = async (clientId, periodInput) => {
  const period = normalisePeriod(periodInput);
  const openAt = dayBefore(period);
  const closeAt = lastDayOf(period);

  const client = await pool.connect();
  try {
    const [companyRes, clientRes, opening, closing] = await Promise.all([
      client.query(COMPANY_SQL),
      client.query(CLIENT_SQL, [clientId]),
      outstandingAsAt(client, clientId, openAt),
      outstandingAsAt(client, clientId, closeAt),
    ]);

    if (clientRes.rows.length === 0) {
      return { success: false, message: `Client ${clientId} not found` };
    }

    const [invoices, addons, payments, creditNotes] = await Promise.all([
      client.query(
        // One line per invoice, group invoices included; the route and
        // reference come from its first child, and a multi-instruction group
        // is labelled by the page from group_ref + instruction_count.
        `SELECT it.ikey, it.date, i.invoice_num, it.gross AS amount,
                first_child."ksmFileRef" AS task, first_child.pickup, first_child.dropoff,
                first_child.rate_title, g.group_ref, kids.n AS instruction_count
         FROM (${INVOICE_TOTALS}) it
         JOIN invoice i ON i.ikey = it.ikey
         LEFT JOIN instruction_group g ON g.group_key = i.instruction_group_id
         JOIN LATERAL (
           SELECT COUNT(*)::int AS n, MIN(ic.m1key) AS first_m1key
           FROM (${INVOICE_CHILDREN}) ic WHERE ic.ikey = it.ikey
         ) kids ON TRUE
         JOIN m1_controller first_child ON first_child.m1key = kids.first_m1key
         WHERE it.clientid = $1 AND it.date BETWEEN $2::date AND $3::date
         ORDER BY it.date, it.ikey`,
        [clientId, period, closeAt]
      ),
      client.query(
        `SELECT addon_id, date, ROUND(amount::numeric, 2) AS amount, items, invoice_number
         FROM add_ons
         WHERE client_id = $1 AND date BETWEEN $2::date AND $3::date
         ORDER BY date, addon_id`,
        [clientId, period, closeAt]
      ),
      client.query(
        `SELECT p.paykey,
                (item->>'line_date')::date        AS date,
                (item->>'this_payment')::numeric  AS amount,
                item->>'line_reference'           AS reference,
                item->>'invoice_num'              AS invoice_num
         FROM payment_m3 p
         CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS item
         WHERE p.clientid = $1
           AND (item->>'line_date')::date BETWEEN $2::date AND $3::date
         ORDER BY 2`,
        [clientId, period, closeAt]
      ),
      // VAT-inclusive, as applied to the invoice — the ex-VAT figure the old
      // statement showed understated every credit note by its VAT.
      client.query(
        `SELECT creditnote_id, creditnote_date AS date, gross AS amount,
                doc_no AS reference, description
         FROM (${CREDIT_NOTES_GROSS}) cn
         WHERE client_id = $1
           AND creditnote_date BETWEEN $2::date AND $3::date
         ORDER BY creditnote_date, creditnote_id`,
        [clientId, period, closeAt]
      ),
    ]);

    const company = companyRes.rows[0] || {};
    const c = clientRes.rows[0];
    const round2 = (n) => Number(Number(n || 0).toFixed(2));

    return {
      success: true,
      data: {
        statement_key: buildStatementKey(clientId, period),
        period,
        // The 1st of the month AFTER the covered one, as the old rows were
        // dated — kept so existing headings and filenames read the same.
        generation_date: new Date(
          Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1)
        )
          .toISOString()
          .slice(0, 10),
        groupid: null,
        opening_balance: round2(opening.total),
        closing_balance: round2(closing.total),
        // Deliberately NOT part of opening/closing: insurance is shown as a
        // credit against this month's balance due, but it is not a payment, so
        // the underlying debt carries into next month's opening balance
        // unchanged — same as the retired generator. Not a reconciliation bug.
        insurance_amount: round2(c.insurance),
        company_name: company.companyname,
        cluster_box: company.cluster_box,
        vat_reg_num: company.vat_reg_num,
        address: company.address,
        suburb: company.suburb,
        branch_code: company.branch_code,
        bank: company.bank,
        name_of_acc: company.name_of_acc,
        swift_code: company.swift_code,
        account_num: company.account_num,
        phonenumber: company.phonenumber,
        client: {
          id: c.m5clientkey,
          name: c.client,
          representative: c.representative,
          email: c.email,
          phone: c.cellnum,
          address: c.companyaddress,
          suburb: c.suburb,
        },
        // Aging as at the END of the covered month, from items still open then
        // and payments applied on or before then.
        aging: {
          current: round2(closing.buckets.current),
          "30days": round2(closing.buckets["30days"]),
          "60days": round2(closing.buckets["60days"]),
          "90days": round2(closing.buckets["90days"]),
        },
        invoices: invoices.rows.map((r) => ({
          ikey: r.ikey,
          date: r.date,
          amount: Number(r.amount),
          task: r.task,
          invoice_num: r.invoice_num,
          pickup: r.pickup,
          dropoff: r.dropoff,
          rate_title: r.rate_title,
          group_ref: r.group_ref,
          instruction_count: r.instruction_count,
        })),
        addons: addons.rows.map((r) => ({
          addon_id: r.addon_id,
          date: r.date,
          amount: Number(r.amount),
          items: r.items,
          addon_num: r.invoice_number,
        })),
        payments: payments.rows.map((r) => ({
          paykey: r.paykey,
          date: r.date,
          amount: Number(r.amount),
          reference: r.reference || "",
          invoice_num: r.invoice_num || "",
        })),
        credit_notes: creditNotes.rows.map((r) => ({
          creditnote_id: r.creditnote_id,
          date: r.date,
          amount: Number(r.amount),
          reference: r.reference || "",
          description: r.description || "",
        })),
      },
    };
  } finally {
    client.release();
  }
};

export {
  normalisePeriod,
  buildStatementKey,
  parseStatementKey,
  lastDayOf,
  dayBefore,
  ageOpenItems,
  outstandingAsAt,
  agingForAllClients,
  listStatementPeriods,
  deriveStatement,
};
