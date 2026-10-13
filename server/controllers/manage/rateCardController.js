import {
  listRateCards,
  getRateCardById,
  saveRateCard,
  deleteRateCard,
  findAssignmentConflicts,
} from "../../models/manage/rateCardModel.js"
import { validateRouteRates } from "../../utils/routeRateFields.js"
import { auditFromReq } from "../../utils/auditLogger.js"

// Returns a de-duplicated int array, or null when the input is not valid.
const parseClientIds = (value) => {
  if (!Array.isArray(value)) return null
  const ids = value.map(Number)
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return null
  return [...new Set(ids)]
}

const listRateCardsHandler = async (req, res) => {
  try {
    const { search = "", active } = req.query
    const cards = await listRateCards({ search, includeInactive: active !== "true" })
    res.json(cards)
  } catch (err) {
    console.error("Error fetching rate cards:", err)
    res.status(500).json({ error: "Failed to fetch rate cards" })
  }
}

const getRateCardHandler = async (req, res) => {
  try {
    const card = await getRateCardById(req.params.rateCardId)
    if (!card) return res.status(404).json({ error: "Rate card not found" })
    res.json(card)
  } catch (err) {
    console.error(`Error fetching rate card ${req.params.rateCardId}:`, err)
    res.status(500).json({ error: "Failed to fetch rate card" })
  }
}

const saveRateCardHandler = async (req, res) => {
  const rateCardId = req.params.rateCardId || null
  try {
    const { name, description, status, rates, clientIds } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Rate card name is required" })
    }
    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ error: "A rate card needs at least one route" })
    }
    const validationError = validateRouteRates(rates)
    if (validationError) return res.status(400).json({ error: validationError })

    let clients
    if (clientIds !== undefined) {
      clients = parseClientIds(clientIds)
      if (!clients) return res.status(400).json({ error: "clientIds must be an array of client ids" })
    }

    const result = await saveRateCard(rateCardId, { name, description, status, rates, clientIds: clients })
    if (!result.success) {
      return res.status(result.notFound ? 404 : 400).json({ error: result.message })
    }

    auditFromReq(req, {
      actionType: rateCardId ? "RATE_CARD_UPDATED" : "RATE_CARD_CREATED",
      entityType: "rate_card",
      targetId: result.rateCardId,
      targetName: name.trim(),
      details: `${rates.length} route(s): ${rates.map((r) => `${r.starting_point}->${r.destination}`).join(", ")}${
        clients ? `; clients: [${clients.join(", ")}]` : ""
      }`,
    })

    res.json({ message: "Rate card saved successfully", rateCardId: result.rateCardId })
  } catch (err) {
    console.error(`Error saving rate card ${rateCardId ?? "(new)"}:`, err)
    res.status(500).json({ error: "Failed to save rate card" })
  }
}

const deleteRateCardHandler = async (req, res) => {
  try {
    const { rateCardId } = req.params
    const result = await deleteRateCard(rateCardId)
    if (!result.success) {
      return res.status(result.notFound ? 404 : 409).json({ error: result.message })
    }

    auditFromReq(req, {
      actionType: "RATE_CARD_DELETED",
      entityType: "rate_card",
      targetId: rateCardId,
      details: `Rate card ${rateCardId} deleted`,
    })

    res.json({ message: "Rate card deleted" })
  } catch (err) {
    console.error(`Error deleting rate card ${req.params.rateCardId}:`, err)
    res.status(500).json({ error: "Failed to delete rate card" })
  }
}

// Before saving, tells the user which card routes a client will not actually
// be charged from because they already have a winning price for that lane.
const assignmentConflictsHandler = async (req, res) => {
  try {
    const { rateCardId = null, lanes = [], clientIds = [] } = req.body
    const clients = parseClientIds(clientIds)
    if (!clients || !Array.isArray(lanes)) {
      return res.status(400).json({ error: "lanes and clientIds must be arrays" })
    }
    const validLanes = lanes.filter((l) => l && l.starting_point && l.destination)
    const conflicts = await findAssignmentConflicts(rateCardId, validLanes, clients)
    res.json(conflicts)
  } catch (err) {
    console.error("Error checking rate card assignment conflicts:", err)
    res.status(500).json({ error: "Failed to check rate card conflicts" })
  }
}

export {
  listRateCardsHandler,
  getRateCardHandler,
  saveRateCardHandler,
  deleteRateCardHandler,
  assignmentConflictsHandler,
}
