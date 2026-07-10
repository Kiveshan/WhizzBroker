import express from "express"
import {
  getAllExpenseTypesHandler,
  getExpenseTypeByIdHandler,
  createExpenseTypeHandler,
  updateExpenseTypeHandler,
  deleteExpenseTypeHandler,
  getSimpleExpenseTypesHandler
} from "../../controllers/manage/expenseTypeController.js"

const router = express.Router()

// Get all expense types with pagination and search
router.get("/api/expense-types", getAllExpenseTypesHandler)

// Get simple expense types for dropdown (all records)
router.get("/api/expense-types/simple", getSimpleExpenseTypesHandler)

// Get expense type by ID
router.get("/api/expense-types/:id", getExpenseTypeByIdHandler)

// Create new expense type
router.post("/api/expense-types", createExpenseTypeHandler)

// Update expense type
router.put("/api/expense-types/:id", updateExpenseTypeHandler)

// Delete expense type
router.delete("/api/expense-types/:id", deleteExpenseTypeHandler)

export default router
