import {
  getShipmentTypes,
  getContainersByInstructionId,
  saveInstruction,
  getClientInstructionStats,
  getClientRates,
  getInstructions,
  getInstructionById,
  updateContainersByInstructionId,
  getActiveClients,
  getClientStartingPoints,
  getClientDestinations,
  checkClientHasRates,
  saveInstructionAndContainers,
  updateFCInstructionAndContainers,
  deleteInstruction,
  checkContainerHasLegs,
  deleteContainerAndLegs,
  getClientSetRate,
  searchInstructions,
} from "../../models/instructions/instructionModel.js"
import { auditFromReq } from "../../utils/auditLogger.js"

// Helper function to calculate total cost based on rate weight type
// Supports FC shipment type 4 using weight rows + unit rate
const calculateTotalCost = (instructionData, containers = [], weightData = []) => {
  const rateWeight = instructionData.rateweight || instructionData.rateWeight || "Container"
  
  let baseCost = 0

  // Set Rate mode: use the provided total_cost directly (no surcharges/hazardous/VGM)
  if (instructionData.is_set_rate) {
    const setRateValue = Number(instructionData.total_cost || 0)
    return Number.isNaN(setRateValue) ? 0 : setRateValue
  }

  if (rateWeight === "Container") {
    // Container-based calculation
    const numSix = Number(instructionData.num_six_meters || 0)
    const numTwelve = Number(instructionData.num_twelve_meters || 0)
    const numAbnormal = Number(instructionData.num_abnormal || 0)
    const numBreakBulk = Number(instructionData.num_breakbulk || 0)

    const ratePer6 = numSix > 0 ? Number(instructionData.rateper_6 || 0) : 0
    const ratePer12 = numTwelve > 0 ? Number(instructionData.rateper_12 || 0) : 0
    const ratePerAbnormal = numAbnormal > 0 ? Number(instructionData.rateper_abnormal || 0) : 0
    const ratePerBreakBulk = numBreakBulk > 0 ? Number(instructionData.rateper_breakbulk || 0) : 0

    baseCost =
      ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal + ratePerBreakBulk * numBreakBulk
  } else {
    // Weight-based calculation (kg, ton, m³)
    const shipmentType = String(
      instructionData.shipment_type || instructionData.shipmentTypeId || ""
    )

    // For FC shipment type 4, use the summed weight rows * unit rate
    if (shipmentType === "4" && Array.isArray(weightData) && weightData.length > 0) {
      const totalWeight = weightData.reduce((total, row) => {
        const raw = row.weight
        if (raw === null || raw === undefined || raw === "") return total
        const parsed = typeof raw === "string" ? Number.parseFloat(raw.trim()) : Number(raw)
        return Number.isNaN(parsed) ? total : total + parsed
      }, 0)

      const unitRate = Number(instructionData.unitrate || 0)
      baseCost = totalWeight * unitRate
    } else {
      // Generic weight * unitRate fallback
      const weight = Number(instructionData.weight || 0)
      const unitRate = Number(instructionData.unitrate || 0)
      baseCost = weight * unitRate
    }
  }

  // Calculate total surcharge from containers
  const totalSurchargeAmount = containers.reduce((total, container) => {
    if (!container["Add Surcharges"]) return total

    const resolved = container.is_12m_surcharge
      ? Number(container.surcharge_12m_amount || 0)
      : Number(container["Surcharge Amount"] || 0)

    return total + resolved
  }, 0)

  // Calculate total hazardous amount from containers
  const totalHazardousAmount = containers.reduce((total, container) => {
    if (container["Hazardous"] && container["Hazardous Amount"]) {
      return total + Number(container["Hazardous Amount"] || 0)
    }
    return total
  }, 0)

  // Calculate total VGM amount from containers
  const totalVgmAmount = containers.reduce((total, container) => {
    if (container["vgm"] && container["vgm amount"]) {
      return total + Number(container["vgm amount"] || 0)
    }
    return total
  }, 0)

  const totalCost = baseCost + totalSurchargeAmount + totalHazardousAmount + totalVgmAmount
  return Number(totalCost.toFixed(2))
}

// Handler functions
export const getClientSetRateHandler = async (req, res) => {
  try {
    const { clientId, starting_point, destination } = req.params

    console.log(`[${new Date().toISOString()}] getClientSetRateHandler: Request for client ${clientId}, starting_point ${starting_point}, destination ${destination}`)

    const result = await getClientSetRate(clientId, starting_point, destination)

    res.status(200).json(result)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getClientSetRateHandler: Error:`, error)
    res.status(500).json({ error: "Failed to fetch client set rate" })
  }
}

export const getShipmentTypesHandler = async (req, res) => {
  try {
    console.log("Fetching shipment types from database...")
    const shipmentTypes = await getShipmentTypes()
    console.log(`Found ${shipmentTypes.length} shipment types`)
    res.json(shipmentTypes)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ error: error.message })
  }
}

// Check if a specific container for an instruction has any legs in legs_m2
export const checkFCContainerLegsHandler = async (req, res) => {
  try {
    const { instructionId, containerNum } = req.params;
    const hasLegs = await checkContainerHasLegs(instructionId, containerNum);
    res.json({ hasLegs });
  } catch (error) {
    console.error("[FC] Error in checkFCContainerLegsHandler:", error);
    res.status(500).json({ error: "Failed to check container assignments" });
  }
};

// Delete a container and any associated legs for the given instruction
export const deleteFCContainerAndLegsHandler = async (req, res) => {
  try {
    const { instructionId, containerNum } = req.params;
    const result = await deleteContainerAndLegs(instructionId, containerNum);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[FC] Error in deleteFCContainerAndLegsHandler:", error);
    res.status(500).json({ error: "Failed to delete container and assignments" });
  }
};

export const getContainersHandler = async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    console.log(`[${new Date().toISOString()}] getContainersHandler: Fetching containers for instruction ID:`, {
      instructionId,
      type: typeof instructionId,
      params: req.params,
      query: req.query,
    })

    const containers = await getContainersByInstructionId(instructionId)
    console.log(`[${new Date().toISOString()}] getContainersHandler: Found containers:`, {
      instructionId,
      containerCount: containers.length,
      containers: containers,
    })

    if (containers.length === 0) {
      console.log(`[${new Date().toISOString()}] No containers found for instruction ID: ${instructionId}`)
      return res.status(200).json([]) // Return empty array instead of 404
    }

    res.json(containers)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getContainersHandler:`, {
      error: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query,
    })
    res.status(500).json({
      error: error.message,
      details: "Failed to fetch containers",
      instructionId: req.params.instructionId,
    })
  }
}

export const saveInstructionHandler = async (req, res) => {
  try {
    const { controllerData, containerData, weightData } = req.body

    console.log("CONTROLLER: Original request data:", {
      total_cost: controllerData.total_cost,
      type: typeof controllerData.total_cost,
      surcharges: controllerData.surcharges,
      surchargesAmount: controllerData.surchargesAmount,
    })

    const shipmentTypeStr = String(controllerData.shipmentTypeId || controllerData.shipment_type || "")

    // The server is authoritative on pricing: always recompute the total from
    // the submitted rate/container/weight inputs rather than trusting a
    // client-precomputed figure (set-rate mode still uses the entered rate by
    // design, inside calculateTotalCost). Warn when the client's figure
    // disagrees so any frontend/backend calculation drift is visible.
    const finalTotalCost = calculateTotalCost(controllerData, containerData || [], weightData || [])
    const clientTotalCost = Number(controllerData.total_cost)
    if (!Number.isNaN(clientTotalCost) && Math.abs(clientTotalCost - finalTotalCost) > 0.01) {
      console.warn(
        `save-instruction: client total_cost ${clientTotalCost} differs from server-calculated ${finalTotalCost}; using server value`
      )
    }

    let updatedControllerData = {
      ...controllerData,
      total_cost: shipmentTypeStr === "5" ? 0 : finalTotalCost,
    }
    
    console.log("CONTROLLER: Final total_cost being sent to model:", updatedControllerData.total_cost)

    console.log("Received instruction data:", {
      controllerData: {
        ...updatedControllerData,
        description: "...", // Truncate for logging
        total_cost: updatedControllerData.total_cost,
        weight: updatedControllerData.weight,
        booking_ref: updatedControllerData.booking_ref,
        vessel_name: updatedControllerData.vessel_name,
        rateper_6: updatedControllerData.rateper_6,
        rateper_12: updatedControllerData.rateper_12,
        rateper_abnormal: updatedControllerData.rateper_abnormal,
        rateper_breakbulk: updatedControllerData.rateper_breakbulk,
        unitrate: updatedControllerData.unitrate,
        rateweight: updatedControllerData.rateweight,
        pickup: updatedControllerData.startingPoints,
        dropoff: updatedControllerData.destinations,
      },
      containerCount: containerData.length,
      containerDataSample:
        containerData.length > 0
          ? {
              ...containerData[0],
              cargo_description: containerData[0].cargo_description || "No cargo description",
            }
          : "No containers",
    })
    
    // Debug each container's file_ref field
    if (containerData && containerData.length > 0) {
      console.log("CONTROLLER: Container data details:")
      containerData.forEach((container, index) => {
        console.log(`Container ${index} details:`, {
          containerNum: container.containerNum || container.containernum,
          file_ref: container.file_ref,
          fileRef: container.fileRef,
          // Include all properties for debugging
          ...container
        })
      })
    }
    // For shipment type 5 (add-on), we now allow containers to be saved while
    // keeping total_cost and rate fields at 0 from the frontend.
    const containersToSave = Array.isArray(containerData) ? containerData : []

    const result = await saveInstruction({
      controllerData: updatedControllerData,
      containerData: containersToSave,
      weightData: Array.isArray(weightData) ? weightData : [],
    })

    auditFromReq(req, {
      actionType: "INSTRUCTION_CREATED",
      entityType: "instruction",
      targetId: result.m1key,
      targetName: `client ${updatedControllerData.client_id ?? updatedControllerData.clientId ?? "?"}`,
      details: `Instruction ${result.m1key} created (total_cost: ${updatedControllerData.total_cost})`,
    })

    res.json({ success: true, m1key: result.m1key })
  } catch (error) {
    console.error("Error in save-instruction endpoint:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getClientInstructionStatsHandler = async (req, res) => {
  try {
    console.log("Fetching client instruction statistics from database...")
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )
    const stats = await getClientInstructionStats()
    console.log("Client stats query result count:", stats.length)
    res.json(stats)
  } catch (error) {
    console.error("Error fetching client statistics:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const getInstructionsHandler = async (req, res) => {
  try {
    const { clientId } = req.query
    console.log(`Fetching instructions for client ID: ${clientId || "all"}`)
    console.log(
      "User making request:",
      req.user ? `${req.user.name} ${req.user.surname} (Role ID: ${req.user.roleid})` : "Unauthenticated",
    )
    const instructions = await getInstructions(clientId)
    console.log(`Found ${instructions.length} instructions`)
    res.json(instructions)
  } catch (error) {
    console.error("Error fetching instructions:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const searchInstructionsHandler = async (req, res) => {
  try {
    const { q, clientId } = req.query
    const results = await searchInstructions({ q, clientId })
    res.json(results)
  } catch (error) {
    console.error("Error in searchInstructionsHandler:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getInstructionByIdHandler = async (req, res) => {
  try {
    const instructionId = req.params.id
    console.log(`Fetching instruction with ID: ${instructionId}`)
    const instruction = await getInstructionById(instructionId)
    if (!instruction) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    // Console log to check what data we're getting from database
    console.log("Raw instruction data from database:", {
      rateper_6: instruction.rateper_6,
      rateper_12: instruction.rateper_12,
      rateper_abnormal: instruction.rateper_abnormal,
      rateper_breakbulk: instruction.rateper_breakbulk,
      pickupdate: instruction.pickupdate,
      stackdate: instruction.stackdate,
      deadline: instruction.deadline,
      vat: instruction.vat,
      vat_type: typeof instruction.vat
    })

    // Format dates to MM/DD/YYYY and ensure all fields are properly mapped
    const formattedInstruction = {
      ...instruction,
      // Format dates to MM/DD/YYYY
      pickupdate: instruction.pickupdate ? new Date(instruction.pickupdate).toLocaleDateString("en-US") : null,
      stackdate: instruction.stackdate ? new Date(instruction.stackdate).toLocaleDateString("en-US") : null,
      deadline: instruction.deadline ? new Date(instruction.deadline).toLocaleDateString("en-US") : null,
      // Ensure rate fields are explicitly included
      rateper_6: instruction.rateper_6 || 0,
      rateper_12: instruction.rateper_12 || 0,
      rateper_abnormal: instruction.rateper_abnormal || 0,
      rateper_breakbulk: instruction.rateper_breakbulk || 0,
      // Ensure VAT is explicitly included and handled correctly
      vat: instruction.vat !== null && instruction.vat !== undefined ? instruction.vat : 15,
      // Add the field names the frontend expects for rates
      sixMeterRate: instruction.rateper_6 || 0,
      twelveMeterRate: instruction.rateper_12 || 0,
      abnormalRate: instruction.rateper_abnormal || 0,
      // Add alternative date field names the frontend might expect
      pickupDate: instruction.pickupdate ? new Date(instruction.pickupdate).toLocaleDateString("en-US") : null,
      stackDate: instruction.stackdate ? new Date(instruction.stackdate).toLocaleDateString("en-US") : null,
    }

    console.log("Formatted instruction data being sent to frontend:", {
      rateper_6: formattedInstruction.rateper_6,
      rateper_12: formattedInstruction.rateper_12,
      rateper_abnormal: formattedInstruction.rateper_abnormal,
      rateper_breakbulk: formattedInstruction.rateper_breakbulk,
      pickupdate: formattedInstruction.pickupdate,
      stackdate: formattedInstruction.stackdate,
      deadline: formattedInstruction.deadline,
      vat: formattedInstruction.vat,
      vat_type: typeof formattedInstruction.vat
    })

    console.log(`Found instruction with ID: ${instructionId}`)
    res.json(formattedInstruction)
  } catch (error) {
    console.error("Error fetching instruction:", error)
    res.status(500).json({ error: error.message })
  }
}

export const updateContainersHandler = async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    const containerData = req.body

    if (!Array.isArray(containerData)) {
      return res.status(400).json({ error: "Container data must be an array" })
    }

    console.log(`Updating containers for instruction ID: ${instructionId}`)
    console.log(
      "Container data received:",
      JSON.stringify(
        containerData.map((container) => ({
          ...container,
          cargo_description: container.cargo_description || container.cargoDescription || "No cargo description",
        })),
        null,
        2,
      ),
    )

    const result = await updateContainersByInstructionId(instructionId, containerData)
    console.log(`Successfully updated ${result.data.length} containers for instruction ID: ${instructionId}`)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error("Error updating containers:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getActiveClientsHandler = async (req, res) => {
  try {
    console.log("Fetching active clients from database...")
    const clients = await getActiveClients()
    console.log(`Found ${clients.length} active clients`)
    res.json(clients)
  } catch (error) {
    console.error("Error fetching active clients:", error)
    res.status(500).json({ error: error.message })
  }
}

export const getClientStartingPointsHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    console.log(`Fetching starting points for client ID: ${clientId}`)

    // First check if client has any rates with valid starting points
    const hasRates = await checkClientHasRates(clientId)
    if (!hasRates) {
      console.log(`No rates with valid starting points found for client ID: ${clientId}`)
      return res.status(404).json({
        error: "No rates with valid starting points found for this client",
      })
    }

    const startingPoints = await getClientStartingPoints(clientId)
    console.log(`Found ${startingPoints.length} starting points for client ID: ${clientId}`)

    if (!startingPoints || startingPoints.length === 0) {
      console.log("No valid starting points returned from getClientStartingPoints")
      return res.status(404).json({
        error: "No valid starting points found for this client",
      })
    }

    res.json(startingPoints)
  } catch (error) {
    console.error("Error fetching client starting points:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const getClientDestinationsHandler = async (req, res) => {
  try {
    const { clientId, startingPoint } = req.params
    console.log(`Fetching destinations for client ID: ${clientId}, starting point: ${startingPoint}`)

    const destinations = await getClientDestinations(clientId, startingPoint)
    console.log(
      `Found ${destinations.length} destinations for client ID: ${clientId} and starting point: ${startingPoint}`,
    )
    res.json(destinations)
  } catch (error) {
    console.error("Error fetching client destinations:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const checkClientRatesHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    console.log(`Checking if client ID ${clientId} has rates...`)

    const hasRates = await checkClientHasRates(clientId)
    console.log(`Client ID ${clientId} has rates: ${hasRates}`)

    res.json({ hasRates })
  } catch (error) {
    console.error("Error checking client rates:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

export const getClientRatesHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    const { start, destination } = req.query

    console.log("[getClientRatesHandler] Request received:", {
      params: req.params,
      query: req.query,
      body: req.body,
    })

    if (!start || !destination) {
      const errorMsg = "Starting point and destination are required"
      console.error(`[getClientRatesHandler] ${errorMsg}`)
      return res.status(400).json({
        error: errorMsg,
      })
    }

    console.log(
      `[getClientRatesHandler] Fetching rates for client ${clientId}, start: ${start}, destination: ${destination}`,
    )

    const rates = await getClientRates(clientId, start, destination)

    console.log("[getClientRatesHandler] getClientRates returned:", rates)

    if (!rates || Object.keys(rates).length === 0) {
      const errorMsg = `No rates found for client ${clientId}, start: ${start}, destination: ${destination}`
      console.error(`[getClientRatesHandler] ${errorMsg}`)
      return res.status(404).json({
        error: errorMsg,
      })
    }

    console.log("[getClientRatesHandler] Sending rates to client:", rates)
    res.json(rates)
  } catch (error) {
    console.error("Error in getClientRatesHandler:", error)
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    })
  }
}

// ========== FC Controller Specific Handlers ==========

export const getFCContainersHandler = async (req, res) => {
  try {
    const instructionId = req.params.instructionId
    console.log(
      `[${new Date().toISOString()}] [FC] getContainersHandler: Fetching containers for instruction ID:`,
      instructionId,
    )

    const containers = await getContainersByInstructionId(instructionId)
    console.log(`[${new Date().toISOString()}] [FC] getContainersHandler: Found ${containers.length} containers`)

    if (containers.length === 0) {
      return res.status(200).json([])
    }

    res.json(containers)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FC] Error in getContainersHandler:`, error)
    res.status(500).json({ error: "Failed to fetch containers" })
  }
}

export const saveFCInstructionHandler = async (req, res) => {
  try {
    const instructionData = req.body

    // Calculate total cost based on rate weight type
    const calculatedTotalCost = calculateTotalCost(instructionData)
    const updatedInstructionData = {
      ...instructionData,
      total_cost: calculatedTotalCost,
    }

    console.log(`[${new Date().toISOString()}] [FC] saveFCInstructionHandler: Saving instruction`)

    const result = await saveInstruction(updatedInstructionData)
    console.log(`[${new Date().toISOString()}] [FC] saveFCInstructionHandler: Instruction saved with ID: ${result.id}`)

    res.status(201).json(result)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FC] Error in saveFCInstructionHandler:`, error)
    res.status(500).json({ error: "Failed to save instruction" })
  }
}

export const getFCInstructionByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`[${new Date().toISOString()}] [FC] getFCInstructionByIdHandler: Fetching instruction ${id}`)

    const instruction = await getInstructionById(id)
    if (!instruction) {
      return res.status(404).json({ error: "Instruction not found" })
    }

    res.json(instruction)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FC] Error in getFCInstructionByIdHandler:`, error)
    res.status(500).json({ error: "Failed to fetch instruction" })
  }
}

export const updateFCContainersHandler = async (req, res) => {
  try {
    const { instructionId } = req.params
    const { containers } = req.body

    console.log(
      `[${new Date().toISOString()}] [FC] updateFCContainersHandler: Updating containers for instruction ${instructionId}`,
    )

    const result = await updateContainersByInstructionId(instructionId, containers)
    res.json(result)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FC] Error in updateFCContainersHandler:`, error)
    res.status(500).json({ error: "Failed to update containers" })
  }
}

export const getActiveClientsController = async (req, res) => {
  try {
    const clients = await getActiveClients()
    res.status(200).json(clients)
  } catch (error) {
    console.error("Error fetching active clients:", error)
    res.status(500).json({ message: "Failed to fetch active clients." })
  }
}

export const getShipmentTypesController = async (req, res) => {
  try {
    const shipmentTypes = await getShipmentTypes()
    res.status(200).json(shipmentTypes)
  } catch (error) {
    console.error("Error fetching shipment types:", error)
    res.status(500).json({ message: "Failed to fetch shipment types." })
  }
}

export const getClientStartingPointsController = async (req, res) => {
  const { clientId } = req.params
  try {
    const startingPoints = await getClientStartingPoints(clientId)
    if (startingPoints.length === 0) {
      return res.status(404).json({ message: "No starting points found for this client." })
    }
    res.status(200).json(startingPoints)
  } catch (error) {
    console.error("Error fetching client starting points:", error)
    res.status(500).json({ message: "Failed to fetch client starting points." })
  }
}

export const getClientDestinationsController = async (req, res) => {
  const { clientId, startingPoint } = req.params
  try {
    const destinations = await getClientDestinations(clientId, startingPoint)
    res.status(200).json(destinations)
  } catch (error) {
    console.error("Error fetching client destinations:", error)
    res.status(500).json({ message: "Failed to fetch client destinations." })
  }
}

export const getClientRatesController = async (req, res) => {
  const { clientId } = req.params
  const { start, destination } = req.query
  try {
    const rates = await getClientRates(clientId, start, destination)
    if (!rates) {
      return res.status(404).json({ message: "No rates found for the selected route." })
    }
    res.status(200).json(rates)
  } catch (error) {
    console.error("Error fetching client rates:", error)
    res.status(500).json({ message: "Failed to fetch client rates." })
  }
}

export const saveInstructionController = async (req, res) => {
  const { controllerData, containerData } = req.body
  try {
    // Server-authoritative pricing: recompute from submitted inputs, never
    // trust a client-precomputed total (see saveInstructionHandler).
    const finalTotalCost = calculateTotalCost(controllerData, containerData || []);
    const clientTotalCost = Number(controllerData.total_cost);
    if (!Number.isNaN(clientTotalCost) && Math.abs(clientTotalCost - finalTotalCost) > 0.01) {
      console.warn(
        `save-instruction: client total_cost ${clientTotalCost} differs from server-calculated ${finalTotalCost}; using server value`
      );
    }

    const updatedControllerData = {
      ...controllerData,
      total_cost: finalTotalCost,
    }

    const containersToSave =
      String(updatedControllerData.shipmentTypeId || updatedControllerData.shipment_type) === "5"
        ? []
        : containerData

    const result = await saveInstructionAndContainers(updatedControllerData, containersToSave)
    res
      .status(201)
      .json({ success: true, message: "Instruction saved successfully!", instructionId: result.instructionId })
  } catch (error) {
    console.error("Error saving instruction:", error)
    res.status(500).json({ success: false, message: error.message || "Failed to save instruction." })
  }
}

export const updateFCInstructionAndContainersHandler = async (req, res) => {
  try {
    const { id } = req.params
    const { instructionData, containers, weightData } = req.body

    // Validate input data
    if (!id) {
      return res.status(400).json({ success: false, error: "Missing instruction ID" })
    }

    if (!instructionData) {
      return res.status(400).json({ success: false, error: "Missing instruction data" })
    }

    if (!containers || !Array.isArray(containers)) {
      return res.status(400).json({ success: false, error: "Containers must be an array" })
    }

    // For FC updates, calculate the total cost on the backend using the latest
    // instruction/containers so that VGM, surcharge and hazardous changes are
    // reflected. For shipment type 5 (add-on), we keep total_cost at 0 even if
    // a non-zero value could be computed.
    const shipmentTypeStr = String(instructionData.shipmentTypeId || instructionData.shipment_type || "")
    const backendCalculatedCost = calculateTotalCost(instructionData, containers, weightData)
    const finalTotalCost = shipmentTypeStr === "5" ? 0 : backendCalculatedCost
    console.log(
      `[${new Date().toISOString()}] [CONTROLLER] updateFCInstructionAndContainersHandler: Backend-calculated total_cost (includes VGM/surcharges/hazardous):`,
      finalTotalCost,
    )

    let updatedInstructionData = {
      ...instructionData,
      total_cost: finalTotalCost,
    }

    console.log(
      `[${new Date().toISOString()}] [CONTROLLER] updateFCInstructionAndContainersHandler: Processing request for instruction ${id} with ${containers.length} containers`,
    )
    console.log(
      `[${new Date().toISOString()}] [CONTROLLER] updateFCInstructionAndContainersHandler: Final total_cost being sent to model: ${updatedInstructionData.total_cost}`,
    )

    // For shipment type 5 (add-on), we now allow containers to be saved while
    // keeping total_cost and rate fields at 0 from the frontend/backend.
    const containersToSave = Array.isArray(containers) ? containers : []

    const result = await updateFCInstructionAndContainers(
      id,
      updatedInstructionData,
      containersToSave,
      Array.isArray(weightData) ? weightData : [],
    )
    res.status(200).json({ success: true, message: "Instruction and containers updated successfully", data: result })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [CONTROLLER] Error in updateFCInstructionAndContainersHandler:`, error)
    res.status(500).json({
      success: false,
      error: "Failed to update instruction and containers",
      message: error.message,
      details: error.stack,
    })
  }
}

// Handler for deleting an instruction and its associated containers
export const deleteInstructionHandler = async (req, res) => {
  try {
    const { id } = req.params
    
    // Validate input data
    if (!id) {
      return res.status(400).json({ success: false, error: "Missing instruction ID" })
    }
    
    console.log(`[${new Date().toISOString()}] [CONTROLLER] deleteInstructionHandler: Processing request to delete instruction ${id}`)

    // Call the model function to delete the instruction and its containers
    const result = await deleteInstruction(id)

    console.log(`[${new Date().toISOString()}] [CONTROLLER] deleteInstructionHandler: Delete successful for instruction ${id}`)

    auditFromReq(req, {
      actionType: "INSTRUCTION_DELETED",
      entityType: "instruction",
      targetId: id,
      details: `Instruction ${id} and its containers deleted`,
    })

    res.status(200).json({
      success: true,
      message: "Instruction and containers deleted successfully",
      data: result,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [CONTROLLER] Error in deleteInstructionHandler:`, error)

    // Provide appropriate error message based on the error
    if (error.message === "Instruction not found") {
      return res.status(404).json({
        success: false,
        error: "Instruction not found",
        message: "The requested instruction could not be found",
      })
    } else if (error.message === "Only instructions with 'New' status can be deleted") {
      return res.status(403).json({
        success: false,
        error: "Cannot delete instruction",
        message: "Only instructions with 'New' status can be deleted",
      })
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete instruction and containers",
      message: error.message,
      details: error.stack,
    })
  }
}
