import { pool } from "../../config/database.js"
import { routeRateValues, cleanExtraCharges } from "../../utils/routeRateFields.js"
import { findRenames, carryRenamesToOpenInstructions } from "./rateUsageModel.js"

const getAllClientsForRates = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "", status = "all" } = options

    // Build WHERE clause for filtering
    let whereClause = "WHERE 1=1"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(c.client) LIKE LOWER($${paramIndex}) OR 
        LOWER(c.representative) LIKE LOWER($${paramIndex}) OR 
        LOWER(c.email) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Status filter
    if (status !== "all") {
      whereClause += ` AND c.status = $${paramIndex}`
      queryParams.push(status === "active")
      paramIndex++
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM m5_client c ${whereClause}`
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results with rate counts
    const dataQuery = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM m5_client_rate cr WHERE cr.clientid = c.m5clientkey) as rate_count,
        (SELECT COALESCE(string_agg(rc.name, ', ' ORDER BY crc.priority), '')
           FROM client_rate_card crc JOIN rate_card rc ON rc.rate_card_id = crc.rate_card_id
           WHERE crc.clientid = c.m5clientkey) as rate_card_names
      FROM m5_client c
      ${whereClause}
      ORDER BY c.m5clientkey DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      clients: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching clients for rates:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getClientRatesByClientId = async (clientId) => {
  let client
  try {
    client = await pool.connect()

    // Get client info and their rates
    const clientQuery = `
      SELECT
        c.*,
        json_agg(
          json_build_object(
            'client_rate_id', cr.client_rate_id,
            'title', cr.title,
            'starting_point', cr.starting_point,
            'destination', cr.destination,
            '6m_rate', cr."6m_rate",
            '12m_rate', cr."12m_rate",
            'surcharge6M', cr.surcharges,
            'surcharge12m', cr.surcharge12m,
            'surcharges', cr.surcharges,
            'hazardous', cr.hazardous,
            'vgm', cr.vgm,
            'set_rate', cr.set_rate,
            'fuel_surcharge', cr.fuel_surcharge,
            'extra_charges', COALESCE(ec.charges, '[]'::json)
          ) ORDER BY cr.title, cr.client_rate_id
        ) FILTER (WHERE cr.client_rate_id IS NOT NULL) as rates
      FROM m5_client c
      LEFT JOIN m5_client_rate cr ON c.m5clientkey = cr.clientid
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'charge_id', e.charge_id,
            'charge_name', e.charge_name,
            'amount', e.amount
          ) ORDER BY e.charge_id
        ) as charges
        FROM client_rate_extra_charge e
        WHERE e.client_rate_id = cr.client_rate_id
      ) ec ON true
      WHERE c.m5clientkey = $1
      GROUP BY c.m5clientkey
    `

    const result = await client.query(clientQuery, [clientId])

    if (!result.rows.length) {
      return { success: false, message: "Client not found" }
    }

    const cardsResult = await client.query(
      `SELECT crc.rate_card_id, rc.name, rc.status, crc.priority, crc.fuel_surcharge,
              (SELECT COUNT(*) FROM rate_card_rate rr WHERE rr.rate_card_id = rc.rate_card_id)::int AS route_count
       FROM client_rate_card crc
       JOIN rate_card rc ON rc.rate_card_id = crc.rate_card_id
       WHERE crc.clientid = $1
       ORDER BY crc.priority, rc.name`,
      [clientId],
    )

    // Every rate this client inherits from its cards, with whether it is the
    // one actually used: "active", "overridden" (the client has its own rate
    // with the same title) or "superseded" (a higher-priority card has it).
    const cardRoutesResult = await client.query(
      `SELECT * FROM (
         SELECT er.*,
                ROW_NUMBER() OVER (PARTITION BY er.title_key
                                   ORDER BY er.source_rank, er.source_rate_id DESC) AS rn,
                BOOL_OR(er.rate_source = 'client') OVER (PARTITION BY er.title_key) AS has_override
         FROM client_effective_rate er
         WHERE er.clientid = $1
       ) ranked
       WHERE rate_source = 'card'
       ORDER BY title_key, source_rank`,
      [clientId],
    )

    const clientData = result.rows[0]
    return {
      success: true,
      data: {
        ...clientData,
        rates: clientData.rates || [],
        rate_cards: cardsResult.rows,
        card_routes: cardRoutesResult.rows.map(({ rn, has_override, ...route }) => ({
          ...route,
          resolution: rn === "1" || rn === 1 ? "active" : has_override ? "overridden" : "superseded",
        })),
      },
    }
  } catch (err) {
    console.error(`Error fetching client rates for client ${clientId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// rateCards: optional [{ rate_card_id, fuel_surcharge }] in priority order.
// When provided it replaces the client's card assignments in the same
// transaction; when undefined the assignments are left alone.
const saveClientRates = async (clientId, rates, rateCards) => {
  let client
  try {
    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    // Renamed rates take their open instructions with them. Done first, while
    // the instructions' titles still resolve to the rows being renamed.
    const renames = await findRenames(
      client,
      { table: "m5_client_rate", idColumn: "client_rate_id", ownerColumn: "clientid", ownerId: clientId },
      rates,
    )
    const renamedInstructions = await carryRenamesToOpenInstructions(client, "client", renames)

    // Remove rates that are no longer present, so their extra charges cascade-delete with them
    const keptRateIds = rates.map((r) => r.client_rate_id).filter((id) => id !== undefined && id !== null)
    if (keptRateIds.length > 0) {
      await client.query("DELETE FROM m5_client_rate WHERE clientid = $1 AND client_rate_id != ALL($2::int[])", [
        clientId,
        keptRateIds,
      ])
    } else {
      await client.query("DELETE FROM m5_client_rate WHERE clientid = $1", [clientId])
    }

    if (Array.isArray(rateCards)) {
      await client.query("DELETE FROM client_rate_card WHERE clientid = $1", [clientId])
      for (const [index, card] of rateCards.entries()) {
        await client.query(
          `INSERT INTO client_rate_card (clientid, rate_card_id, priority, fuel_surcharge)
           VALUES ($1, $2, $3, $4)`,
          [
            clientId,
            card.rate_card_id,
            index + 1,
            card.fuel_surcharge === "" || card.fuel_surcharge === undefined || card.fuel_surcharge === null
              ? null
              : Number(card.fuel_surcharge),
          ],
        )
      }
    }

    // Titles are unique per client; park the kept rows on temporary titles so
    // renames that swap titles between rows don't collide mid-save.
    await client.query(
      `UPDATE m5_client_rate SET title = '__saving__' || client_rate_id
       WHERE clientid = $1 AND client_rate_id = ANY($2::int[])`,
      [clientId, keptRateIds],
    )

    const results = []
    for (const rate of rates) {
      const values = [clientId, ...routeRateValues(rate)]

      let rateRow
      if (rate.client_rate_id) {
        const result = await client.query(
          `UPDATE m5_client_rate
           SET starting_point = $2, destination = $3, "6m_rate" = $4, "12m_rate" = $5,
               surcharges = $6, surcharge12m = $7, hazardous = $8, vgm = $9, set_rate = $10, fuel_surcharge = $11,
               title = $12
           WHERE client_rate_id = $13 AND clientid = $1
           RETURNING *`,
          [...values, rate.client_rate_id],
        )
        rateRow = result.rows[0]
      }

      if (!rateRow) {
        const result = await client.query(
          `INSERT INTO m5_client_rate (clientid, starting_point, destination, "6m_rate", "12m_rate", surcharges, surcharge12m, hazardous, vgm, set_rate, fuel_surcharge, title)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          values,
        )
        rateRow = result.rows[0]
      }

      // Replace this rate's extra charges wholesale
      await client.query("DELETE FROM client_rate_extra_charge WHERE client_rate_id = $1", [rateRow.client_rate_id])

      for (const charge of cleanExtraCharges(rate)) {
        await client.query(
          `INSERT INTO client_rate_extra_charge (client_rate_id, charge_name, amount)
           VALUES ($1, $2, $3)`,
          [rateRow.client_rate_id, charge.charge_name, charge.amount],
        )
      }

      results.push(rateRow)
    }

    // Commit transaction
    await client.query("COMMIT")

    return {
      success: true,
      data: results,
      renames,
      renamedInstructions,
    }
  } catch (err) {
    // Rollback on error
    await client.query("ROLLBACK")
    if (err.code === "23505") {
      return { success: false, message: "Two of this client's rates have the same title. Each title can only be used once." }
    }
    console.error(`Error saving client rates for client ${clientId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteClientRate = async (rateId) => {
  let client
  try {
    client = await pool.connect()

    const checkResult = await client.query("SELECT client_rate_id FROM m5_client_rate WHERE client_rate_id = $1", [
      rateId,
    ])

    if (!checkResult.rows.length) {
      return { success: false, message: "Rate not found" }
    }

    await client.query("DELETE FROM m5_client_rate WHERE client_rate_id = $1", [rateId])

    return { success: true, message: "Rate deleted successfully" }
  } catch (err) {
    console.error(`Error deleting client rate ${rateId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export { getAllClientsForRates, getClientRatesByClientId, saveClientRates, deleteClientRate }