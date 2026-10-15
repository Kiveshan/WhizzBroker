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
import { verifyToken, requireRoles } from "../../middleware/auth.js"
import { MANAGEMENT_ROLES } from "../../config/roles.js"

const router = express.Router()

// Existing subcontractor routes
router.get("/api/subcontractors", verifyToken, getAllSubcontractorsHandler)
router.get("/api/subcontractors/:id", verifyToken, getSubcontractorByIdHandler)
router.post("/api/subcontractors", verifyToken, requireRoles(...MANAGEMENT_ROLES), createSubcontractorHandler)
router.put("/api/subcontractors/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), updateSubcontractorHandler)
router.put("/api/subcontractors/:id/toggle-status", verifyToken, requireRoles(...MANAGEMENT_ROLES), toggleSubcontractorStatusHandler)

// Driver-specific routes
router.put("/api/subcontractors/drivers/:driverId/toggle-status", verifyToken, requireRoles(...MANAGEMENT_ROLES), toggleSubcontractorDriverStatusHandler)
router.delete("/api/subcontractors/drivers/:driverId", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteSubcontractorDriverHandler)

// Truck-specific routes
router.delete("/api/subcontractors/trucks/:truckId", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteSubcontractorTruckHandler)

export default router
