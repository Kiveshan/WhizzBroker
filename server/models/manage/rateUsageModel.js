import { pool } from "../../config/database.js"
import { cleanTitle } from "../../utils/routeRateFields.js"

// Which open instructions are priced from which rate.
//
// An instruction stores only its rate's title (m1_controller.rate_title). The
// rate it uses is whichever row of client_effective_rate wins for that title
// right now — the client's own price, else the highest-priority card. These
// helpers resolve that the same way the instruction screens do, so "used by"
// means "the rate an edit of that instruction would price new additions from".
//
// Open = not completed and not invoiced (on its own or through its group).
// Completed / invoiced instructions only ever read their stored amounts, so
// removing or renaming a rate never affects them.

const OPEN_INSTRUCTION_SQL = `
  m.rate_title IS NOT NULL
  AND LOWER(REPLACE(COALESCE(m.status, ''), ' ', '')) <> 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.invoice i
    WHERE i.m1key = m.m1key
       OR (m.instruction_group_id IS NOT NULL AND i.instruction_group_id = m.instruction_group_id)
  )`

const WINNING_RATE_JOIN = `
  JOIN LATERAL (
    SELECT er.rate_source, er.source_rate_id, er.rate_card_id
    FROM public.client_effective_rate er
    WHERE er.clientid = m.client
      AND er.title_key = rate_title_key(m.rate_title)
    ORDER BY er.source_rank, er.source_rate_id DESC
    LIMIT 1
  ) win ON true`

const intArray = (values) =>
  [...new Set((values || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]

// Open-instruction counts for rates about to be removed or renamed, and for
// cards about to stop applying to some clients (unassigned, or the card made
// inactive). One row per client + rate title.
//
//   clientRateIds  m5_client_rate ids
//   cardRateIds    rate_card_rate ids
//   cardClients    [{ rateCardId, clientId }] — the whole card for that client
const findOpenInstructionUsage = async ({ clientRateIds = [], cardRateIds = [], cardClients = [] } = {}) => {
  const clientIds = intArray(clientRateIds)
  const cardIds = intArray(cardRateIds)
  const pairs = (cardClients || [])
    .map((p) => [Number(p.rateCardId), Number(p.clientId)])
    .filter(([card, cl]) => Number.isInteger(card) && Number.isInteger(cl))
  if (!clientIds.length && !cardIds.length && !pairs.length) return []

  const result = await pool.query(
    `SELECT win.rate_source, win.source_rate_id, win.rate_card_id,
            m.client AS clientid, c.client AS client_name, m.rate_title AS title,
            COUNT(*)::int AS open_count,
            (ARRAY_AGG(m.m1key ORDER BY m.m1key))[1:10] AS sample_instructions
     FROM public.m1_controller m
     ${WINNING_RATE_JOIN}
     JOIN public.m5_client c ON c.m5clientkey = m.client
     WHERE ${OPEN_INSTRUCTION_SQL}
       AND (
         (win.rate_source = 'client' AND win.source_rate_id = ANY($1::int[]))
         OR (win.rate_source = 'card' AND win.source_rate_id = ANY($2::int[]))
         OR (win.rate_source = 'card' AND (win.rate_card_id, m.client) IN (
               SELECT * FROM unnest($3::int[], $4::int[])))
       )
     GROUP BY win.rate_source, win.source_rate_id, win.rate_card_id, m.client, c.client, m.rate_title
     ORDER BY c.client, m.rate_title`,
    [clientIds, cardIds, pairs.map((p) => p[0]), pairs.map((p) => p[1])],
  )
  return result.rows
}

// Renames among `rates` (rows that already exist and whose title changes),
// read from the database before the save writes anything. Only rows owned by
// the client / card being saved (ownerColumn = ownerId) count.
// table / idColumn / ownerColumn are fixed identifiers from the callers.
const findRenames = async (db, { table, idColumn, ownerColumn, ownerId }, rates) => {
  const incoming = (rates || [])
    .filter((r) => r[idColumn])
    .map((r) => ({ id: Number(r[idColumn]), title: cleanTitle(r.title) }))
  if (!incoming.length) return []
  const current = await db.query(
    `SELECT ${idColumn} AS id, title FROM public.${table}
     WHERE ${idColumn} = ANY($1::int[]) AND ${ownerColumn} = $2`,
    [incoming.map((r) => r.id), ownerId],
  )
  const oldById = new Map(current.rows.map((r) => [Number(r.id), r.title]))
  return incoming
    .filter((r) => oldById.has(r.id) && r.title && r.title !== oldById.get(r.id))
    .map((r) => ({ id: r.id, oldTitle: oldById.get(r.id), newTitle: r.title }))
}

// Moves open instructions onto a renamed rate's new title, so a rename (say a
// typo fix) does not leave them pointing at a title that no longer exists.
// Must run inside the save transaction BEFORE any rate rows change: it finds
// the instructions whose title currently resolves to the renamed row.
// Completed / invoiced instructions keep the title they were billed under.
// Returns how many instructions were updated.
const carryRenamesToOpenInstructions = async (db, source, renames) => {
  if (!renames.length) return 0
  const result = await db.query(
    `WITH targets AS (
       SELECT m.m1key, r.new_title
       FROM public.m1_controller m
       ${WINNING_RATE_JOIN}
       JOIN unnest($2::int[], $3::text[]) AS r(rate_id, new_title) ON r.rate_id = win.source_rate_id
       WHERE ${OPEN_INSTRUCTION_SQL}
         AND win.rate_source = $1
         AND m.rate_title IS DISTINCT FROM r.new_title
     )
     UPDATE public.m1_controller m
     SET rate_title = t.new_title
     FROM targets t
     WHERE m.m1key = t.m1key`,
    [source, renames.map((r) => r.id), renames.map((r) => r.newTitle)],
  )
  return result.rowCount
}

export { findOpenInstructionUsage, findRenames, carryRenamesToOpenInstructions }
