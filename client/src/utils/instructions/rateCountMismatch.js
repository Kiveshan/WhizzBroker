/**
 * Detect whether a rate/container-count mismatch requires user confirmation.
 *
 * Handles both field-naming conventions:
 *   - update form: rateper_6 / rateper_12 / rateper_abnormal
 *   - create form: sixMeterRate / twelveMeterRate / abnormalRate
 *
 * Does NOT check break-bulk — the FC update form omits that check intentionally
 * (see Appendix). The create form passes isCrossHaul to enable break-bulk check.
 *
 * @param {object}  formData
 * @param {object}  flags
 * @param {boolean} [flags.isAddOn=false]
 * @param {boolean} [flags.isWeightBased=false]
 * @param {boolean} [flags.isSetRateMode=false]
 * @param {boolean} [flags.isCrossHaul=false]
 * @returns {{ needsConfirmation: boolean, message: string }}
 */
export function checkRateCountMismatch(formData, {
  isAddOn = false,
  isWeightBased = false,
  isSetRateMode = false,
  isCrossHaul = false,
} = {}) {
  if (isAddOn || isWeightBased || isSetRateMode) {
    return { needsConfirmation: false, message: "" };
  }

  // Support both naming conventions
  const sixMeterRate =
    Number.parseFloat(formData.rateper_6 ?? formData.sixMeterRate) || 0;
  const twelveMeterRate =
    Number.parseFloat(formData.rateper_12 ?? formData.twelveMeterRate) || 0;
  const abnormalRate =
    Number.parseFloat(formData.rateper_abnormal ?? formData.abnormalRate) || 0;

  const sixMeterCount = formData.num_six_meters || 0;
  const twelveMeterCount = formData.num_twelve_meters || 0;
  const abnormalCount = formData.num_abnormal || 0;

  const typesWithRatesButZeroCount = [];
  const typesWithCountAndRates = [];

  if (sixMeterRate > 0 && sixMeterCount === 0) typesWithRatesButZeroCount.push("6m");
  if (sixMeterCount > 0 && sixMeterRate > 0)
    typesWithCountAndRates.push(`6m (${sixMeterCount} containers, Rate: R${sixMeterRate.toFixed(2)})`);

  if (twelveMeterRate > 0 && twelveMeterCount === 0) typesWithRatesButZeroCount.push("12m");
  if (twelveMeterCount > 0 && twelveMeterRate > 0)
    typesWithCountAndRates.push(`12m (${twelveMeterCount} containers, Rate: R${twelveMeterRate.toFixed(2)})`);

  if (abnormalRate > 0 && abnormalCount === 0) typesWithRatesButZeroCount.push("Abnormal");
  if (abnormalCount > 0 && abnormalRate > 0)
    typesWithCountAndRates.push(`Abnormal (${abnormalCount} containers, Rate: R${abnormalRate.toFixed(2)})`);

  if (isCrossHaul) {
    const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0;
    const breakBulkCount = formData.num_breakbulk || 0;
    if (breakBulkRate > 0 && breakBulkCount === 0) typesWithRatesButZeroCount.push("Break Bulk");
    if (breakBulkCount > 0 && breakBulkRate > 0)
      typesWithCountAndRates.push(
        `Break Bulk (${breakBulkCount} containers, Rate: R${breakBulkRate.toFixed(2)})`
      );
  }

  if (typesWithRatesButZeroCount.length === 0) {
    return { needsConfirmation: false, message: "" };
  }

  const message =
    typesWithCountAndRates.length > 0
      ? `You have containers with the following rates: ${typesWithCountAndRates.join(", ")}. Are you sure you want to continue?`
      : "You have set rates for container types with 0 containers. Are you sure you want to continue?";

  return { needsConfirmation: true, message };
}
