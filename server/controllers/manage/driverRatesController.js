import {
  getAllDriverRates,
  getDriverRateById,
  createDriverRate,
  updateDriverRate,
  deleteDriverRate,
  getDriverRateUsage,
  refreshDriverRateLegsForInstructions,
  checkRateDateOverlaps,
  getDistinctRoutes,
  getPeriodsForRoute,
  saveRoutePeriods,
  getRouteUsage,
  deleteRoute,
  getRouteLegDates,
  getRouteOptions,
  auditDriverRatesForMonth,
  applyDriverRateFixesForMonth,
} from "../../models/manage/driverRatesModel.js"
import { auditFromReq } from "../../utils/auditLogger.js"

// Validate year/month query/body params for the month audit endpoints.
const parseYearMonth = (src) => {
  const year = Number.parseInt(src.year, 10)
  const month = Number.parseInt(src.month, 10)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Invalid year" }
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Invalid month (1-12)" }
  return { year, month }
}

const getAllDriverRatesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching driver rates - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}`)

    const result = await getAllDriverRates({
      offset,
      limit: limitNum,
      search,
    })

    res.json({
      items: result.driverRates,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching driver rates:", err)
    res.status(500).json({ error: "Failed to fetch driver rates" })
  }
}

// Trigger a refresh of legs_m2.driverrate for all In Progress instructions
// that are currently using this driver rate. This is intended to be called
// from the Manage UI "Continue" button after a rate edit is confirmed.
const refreshDriverRateLegsHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (!/^[0-9]+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    let instructions = []

    if (Array.isArray(req.body?.instructions) && req.body.instructions.length > 0) {
      instructions = [...new Set(req.body.instructions)]
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0)
    } else {
      const usageResult = await getDriverRateUsage(id)
      if (!usageResult.success) {
        return res.status(404).json({ message: usageResult.message })
      }

      instructions = Array.isArray(usageResult.data?.instructions) ? usageResult.data.instructions : []
    }

    // Refresh legs for all affected instructions using the specific driver rate id.
    // This avoids relying on assignmentModel and is deterministic.
    const refreshResult = await refreshDriverRateLegsForInstructions(Number(id), instructions)

    return res.status(200).json({
      success: true,
      instructions,
      updated: refreshResult?.updated ?? 0,
      message: "Driver rates successfully refreshed for affected instructions",
    })
  } catch (err) {
    console.error(
      `Error refreshing legs for driver rate ${req.params.id}:`,
      err,
    )
    return res.status(500).json({
      error: "Failed to refresh driver rate usage on legs",
    })
  }
}

const getDriverRateByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Fetching driver rate ID ${id}`)
    const result = await getDriverRateById(id)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to fetch driver rate" })
  }
}

const createDriverRateHandler = async (req, res) => {
  try {
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    } = req.body

    // Validate required fields (only starting point and destination)
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "Starting point and destination are required" })
    }

    // Validate all rates (only if provided - all are now optional)
    if (
      (driver_six_meter_rate !== null &&
        driver_six_meter_rate !== "" &&
        driver_six_meter_rate !== undefined &&
        isNaN(Number.parseFloat(driver_six_meter_rate))) ||
      (driver_twelve_meter_rate !== null &&
        driver_twelve_meter_rate !== "" &&
        driver_twelve_meter_rate !== undefined &&
        isNaN(Number.parseFloat(driver_twelve_meter_rate))) ||
      (subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        subie_six_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        subie_twelve_meter_rate !== undefined &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "All rates must be valid numbers if provided" })
    }

    if (effective_from && effective_to && effective_to < effective_from) {
      return res.status(400).json({ error: "effective_to must be on or after effective_from" })
    }

    console.log("Creating driver rate with data:", req.body)
    const newDriverRate = await createDriverRate({
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    })

    auditFromReq(req, {
      actionType: "DRIVER_RATE_CREATED",
      entityType: "driver_rate",
      targetId: newDriverRate?.driverratekey ?? newDriverRate?.id,
      targetName: `${startingpoint} -> ${destination}`,
      details: `Driver rate created for ${startingpoint} -> ${destination} (effective ${effective_from || "always"})`,
    })

    res.status(201).json(newDriverRate)
  } catch (err) {
    console.error("Error creating driver rate:", err)
    res.status(500).json({ error: err.message || "Failed to create driver rate" })
  }
}

const updateDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params
    const {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    } = req.body

    // Validate ID
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    // Validate all rates (only if provided - all are now optional)
    if (
      (driver_six_meter_rate !== undefined &&
        driver_six_meter_rate !== null &&
        driver_six_meter_rate !== "" &&
        isNaN(Number.parseFloat(driver_six_meter_rate))) ||
      (driver_twelve_meter_rate !== undefined &&
        driver_twelve_meter_rate !== null &&
        driver_twelve_meter_rate !== "" &&
        isNaN(Number.parseFloat(driver_twelve_meter_rate))) ||
      (subie_six_meter_rate !== undefined &&
        subie_six_meter_rate !== null &&
        subie_six_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_six_meter_rate))) ||
      (subie_twelve_meter_rate !== undefined &&
        subie_twelve_meter_rate !== null &&
        subie_twelve_meter_rate !== "" &&
        isNaN(Number.parseFloat(subie_twelve_meter_rate)))
    ) {
      return res.status(400).json({ error: "All rates must be valid numbers if provided" })
    }

    if (effective_from && effective_to && effective_to < effective_from) {
      return res.status(400).json({ error: "effective_to must be on or after effective_from" })
    }

    console.log(`Updating driver rate ID ${id}`)
    const result = await updateDriverRate(id, {
      startingpoint,
      destination,
      driver_six_meter_rate,
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to,
    })
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    auditFromReq(req, {
      actionType: "DRIVER_RATE_UPDATED",
      entityType: "driver_rate",
      targetId: id,
      targetName: `${startingpoint || "?"} -> ${destination || "?"}`,
      details: `Driver rate ${id} updated`,
    })

    res.json(result.data)
  } catch (err) {
    console.error(`Error updating driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to update driver rate" })
  }
}

const deleteDriverRateHandler = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Deleting driver rate ID ${id}`)
    const result = await deleteDriverRate(id)
    if (!result.success) {
      const status = result.code === "IN_USE" ? 409 : 404
      return res.status(status).json({ message: result.message })
    }

    auditFromReq(req, {
      actionType: "DRIVER_RATE_DELETED",
      entityType: "driver_rate",
      targetId: id,
      details: `Driver rate ${id} deleted`,
    })

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to delete driver rate" })
  }
}

const getDriverRateUsageHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid ID format" })
    }

    console.log(`Checking usage for driver rate ID ${id}`)
    const result = await getDriverRateUsage(id)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error checking usage for driver rate ${req.params.id}:`, err)
    res.status(500).json({ error: "Failed to check driver rate usage" })
  }
}

const checkRateDateOverlapsHandler = async (req, res) => {
  try {
    const { startingpoint, destination, effective_from, effective_to, exclude_id } = req.query

    if (!startingpoint || !destination || !effective_from) {
      return res.status(400).json({ error: "Starting point, destination, and effective_from are required" })
    }

    const excludeRateId = exclude_id && /^\d+$/.test(exclude_id) ? parseInt(exclude_id) : null

    console.log(`Checking rate overlaps for ${startingpoint} -> ${destination}, from ${effective_from} to ${effective_to || 'null'}, exclude: ${excludeRateId}`)
    const result = await checkRateDateOverlaps(startingpoint, destination, effective_from, effective_to, excludeRateId)

    res.json(result)
  } catch (err) {
    console.error(`Error checking rate date overlaps:`, err)
    res.status(500).json({ error: "Failed to check rate date overlaps" })
  }
}

// ─── Route-grouped handlers (new UX) ────────────────────────────────────────

const getDistinctRoutesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    const result = await getDistinctRoutes({ offset, limit: limitNum, search })

    res.json({
      items: result.routes,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching distinct routes:", err)
    res.status(500).json({ error: "Failed to fetch routes" })
  }
}

const getPeriodsForRouteHandler = async (req, res) => {
  try {
    const { startingpoint, destination } = req.query
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "startingpoint and destination are required" })
    }
    const result = await getPeriodsForRoute(startingpoint, destination)
    if (!result.success) return res.status(500).json({ error: "Failed to fetch periods" })
    res.json(result.data)
  } catch (err) {
    console.error("Error fetching periods for route:", err)
    res.status(500).json({ error: "Failed to fetch periods for route" })
  }
}

const saveRoutePeriodsHandler = async (req, res) => {
  try {
    const { startingpoint, destination, periods, originalStartingpoint, originalDestination } = req.body

    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "startingpoint and destination are required" })
    }
    if (!Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({ error: "At least one period is required" })
    }

    for (const period of periods) {
      if (!period.effective_from) {
        return res.status(400).json({ error: "Each period must have an effective_from date" })
      }
      const hasAtLeastOneRate =
        (period.driver_six_meter_rate !== "" && period.driver_six_meter_rate != null) ||
        (period.driver_twelve_meter_rate !== "" && period.driver_twelve_meter_rate != null) ||
        (period.subie_six_meter_rate !== "" && period.subie_six_meter_rate != null) ||
        (period.subie_twelve_meter_rate !== "" && period.subie_twelve_meter_rate != null)
      if (!hasAtLeastOneRate) {
        return res.status(400).json({ error: "Each period must have at least one rate value" })
      }
    }

    const result = await saveRoutePeriods(startingpoint, destination, periods, originalStartingpoint, originalDestination)
    res.json({ periods: result.data, renamedInstructions: result.renamedInstructions || [] })
  } catch (err) {
    console.error("Error saving route periods:", err)
    res.status(500).json({ error: "Failed to save route periods" })
  }
}

const deleteRouteHandler = async (req, res) => {
  try {
    const { startingpoint, destination } = req.query

    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "startingpoint and destination are required" })
    }

    const usageResult = await getRouteUsage(startingpoint, destination)
    if (usageResult.success && usageResult.data.inUse) {
      return res.status(409).json({
        error: "This route cannot be deleted while it is being used in instructions",
        instructions: usageResult.data.instructions,
      })
    }

    const deleteResult = await deleteRoute(startingpoint, destination)
    if (!deleteResult.success) {
      return res.status(409).json({ error: deleteResult.message })
    }
    res.json({ message: "Route deleted successfully" })
  } catch (err) {
    console.error("Error deleting route:", err)
    res.status(500).json({ error: "Failed to delete route" })
  }
}

const getRouteLegDatesHandler = async (req, res) => {
  try {
    const { startingpoint, destination } = req.query
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "startingpoint and destination are required" })
    }
    const result = await getRouteLegDates(startingpoint, destination)
    res.json(result.data)
  } catch (err) {
    console.error("Error fetching route leg dates:", err)
    res.status(500).json({ error: "Failed to fetch route leg dates" })
  }
}

const getRouteUsageCheckHandler = async (req, res) => {
  try {
    const { startingpoint, destination } = req.query
    if (!startingpoint || !destination) {
      return res.status(400).json({ error: "startingpoint and destination are required" })
    }
    const result = await getRouteUsage(startingpoint, destination)
    res.json(result.data)
  } catch (err) {
    console.error("Error checking route usage:", err)
    res.status(500).json({ error: "Failed to check route usage" })
  }
}

// ─── Month driver-rate audit (admin tool) ───────────────────────────────────

// Read-only: classify every leg on instructions created in the given month.
const auditDriverRatesHandler = async (req, res) => {
  try {
    const parsed = parseYearMonth(req.query)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const result = await auditDriverRatesForMonth(parsed.year, parsed.month)
    res.json(result)
  } catch (err) {
    console.error("Error running driver rate audit:", err)
    res.status(500).json({ error: "Failed to run driver rate audit" })
  }
}

// Write: apply the MISMATCH fixes for the given month.
const applyDriverRateFixesHandler = async (req, res) => {
  try {
    const parsed = parseYearMonth(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const result = await applyDriverRateFixesForMonth(parsed.year, parsed.month)
    res.json({
      success: true,
      updated: result.updated,
      message: `Updated ${result.updated} leg(s) for ${parsed.month}/${parsed.year}`,
    })
  } catch (err) {
    console.error("Error applying driver rate fixes:", err)
    res.status(500).json({ error: "Failed to apply driver rate fixes" })
  }
}

const getRouteOptionsHandler = async (req, res) => {
  try {
    const result = await getRouteOptions()
    res.json(result.data)
  } catch (err) {
    console.error("Error fetching route options:", err)
    res.status(500).json({ error: "Failed to fetch route options" })
  }
}

export {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
  getDriverRateUsageHandler,
  refreshDriverRateLegsHandler,
  checkRateDateOverlapsHandler,
  getDistinctRoutesHandler,
  getPeriodsForRouteHandler,
  saveRoutePeriodsHandler,
  deleteRouteHandler,
  getRouteLegDatesHandler,
  getRouteUsageCheckHandler,
  getRouteOptionsHandler,
  auditDriverRatesHandler,
  applyDriverRateFixesHandler,
}
