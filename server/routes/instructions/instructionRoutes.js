import express from "express"
import {
  getShipmentTypesHandler,
  getContainersHandler,
  saveInstructionHandler,
  getClientInstructionStatsHandler,
  getInstructionsHandler,
  searchInstructionsHandler,
  getInstructionByIdHandler,
  updateContainersHandler,
  getActiveClientsHandler,
  getClientStartingPointsHandler,
  getClientDestinationsHandler,
  checkClientRatesHandler,
  getClientRatesHandler,
  getClientSetRateHandler,
  // FC Handlers
  getFCContainersHandler,
  saveFCInstructionHandler,
  getFCInstructionByIdHandler,
  updateFCContainersHandler,
  updateFCInstructionAndContainersHandler,
  checkFCContainerLegsHandler,
  deleteFCContainerAndLegsHandler,
  deleteInstructionHandler,
} from "../../controllers/instructions/instructionController.js"
import { verifyToken } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { instructionSaveSchema } from "../../validation/financialSchemas.js"

const router = express.Router()

// ========== Original Controller Instructions Endpoints ==========
router.get("/shipment-types", getShipmentTypesHandler)

// Test route - should work
router.get('/test-containers/:id', (req, res) => {
  console.log(`[${new Date().toISOString()}] Test route hit with ID:`, req.params.id);
  res.json({ success: true, message: 'Test route works!', id: req.params.id });
});

// Containers routes
router.get('/containers/:instructionId', getContainersHandler);
router.post("/save-instruction", verifyToken, validate(instructionSaveSchema), saveInstructionHandler)
router.get("/client-instruction-stats", getClientInstructionStatsHandler)
router.get("/instructions", getInstructionsHandler)
router.get("/search", searchInstructionsHandler)
router.get("/instruction/:id", getInstructionByIdHandler)
router.post("/containers/:instructionId", updateContainersHandler)

// ========== FC Controller Instructions Endpoints ==========
router.get("/fc/containers/:instructionId", getFCContainersHandler);
router.post("/fc/save-instruction", verifyToken, saveFCInstructionHandler)
router.get("/fc/instruction/:id", getFCInstructionByIdHandler)
router.put("/fc/containers/:instructionId", updateFCContainersHandler)
// New unified endpoint for updating both instruction and containers
router.put("/fc/update/:id", updateFCInstructionAndContainersHandler)
// Delete instruction and its containers
router.delete("/fc/instruction/:id", deleteInstructionHandler)
// Check and delete specific containers (and their legs) for FC
router.get(
  "/fc/container/:instructionId/:containerNum/legs-exists",
  checkFCContainerLegsHandler,
)
router.delete(
  "/fc/container/:instructionId/:containerNum",
  deleteFCContainerAndLegsHandler,
)

// Shared routes
router.get("/active-clients", getActiveClientsHandler)
router.get("/client/:clientId/starting-points", getClientStartingPointsHandler)
router.get("/client/:clientId/destinations/:startingPoint", getClientDestinationsHandler)
router.get("/client/:clientId/check-rates", checkClientRatesHandler)
router.get("/client/:clientId/rates", getClientRatesHandler)
router.get("/client/:clientId/set-rate/:starting_point/:destination", getClientSetRateHandler)

export default router
