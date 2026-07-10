import { query, pool } from "../../config/database.js"

export const getAllSuppliers = async (page = 1, limit = 10, search = "") => {
  try {
    const offset = (page - 1) * limit

    // Build WHERE clause - removed status filtering
    let whereClause = "WHERE 1=1"
    const params = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (LOWER(s.supplier) LIKE LOWER($${paramCount}) OR LOWER(s.email) LIKE LOWER($${paramCount + 1}) OR LOWER(s.representative) LIKE LOWER($${paramCount + 2}))`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      paramCount += 2
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM suppliers s ${whereClause}`
    const countResult = await query(countQuery, params)
    const totalItems = Number.parseInt(countResult.rows[0].total)

    // Get suppliers with their associated expense types
    const suppliersQuery = `
      SELECT 
        s.supplier_id,
        s.supplier,
        s.representative,
        s.address,
        s.suburb,
        s.postalcode,
        s.email,
        s.cellnum,
        s.vatregno,
        s.city,
        s.streetaddress,
        s.payment_type,
        s.status,
        COALESCE(
          json_agg(
            CASE 
              WHEN et.id IS NOT NULL 
              THEN json_build_object('id', et.id, 'expense', et.expense)
              ELSE NULL 
            END
          ) FILTER (WHERE et.id IS NOT NULL), 
          '[]'::json
        ) as expense_types
      FROM suppliers s
      LEFT JOIN supplier_expense_types set ON s.supplier_id = set.se_id
      LEFT JOIN expense_types et ON set.expense_type_id = et.id
      ${whereClause}
      GROUP BY s.supplier_id, s.supplier, s.representative, s.address, s.suburb, 
               s.postalcode, s.email, s.cellnum, s.vatregno, s.city, 
               s.streetaddress, s.payment_type, s.status
      ORDER BY s.supplier ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    params.push(limit, offset)
    const suppliersResult = await query(suppliersQuery, params)

    const totalPages = Math.ceil(totalItems / limit)

    return {
      suppliers: suppliersResult.rows,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    }
  } catch (error) {
    console.error("Error in getAllSuppliers:", error)
    throw error
  }
}

export const getSupplierById = async (id) => {
  try {
    const result = await query(
      `SELECT 
        s.supplier_id,
        s.supplier,
        s.representative,
        s.address,
        s.suburb,
        s.postalcode,
        s.email,
        s.cellnum,
        s.vatregno,
        s.city,
        s.streetaddress,
        s.payment_type,
        s.status,
        COALESCE(
          json_agg(
            CASE 
              WHEN et.id IS NOT NULL 
              THEN json_build_object('id', et.id, 'expense', et.expense)
              ELSE NULL 
            END
          ) FILTER (WHERE et.id IS NOT NULL), 
          '[]'::json
        ) as expense_types,
        COALESCE(
          array_agg(et.id) FILTER (WHERE et.id IS NOT NULL), 
          ARRAY[]::integer[]
        ) as expense_type_ids
      FROM suppliers s
      LEFT JOIN supplier_expense_types set ON s.supplier_id = set.se_id
      LEFT JOIN expense_types et ON set.expense_type_id = et.id
      WHERE s.supplier_id = $1
      GROUP BY s.supplier_id, s.supplier, s.representative, s.address, s.suburb, 
               s.postalcode, s.email, s.cellnum, s.vatregno, s.city, 
               s.streetaddress, s.payment_type, s.status`,
      [id],
    )

    if (result.rows.length === 0) {
      return null
    }

    const supplier = result.rows[0]
    // Convert expense_type_ids to expenseTypes for form compatibility
    supplier.expenseTypes = supplier.expense_type_ids || []
    delete supplier.expense_type_ids

    return supplier
  } catch (error) {
    console.error("Error in getSupplierById:", error)
    throw error
  }
}

export const createSupplier = async (supplierData) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const {
      supplier,
      representative,
      address,
      suburb,
      postalcode,
      email,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      expenseTypes = [],
    } = supplierData

    console.log("Creating supplier with expense types:", expenseTypes)

    // Insert supplier
    const supplierResult = await client.query(
      `INSERT INTO suppliers (
        supplier, representative, address, suburb, postalcode, 
        email, cellnum, vatregno, city, streetaddress, payment_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING supplier_id, supplier, representative, address, suburb, postalcode, 
                email, cellnum, vatregno, city, streetaddress, payment_type, status`,
      [
        supplier,
        representative,
        address || null,
        suburb || null,
        postalcode || null,
        email || null,
        cellnum || null,
        vatregno || null,
        city || null,
        streetaddress || null,
        payment_type || null,
      ],
    )

    const newSupplier = supplierResult.rows[0]
    const supplierId = newSupplier.supplier_id

    console.log("Supplier created with ID:", supplierId)

    // Insert expense type associations
    if (expenseTypes && expenseTypes.length > 0) {
      console.log("Inserting expense type associations:", expenseTypes)
      for (const expenseTypeId of expenseTypes) {
        await client.query(`INSERT INTO supplier_expense_types (se_id, expense_type_id) VALUES ($1, $2)`, [
          supplierId,
          expenseTypeId,
        ])
      }
    }

    await client.query("COMMIT")

    // Return supplier with expense types
    newSupplier.expenseTypes = expenseTypes
    return newSupplier
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error in createSupplier:", error)
    throw error
  } finally {
    client.release()
  }
}

export const updateSupplier = async (id, supplierData) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const {
      supplier,
      representative,
      address,
      suburb,
      postalcode,
      email,
      cellnum,
      vatregno,
      city,
      streetaddress,
      payment_type,
      expenseTypes = [],
    } = supplierData

    console.log("Updating supplier with expense types:", expenseTypes)

    // Update supplier
    const supplierResult = await client.query(
      `UPDATE suppliers SET 
        supplier = $1, representative = $2, address = $3, suburb = $4, postalcode = $5,
        email = $6, cellnum = $7, vatregno = $8, city = $9, streetaddress = $10, payment_type = $11
      WHERE supplier_id = $12
      RETURNING supplier_id, supplier, representative, address, suburb, postalcode, 
                email, cellnum, vatregno, city, streetaddress, payment_type, status`,
      [
        supplier,
        representative,
        address || null,
        suburb || null,
        postalcode || null,
        email || null,
        cellnum || null,
        vatregno || null,
        city || null,
        streetaddress || null,
        payment_type || null,
        id,
      ],
    )

    if (supplierResult.rowCount === 0) {
      await client.query("ROLLBACK")
      return null
    }

    // Delete existing expense type associations
    await client.query(`DELETE FROM supplier_expense_types WHERE se_id = $1`, [id])

    // Insert new expense type associations
    if (expenseTypes && expenseTypes.length > 0) {
      console.log("Updating expense type associations:", expenseTypes)
      for (const expenseTypeId of expenseTypes) {
        await client.query(`INSERT INTO supplier_expense_types (se_id, expense_type_id) VALUES ($1, $2)`, [
          id,
          expenseTypeId,
        ])
      }
    }

    await client.query("COMMIT")

    const updatedSupplier = supplierResult.rows[0]
    updatedSupplier.expenseTypes = expenseTypes
    return updatedSupplier
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error in updateSupplier:", error)
    throw error
  } finally {
    client.release()
  }
}

export const deleteSupplier = async (id) => {
  try {
    // The CASCADE constraint will automatically delete related records in supplier_expense_types
    const result = await query("DELETE FROM suppliers WHERE supplier_id = $1", [id])
    return result.rowCount > 0
  } catch (error) {
    console.error("Error in deleteSupplier:", error)
    throw error
  }
}

export const toggleSupplierStatus = async (id) => {
  try {
    console.log("Toggling supplier status for ID:", id)

    const result = await query(
      `UPDATE suppliers SET status = NOT status 
      WHERE supplier_id = $1 
      RETURNING supplier_id, supplier, representative, address, suburb, postalcode, 
                email, cellnum, vatregno, city, streetaddress, payment_type, status`,
      [id],
    )

    console.log("Toggle result:", result.rows)

    if (result.rowCount === 0) {
      console.log("No supplier found with ID:", id)
      return null
    }

    const updatedSupplier = result.rows[0]
    console.log(
      "Supplier status toggled successfully:",
      updatedSupplier.supplier_id,
      "New status:",
      updatedSupplier.status,
    )

    return updatedSupplier
  } catch (error) {
    console.error("Error in toggleSupplierStatus:", error)
    throw error
  }
}
