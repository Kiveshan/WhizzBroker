/**
 * Pure cost arithmetic. No API calls, no React state.
 *
 * ⚠️  recalculateTotalCost (display) and performSave must use identical type-4
 *     branching. Both call calcBreakBulkCost to prevent future divergence.
 */

/**
 * Break-bulk (type 4) cost.
 * Set-rate mode: setRateAmount × weightRows.length (min 1)
 * Weight mode:   sum(row.weight) × unitRate
 */
export function calcBreakBulkCost(weightRows, unitRate, { isSetRateMode = false, setRateAmount = 0 } = {}) {
  if (isSetRateMode) {
    const rate = Number.isFinite(Number(setRateAmount)) ? Number(setRateAmount) : 0;
    const rowCount = weightRows.length || 1;
    return rate * rowCount;
  }
  const totalWeight = weightRows.reduce((sum, row) => {
    if (row.weight === null || row.weight === undefined || row.weight === "") return sum;
    const parsed = Number.parseFloat(row.weight);
    return Number.isNaN(parsed) ? sum : sum + parsed;
  }, 0);
  const rate = Number.parseFloat(unitRate) || 0;
  return totalWeight * rate;
}

/**
 * Container-based cost for the UPDATE form (types 1/2/3).
 * Includes per-container surcharge, hazardous, and VGM amounts
 * already stored on each container object.
 *
 * @param {number} rate6
 * @param {number} rate12
 * @param {number} rateAbnormal
 * @param {number} count6
 * @param {number} count12
 * @param {number} countAbnormal
 * @param {Array}  containers
 */
export function calculateTotalCostFromRates(
  rate6,
  rate12,
  rateAbnormal,
  count6,
  count12,
  countAbnormal,
  containers = []
) {
  const baseCost = rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal;

  const surchargeTotal = containers
    .filter((c) => c.addSurcharges === true)
    .reduce((total, c) => {
      const resolved = c.is_12m_surcharge
        ? Number(c.surcharge_12m_amount || 0)
        : Number(c.surchargeAmount || 0);
      return total + resolved;
    }, 0);

  const hazardousTotal = containers
    .filter((c) => c.hazardous === true)
    .reduce((total, c) => total + (Number(c.hazardousAmount) || 0), 0);

  const vgmTotal = containers
    .filter((c) => c.vgm === true)
    .reduce((total, c) => total + (Number(c.vgmAmount) || 0), 0);

  return baseCost + surchargeTotal + hazardousTotal + vgmTotal;
}

/**
 * Resolve the base cost for the UPDATE form save path (performSave).
 *
 * Mirrors the three-way branch in useRateManagement.recalculateTotalCost so
 * the display path and save path can never diverge again.
 *
 * Does NOT include per-container surcharge / hazardous / VGM — those are
 * fetched fresh by the caller and added on top of this value.
 *
 * Three-way branch (same priority order as recalculateTotalCost):
 *  1. Set-rate mode (with historicalSetRate fallback)
 *  2. Weight-based type-4  (rateWeight = "kg" | "ton")
 *  3. Container-based      (rateper_6/12/abnormal × counts)
 *
 * @param {object} formData
 * @param {Array}  weightRows
 * @param {{ isSetRateMode: boolean, historicalSetRate: number, isAddOn: boolean }} flags
 * @returns {number}
 */
export function resolveBaseCost(
  formData,
  weightRows,
  { isSetRateMode = false, historicalSetRate = 0, isAddOn = false } = {}
) {
  // ── Branch 1: Set-rate ───────────────────────────────────────────────────
  if (isSetRateMode && !isAddOn) {
    const rawRate = Number.parseFloat(formData.setRateAmount);
    const resolvedSetRateAmount =
      !Number.isNaN(rawRate) && rawRate > 0 ? rawRate : historicalSetRate || 0;
    return calcBreakBulkCost(weightRows, 0, {
      isSetRateMode: true,
      setRateAmount: resolvedSetRateAmount,
    });
  }

  // ── Branch 2: Weight-based type-4 ───────────────────────────────────────
  if (
    (formData.rateWeight === "kg" || formData.rateWeight === "ton") &&
    String(formData.shipmentTypeId) === "4"
  ) {
    return calcBreakBulkCost(weightRows, formData.unitRate || 0);
  }

  // ── Branch 3: Container-based ────────────────────────────────────────────
  // Rates are zeroed when the corresponding count is 0 (prevents phantom cost
  // when a count is cleared without also clearing the stored rate).
  const numSix = formData.num_six_meters || 0;
  const numTwelve = formData.num_twelve_meters || 0;
  const numAbnormal = formData.num_abnormal || 0;
  const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0;
  const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0;
  const ratePerAbnormal = numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0;
  return ratePer6 * numSix + ratePer12 * numTwelve + ratePerAbnormal * numAbnormal;
}

/**
 * Container-based cost for the CREATE form.
 * Uses create-form field naming (sixMeterRate / twelveMeterRate / abnormalRate).
 * Does NOT include hazardous/VGM — those are only on the update form.
 *
 * @param {object} formData
 * @param {Array}  containers
 * @param {{ isCrossHaul: boolean }} flags
 */
export function calcContainerBasedCost(formData, containers = [], { isCrossHaul = false } = {}) {
  const sixMeterRate = Number.parseFloat(formData.sixMeterRate) || 0;
  const twelveMeterRate = Number.parseFloat(formData.twelveMeterRate) || 0;
  const abnormalRate = Number.parseFloat(formData.abnormalRate) || 0;
  const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0;

  const sixMeterCount = formData.num_six_meters || 0;
  const twelveMeterCount = formData.num_twelve_meters || 0;
  const abnormalCount = formData.num_abnormal || 0;
  const breakBulkCount = formData.num_breakbulk || 0;

  const breakBulkCost =
    isCrossHaul && formData.rateWeight === "Container" ? breakBulkRate * breakBulkCount : 0;

  const surchargeTotal = containers.reduce((sum, c) => {
    if (!c.addSurcharges) return sum;
    const resolved = c.is_12m_surcharge
      ? Number(c.surcharge_12m_amount) || 0
      : Number(c.surchargeAmount) || 0;
    return sum + resolved;
  }, 0);

  return (
    sixMeterRate * sixMeterCount +
    twelveMeterRate * twelveMeterCount +
    abnormalRate * abnormalCount +
    breakBulkCost +
    surchargeTotal
  );
}
