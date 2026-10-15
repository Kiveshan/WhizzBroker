/**
 * What an instruction is worth, as a line-by-line breakdown.
 *
 * Mirrors the server's calculateTotalCost (instructionController.js), which is
 * authoritative and recomputes total_cost on every save — so the value shown
 * on the instruction is the value that gets saved and invoiced:
 *
 *   set rate        set rate × weight rows (min 1), nothing added on top
 *   weight-based    total weight × unit rate (break bulk), else weight × rate
 *   container       count × rate per size (+ break-bulk containers)
 *   then, on top    surcharges, hazardous, VGM and extra charges per container
 *   add-on          always 0 — billed through the linked add-on invoice
 *
 * Pure: no API calls, no React. Callers map their form's field names in.
 */

const num = (value) => {
  const n = typeof value === "string" ? Number.parseFloat(value.trim()) : Number(value)
  return Number.isFinite(n) ? n : 0
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * @param {object}  args
 * @param {string}  args.shipmentTypeId   "1".."5"
 * @param {string}  args.rateWeight       "Container" | "kg" | "ton" | …
 * @param {?number} args.setRate          set-rate amount when set-rate mode is on, else null
 * @param {number}  args.unitRate         rate per weight unit
 * @param {number}  [args.weight]         instruction weight (non-break-bulk weight mode)
 * @param {Array}   args.weightRows       break-bulk weight rows ({ weight })
 * @param {{six,twelve,abnormal,breakbulk}} args.counts
 * @param {{six,twelve,abnormal,breakbulk}} args.rates
 * @param {Array}   args.containers       form containers (camelCase amounts)
 * @param {number}  args.vat              VAT percentage (15 or 0)
 */
export function instructionValue({
  shipmentTypeId,
  rateWeight = "Container",
  setRate = null,
  unitRate = 0,
  weight = 0,
  weightRows = [],
  counts = {},
  rates = {},
  containers = [],
  vat = 15,
}) {
  const type = String(shipmentTypeId || "")
  const vatPercent = num(vat)
  const lines = []

  if (type === "5") {
    return { isAddOn: true, lines, subtotal: 0, vatPercent, vatAmount: 0, total: 0 }
  }

  const finish = () => {
    const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0))
    const vatAmount = round2((subtotal * vatPercent) / 100)
    return { isAddOn: false, lines, subtotal, vatPercent, vatAmount, total: round2(subtotal + vatAmount) }
  }

  // Set rate: the entered rate per load, with nothing added on top.
  if (setRate !== null && setRate !== undefined) {
    const loads = weightRows.length || 1
    const rate = num(setRate)
    lines.push({ label: "Set rate", detail: `${loads} × ${formatRand(rate)}`, amount: rate * loads })
    return finish()
  }

  if (rateWeight && rateWeight !== "Container") {
    const unit = num(unitRate)
    const totalWeight =
      type === "4" && weightRows.length > 0 ? weightRows.reduce((sum, row) => sum + num(row.weight), 0) : num(weight)
    lines.push({
      label: "Weight",
      detail: `${round2(totalWeight)} ${rateWeight} × ${formatRand(unit)}`,
      amount: totalWeight * unit,
    })
  } else {
    const sizes = [
      ["6m", counts.six, rates.six],
      ["12m", counts.twelve, rates.twelve],
      ["Abnormal", counts.abnormal, rates.abnormal],
      ["Break bulk", counts.breakbulk, rates.breakbulk],
    ]
    for (const [label, count, rate] of sizes) {
      const n = num(count)
      if (n > 0) lines.push({ label, detail: `${n} × ${formatRand(num(rate))}`, amount: n * num(rate) })
    }
  }

  // Per-container charges, exactly as the server adds them.
  const allowVgm = type !== "4"
  let surcharge = 0
  let surchargeCount = 0
  let hazardous = 0
  let hazardousCount = 0
  let vgm = 0
  let vgmCount = 0
  const extras = new Map()
  for (const c of containers || []) {
    if (c.addSurcharges) {
      const amount = c.is_12m_surcharge ? num(c.surcharge_12m_amount) : num(c.surchargeAmount)
      surcharge += amount
      surchargeCount += 1
    }
    if (c.hazardous && num(c.hazardousAmount)) {
      hazardous += num(c.hazardousAmount)
      hazardousCount += 1
    }
    if (allowVgm && c.vgm && num(c.vgmAmount)) {
      vgm += num(c.vgmAmount)
      vgmCount += 1
    }
    const charges = c.selectedExtraCharges || c.extra_charges || []
    if (Array.isArray(charges)) {
      for (const charge of charges) {
        const name = charge.charge_name || "Extra charge"
        const prev = extras.get(name) || { amount: 0, count: 0 }
        extras.set(name, { amount: prev.amount + num(charge.amount), count: prev.count + 1 })
      }
    }
  }
  const containerWord = (n) => `${n} container${n === 1 ? "" : "s"}`
  if (surchargeCount) lines.push({ label: "Surcharge", detail: containerWord(surchargeCount), amount: surcharge })
  if (hazardousCount) lines.push({ label: "Hazardous", detail: containerWord(hazardousCount), amount: hazardous })
  if (vgmCount) lines.push({ label: "VGM", detail: containerWord(vgmCount), amount: vgm })
  for (const [name, { amount, count }] of extras) {
    lines.push({ label: name, detail: containerWord(count), amount })
  }

  return finish()
}

export function formatRand(value) {
  return `R ${num(value).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * For a saved instruction: keep the breakdown when it adds up to the stored
 * total_cost, otherwise (older instructions priced under earlier rules) show
 * the stored total as one line — the stored figure is what was invoiced.
 */
export function savedInstructionValue(value, savedTotal) {
  if (!value || value.isAddOn) return value
  const saved = round2(num(savedTotal))
  if (Math.abs(value.subtotal - saved) <= 0.01) return value
  const vatAmount = round2((saved * value.vatPercent) / 100)
  return {
    ...value,
    lines: [{ label: "Instruction total", detail: "as saved", amount: saved }],
    subtotal: saved,
    vatAmount,
    total: round2(saved + vatAmount),
  }
}
