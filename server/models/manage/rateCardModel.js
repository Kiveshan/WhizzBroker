import { pool } from "../../config/database.js"
import { routeRateValues, cleanExtraCharges } from "../../utils/routeRateFields.js"
import { findRenames, carryRenamesToOpenInstructions } from "./rateUsageModel.js"

// Rate cards: named, reusable route price lists assigned to many clients.
// Resolution against a client's own rates happens in the
// client_effective_rate view (migration 014), not here.

const listRateCards = async ({ search = "", includeInactive = true } = {}) => {
  const params = []
  let where = "WHERE 1=1"
  if (search.trim() !== "") {
    params.push(`%${search.trim()}%`)
    where += ` AND (LOWER(rc.name) LIKE LOWER($${params.length}) OR LOWER(COALESCE(rc.description, '')) LIKE LOWER($${params.length}))`
  }
  if (!includeInactive) where += " AND rc.status = true"

  const result = await pool.query(
    `SELECT
       rc.*,
       (SELECT COUNT(*) FROM rate_card_rate rr WHERE rr.rate_card_id = rc.rate_card_id)::int AS route_count,
       (SELECT COUNT(*) FROM client_rate_card crc WHERE crc.rate_card_id = rc.rate_card_id)::int AS client_count
     FROM rate_card rc
     ${where}
     ORDER BY rc.name`,
    params,
  )
  return result.rows
}

const getRateCardById = async (rateCardId) => {
  const cardResult = await pool.query("SELECT * FROM rate_card WHERE rate_card_id = $1", [rateCardId])
  if (!cardResult.rows.length) return null

  const ratesResult = await pool.query(
    `SELECT
       rr.*,
       rr.surcharges AS "surcharge6M",
       COALESCE((
         SELECT json_agg(json_build_object(
                  'charge_id', e.charge_id,
                  'charge_name', e.charge_name,
                  'amount', e.amount
                ) ORDER BY e.charge_id)
         FROM rate_card_extra_charge e
         WHERE e.rate_card_rate_id = rr.rate_card_rate_id
       ), '[]'::json) AS extra_charges
     FROM rate_card_rate rr
     WHERE rr.rate_card_id = $1
     ORDER BY rr.title, rr.rate_card_rate_id`,
    [rateCardId],
  )

  const clientsResult = await pool.query(
    `SELECT c.m5clientkey, c.client, crc.priority, crc.fuel_surcharge
     FROM client_rate_card crc
     JOIN m5_client c ON c.m5clientkey = crc.clientid
     WHERE crc.rate_card_id = $1
     ORDER BY c.client`,
    [rateCardId],
  )

  return { ...cardResult.rows[0], rates: ratesResult.rows, clients: clientsResult.rows }
}

// Updates routes in place (keyed by rate_card_rate_id) and deletes routes no
// longer present, mirroring saveClientRates so extra charges are not lost to
// a delete-and-reinsert.
const saveRateCardRates = async (client, rateCardId, rates) => {
  const keptIds = rates.map((r) => r.rate_card_rate_id).filter((id) => id !== undefined && id !== null)
  await client.query("DELETE FROM rate_card_rate WHERE rate_card_id = $1 AND rate_card_rate_id != ALL($2::int[])", [
    rateCardId,
    keptIds,
  ])
  // Titles are unique per card; park kept rows on temporary titles so renames
  // that swap titles between rows don't collide mid-save.
  await client.query(
    `UPDATE rate_card_rate SET title = '__saving__' || rate_card_rate_id
     WHERE rate_card_id = $1 AND rate_card_rate_id = ANY($2::int[])`,
    [rateCardId, keptIds],
  )

  for (const rate of rates) {
    const values = routeRateValues(rate)
    let row
    if (rate.rate_card_rate_id) {
      const result = await client.query(
        `UPDATE rate_card_rate
         SET starting_point = $2, destination = $3, "6m_rate" = $4, "12m_rate" = $5, surcharges = $6,
             surcharge12m = $7, hazardous = $8, vgm = $9, set_rate = $10, fuel_surcharge = $11, title = $12
         WHERE rate_card_rate_id = $13 AND rate_card_id = $1
         RETURNING rate_card_rate_id`,
        [rateCardId, ...values, rate.rate_card_rate_id],
      )
      row = result.rows[0]
    }
    if (!row) {
      const result = await client.query(
        `INSERT INTO rate_card_rate (rate_card_id, starting_point, destination, "6m_rate", "12m_rate", surcharges,
                                     surcharge12m, hazardous, vgm, set_rate, fuel_surcharge, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING rate_card_rate_id`,
        [rateCardId, ...values],
      )
      row = result.rows[0]
    }

    await client.query("DELETE FROM rate_card_extra_charge WHERE rate_card_rate_id = $1", [row.rate_card_rate_id])
    for (const charge of cleanExtraCharges(rate)) {
      await client.query(
        "INSERT INTO rate_card_extra_charge (rate_card_rate_id, charge_name, amount) VALUES ($1, $2, $3)",
        [row.rate_card_rate_id, charge.charge_name, charge.amount],
      )
    }
  }
}

// Makes clientIds exactly the set of clients on this card. Clients newly
// added get the card at the bottom of their own card list (lowest priority),
// so assigning from the card side never changes which price wins on routes
// the client already has. Priority and fuel % of existing assignments are
// left alone; those are edited per client on the Client Rates screen.
const syncCardClients = async (client, rateCardId, clientIds) => {
  await client.query("DELETE FROM client_rate_card WHERE rate_card_id = $1 AND clientid <> ALL($2::int[])", [
    rateCardId,
    clientIds,
  ])
  await client.query(
    `INSERT INTO client_rate_card (clientid, rate_card_id, priority)
     SELECT c.clientid, $1,
            COALESCE((SELECT MAX(crc.priority) FROM client_rate_card crc WHERE crc.clientid = c.clientid), 0) + 1
     FROM unnest($2::int[]) AS c(clientid)
     ON CONFLICT (clientid, rate_card_id) DO NOTHING`,
    [rateCardId, clientIds],
  )
}

// For each client, the card rates that would NOT be used because the client
// already has a winning price with the same title: its own rate, or a card
// above this one in its list. Titles are taken from the form so unsaved edits
// count. A client not yet on the card is treated as getting it at the bottom.
const findAssignmentConflicts = async (rateCardId, titles, clientIds) => {
  if (!titles.length || !clientIds.length) return []
  const result = await pool.query(
    `WITH titles AS (
       SELECT DISTINCT ON (rate_title_key(t)) t AS title, rate_title_key(t) AS title_key
       FROM unnest($2::text[]) AS t
     ),
     picked AS (SELECT DISTINCT unnest($3::int[]) AS clientid)
     SELECT p.clientid, c.client, l.title,
            win.rate_source AS winning_source, win.rate_card_name AS winning_card
     FROM picked p
     JOIN m5_client c ON c.m5clientkey = p.clientid
     CROSS JOIN titles l
     JOIN LATERAL (
       SELECT er.rate_source, er.rate_card_name
       FROM client_effective_rate er
       WHERE er.clientid = p.clientid
         AND er.title_key = l.title_key
         -- any price other than this card's own rows ($1 is null for a new card)
         AND (er.rate_source = 'client' OR $1::int IS NULL OR er.rate_card_id <> $1::int)
         AND er.source_rank < COALESCE(
               (SELECT crc.priority FROM client_rate_card crc
                WHERE crc.clientid = p.clientid AND crc.rate_card_id = $1::int),
               2147483647)
       ORDER BY er.source_rank, er.source_rate_id DESC
       LIMIT 1
     ) win ON true
     ORDER BY c.client, l.title`,
    [rateCardId || null, titles, clientIds],
  )
  return result.rows
}

// Creates the card when rateCardId is null, otherwise updates it. When
// clientIds is an array, the card's client list is replaced in the same
// transaction; when undefined, assignments are left alone.
const saveRateCard = async (rateCardId, { name, description, status = true, rates = [], clientIds }) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Renamed rates take their open instructions with them. Done first, while
    // the card is still active and its titles still resolve.
    let renames = []
    let renamedInstructions = 0
    if (rateCardId) {
      renames = await findRenames(
        client,
        { table: "rate_card_rate", idColumn: "rate_card_rate_id", ownerColumn: "rate_card_id", ownerId: rateCardId },
        rates,
      )
      renamedInstructions = await carryRenamesToOpenInstructions(client, "card", renames)
    }

    let id = rateCardId
    if (id) {
      const result = await client.query(
        `UPDATE rate_card SET name = $2, description = $3, status = $4, updated_at = now()
         WHERE rate_card_id = $1 RETURNING rate_card_id`,
        [id, name.trim(), description || null, status !== false],
      )
      if (!result.rows.length) {
        await client.query("ROLLBACK")
        return { success: false, notFound: true, message: "Rate card not found" }
      }
    } else {
      const result = await client.query(
        "INSERT INTO rate_card (name, description, status) VALUES ($1, $2, $3) RETURNING rate_card_id",
        [name.trim(), description || null, status !== false],
      )
      id = result.rows[0].rate_card_id
    }

    await saveRateCardRates(client, id, rates)
    if (Array.isArray(clientIds)) await syncCardClients(client, id, clientIds)

    await client.query("COMMIT")
    return { success: true, rateCardId: id, renames, renamedInstructions }
  } catch (err) {
    await client.query("ROLLBACK")
    if (err.code === "23505") {
      return {
        success: false,
        message:
          err.constraint === "uq_rate_card_name"
            ? `A rate card named "${name}" already exists`
            : "Two rates on this card have the same title. Each title can only be used once.",
      }
    }
    throw err
  } finally {
    client.release()
  }
}

const deleteRateCard = async (rateCardId) => {
  const inUse = await pool.query(
    `SELECT c.client FROM client_rate_card crc JOIN m5_client c ON c.m5clientkey = crc.clientid
     WHERE crc.rate_card_id = $1 ORDER BY c.client`,
    [rateCardId],
  )
  if (inUse.rows.length) {
    return {
      success: false,
      message: `Rate card is still assigned to: ${inUse.rows.map((r) => r.client).join(", ")}. Remove it from these clients first.`,
    }
  }
  const result = await pool.query("DELETE FROM rate_card WHERE rate_card_id = $1", [rateCardId])
  if (!result.rowCount) return { success: false, notFound: true, message: "Rate card not found" }
  return { success: true }
}

export { listRateCards, getRateCardById, saveRateCard, deleteRateCard, findAssignmentConflicts }
