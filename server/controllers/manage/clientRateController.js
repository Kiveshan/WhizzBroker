import {
  getAllClientsForRates,
  getClientRatesByClientId,
  saveClientRates,
  deleteClientRate,
} from "../../models/manage/clientRateModel.js"
import { auditFromReq } from "../../utils/auditLogger.js"
import { validateRouteRates } from "../../utils/routeRateFields.js"

const getAllClientsForRatesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(
      `Fetching clients for rates - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}, Status: ${status}`,
    )

    const result = await getAllClientsForRates({
      offset,
      limit: limitNum,
      search,
      status,
    })

    res.json({
      items: result.clients,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching clients for rates:", err)
    res.status(500).json({ error: "Failed to fetch clients for rates" })
  }
}

const getClientRatesByClientIdHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    console.log(`Fetching rates for client ID ${clientId}`)

    const result = await getClientRatesByClientId(clientId)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching client rates for client ${req.params.clientId}:`, err)
    res.status(500).json({ error: "Failed to fetch client rates" })
  }
}

const saveClientRatesHandler = async (req, res) => {
  try {
    const { clientId } = req.params
    const { rates = [], rateCards } = req.body

    console.log(`Saving rates for client ID ${clientId}:`, { rates, rateCards })

    if (!Array.isArray(rates)) {
      return res.status(400).json({ error: "Rates must be an array" })
    }
    if (rateCards !== undefined && !Array.isArray(rateCards)) {
      return res.status(400).json({ error: "Rate cards must be an array" })
    }

    // A client needs something to price from: its own rates or at least one card
    if (rates.length === 0 && (!rateCards || rateCards.length === 0)) {
      return res.status(400).json({ error: "Add at least one rate or assign a rate card" })
    }

    const validationError = validateRouteRates(rates)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    let cardAssignments
    if (rateCards) {
      const seen = new Set()
      cardAssignments = []
      for (const card of rateCards) {
        const id = Number(card.rate_card_id)
        if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid rate card" })
        if (seen.has(id)) continue
        seen.add(id)
        const fuel = card.fuel_surcharge
        if (fuel !== undefined && fuel !== null && fuel !== "" && (isNaN(fuel) || Number.parseFloat(fuel) < 0)) {
          return res.status(400).json({ error: "Rate card fuel surcharge must be a non-negative percentage" })
        }
        cardAssignments.push({ rate_card_id: id, fuel_surcharge: fuel })
      }
    }

    const result = await saveClientRates(clientId, rates, cardAssignments)

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    auditFromReq(req, {
      actionType: "CLIENT_RATES_SAVED",
      entityType: "client_rate",
      targetId: clientId,
      targetName: `client ${clientId}`,
      details: `${rates.length} rate(s) saved for client ${clientId}: ${rates
        .map((r) => r.title)
        .join(", ")}${cardAssignments ? `; rate cards: [${cardAssignments.map((c) => c.rate_card_id).join(", ")}]` : ""}`,
    })

    res.json({
      message: "Client rates saved successfully",
      data: result.data,
    })
  } catch (err) {
    console.error(`Error saving client rates for client ${req.params.clientId}:`, err)
    res.status(500).json({ error: "Failed to save client rates" })
  }
}

const deleteClientRateHandler = async (req, res) => {
  try {
    const { rateId } = req.params
    console.log(`Deleting client rate ID ${rateId}`)

    const result = await deleteClientRate(rateId)

    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }

    auditFromReq(req, {
      actionType: "CLIENT_RATE_DELETED",
      entityType: "client_rate",
      targetId: rateId,
      details: `Client rate ${rateId} deleted`,
    })

    res.json({ message: result.message })
  } catch (err) {
    console.error(`Error deleting client rate ${req.params.rateId}:`, err)
    res.status(500).json({ error: "Failed to delete client rate" })
  }
}

export {
  getAllClientsForRatesHandler,
  getClientRatesByClientIdHandler,
  saveClientRatesHandler,
  deleteClientRateHandler,
}