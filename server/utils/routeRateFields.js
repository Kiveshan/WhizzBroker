// Shared shape for a priced route row. Client rates (m5_client_rate) and rate
// card routes (rate_card_rate) carry the same columns, so both save flows use
// these helpers to validate the request and turn form values into SQL params.

const isBlank = (v) => v === "" || v === undefined || v === null

const toNumberOrNull = (v) => (isBlank(v) ? null : Number(v))

const isNonNegative = (v) => isBlank(v) || (!isNaN(v) && Number.parseFloat(v) >= 0)

// Returns an error message for the first invalid row, or null when all pass.
export const validateRouteRates = (rates) => {
  for (const rate of rates) {
    if (!rate.starting_point || !rate.destination) {
      return "Starting point and destination are required for each rate"
    }
    if (isBlank(rate["6m_rate"]) && isBlank(rate["12m_rate"])) {
      return "At least one rate (6m or 12m) is required for each entry"
    }
    if (!isNonNegative(rate.hazardous)) return "Hazardous must be a non-negative number"
    if (!isNonNegative(rate.surcharge6M ?? rate.surcharges)) return "Surcharge 6M must be a non-negative number"
    if (!isNonNegative(rate.surcharge12m)) return "Surcharge 12M must be a non-negative number"
    if (!isNonNegative(rate.vgm)) return "VGM must be a non-negative number"
    if (!isNonNegative(rate.fuel_surcharge)) return "Fuel surcharge must be a non-negative percentage"

    if (rate.extra_charges !== undefined) {
      if (!Array.isArray(rate.extra_charges)) return "Extra charges must be an array"
      for (const charge of rate.extra_charges) {
        if (!charge.charge_name || !charge.charge_name.trim()) continue
        if (!isNonNegative(charge.amount)) {
          return `Extra charge "${charge.charge_name}" must have a non-negative amount`
        }
      }
    }
  }
  return null
}

// Column values in the order: starting_point, destination, 6m_rate, 12m_rate,
// surcharges, surcharge12m, hazardous, vgm, set_rate, fuel_surcharge.
export const routeRateValues = (rate) => [
  // Not trimmed: existing instructions store the route text verbatim and
  // later lookups must still match it exactly.
  rate.starting_point || null,
  rate.destination || null,
  toNumberOrNull(rate["6m_rate"]),
  toNumberOrNull(rate["12m_rate"]),
  toNumberOrNull(rate.surcharge6M ?? rate.surcharges),
  toNumberOrNull(rate.surcharge12m),
  toNumberOrNull(rate.hazardous),
  toNumberOrNull(rate.vgm),
  toNumberOrNull(rate.set_rate),
  toNumberOrNull(rate.fuel_surcharge),
]

// Named extra charges with a blank name are dropped; blank amounts become 0.
export const cleanExtraCharges = (rate) =>
  (Array.isArray(rate.extra_charges) ? rate.extra_charges : [])
    .filter((c) => c.charge_name && c.charge_name.trim() !== "")
    .map((c) => ({ charge_name: c.charge_name.trim(), amount: isBlank(c.amount) ? 0 : Number(c.amount) }))
