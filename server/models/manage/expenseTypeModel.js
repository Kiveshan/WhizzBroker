import { query } from "../../config/database.js"

export const getAllExpenseTypes = async (page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM expense_types`
    const countResult = await query(countQuery)
    const totalItems = Number.parseInt(countResult.rows[0].total)

    // Get expense types
    const expenseTypesQuery = `
      SELECT 
        id,
        expense
      FROM expense_types
      ORDER BY expense ASC
      LIMIT $1 OFFSET $2
    `

    const params = [limit, offset]
    const expenseTypesResult = await query(expenseTypesQuery, params)

    const totalPages = Math.ceil(totalItems / limit)

    return {
      expenseTypes: expenseTypesResult.rows,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    }
  } catch (error) {
    console.error("Error in getAllExpenseTypes:", error)
    throw error
  }
}

export const getExpenseTypeById = async (id) => {
  try {
    const result = await query(
      `SELECT 
        id,
        expense
      FROM expense_types 
      WHERE id = $1`,
      [id],
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error in getExpenseTypeById:", error)
    throw error
  }
}

export const createExpenseType = async (expenseTypeData) => {
  try {
    const { expense } = expenseTypeData

    const result = await query(
      `INSERT INTO expense_types (expense) 
      VALUES ($1) 
      RETURNING id, expense`,
      [expense],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error in createExpenseType:", error)
    throw error
  }
}

export const updateExpenseType = async (id, expenseTypeData) => {
  try {
    const { expense } = expenseTypeData

    const result = await query(
      `UPDATE expense_types SET expense = $1
      WHERE id = $2
      RETURNING id, expense`,
      [expense, id],
    )

    if (result.rowCount === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error in updateExpenseType:", error)
    throw error
  }
}

export const deleteExpenseType = async (id) => {
  try {
    const result = await query("DELETE FROM expense_types WHERE id = $1", [id])
    return result.rowCount > 0
  } catch (error) {
    console.error("Error in deleteExpenseType:", error)
    throw error
  }
}

export const getSimpleExpenseTypes = async () => {
  try {
    console.log("Getting simple expense types for dropdown")

    const expenseTypesQuery = `
      SELECT expense_type_id as id, expense
      FROM expense_types
      ORDER BY expense ASC
    `
    const result = await query(expenseTypesQuery)

    console.log(`Found ${result.rows.length} expense types for dropdown`)
    return result.rows
  } catch (error) {
    console.error("Error getting simple expense types:", error)
    throw error
  }
}
