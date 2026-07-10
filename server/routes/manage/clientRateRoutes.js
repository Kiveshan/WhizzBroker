import express from "express"
import {
  getAllClientsForRatesHandler,
  getClientRatesByClientIdHandler,
  saveClientRatesHandler,
  deleteClientRateHandler,
} from "../../controllers/manage/clientRateController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// Get all clients for rates management
router.get("/api/client-rates", verifyToken, getAllClientsForRatesHandler)

// Get specific client's rates - this matches what the frontend expects
router.get("/api/client-rates/client/:clientId", verifyToken, getClientRatesByClientIdHandler)

// Save client rates (replaces all existing rates for the client)
router.post("/api/client-rates/:clientId", verifyToken, saveClientRatesHandler)

// Delete individual rate
router.delete("/api/client-rates/rate/:rateId", verifyToken, deleteClientRateHandler)

export default router
