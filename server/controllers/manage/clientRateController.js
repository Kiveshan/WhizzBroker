import {
  getAllClientsForRates,
  getClientRatesByClientId,
  saveClientRates,
  deleteClientRate,
} from "../../models/manage/clientRateModel.js"
import { auditFromReq } from "../../utils/auditLogger.js"

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
    const { rates } = req.body

    console.log(`Saving rates for client ID ${clientId}:`, rates)

    // Validate that we have rates to save
    if (!rates || !Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ error: "At least one rate is required" })
    }

    // Validate each rate
    for (const rate of rates) {
      if (!rate.starting_point || !rate.destination) {
        return res.status(400).json({ error: "Starting point and destination are required for each rate" })
      }

      if ((rate["6m_rate"] === "" || rate["6m_rate"] === undefined) && (rate["12m_rate"] === "" || rate["12m_rate"] === undefined)) {
        return res.status(400).json({ error: "At least one rate (6m or 12m) is required for each entry" })
      }

      // Validate hazardous if provided
      if (rate.hazardous !== undefined && rate.hazardous !== "" && (isNaN(rate.hazardous) || Number.parseFloat(rate.hazardous) < 0)) {
        return res.status(400).json({ error: "Hazardous must be a non-negative number" })
      }

      const surcharge6M = rate.surcharge6M ?? rate.surcharges
      if (surcharge6M !== undefined && surcharge6M !== "" && (isNaN(surcharge6M) || Number.parseFloat(surcharge6M) < 0)) {
        return res.status(400).json({ error: "Surcharge 6M must be a non-negative number" })
      }

      if (rate.surcharge12m !== undefined && rate.surcharge12m !== "" && (isNaN(rate.surcharge12m) || Number.parseFloat(rate.surcharge12m) < 0)) {
        return res.status(400).json({ error: "Surcharge 12M must be a non-negative number" })
      }

      // Validate vgm if provided
      if (rate.vgm !== undefined && rate.vgm !== "" && (isNaN(rate.vgm) || Number.parseFloat(rate.vgm) < 0)) {
        return res.status(400).json({ error: "VGM must be a non-negative number" })
      }

      // Validate fuel surcharge if provided (percentage, non-negative)
      if (
        rate.fuel_surcharge !== undefined &&
        rate.fuel_surcharge !== "" &&
        (isNaN(rate.fuel_surcharge) || Number.parseFloat(rate.fuel_surcharge) < 0)
      ) {
        return res.status(400).json({ error: "Fuel surcharge must be a non-negative percentage" })
      }
    }

    const result = await saveClientRates(clientId, rates)

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    auditFromReq(req, {
      actionType: "CLIENT_RATES_SAVED",
      entityType: "client_rate",
      targetId: clientId,
      targetName: `client ${clientId}`,
      details: `${rates.length} rate(s) saved for client ${clientId}: ${rates
        .map((r) => `${r.starting_point}->${r.destination}`)
        .join(", ")}`,
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