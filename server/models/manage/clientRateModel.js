import { pool } from "../../config/database.js"

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
        COUNT(cr.client_rate_id) as rate_count
      FROM m5_client c 
      LEFT JOIN m5_client_rate cr ON c.m5clientkey = cr.clientid
      ${whereClause}
      GROUP BY c.m5clientkey
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
            'fuel_surcharge', cr.fuel_surcharge
          ) ORDER BY cr.client_rate_id
        ) FILTER (WHERE cr.client_rate_id IS NOT NULL) as rates
      FROM m5_client c
      LEFT JOIN m5_client_rate cr ON c.m5clientkey = cr.clientid
      WHERE c.m5clientkey = $1
      GROUP BY c.m5clientkey
    `

    const result = await client.query(clientQuery, [clientId])

    if (!result.rows.length) {
      return { success: false, message: "Client not found" }
    }

    const clientData = result.rows[0]
    return {
      success: true,
      data: {
        ...clientData,
        rates: clientData.rates || [],
      },
    }
  } catch (err) {
    console.error(`Error fetching client rates for client ${clientId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const saveClientRates = async (clientId, rates) => {
  let client
  try {
    client = await pool.connect()

    // Start transaction
    await client.query("BEGIN")

    // Delete existing rates for this client
    await client.query("DELETE FROM m5_client_rate WHERE clientid = $1", [clientId])

    // Insert new rates
    const insertPromises = rates.map((rate) => {
      const surcharge6M = rate.surcharge6M ?? rate.surcharges
      const surcharge12m = rate.surcharge12m

      return client.query(
        `INSERT INTO m5_client_rate (clientid, starting_point, destination, "6m_rate", "12m_rate", surcharges, surcharge12m, hazardous, vgm, set_rate, fuel_surcharge)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          clientId,
          rate.starting_point || null,
          rate.destination || null,
          rate["6m_rate"] === "" || rate["6m_rate"] === undefined ? null : Number(rate["6m_rate"]),
          rate["12m_rate"] === "" || rate["12m_rate"] === undefined ? null : Number(rate["12m_rate"]),
          surcharge6M === "" || surcharge6M === undefined ? null : Number(surcharge6M),
          surcharge12m === "" || surcharge12m === undefined ? null : Number(surcharge12m),
          rate.hazardous === "" || rate.hazardous === undefined ? null : Number(rate.hazardous),
          rate.vgm === "" || rate.vgm === undefined ? null : Number(rate.vgm),
          rate.set_rate === "" || rate.set_rate === undefined ? null : Number(rate.set_rate),
          rate.fuel_surcharge === "" || rate.fuel_surcharge === undefined ? null : Number(rate.fuel_surcharge),
        ],
      )
    })

    const results = await Promise.all(insertPromises)

    // Commit transaction
    await client.query("COMMIT")

    return {
      success: true,
      data: results.map((result) => result.rows[0]),
    }
  } catch (err) {
    // Rollback on error
    await client.query("ROLLBACK")
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