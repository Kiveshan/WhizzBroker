import express from "express"
import {
  getAllTrailersHandler,
  getTrailerByIdHandler,
  createTrailerHandler,
  updateTrailerHandler,
  toggleTrailerStatusHandler,
  deleteTrailerDocumentHandler,
  getTrailersWithExpiringLicensesHandler,
  getTrailersWithExpiredLicensesHandler,
} from "../../controllers/manage/trailerController.js"
import { verifyToken } from "../../middleware/auth.js"
import { uploadTrailerDocs } from "../../utils/s3Config.js"

const router = express.Router()

console.log("🚛 Loading trailer routes...")

// Notification routes MUST come first to avoid conflicts with /:id routes
router.get("/api/trailers/notifications/expiring", verifyToken, getTrailersWithExpiringLicensesHandler)
router.get("/api/trailers/notifications/expired", verifyToken, getTrailersWithExpiredLicensesHandler)

// Main CRUD routes
router.get("/api/trailers", verifyToken, getAllTrailersHandler)
router.get("/api/trailers/:id", verifyToken, getTrailerByIdHandler)
router.post("/api/trailers", verifyToken, uploadTrailerDocs.array("documents", 3), createTrailerHandler)
router.put("/api/trailers/:id", verifyToken, uploadTrailerDocs.array("documents", 3), updateTrailerHandler)

// Status toggle route
router.put("/api/trailers/:id/toggle-status", verifyToken, toggleTrailerStatusHandler)

// Document and delete routes
router.post("/api/trailers/delete-doc", verifyToken, deleteTrailerDocumentHandler)




export default router
