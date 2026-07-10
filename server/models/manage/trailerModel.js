import { pool } from "../../config/database.js"

// Helper function to convert empty strings to null
const toNullIfEmpty = (value) => {
  if (value === "" || value === undefined || value === "null") {
    return null
  }
  return value
}

// Helper function to convert empty strings to null for numbers
const toNullIfEmptyNumber = (value) => {
  if (value === "" || value === undefined || value === "null") {
    return null
  }
  const num = Number.parseFloat(value)
  return isNaN(num) ? null : num
}

const getAllTrailers = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "" } = options

    // Build WHERE clause for filtering
    let whereClause = "WHERE 1=1"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(trailerregnum) LIKE LOWER($${paramIndex}) OR 
        LOWER(model) LIKE LOWER($${paramIndex}) OR 
        LOWER(vin_num) LIKE LOWER($${paramIndex}) OR
        LOWER(trailersize) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM m5_trailers ${whereClause}`
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results
    const dataQuery = `
      SELECT * FROM m5_trailers 
      ${whereClause}
      ORDER BY m5trailerskey DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      trailers: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching trailers:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getTrailerById = async (id) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT * FROM m5_trailers WHERE m5trailerskey = $1", [id])
    if (!result.rows.length) {
      return { success: false, message: "Trailer not found" }
    }

    const trailer = result.rows[0]

    // Format dates for consistent handling
    if (trailer.trailerpurchasedate) {
      trailer.trailerpurchasedate = new Date(trailer.trailerpurchasedate).toISOString().split("T")[0]
    }
    if (trailer.trailer_license_expiry) {
      trailer.trailer_license_expiry = new Date(trailer.trailer_license_expiry).toISOString().split("T")[0]
    }

    return { success: true, data: trailer }
  } catch (err) {
    console.error(`Error fetching trailer ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createTrailer = async (trailerData, documentKeys) => {
  let client
  try {
    client = await pool.connect()
    const {
      trailerregnum,
      trailersize,
      trailerpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      trailer_license_expiry,
    } = trailerData

    // Set non-required fields to null if empty or undefined
    const trailersizeValue = toNullIfEmpty(trailersize)
    const trailerpurchasedateValue = toNullIfEmpty(trailerpurchasedate)
    const yearValue = toNullIfEmpty(year)
    const modelValue = toNullIfEmpty(model)
    const purchase_priceValue = toNullIfEmptyNumber(purchase_price)
    const current_evaluationValue = toNullIfEmptyNumber(current_evaluation)
    const vin_numValue = toNullIfEmpty(vin_num)

    const document_url1 = documentKeys[0] || null
    const document_url2 = documentKeys[1] || null
    const document_url3 = documentKeys[2] || null

    const result = await client.query(
      `INSERT INTO m5_trailers (
         trailerregnum, trailersize, trailerpurchasedate, year, model,
         purchase_price, current_evaluation, vin_num,
         trailer_license_expiry, document_url1, document_url2, document_url3, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        trailerregnum,
        trailersizeValue,
        trailerpurchasedateValue,
        yearValue,
        modelValue,
        purchase_priceValue,
        current_evaluationValue,
        vin_numValue,
        trailer_license_expiry,
        document_url1,
        document_url2,
        document_url3,
        true, // Default status to enabled
      ],
    )
    return result.rows[0]
  } catch (err) {
    console.error("Error creating trailer:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateTrailer = async (id, trailerData, newDocKeys) => {
  let client
  try {
    client = await pool.connect()
    const {
      trailerregnum,
      trailersize,
      trailerpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      trailer_license_expiry,
    } = trailerData

    // Set non-required fields to null if empty, undefined, or string "null"
    const trailersizeValue = toNullIfEmpty(trailersize)
    const trailerpurchasedateValue = toNullIfEmpty(trailerpurchasedate)
    const yearValue = toNullIfEmpty(year)
    const modelValue = toNullIfEmpty(model)
    const purchase_priceValue = toNullIfEmptyNumber(purchase_price)
    const current_evaluationValue = toNullIfEmptyNumber(current_evaluation)
    const vin_numValue = toNullIfEmpty(vin_num)

    const existingResult = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_trailers WHERE m5trailerskey = $1",
      [id],
    )
    if (!existingResult.rows.length) {
      return { success: false, message: "Trailer not found" }
    }

    let { document_url1, document_url2, document_url3 } = existingResult.rows[0]
    const currentDocs = [document_url1, document_url2, document_url3]

    let newIndex = 0
    for (let i = 0; i < currentDocs.length && newIndex < newDocKeys.length; i++) {
      if (!currentDocs[i]) {
        currentDocs[i] = newDocKeys[newIndex]
        newIndex++
      }
    }
    ;[document_url1, document_url2, document_url3] = currentDocs

    const result = await client.query(
      `UPDATE m5_trailers
       SET trailerregnum = $1, trailersize = $2, trailerpurchasedate = $3,
           year = $4, model = $5, purchase_price = $6,
           current_evaluation = $7, vin_num = $8,
           trailer_license_expiry = $9, document_url1 = $10, document_url2 = $11, document_url3 = $12
       WHERE m5trailerskey = $13
       RETURNING *`,
      [
        trailerregnum,
        trailersizeValue,
        trailerpurchasedateValue,
        yearValue,
        modelValue,
        purchase_priceValue,
        current_evaluationValue,
        vin_numValue,
        trailer_license_expiry,
        document_url1,
        document_url2,
        document_url3,
        id,
      ],
    )
    if (!result.rowCount) {
      return { success: false, message: "Trailer not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error updating trailer ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// New function to toggle trailer status
const toggleTrailerStatus = async (id, newStatus) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("UPDATE m5_trailers SET status = $1 WHERE m5trailerskey = $2 RETURNING *", [
      newStatus,
      id,
    ])
    if (!result.rowCount) {
      return { success: false, message: "Trailer not found" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error toggling trailer status ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// New function to get trailers with expiring licenses
const getTrailersWithExpiringLicenses = async (daysAhead = 30) => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT trailerregnum, trailer_license_expiry, 
             (trailer_license_expiry - CURRENT_DATE) as days_until_expiry
      FROM m5_trailers 
      WHERE trailer_license_expiry IS NOT NULL 
        AND trailer_license_expiry <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        AND trailer_license_expiry >= CURRENT_DATE
         AND status = true 
      ORDER BY trailer_license_expiry ASC
    `

    const result = await client.query(query)
    return result.rows
  } catch (err) {
    console.error("Error fetching trailers with expiring licenses:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

// New function to get expired licenses
const getTrailersWithExpiredLicenses = async () => {
  let client
  try {
    client = await pool.connect()

    const query = `
      SELECT trailerregnum, trailer_license_expiry,
             (CURRENT_DATE - trailer_license_expiry) as days_expired
      FROM m5_trailers 
      WHERE trailer_license_expiry IS NOT NULL 
        AND trailer_license_expiry < CURRENT_DATE
         AND status = true 
      ORDER BY trailer_license_expiry ASC
    `

    const result = await client.query(query)
    return result.rows
  } catch (err) {
    console.error("Error fetching trailers with expired licenses:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteTrailerDocument = async (trailerId, url) => {
  let client
  try {
    client = await pool.connect()
    const { rows } = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_trailers WHERE m5trailerskey = $1",
      [trailerId],
    )
    if (!rows.length) {
      return { success: false, message: "Trailer not found" }
    }

    let updateField = null
    const storedUrls = [rows[0].document_url1, rows[0].document_url2, rows[0].document_url3]
    for (let i = 0; i < storedUrls.length; i++) {
      if (storedUrls[i]) {
        let storedKey
        try {
          storedKey = decodeURIComponent(new URL(storedUrls[i]).pathname.substring(1))
        } catch {
          storedKey = storedUrls[i]
        }
        if (storedKey === url) {
          updateField = `document_url${i + 1}`
          break
        }
      }
    }

    if (updateField) {
      await client.query(`UPDATE m5_trailers SET ${updateField} = NULL WHERE m5trailerskey = $1`, [trailerId])
      return { success: true, message: "Document deleted successfully" }
    }
    return { success: false, message: "No matching document URL found" }
  } catch (err) {
    console.error("Error deleting trailer document:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  getAllTrailers,
  getTrailerById,
  createTrailer,
  updateTrailer,
  deleteTrailerDocument,
  toggleTrailerStatus,
  getTrailersWithExpiringLicenses,
  getTrailersWithExpiredLicenses,
}
