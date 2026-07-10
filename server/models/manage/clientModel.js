import { pool } from "../../config/database.js"

const checkClientEmailExists = async (email) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT 1 FROM m5_client WHERE email = $1", [email])
    return result.rows.length > 0
  } catch (err) {
    console.error("Error checking email existence:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getAllClients = async (options = {}) => {
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
        LOWER(client) LIKE LOWER($${paramIndex}) OR 
        LOWER(representative) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(companyaddress) LIKE LOWER($${paramIndex}) OR
        LOWER(city) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Status filter
    if (status !== "all") {
      whereClause += ` AND status = $${paramIndex}`
      queryParams.push(status === "active")
      paramIndex++
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM m5_client ${whereClause}`
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results
    const dataQuery = `
      SELECT * FROM m5_client 
      ${whereClause}
      ORDER BY m5clientkey DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      clients: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching clients:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getClientById = async (id) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT * FROM m5_client WHERE m5clientkey = $1", [id])

    if (!result.rows.length) {
      return { success: false, message: "Client not found" }
    }

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error fetching client ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createClient = async (clientData) => {
  let client
  try {
    client = await pool.connect()

    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    } = clientData

    const insuranceValue = insurance === undefined || insurance === null || insurance === "" ? 0 : insurance

    // Only validate that client name is provided
    if (!clientName || clientName.trim() === "") {
      throw new Error("Client name is required")
    }

    const result = await client.query(
      `INSERT INTO m5_client (
         client, representative, companyaddress, suburb, postalcode,
         email, client_reg_num, cellnum, vatregno, city, streetaddress, 
         payment_type, insurance, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        clientName.trim(),
        representative || null,
        companyaddress || null,
        suburb || null,
        postalcode || null,
        email || null,
        client_reg_num || null,
        cellnum || null,
        vatregno || null,
        city || null,
        streetaddress || null,
        payment_type || null,
        insuranceValue,
        true, // status
      ],
    )

    return result.rows[0]
  } catch (err) {
    console.error("Error creating client:", err.code, err.message)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateClient = async (id, clientData) => {
  let client
  try {
    client = await pool.connect()

    const {
      client: clientName,
      representative,
      companyaddress,
      suburb,
      postalcode,
      email,
      client_reg_num,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      insurance,
    } = clientData

    const insuranceValue = insurance === undefined || insurance === null || insurance === "" ? 0 : insurance

    // Only validate that client name is provided
    if (!clientName || clientName.trim() === "") {
      throw new Error("Client name is required")
    }

    const result = await client.query(
      `UPDATE m5_client
       SET client = $1, representative = $2, companyaddress = $3, suburb = $4,
           postalcode = $5, email = $6, client_reg_num = $7, cellnum = $8,
           vatregno = $9, city = $10, streetaddress = $11, payment_type = $12,
           insurance = $13
       WHERE m5clientkey = $14
       RETURNING *`,
      [
        clientName.trim(),
        representative || null,
        companyaddress || null,
        suburb || null,
        postalcode || null,
        email || null,
        client_reg_num || null,
        cellnum || null,
        vatregno || null,
        city || null,
        streetaddress || null,
        payment_type || null,
        insuranceValue,
        id,
      ],
    )

    if (!result.rowCount) {
      return { success: false, message: "Client not found" }
    }

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error updating client ${id}:`, err.code, err.message)
    throw err
  } finally {
    if (client) client.release()
  }
}

const toggleClientStatus = async (id, status) => {
  let client
  try {
    client = await pool.connect()

    const checkResult = await client.query("SELECT m5clientkey FROM m5_client WHERE m5clientkey = $1", [id])

    if (!checkResult.rows.length) {
      return { success: false, message: "Client not found" }
    }

    const result = await client.query(
      `UPDATE m5_client
       SET status = $1
       WHERE m5clientkey = $2
       RETURNING m5clientkey, client, representative, email, status`,
      [status, id],
    )

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error toggling client ${id} status:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteClient = async (id) => {
  let client
  try {
    client = await pool.connect()

    const checkResult = await client.query("SELECT m5clientkey FROM m5_client WHERE m5clientkey = $1", [id])

    if (!checkResult.rows.length) {
      return { success: false, message: "Client not found" }
    }

    await client.query("DELETE FROM m5_client WHERE m5clientkey = $1", [id])

    return { success: true, message: "Client deleted successfully" }
  } catch (err) {
    // FK RESTRICT (migration 007): the client has instructions, payments or
    // credit notes — history must be preserved. Deactivate instead.
    if (err.code === "23503") {
      return {
        success: false,
        code: "IN_USE",
        message:
          "This client has instructions, payments or credit notes on record and cannot be deleted. Deactivate the client instead.",
      }
    }
    console.error(`Error deleting client ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  checkClientEmailExists,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
}
