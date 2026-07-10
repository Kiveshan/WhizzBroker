import {
  getDrivers,
  getStartingPoints,
  getDestinations,
  updateInstructionStatus,
  getDriversSub,
  getDriverRatesWithSubbie,
  getControllers,
  getManagers,
  getInstructionById,
  getShipmentTypeByInstructionId,
  getInstructions,
  getTruckRegNums,
  getTrucks,
  getClientInstructions,
  getClientInstructionsDetails,
  getContainerDetails,
  getDriverRates,
  getContainerNumbers,
  getContainerTypes,
  saveLeg,
  getLegsByInstructionId,
  deleteLeg,
  getContainersByInstructionId,
  completeInstruction,
  getInstructionDetails,
  getDriverById,
  getDriverInstructions,
  getLegDetailsByInstructionAndDriver,
  getCompletedDriverLegs,
  getDriverLegs,
  getDocuments,
  generateInvoice,
  fixInvoiceSequence,
  updateLegNumber
} from "../../models/assignments/assignmentModel.js";

export const getDriversHandler = async (req, res) => {
  console.log("Route /drivers was accessed");
  try {
    const drivers = await getDrivers();
    console.log("Query result:", drivers);
    console.log("Rows:", drivers);
    if (drivers.length === 0)
      console.log("No data found in the m5_driver_rate table");
    else console.log("Data fetched from DB:");
    res.status(200).json(drivers);
  } catch (err) {
    console.error("Error fetching data from database:", err);
    res.status(500).send("Server Error");
  }
};

export const getStartingPointsHandler = async (req, res) => {
  console.log("Route /starting-points was accessed");
  try {
    const startingPoints = await getStartingPoints();
    console.log("Unique starting points:", startingPoints);
    res.status(200).json(startingPoints);
  } catch (err) {
    console.error("Error fetching starting points:", err);
    res.status(500).send("Server Error");
  }
};

export const getDestinationsHandler = async (req, res) => {
  console.log("Route /destinations was accessed");
  try {
    const destinations = await getDestinations();
    console.log("Unique destinations:", destinations);
    res.status(200).json(destinations);
  } catch (err) {
    console.error("Error fetching destinations:", err);
    res.status(500).send("Server Error");
  }
};

export const updateInstructionStatusHandler = async (req, res) => {
  const { instructionId } = req.params;
  const { status } = req.body;
  console.log(
    `Route PUT /instructions/${instructionId}/status was accessed, setting status to ${status}`
  );
  try {
    await updateInstructionStatus(instructionId, status);
    console.log(`Instruction ${instructionId} status updated to ${status}`);
    res.status(200).json({
      success: true,
      message: `Instruction status updated to ${status} successfully`,
    });
  } catch (err) {
    console.error(`Error updating instruction ${instructionId} status:`, err);
    res.status(500).json({
      success: false,
      message: "Failed to update instruction status",
      error: err.message,
    });
  }
};

export const getDriversSubHandler = async (req, res) => {
  console.log("Route /employees/drivers was accessed");
  try {
    const drivers = await getDriversSub();
    console.log("Drivers found:", drivers);
    if (drivers.length === 0)
      console.log("No drivers found in the m5_employee table");
    else console.log(`Found ${drivers.length} drivers`);
    res.status(200).json(drivers);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).send("Server Error");
  }
};

export const getDriverRatesWithSubbieHandler = async (req, res) => {
  const { startingpoint, destination, containerType, legDate } = req.query;
  console.log(
    `Route /api/driver-rates-with-subbie was accessed with params:`,
    req.query
  );
  if (!startingpoint || !destination) {
    return res
      .status(400)
      .json({ error: "Starting point and destination are required" });
  }
  try {
    console.log(`[getDriverRatesWithSubbieHandler] Request: ${startingpoint} -> ${destination}, legDate: ${legDate}`);
    const rateData = await getDriverRatesWithSubbie(startingpoint, destination, legDate || null);
    
    console.log(`[getDriverRatesWithSubbieHandler] rateData:`, rateData);
    
    if (!rateData) {
      console.log(`[getDriverRatesWithSubbieHandler] Returning 404`);
      return res.status(404).json({
        error: "Rate not found for the given route",
        message: `No rate found for route from ${startingpoint} to ${destination}${legDate ? ' effective on ' + legDate : ''}`,
      });
    }
    console.log(`[getDriverRatesWithSubbieHandler] Returning 200 with rate data`);
    res.status(200).json(rateData);
  } catch (err) {
    console.error(`[getDriverRatesWithSubbieHandler] Error:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getControllersHandler = async (req, res) => {
  console.log("Route /employees/controllers was accessed");
  try {
    const controllers = await getControllers();
    console.log("Controllers found:", controllers);
    if (controllers.length === 0)
      console.log("No controllers found in the m5_employee table");
    else console.log(`Found ${controllers.length} controllers`);
    res.status(200).json(controllers);
  } catch (err) {
    console.error("Error fetching controllers:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

export const getManagersHandler = async (req, res) => {
  console.log("Route /employees/managers was accessed");
  try {
    const managers = await getManagers();
    console.log("Managers found:", managers);
    if (managers.length === 0)
      console.log("No managers found in the usertable");
    else console.log(`Found ${managers.length} managers`);
    res.status(200).json(managers);
  } catch (err) {
    console.error("Error fetching managers:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

export const getInstructionByIdHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route /instructions/${instructionId} was accessed`);
  try {
    const instruction = await getInstructionById(instructionId);
    if (!instruction)
      return res.status(404).json({ error: "Instruction not found" });
    const isCompleted = instruction.status === "Completed";
    res.status(200).json({
      id: instruction.m1key,
      status: instruction.status,
      is_completed: isCompleted,
    });
  } catch (err) {
    console.error(`Error fetching instruction ${instructionId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getShipmentTypeByInstructionIdHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(
    `Route /instructions/${instructionId}/shipment-type was accessed`
  );
  try {
    const shipmentType = await getShipmentTypeByInstructionId(instructionId);
    if (shipmentType === null) {
      console.log(`No instruction found with ID ${instructionId}`);
      return res.status(404).json({ error: "Instruction not found" });
    }
    console.log(
      `Raw shipment type from database for instruction ID ${instructionId}:`,
      shipmentType
    );
    console.log(`Type of shipment_type: ${typeof shipmentType}`);
    res.status(200).json({ shipment_type: shipmentType });
  } catch (err) {
    console.error(
      `Error fetching shipment type for instruction ID ${instructionId}:`,
      err
    );
    res.status(500).json({ error: err.message });
  }
};

export const getInstructionsHandler = async (req, res) => {
  console.log("Route /instructions was accessed");
  try {
    const instructions = await getInstructions();
    console.log("Instructions found:", instructions);
    if (instructions.length === 0)
      console.log("No instructions found in the m1_controller table");
    else console.log(`Found ${instructions.length} instructions`);
    res.status(200).json(instructions);
  } catch (err) {
    console.error("Error fetching instructions:", err);
    res.status(500).send("Server Error");
  }
};

export const getTruckRegNumsHandler = async (req, res) => {
  console.log("Route /trucks/regnums was accessed");
  try {
    const truckRegNums = await getTruckRegNums();
    console.log("Truck registration numbers found:", truckRegNums);
    if (truckRegNums.length === 0)
      console.log("No truck registration numbers found in the m5_trucks table");
    else console.log(`Found ${truckRegNums.length} truck registration numbers`);
    res.status(200).json(truckRegNums);
  } catch (err) {
    console.error("Error fetching truck registration numbers:", err);
    res.status(500).send("Server Error");
  }
};

export const getTrucksHandler = async (req, res) => {
  console.log("Route /trucks was accessed");
  try {
    const trucks = await getTrucks();
    console.log("Trucks found:", trucks);
    if (trucks.length === 0)
      console.log("No trucks found in the m5_trucks table");
    else console.log(`Found ${trucks.length} trucks`);
    res.status(200).json(trucks);
  } catch (err) {
    console.error("Error fetching trucks:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getClientInstructionsHandler = async (req, res) => {
  console.log("Route /client-instructions was accessed");
  try {
    const clientInstructions = await getClientInstructions();
    console.log("Query result:", clientInstructions);
    res.status(200).json(clientInstructions);
  } catch (error) {
    console.error("Error fetching client instructions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client instructions",
      error: error.message,
    });
  }
};

export const getClientInstructionsDetailsHandler = async (req, res) => {
  const { clientId } = req.params;
  try {
    const details = await getClientInstructionsDetails(clientId);
    console.log(details);
    res.json(details);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getContainerDetailsHandler = async (req, res) => {
  const { containerNum } = req.params;
  console.log(`Route /api/container-details/${containerNum} was accessed`);
  try {
    const container = await getContainerDetails(containerNum);
    if (!container)
      return res.status(404).json({ error: "Container not found" });
    console.log(`Found container details for ${containerNum}:`, container);
    res.status(200).json(container);
  } catch (err) {
    console.error(`Error fetching container details for ${containerNum}:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getDriverRatesHandler = async (req, res) => {
  const { startingpoint, destination, containerType } = req.query;
  console.log(`Route /api/driver-rates was accessed with params:`, req.query);
  if (!startingpoint || !destination) {
    return res
      .status(400)
      .json({ error: "Starting point and destination are required" });
  }
  try {
    const rateData = await getDriverRates(
      startingpoint,
      destination,
      containerType
    );
    if (!rateData) {
      return res.status(404).json({
        error: "Rate not found for the given route",
        message: `No rate found for route from ${startingpoint} to ${destination}`,
      });
    }
    console.log(
      `Found rate for ${startingpoint} to ${destination} with container type ${containerType}:`,
      rateData.applicable_rate
    );
    res.status(200).json(rateData);
  } catch (err) {
    console.error(`Error fetching driver rates:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getContainerNumbersHandler = async (req, res) => {
  console.log("Route /containers/numbers was accessed");
  try {
    const containerNumbers = await getContainerNumbers();
    console.log("Container numbers found:", containerNumbers);
    if (containerNumbers.length === 0)
      console.log("No container numbers found in the container table");
    else console.log(`Found ${containerNumbers.length} container numbers`);
    res.status(200).json(containerNumbers);
  } catch (err) {
    console.error("Error fetching container numbers:", err);
    res.status(500).send("Server Error");
  }
};

export const getContainerTypesHandler = async (req, res) => {
  console.log("Route /api/container-types was accessed");
  try {
    const containerTypes = await getContainerTypes();
    console.log(`Found ${containerTypes.length} container types`);
    res.status(200).json(containerTypes);
  } catch (err) {
    console.error("Error fetching container types:", err);
    res.status(500).json({ error: err.message });
  }
};

export const saveLegHandler = async (req, res) => {
  console.log("Route POST /legs/save was accessed");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  const {
    legkey,
    legnumber,
    startingpoint,
    destination,
    driverrate,
    m1key,
    drivers,
  } = req.body;
  const isNewLeg = !legkey || legkey === null;
  if (!m1key)
    return res
      .status(400)
      .json({ success: false, message: "Missing required field: m1key" });
  if (!legnumber)
    return res
      .status(400)
      .json({ success: false, message: "Missing required field: legnumber" });
  if (!startingpoint || !destination)
    return res.status(400).json({
      success: false,
      message: "Starting point and destination are required",
    });
  try {
    const result = await saveLeg({
      legkey,
      legnumber,
      startingpoint,
      destination,
      driverrate,
      m1key,
      drivers,
    });
    res.status(200).json({
      success: true,
      message: isNewLeg
        ? "New leg created in database"
        : "Leg updated successfully",
      legId: result.legId,
      isUpdate: result.isUpdate,
    });
  } catch (err) {
    console.error("Error saving leg:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save leg: " + err.message,
      error: err.message,
    });
  }
};

export const getLegsByInstructionIdHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route /legs/${instructionId} was accessed`);
  try {
    const legs = await getLegsByInstructionId(instructionId);
    console.log(
      `Found ${legs.length} unique legs for instruction ID ${instructionId}`
    );
    console.log(`Sending legs data to client:`, JSON.stringify(legs, null, 2));
    res.status(200).json(legs);
  } catch (err) {
    console.error(
      `Error fetching legs for instruction ID ${instructionId}:`,
      err
    );
    res.status(500).json({ error: err.message });
  }
};

export const deleteLegHandler = async (req, res) => {
  const { legId } = req.params;
  console.log(`Route DELETE /legs/${legId} was accessed`);
  try {
    const result = await deleteLeg(legId);
    console.log(`Successfully deleted leg with ID ${legId}`);
    res.status(200).json({
      success: true,
      message: `Leg with ID ${legId} successfully deleted`,
      deletedLegId: result.deletedLegId,
    });
  } catch (err) {
    console.error(`Error deleting leg with ID ${legId}:`, err);
    res.status(500).json({
      success: false,
      message: `Failed to delete leg: ${err.message}`,
      error: err.message,
    });
  }
};

export const getContainersByInstructionIdHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route /containers/instruction/${instructionId} was accessed`);
  try {
    const containers = await getContainersByInstructionId(instructionId);
    console.log(
      `Found ${containers.length} containers for instruction ID ${instructionId}`
    );
    res.status(200).json(containers);
  } catch (err) {
    console.error(
      `Error fetching containers for instruction ID ${instructionId}:`,
      err
    );
    res.status(500).json({ error: err.message });
  }
};

export const completeInstructionHandler = async (req, res) => {
  const { instructionId } = req.params;
  const { status } = req.body;
  console.log(`Route PUT /instructions/${instructionId}/complete was accessed`);
  try {
    await completeInstruction(instructionId, status);
    console.log(`Instruction ${instructionId} marked as ${status}`);
    res.status(200).json({
      success: true,
      message: `Instruction marked as ${status} successfully`,
    });
  } catch (err) {
    console.error(`Error completing instruction ${instructionId}:`, err);
    // Validation failure (e.g. add-on instruction not linked to an invoice)
    if (err.code === "ADDON_LINK_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to complete instruction",
      error: err.message,
    });
  }
};

export const getInstructionDetailsHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route /instructions/${instructionId}/details was accessed`);
  try {
    const details = await getInstructionDetails(instructionId);
    if (!details)
      return res.status(404).json({ error: "Instruction not found" });
    console.log(`Instruction details for ID ${instructionId}:`, details);
    res.status(200).json(details);
  } catch (err) {
    console.error(
      `Error fetching instruction details for ID ${instructionId}:`,
      err
    );
    res.status(500).json({ error: err.message });
  }
};

export const getDriverByIdHandler = async (req, res) => {
  const { driverId } = req.params;
  console.log(`Route /driver/${driverId} was accessed`);
  try {
    const driver = await getDriverById(driverId);
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    res.status(200).json(driver);
  } catch (err) {
    console.error(`Error fetching driver with ID ${driverId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

export const getDriverInstructionsHandler = async (req, res) => {
  const driverId = req.params.id;
  try {
    const instructions = await getDriverInstructions(driverId);
    res.json(instructions);
  } catch (error) {
    console.error("Error fetching driver instructions:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching driver instructions" });
  }
};

export const getLegDetailsByInstructionAndDriverHandler = async (req, res) => {
  const instructionId = req.params.id;
  const driverId = req.params.driverId;
  try {
    const legDetails = await getLegDetailsByInstructionAndDriver(
      instructionId,
      driverId
    );
    res.json(legDetails);
  } catch (error) {
    console.error("Error fetching leg details:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching leg details" });
  }
};

export const getCompletedDriverLegsHandler = async (req, res) => {
  const { driverId } = req.params;
  const { instructionId } = req.query;
  console.log(
    `Route /api/completed-driver-legs/${driverId} was accessed with instructionId=${instructionId}`
  );
  try {
    const legs = await getCompletedDriverLegs(driverId, instructionId);
    console.log(
      `Found ${legs.length} completed legs for driver ID ${driverId}`
    );
    res.json(legs);
  } catch (error) {
    console.error("Error fetching completed driver legs:", error);
    res.status(500).json({ error: "Failed to fetch completed driver legs" });
  }
};

export const getDriverLegsHandler = async (req, res) => {
  const { driverId } = req.params;
  const { instructionId } = req.query;
  console.log(
    `Route /api/driver-legs/${driverId} was accessed with instructionId=${instructionId}`
  );
  if (!driverId)
    return res.status(400).json({ error: "Driver ID is required" });
  try {
    const legs = await getDriverLegs(driverId, instructionId);
    console.log(`Found ${legs.length} legs for driver ID ${driverId}`);
    res.status(200).json(legs);
  } catch (error) {
    console.error("Error in /api/driver-legs/:driverId endpoint:");
    console.error("Error message:", error.message);
    res.status(500).json({
      error: "An error occurred while fetching leg details",
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
};

export const getDocumentsHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route /documents/${instructionId} was accessed`);
  try {
    console.log(
      `Executing query to fetch documents for instruction ID: ${instructionId}`
    );
    const documents = await getDocuments(instructionId);
    console.log(
      `Found ${documents.length} documents for instruction ID ${instructionId}`
    );
    res.status(200).json(documents);
  } catch (err) {
    console.error(
      `Error fetching documents for instruction ID ${instructionId}:`,
      err
    );
    res.status(500).json({ error: err.message });
  }
};

export const generateInvoiceHandler = async (req, res) => {
  const { instructionId } = req.params;
  console.log(`Route POST /generate-invoice/${instructionId} was accessed`);
  try {
    console.log(
      `Attempting to generate invoice for instruction ID: ${instructionId}`
    );
    const result = await generateInvoice(instructionId);
    console.log(`Invoice generation result:`, result);
    if (result.success) res.status(201).json(result);
    else res.status(400).json(result);
  } catch (error) {
    console.error("Error in invoice generation route:", error);
    res.status(500).json({
      success: false,
      error: "Server error while generating invoice",
    });
  }
};
export const updateLegNumberHandler = async (req, res) => {
  const { legId } = req.params;
  const { legnumber } = req.body;
  console.log(`Route PUT /legs/${legId}/update-number was accessed with legnumber=${legnumber}`);
  if (legnumber === undefined) {
    return res.status(400).json({ success: false, message: "Missing required field: legnumber" });
  }
  try {
    const result = await updateLegNumber(legId, legnumber);
    res.status(200).json({
      success: true,
      message: `Leg number updated successfully to ${legnumber}`,
      updatedLegId: result.updatedLegId,
    });
  } catch (err) {
    console.error(`Error updating leg number for ID ${legId}:`, err);
    res.status(500).json({
      success: false,
      message: "Failed to update leg number",
      error: err.message,
    });
  }
};