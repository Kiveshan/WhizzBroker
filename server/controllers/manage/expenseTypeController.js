import {
  getAllExpenseTypes,
  getExpenseTypeById,
  createExpenseType,
  updateExpenseType,
  getSimpleExpenseTypes,
  deleteExpenseType,
} from "../../models/manage/expenseTypeModel.js"

export const getAllExpenseTypesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query

    console.log("Fetching expense types with params:", { page, limit, search })

    const result = await getAllExpenseTypes(Number.parseInt(page), Number.parseInt(limit), search)

    res.json({
      success: true,
      expenseTypes: result.expenseTypes,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
      itemsPerPage: result.itemsPerPage,
    })
  } catch (error) {
    console.error("Error fetching expense types:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch expense types",
      details: error.message,
    })
  }
}

export const getExpenseTypeByIdHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ID parameter
    const expenseTypeId = Number.parseInt(id)
    if (isNaN(expenseTypeId) || expenseTypeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid expense type ID provided",
      })
    }

    const expenseType = await getExpenseTypeById(expenseTypeId)

    if (!expenseType) {
      return res.status(404).json({
        success: false,
        error: "Expense type not found",
      })
    }

    res.json({
      success: true,
      expenseType,
    })
  } catch (error) {
    console.error("Error fetching expense type:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch expense type",
      details: error.message,
    })
  }
}

export const createExpenseTypeHandler = async (req, res) => {
  try {
    const { expense } = req.body

    if (!expense || !expense.trim()) {
      return res.status(400).json({
        success: false,
        error: "Expense type name is required",
      })
    }

    console.log("Creating expense type with data:", { expense })

    const expenseType = await createExpenseType({ expense: expense.trim() })

    res.status(201).json({
      success: true,
      expenseType,
      message: "Expense type created successfully",
    })
  } catch (error) {
    console.error("Error creating expense type:", error)

    // Handle unique constraint violation
    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Expense type name already exists",
      })
    }

    res.status(500).json({
      success: false,
      error: "Failed to create expense type",
      details: error.message,
    })
  }
}

export const updateExpenseTypeHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { expense } = req.body

    // Validate ID parameter
    const expenseTypeId = Number.parseInt(id)
    if (isNaN(expenseTypeId) || expenseTypeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid expense type ID provided",
      })
    }

    if (!expense || !expense.trim()) {
      return res.status(400).json({
        success: false,
        error: "Expense type name is required",
      })
    }

    console.log("Updating expense type with ID:", expenseTypeId, "Data:", { expense })

    const expenseType = await updateExpenseType(expenseTypeId, { expense: expense.trim() })

    if (!expenseType) {
      return res.status(404).json({
        success: false,
        error: "Expense type not found",
      })
    }

    res.json({
      success: true,
      expenseType,
      message: "Expense type updated successfully",
    })
  } catch (error) {
    console.error("Error updating expense type:", error)

    // Handle unique constraint violation
    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Expense type name already exists",
      })
    }

    res.status(500).json({
      success: false,
      error: "Failed to update expense type",
      details: error.message,
    })
  }
}

export const deleteExpenseTypeHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ID parameter
    const expenseTypeId = Number.parseInt(id)
    if (isNaN(expenseTypeId) || expenseTypeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid expense type ID provided",
      })
    }

    const deleted = await deleteExpenseType(expenseTypeId)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Expense type not found",
      })
    }

    res.json({
      success: true,
      message: "Expense type deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting expense type:", error)

    // Handle foreign key constraint violation
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete expense type as it is associated with suppliers",
      })
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete expense type",
      details: error.message,
    })
  }
}

// Get simple expense types for dropdown
export const getSimpleExpenseTypesHandler = async (req, res) => {
  try {
    console.log("Getting simple expense types for dropdown")

    const expenseTypes = await getSimpleExpenseTypes.getSimpleExpenseTypes()

    console.log(`Returning ${expenseTypes.length} simple expense types`)
    res.json(expenseTypes)
  } catch (error) {
    console.error("Error in getSimpleExpenseTypesHandler:", error)
    res.status(500).json({
      error: "Failed to fetch expense types",
      details: error.message,
    })
  }
}
