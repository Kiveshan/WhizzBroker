import express from "express"
import {
  getAllSuppliersHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  toggleSupplierStatusHandler,
} from "../../controllers/manage/supplierController.js"

const router = express.Router()

// Get all suppliers with pagination and search
router.get("/api/suppliers", getAllSuppliersHandler)

// Get supplier by ID with expense types
router.get("/api/suppliers/:id", getSupplierByIdHandler)

// Create new supplier with expense types
router.post("/api/suppliers", createSupplierHandler)

// Update supplier with expense types
router.put("/api/suppliers/:id", updateSupplierHandler)

// Delete supplier (will cascade delete expense type associations)
router.delete("/api/suppliers/:id", deleteSupplierHandler)

// Toggle supplier status - CHANGED FROM PATCH TO PUT
router.put("/api/suppliers/:id/toggle-status", toggleSupplierStatusHandler)

export default router
