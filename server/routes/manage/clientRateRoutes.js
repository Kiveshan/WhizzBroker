import express from "express"
import {
  getAllClientsForRatesHandler,
  getClientRatesByClientIdHandler,
  saveClientRatesHandler,
  deleteClientRateHandler,
} from "../../controllers/manage/clientRateController.js"
import { verifyToken, requireRoles } from "../../middleware/auth.js"
import { MANAGEMENT_ROLES } from "../../config/roles.js"

const router = express.Router()

// Get all clients for rates management
router.get("/api/client-rates", verifyToken, getAllClientsForRatesHandler)

// Get specific client's rates - this matches what the frontend expects
router.get("/api/client-rates/client/:clientId", verifyToken, getClientRatesByClientIdHandler)

// Save client rates (replaces all existing rates for the client)
router.post("/api/client-rates/:clientId", verifyToken, requireRoles(...MANAGEMENT_ROLES), saveClientRatesHandler)

// Delete individual rate
router.delete("/api/client-rates/rate/:rateId", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteClientRateHandler)

export default router
