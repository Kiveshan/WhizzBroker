import express from "express"
import {
  getAllSubcontractorsHandler,
  getSubcontractorByIdHandler,
  createSubcontractorHandler,
  updateSubcontractorHandler,
  toggleSubcontractorStatusHandler,
  toggleSubcontractorDriverStatusHandler,
  deleteSubcontractorDriverHandler,
  deleteSubcontractorTruckHandler,
} from "../../controllers/manage/subbieController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// Existing subcontractor routes
router.get("/api/subcontractors", verifyToken, getAllSubcontractorsHandler)
router.get("/api/subcontractors/:id", verifyToken, getSubcontractorByIdHandler)
router.post("/api/subcontractors", verifyToken, createSubcontractorHandler)
router.put("/api/subcontractors/:id", verifyToken, updateSubcontractorHandler)
router.put("/api/subcontractors/:id/toggle-status", verifyToken, toggleSubcontractorStatusHandler)

// Driver-specific routes
router.put("/api/subcontractors/drivers/:driverId/toggle-status", verifyToken, toggleSubcontractorDriverStatusHandler)
router.delete("/api/subcontractors/drivers/:driverId", verifyToken, deleteSubcontractorDriverHandler)

// Truck-specific routes
router.delete("/api/subcontractors/trucks/:truckId", verifyToken, deleteSubcontractorTruckHandler)

export default router
