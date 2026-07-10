import { pool } from "../../config/database.js"

const getAllSubcontractors = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    const { offset = 0, limit = 10, search = "", status = "all" } = options

    // Build WHERE clause for filtering - group by company info
    let whereClause = "WHERE roleid = 6"
    const queryParams = []
    let paramIndex = 1

    // Search filter
    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(companyname) LIKE LOWER($${paramIndex}) OR 
        LOWER(contact_person) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(name) LIKE LOWER($${paramIndex}) OR
        LOWER(surname) LIKE LOWER($${paramIndex})
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

    // Get total count for pagination (count unique companies)
    const countQuery = `
      SELECT COUNT(DISTINCT subei_reg_num) 
      FROM m5_employee 
      ${whereClause}
    `
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    // Get paginated results grouped by company with truck counts from m5_trucks
    const dataQuery = `
      WITH company_groups AS (
        SELECT 
          subei_reg_num,
          MIN(userid) as min_userid,
          companyname,
          location,
          contact_person,
          cellnum,
          email,
          status,
          COUNT(*) as driver_count,
          STRING_AGG(name || ' ' || surname, ', ' ORDER BY name) as driver_names
        FROM m5_employee 
        ${whereClause}
        GROUP BY subei_reg_num, companyname, location, contact_person, cellnum, email, status
      ),
      truck_counts AS (
        SELECT 
          subei_reg_num,
          COUNT(*) as truck_count,
          STRING_AGG(truckregnum, ', ' ORDER BY truckregnum) as truck_registrations
        FROM m5_trucks 
        WHERE is_subcontractor = true AND subei_reg_num IS NOT NULL
        GROUP BY subei_reg_num
      )
      SELECT 
        cg.*,
        COALESCE(tc.truck_count, 0) as truck_count,
        COALESCE(tc.truck_registrations, '') as truck_registrations
      FROM company_groups cg
      LEFT JOIN truck_counts tc ON cg.subei_reg_num = tc.subei_reg_num
      ORDER BY cg.min_userid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      subcontractors: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching subcontractors:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getSubcontractorById = async (id) => {
  let client
  try {
    client = await pool.connect()

    // First get the company info from any record with this userid
    const mainResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6", [id])

    if (!mainResult.rows.length) {
      return { success: false, message: "Subcontractor not found" }
    }

    const mainRecord = mainResult.rows[0]

    // Get all driver records for this company (same subei_reg_num)
    const driversResult = await client.query(
      `SELECT userid, name, surname, driverstatus 
       FROM m5_employee 
       WHERE subei_reg_num = $1 AND roleid = 6 
       ORDER BY userid`,
      [mainRecord.subei_reg_num],
    )

    // Get all truck records for this company from m5_trucks
    const trucksResult = await client.query(
      `SELECT m5truckskey, truckregnum, trailersize, year, model, vin_num, truck_license_expiry
       FROM m5_trucks 
       WHERE subei_reg_num = $1 AND is_subcontractor = true 
       ORDER BY m5truckskey`,
      [mainRecord.subei_reg_num],
    )

    // Build the drivers array
    const drivers = driversResult.rows.map((record) => ({
      userid: record.userid,
      name: `${record.name || ""} ${record.surname || ""}`.trim(),
      driverstatus: record.driverstatus !== false, // Default to true if null
    }))

    // Build the trucks array
    const trucks = trucksResult.rows.map((truck) => ({
      m5truckskey: truck.m5truckskey,
      truckregnum: truck.truckregnum || "",
      trailersize: truck.trailersize || "",
      year: truck.year || "",
      model: truck.model || "",
      vin_num: truck.vin_num || "",
      truck_license_expiry: truck.truck_license_expiry,
    }))

    const result = {
      ...mainRecord,
      drivers,
      trucks,
      driver_count: drivers.length,
      truck_count: trucks.length,
    }

    return { success: true, data: result }
  } catch (err) {
    console.error(`Error fetching subcontractor ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const checkSubcontractorEmailExists = async (email, excludeSubeiRegNum = null) => {
  let client
  try {
    client = await pool.connect()

    let query = "SELECT 1 FROM m5_employee WHERE email = $1 AND roleid = 6"
    const params = [email]

    if (excludeSubeiRegNum !== null) {
      query += " AND subei_reg_num != $2"
      params.push(excludeSubeiRegNum)
    }

    console.log(`Checking email existence for: ${email}, excluding reg num: ${excludeSubeiRegNum}`)
    const result = await client.query(query, params)
    return result.rows.length > 0
  } catch (err) {
    console.error("Error checking subcontractor email existence:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createSubcontractor = async (subcontractorData) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    const {
      cellnum,
      email,
      companyname,
      location,
      contact_person,
      subei_reg_num,
      drivers = [],
      trucks = [],
    } = subcontractorData

    // Validate email uniqueness
    const emailExists = await checkSubcontractorEmailExists(email)
    if (emailExists) {
      await client.query("ROLLBACK")
      return { success: false, message: "Email already exists" }
    }

    // Validate that we have at least one driver
    if (!drivers.length || drivers.every((driver) => !driver.name)) {
      await client.query("ROLLBACK")
      return { success: false, message: "At least one driver is required" }
    }

    const createdDrivers = []
    const createdTrucks = []

    // Create driver records in m5_employee
    for (const driver of drivers) {
      if (!driver.name || !driver.name.trim()) continue

      // Parse driver name into first and last name
      const driverName = driver.name.trim()
      let firstName = ""
      let lastName = ""

      if (driverName) {
        const nameParts = driverName.split(" ")
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      const driverResult = await client.query(
        `INSERT INTO m5_employee (
          name, surname, cellnum, email, companyname, location, 
          contact_person, subei_reg_num, roleid, status, driverstatus
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          firstName,
          lastName,
          cellnum,
          email,
          companyname,
          location,
          contact_person,
          subei_reg_num,
          6, // roleid for subcontractor
          true, // status
          true, // driverstatus - default to active
        ],
      )

      createdDrivers.push(driverResult.rows[0])
    }

    // Create truck records in m5_trucks
    for (const truck of trucks) {
      if (!truck.truckregnum || !truck.truckregnum.trim()) continue

      const truckResult = await client.query(
        `INSERT INTO m5_trucks (
          truckregnum, trailersize, year, model, vin_num, 
          truck_license_expiry, is_subcontractor, subei_reg_num
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          truck.truckregnum.trim(),
          truck.trailersize || null,
          truck.year || null,
          truck.model || null,
          truck.vin_num || null,
          truck.truck_license_expiry || null,
          true, // is_subcontractor
          subei_reg_num,
        ],
      )

      createdTrucks.push(truckResult.rows[0])
    }

    await client.query("COMMIT")
    return {
      success: true,
      data: {
        ...createdDrivers[0], // Return first driver record as main reference
        drivers: createdDrivers,
        trucks: createdTrucks,
      },
    }
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error creating subcontractor:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateSubcontractor = async (id, subcontractorData) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    // Get the current record to find the subei_reg_num
    const currentResult = await client.query("SELECT subei_reg_num FROM m5_employee WHERE userid = $1 AND roleid = 6", [
      id,
    ])

    if (!currentResult.rows.length) {
      await client.query("ROLLBACK")
      return { success: false, message: "Subcontractor not found" }
    }

    const currentSubeiRegNum = currentResult.rows[0].subei_reg_num

    const {
      cellnum,
      email,
      companyname,
      location,
      contact_person,
      subei_reg_num,
      drivers = [],
      trucks = [],
    } = subcontractorData

    // Validate email uniqueness (excluding current company)
    const emailExists = await checkSubcontractorEmailExists(email, currentSubeiRegNum)
    if (emailExists) {
      await client.query("ROLLBACK")
      return { success: false, message: "Email already exists" }
    }

    // Validate that we have at least one driver
    if (!drivers.length || drivers.every((driver) => !driver.name)) {
      await client.query("ROLLBACK")
      return { success: false, message: "At least one driver is required" }
    }

    // Get existing driver IDs for this company
    const existingDriversResult = await client.query(
      "SELECT userid FROM m5_employee WHERE subei_reg_num = $1 AND roleid = 6",
      [currentSubeiRegNum]
    )
    const existingDriverIds = existingDriversResult.rows.map(row => row.userid)

    // Separate existing drivers from new drivers
    const driversToUpdate = drivers.filter(d => d.userid && existingDriverIds.includes(d.userid))
    const driversToCreate = drivers.filter(d => !d.userid)
    const driverIdsToKeep = driversToUpdate.map(d => d.userid)

    // Delete drivers that are no longer in the list
    if (existingDriverIds.length > 0) {
      const idsToDelete = existingDriverIds.filter(id => !driverIdsToKeep.includes(id))
      if (idsToDelete.length > 0) {
        await client.query(
          "DELETE FROM m5_employee WHERE userid = ANY($1) AND roleid = 6",
          [idsToDelete]
        )
      }
    }

    const updatedDrivers = []
    const createdDrivers = []

    // Update existing drivers (preserve their driverstatus)
    for (const driver of driversToUpdate) {
      // Parse driver name into first and last name
      const driverName = (driver.name || "").trim()
      let firstName = ""
      let lastName = ""

      if (driverName) {
        const nameParts = driverName.split(" ")
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      await client.query(
        `UPDATE m5_employee 
         SET name = $1, surname = $2, cellnum = $3, email = $4, companyname = $5, location = $6, 
             contact_person = $7, subei_reg_num = $8
         WHERE userid = $9 AND roleid = 6
         RETURNING *`,
        [firstName, lastName, cellnum, email, companyname, location, contact_person, subei_reg_num, driver.userid]
      )
      
      const updatedResult = await client.query(
        "SELECT * FROM m5_employee WHERE userid = $1",
        [driver.userid]
      )
      updatedDrivers.push(updatedResult.rows[0])
    }

    // Create new driver records
    for (const driver of driversToCreate) {
      if (!driver.name || !driver.name.trim()) continue

      const driverName = driver.name.trim()
      let firstName = ""
      let lastName = ""

      if (driverName) {
        const nameParts = driverName.split(" ")
        firstName = nameParts[0] || ""
        lastName = nameParts.slice(1).join(" ") || ""
      }

      const driverResult = await client.query(
        `INSERT INTO m5_employee (
          name, surname, cellnum, email, companyname, location, 
          contact_person, subei_reg_num, roleid, status, driverstatus
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          firstName,
          lastName,
          cellnum,
          email,
          companyname,
          location,
          contact_person,
          subei_reg_num,
          6, // roleid for subcontractor
          true, // status
          true, // driverstatus - default to active for new drivers
        ],
      )

      createdDrivers.push(driverResult.rows[0])
    }

    const allDrivers = [...updatedDrivers, ...createdDrivers]

    // Delete all existing truck records for this company (trucks are always recreated)
    await client.query("DELETE FROM m5_trucks WHERE subei_reg_num = $1 AND is_subcontractor = true", [
      currentSubeiRegNum,
    ])

    const createdTrucks = []

    // Create new truck records
    for (const truck of trucks) {
      if (!truck.truckregnum || !truck.truckregnum.trim()) continue

      const truckResult = await client.query(
        `INSERT INTO m5_trucks (
          truckregnum, trailersize, year, model, vin_num, 
          truck_license_expiry, is_subcontractor, subei_reg_num
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          truck.truckregnum.trim(),
          truck.trailersize || null,
          truck.year || null,
          truck.model || null,
          truck.vin_num || null,
          truck.truck_license_expiry || null,
          true, // is_subcontractor
          subei_reg_num,
        ],
      )

      createdTrucks.push(truckResult.rows[0])
    }

    await client.query("COMMIT")
    return {
      success: true,
      data: {
        ...(allDrivers[0] || {}), // Return first driver record as main reference
        drivers: allDrivers,
        trucks: createdTrucks,
      },
    }
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(`Error updating subcontractor ${id}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteSubcontractorDriver = async (driverId) => {
  let client
  try {
    client = await pool.connect()

    const result = await client.query(
      `DELETE FROM m5_employee 
       WHERE userid = $1 AND roleid = 6
       RETURNING subei_reg_num`,
      [driverId],
    )

    if (!result.rowCount) {
      return { success: false, message: "Driver not found" }
    }

    return { success: true, message: "Driver deleted successfully" }
  } catch (err) {
    console.error(`Error deleting subcontractor driver ${driverId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteSubcontractorTruck = async (truckId) => {
  let client
  try {
    client = await pool.connect()

    const result = await client.query(
      `DELETE FROM m5_trucks 
       WHERE m5truckskey = $1 AND is_subcontractor = true
       RETURNING subei_reg_num`,
      [truckId],
    )

    if (!result.rowCount) {
      return { success: false, message: "Truck not found" }
    }

    return { success: true, message: "Truck deleted successfully" }
  } catch (err) {
    console.error(`Error deleting subcontractor truck ${truckId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const toggleSubcontractorStatus = async (id, status) => {
  let client
  try {
    client = await pool.connect()

    // Get the subei_reg_num for this record
    const currentResult = await client.query("SELECT subei_reg_num FROM m5_employee WHERE userid = $1 AND roleid = 6", [
      id,
    ])

    if (!currentResult.rows.length) {
      return { success: false, message: "Subcontractor not found" }
    }

    const subeiRegNum = currentResult.rows[0].subei_reg_num

    // Update status for all driver records with the same subei_reg_num
    const result = await client.query(
      `UPDATE m5_employee
       SET status = $1
       WHERE subei_reg_num = $2 AND roleid = 6
       RETURNING *`,
      [status, subeiRegNum],
    )

    if (!result.rowCount) {
      return { success: false, message: "Subcontractor not found" }
    }

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error toggling subcontractor ${id} status:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const toggleSubcontractorDriverStatus = async (driverId, driverstatus) => {
  let client
  try {
    client = await pool.connect()

    // Update driverstatus for the specific driver
    const result = await client.query(
      `UPDATE m5_employee
       SET driverstatus = $1
       WHERE userid = $2 AND roleid = 6
       RETURNING *`,
      [driverstatus, driverId],
    )

    if (!result.rowCount) {
      return { success: false, message: "Driver not found" }
    }

    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error toggling driver ${driverId} status:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  getAllSubcontractors,
  getSubcontractorById,
  checkSubcontractorEmailExists,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractorDriver,
  deleteSubcontractorTruck,
  toggleSubcontractorStatus,
  toggleSubcontractorDriverStatus,
}
