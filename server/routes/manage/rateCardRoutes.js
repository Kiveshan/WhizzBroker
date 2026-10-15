import express from "express"
import {
  listRateCardsHandler,
  getRateCardHandler,
  saveRateCardHandler,
  deleteRateCardHandler,
  assignmentConflictsHandler,
  rateUsageHandler,
} from "../../controllers/manage/rateCardController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// List rate cards (?search=, ?active=true for assignable cards only)
router.get("/api/rate-cards", verifyToken, listRateCardsHandler)

// Which of a card's routes chosen clients already have a winning price for
router.post("/api/rate-cards/assignment-conflicts", verifyToken, assignmentConflictsHandler)

// Open instructions using rates about to be removed / renamed, or cards about
// to be taken off clients (both rate screens warn with this before saving)
router.post("/api/rate-cards/rate-usage", verifyToken, rateUsageHandler)

// One card with its routes and the clients using it
router.get("/api/rate-cards/:rateCardId", verifyToken, getRateCardHandler)

// Create / update a card and replace its routes (and its client list, when
// clientIds is sent)
router.post("/api/rate-cards", verifyToken, saveRateCardHandler)
router.put("/api/rate-cards/:rateCardId", verifyToken, saveRateCardHandler)

// Delete a card (refused while any client still uses it)
router.delete("/api/rate-cards/:rateCardId", verifyToken, deleteRateCardHandler)

export default router
