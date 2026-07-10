import express from "express";
import {
  getDriversHandler,
  getStartingPointsHandler,
  getDestinationsHandler,
  updateInstructionStatusHandler,
  getDriversSubHandler,
  getDriverRatesWithSubbieHandler,
  getControllersHandler,
  getManagersHandler,
  getInstructionByIdHandler,
  getShipmentTypeByInstructionIdHandler,
  getInstructionsHandler,
  getTruckRegNumsHandler,
  getTrucksHandler,
  getClientInstructionsHandler,
  getClientInstructionsDetailsHandler,
  getContainerDetailsHandler,
  getDriverRatesHandler,
  getContainerNumbersHandler,
  getContainerTypesHandler,
  saveLegHandler,
  getLegsByInstructionIdHandler,
  deleteLegHandler,
  getContainersByInstructionIdHandler,
  completeInstructionHandler,
  getInstructionDetailsHandler,
  getDriverByIdHandler,
  getDriverInstructionsHandler,
  getLegDetailsByInstructionAndDriverHandler,
  getCompletedDriverLegsHandler,
  getDriverLegsHandler,
  getDocumentsHandler,
  generateInvoiceHandler,
  updateLegNumberHandler
} from "../../controllers/assignments/assignmentController.js";

const router = express.Router();

router.get("/drivers", getDriversHandler);
router.get("/starting-points", getStartingPointsHandler);
router.get("/destinations", getDestinationsHandler);
router.put(
  "/instructions/:instructionId/status",
  updateInstructionStatusHandler
);
router.get("/employees/driverssub", getDriversSubHandler);
router.get("/api/driver-rates-with-subbie", getDriverRatesWithSubbieHandler);
router.get("/employees/controllers", getControllersHandler);
router.get("/employees/managers", getManagersHandler);
router.get("/instructions/:instructionId", getInstructionByIdHandler);
router.get(
  "/instructions/:instructionId/shipment-type",
  getShipmentTypeByInstructionIdHandler
);
// router.get("/instructions", getInstructionsHandler);
router.get("/trucks/regnums", getTruckRegNumsHandler);
router.get("/trucks", getTrucksHandler);
router.get("/client-instructions", getClientInstructionsHandler);
router.get(
  "/client-instructions-details/:clientId",
  getClientInstructionsDetailsHandler
);
router.get("/api/container-details/:containerNum", getContainerDetailsHandler);
router.get("/api/driver-rates", getDriverRatesHandler);
router.get("/containers/numbers", getContainerNumbersHandler);
router.get("/api/container-types", getContainerTypesHandler);
router.post("/legs/save", saveLegHandler);
router.get("/legs/:instructionId", getLegsByInstructionIdHandler);
router.delete("/legs/:legId", deleteLegHandler);
router.put("/legs/:legId/update-number", updateLegNumberHandler);
router.get(
  "/containers/instruction/:instructionId",
  getContainersByInstructionIdHandler
);
router.put("/instructions/:instructionId/complete", completeInstructionHandler);
router.get(
  "/instructions/:instructionId/details",
  getInstructionDetailsHandler
);
router.get("/driver/:driverId", getDriverByIdHandler);
router.get("/instructions/driver/:id", getDriverInstructionsHandler);
router.get(
  "/legs/instruction/:id/driver/:driverId",
  getLegDetailsByInstructionAndDriverHandler
);
router.get(
  "/api/completed-driver-legs/:driverId",
  getCompletedDriverLegsHandler
);
router.get("/api/driver-legs/:driverId", getDriverLegsHandler);
router.get("/documents/:instructionId", getDocumentsHandler);
router.post("/generate-invoice/:instructionId", generateInvoiceHandler);

export default router;
