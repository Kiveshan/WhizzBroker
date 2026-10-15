// Shared shape for a priced rate row. Client rates (m5_client_rate) and rate
// card routes (rate_card_rate) carry the same columns, so both save flows use
// these helpers to validate the request and turn form values into SQL params.
//
// A rate is identified by its title (migration 015); starting point and
// destination are optional.

const isBlank = (v) => v === "" || v === undefined || v === null

const toNumberOrNull = (v) => (isBlank(v) ? null : Number(v))

const isNonNegative = (v) => isBlank(v) || (!isNaN(v) && Number.parseFloat(v) >= 0)

const hasText = (v) => typeof v === "string" && v.trim() !== ""

// Mirrors the rate_title_key() SQL function: titles are compared
// case-insensitively with whitespace collapsed.
export const titleKey = (title) =>
  String(title ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()

// Stored form of a title: trimmed, inner whitespace collapsed.
export const cleanTitle = (title) =>
  String(title ?? "")
    .trim()
    .replace(/\s+/g, " ")

// Returns an error message for the first invalid row, or null when all pass.
// Titles must be unique within the list (one client's own rates, or one card).
export const validateRouteRates = (rates) => {
  const seenTitles = new Set()
  for (const rate of rates) {
    const title = cleanTitle(rate.title)
    if (!title) return "Each rate needs a title"
    if (seenTitles.has(titleKey(title))) {
      return `Two rates are both titled "${title}". Each title can only be used once.`
    }
    seenTitles.add(titleKey(title))

    if (hasText(rate.starting_point) !== hasText(rate.destination)) {
      return `"${title}": enter both a starting point and a destination, or leave both empty`
    }
    if (isBlank(rate["6m_rate"]) && isBlank(rate["12m_rate"])) {
      return `"${title}": enter a 6m or 12m rate`
    }
    if (!isNonNegative(rate.hazardous)) return `"${title}": hazardous must be a non-negative number`
    if (!isNonNegative(rate.surcharge6M ?? rate.surcharges)) return `"${title}": surcharge 6m must be a non-negative number`
    if (!isNonNegative(rate.surcharge12m)) return `"${title}": surcharge 12m must be a non-negative number`
    if (!isNonNegative(rate.vgm)) return `"${title}": VGM must be a non-negative number`
    if (!isNonNegative(rate.fuel_surcharge)) return `"${title}": fuel surcharge must be a non-negative percentage`

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
// surcharges, surcharge12m, hazardous, vgm, set_rate, fuel_surcharge, title.
export const routeRateValues = (rate) => [
  // Not trimmed: existing instructions store the route text verbatim and
  // fall back to matching it exactly. Blank becomes NULL.
  hasText(rate.starting_point) ? rate.starting_point : null,
  hasText(rate.destination) ? rate.destination : null,
  toNumberOrNull(rate["6m_rate"]),
  toNumberOrNull(rate["12m_rate"]),
  toNumberOrNull(rate.surcharge6M ?? rate.surcharges),
  toNumberOrNull(rate.surcharge12m),
  toNumberOrNull(rate.hazardous),
  toNumberOrNull(rate.vgm),
  toNumberOrNull(rate.set_rate),
  toNumberOrNull(rate.fuel_surcharge),
  cleanTitle(rate.title),
]

// Named extra charges with a blank name are dropped; blank amounts become 0.
export const cleanExtraCharges = (rate) =>
  (Array.isArray(rate.extra_charges) ? rate.extra_charges : [])
    .filter((c) => c.charge_name && c.charge_name.trim() !== "")
    .map((c) => ({ charge_name: c.charge_name.trim(), amount: isBlank(c.amount) ? 0 : Number(c.amount) }))
