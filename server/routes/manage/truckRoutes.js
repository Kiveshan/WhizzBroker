import express from "express"
import {
  getAllTrucksHandler,
  getTruckByIdHandler,
  createTruckHandler,
  updateTruckHandler,
  toggleTruckStatusHandler,
  deleteTruckDocumentHandler,
  deleteTruckHandler,
  getTrucksWithExpiringLicensesHandler,
  getTrucksWithExpiredLicensesHandler,
} from "../../controllers/manage/truckController.js"
import { verifyToken } from "../../middleware/auth.js"
import { uploadTruckDocs } from "../../utils/s3Config.js"

const router = express.Router()

// Notification routes - these need to be BEFORE the /:id route to avoid conflicts
router.get("/api/trucks/notifications/expiring", verifyToken, getTrucksWithExpiringLicensesHandler)
router.get("/api/trucks/notifications/expired", verifyToken, getTrucksWithExpiredLicensesHandler)

// Main CRUD routes
router.get("/api/trucks", verifyToken, getAllTrucksHandler)
router.get("/api/trucks/:id", verifyToken, getTruckByIdHandler)
router.post("/api/trucks", verifyToken, uploadTruckDocs.array("documents", 3), createTruckHandler)
router.put("/api/trucks/:id", verifyToken, uploadTruckDocs.array("documents", 3), updateTruckHandler)

// Status management route
router.put("/api/trucks/:id/status", verifyToken, toggleTruckStatusHandler)

// Document management
router.post("/api/trucks/delete-doc", verifyToken, deleteTruckDocumentHandler)

// Keep delete route for admin purposes (not exposed in UI)
router.delete("/api/trucks/:id", verifyToken, deleteTruckHandler)

export default router
