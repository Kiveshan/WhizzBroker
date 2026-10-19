/**
 * useRateManagement — rate fetching, set-rate state, and cost recalculation
 * for instruction forms.
 *
 * Manages: isSetRate / isSetRateMode, setRateValue, historicalSetRate,
 * showSetRateWarning, rateUpdateMessage.
 * Exposes: fetchRates, fetchFreshAmounts, recalculateTotalCost.
 *
 * @param {object} options
 * @param {boolean} [options.isAddOn]        – true for add-on shipment type (type 5)
 * @param {string}  [options.clientId]       – reactive: used for set-rate fetch
 * @param {string}  [options.pickup]         – reactive: used for set-rate fetch
 * @param {string}  [options.dropoff]        – reactive: used for set-rate fetch
 * @param {string}  [options.rateTitle]      – reactive: the selected rate's title. Rates are
 *                                             looked up by title; pickup/dropoff are only used
 *                                             for instructions captured before rate titles.
 * @param {string}  [options.status]         – formData.status, used for warning check
 * @param {function} [options.onFormUpdate]  – (partialUpdate: object) => void
 *                                             called when rates or total cost change
 * @param {function} [options.onError]       – (message: string) => void
 *
 * @returns {{
 *   isSetRate:           boolean,
 *   setIsSetRate:        function,
 *   isSetRateMode:       boolean,
 *   setRateValue:        number,
 *   setSetRateValue:     function,
 *   historicalSetRate:   number | null,
 *   setHistoricalSetRate: function,
 *   showSetRateWarning:  boolean,
 *   rateUpdateMessage:   string,
 *   fetchRates:          (clientId, pickup, dropoff, title) => Promise<void>,
 *   fetchFreshAmounts:   (containers, formData) => Promise<object[]>,
 *   recalculateTotalCost: (formData, containers, weightRows) => void,
 * }}
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchRates as fetchRatesService,
  fetchSetRate as fetchSetRateService,
  fetchDestinations as fetchDestinationsService,
} from "../services/instructionService.js";
import {
  calculateTotalCostFromRates,
  calcBreakBulkCost,
} from "../utils/instructions/costCalculation.js";

export function useRateManagement({
  isAddOn = false,
  clientId = "",
  pickup = "",
  dropoff = "",
  rateTitle = "",
  status = "",
  onFormUpdate = null,
  onError = null,
} = {}) {
  const [isSetRate, setIsSetRate] = useState(false);
  const [isSetRateMode, setIsSetRateMode] = useState(false);
  const [setRateValue, setSetRateValue] = useState(0);
  const [historicalSetRate, setHistoricalSetRate] = useState(null);
  const [showSetRateWarning, setShowSetRateWarning] = useState(false);
  const [rateUpdateMessage, setRateUpdateMessage] = useState("");
  const [availableExtraCharges, setAvailableExtraCharges] = useState([]);

  // Stable refs for callbacks (prevent effect re-fires)
  const onFormUpdateRef = useRef(onFormUpdate);
  const onErrorRef = useRef(onError);
  useEffect(() => { onFormUpdateRef.current = onFormUpdate; }, [onFormUpdate]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // ── Keep isSetRateMode in sync with the checkbox ────────────────────────────

  useEffect(() => {
    setIsSetRateMode(isSetRate);
  }, [isSetRate]);

  // ── Load available extra charges whenever a rate is selected ──────────────
  // Runs independently of fetchRates (which is only invoked on user-driven
  // rate changes) so the FC update form — which loads with the rate already
  // set — still populates the extra-charges checkbox list.

  useEffect(() => {
    if (!clientId || (!rateTitle && (!pickup || !dropoff))) {
      setAvailableExtraCharges([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const responseData = await fetchRatesService(clientId, pickup, dropoff, rateTitle);
        if (cancelled) return;
        const rateData = Array.isArray(responseData) ? responseData[0] : responseData;
        setAvailableExtraCharges(
          rateData && Array.isArray(rateData.extraCharges) ? rateData.extraCharges : []
        );
      } catch (error) {
        if (!cancelled) setAvailableExtraCharges([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [clientId, pickup, dropoff, rateTitle]);

  // ── Fetch set_rate when checkbox is on + a rate is selected ──────────────────

  useEffect(() => {
    if (!isSetRate || !clientId || (!rateTitle && (!pickup || !dropoff))) return;
    let cancelled = false;
    const load = async () => {
      try {
        const setRateData = await fetchSetRateService(clientId, pickup, dropoff, rateTitle);
        if (cancelled) return;
        if (setRateData && setRateData.set_rate !== undefined) {
          const numeric = Number(setRateData.set_rate);
          setSetRateValue(numeric);
          onFormUpdateRef.current?.({
            setRateAmount: Number.isNaN(numeric) ? "" : String(numeric),
          });
        }
      } catch (error) {
        console.error("[useRateManagement] Error fetching set_rate:", error);
        if (!cancelled) setSetRateValue(0);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isSetRate, clientId, pickup, dropoff, rateTitle]);

  // ── Show set-rate mismatch warning ──────────────────────────────────────────

  useEffect(() => {
    if (
      isSetRate &&
      (status === "New" || status === "In Progress") &&
      historicalSetRate !== null &&
      historicalSetRate !== 0 &&
      setRateValue !== 0 &&
      historicalSetRate !== setRateValue
    ) {
      setShowSetRateWarning(true);
    } else {
      setShowSetRateWarning(false);
    }
  }, [isSetRate, status, historicalSetRate, setRateValue]);

  // ── fetchRates ──────────────────────────────────────────────────────────────
  // Fetches a rate's prices (by title, or by route for older instructions) and
  // applies them via onFormUpdate. With a route but no dropoff it resolves
  // the dropoff from the destinations list.

  const fetchRates = useCallback(
    async (fetchClientId, fetchPickup, fetchDropoff = null, fetchTitle = null) => {
      if (!fetchClientId || (!fetchTitle && !fetchPickup)) return;
      try {
        let destinationToUse = fetchDropoff;
        if (!fetchTitle && !destinationToUse) {
          const destinationsResult = await fetchDestinationsService(
            fetchClientId,
            fetchPickup
          );
          destinationToUse = destinationsResult?.[0]?.destination;
          if (!destinationToUse) return;
        }

        const responseData = await fetchRatesService(
          fetchClientId,
          fetchPickup,
          destinationToUse,
          fetchTitle
        );
        if (!responseData) return;

        const rateData = Array.isArray(responseData)
          ? responseData[0]
          : responseData;
        if (!rateData) return;

        const rate6m =
          rateData.rateper_6 || rateData["6m_rate"] || rateData.sixMeterRate || 0;
        const rate12m =
          rateData.rateper_12 || rateData["12m_rate"] || rateData.twelveMeterRate || 0;
        const abnormalRate = rateData.rateper_abnormal || rateData.abnormalRate || 0;
        const surcharge = rateData.surcharge || rateData.surcharges || 0;

        onFormUpdateRef.current?.({
          rateper_6: rate6m,
          rateper_12: rate12m,
          rateper_abnormal: abnormalRate,
          surcharge,
        });

        setAvailableExtraCharges(
          Array.isArray(rateData.extraCharges) ? rateData.extraCharges : []
        );

        setRateUpdateMessage("Prices updated from the selected rate");
        setTimeout(() => setRateUpdateMessage(""), 3000);
      } catch (error) {
        console.error("[useRateManagement] Error fetching rates:", error);
        onErrorRef.current?.(
          "Failed to fetch prices for the selected rate. Please check your selection or try again."
        );
      }
    },
    [] // stable — only reads from refs at call time
  );

  // ── fetchFreshAmounts ───────────────────────────────────────────────────────
  // Pre-save: resolves surcharge/hazardous/VGM/extra-charge amounts for every
  // container. Rate changes apply to NEW instructions only, so a saved
  // container keeps the amount it was saved with for any flag that was
  // already on (container._saved, set when the instruction loaded); the
  // server enforces the same rule. Only newly ticked flags and new containers
  // are priced from the current rate. Returns an updated container array.

  const fetchFreshAmounts = useCallback(
    async (containers, formData) => {
      const hasRate =
        formData.clientId && (formData.rate_title || (formData.pickup && formData.dropoff));
      let ratesPromise = null;
      const getRates = () => {
        if (!ratesPromise) {
          ratesPromise = fetchRatesService(
            formData.clientId,
            formData.pickup,
            formData.dropoff,
            formData.rate_title
          );
        }
        return ratesPromise;
      };

      const freshContainers = await Promise.all(
        containers.map(async (container) => {
          const saved = container._saved;
          const isTwelveMeter = container.containerType === "12m";
          const keep = {
            hazardous: Boolean(saved?.hazardous && container.hazardous),
            surcharge: Boolean(
              saved?.addSurcharges &&
                container.addSurcharges &&
                saved.containerType === container.containerType
            ),
            vgm: Boolean(saved?.vgm && container.vgm),
          };
          const savedChargeAmount = (name) =>
            saved?.extraCharges?.find(
              (c) => String(c.charge_name).trim().toLowerCase() === String(name).trim().toLowerCase()
            )?.amount;

          const selected = Array.isArray(container.selectedExtraCharges)
            ? container.selectedExtraCharges
            : [];
          const needsRate =
            (container.addSurcharges && !keep.surcharge) ||
            (container.hazardous && !keep.hazardous) ||
            (container.vgm && !keep.vgm) ||
            selected.some((c) => savedChargeAmount(c.charge_name) === undefined);

          let rate = null;
          if (needsRate && hasRate) {
            try {
              rate = await getRates();
            } catch (error) {
              console.error("[useRateManagement] Error fetching fresh amounts:", error);
            }
          }

          const out = { ...container };

          if (keep.surcharge) {
            out.is_12m_surcharge = saved.is_12m_surcharge;
            out.surchargeAmount = saved.surchargeAmount;
            out.surcharge_12m_amount = saved.surcharge_12m_amount;
          } else if (container.addSurcharges && rate) {
            const six = rate.surcharges ?? rate.surcharge ?? 0;
            const twelve =
              rate.surcharge12m ?? rate.surcharge_12m ?? rate.surcharges ?? rate.surcharge ?? 0;
            const resolved = Number((isTwelveMeter ? twelve : six) || 0);
            out.is_12m_surcharge = isTwelveMeter;
            out.surchargeAmount = isTwelveMeter ? 0 : resolved;
            out.surcharge_12m_amount = isTwelveMeter ? resolved : 0;
          }

          if (keep.hazardous) out.hazardousAmount = saved.hazardousAmount;
          else if (container.hazardous && rate) out.hazardousAmount = Number(rate.hazardous || 0);

          if (keep.vgm) out.vgmAmount = saved.vgmAmount;
          else if (container.vgm && rate) out.vgmAmount = Number(rate.vgm || 0);

          if (selected.length > 0) {
            out.selectedExtraCharges = selected.map((charge) => {
              const savedAmount = savedChargeAmount(charge.charge_name);
              if (savedAmount !== undefined) return { charge_name: charge.charge_name, amount: savedAmount };
              const current = (rate?.extraCharges || []).find((c) => c.charge_name === charge.charge_name);
              return current
                ? { charge_name: current.charge_name, amount: Number(current.amount || 0) }
                : charge;
            });
          }

          return out;
        })
      );
      return freshContainers;
    },
    [] // stable — all data passed as explicit params
  );

  // ── recalculateTotalCost ────────────────────────────────────────────────────
  // Branches by shipment type:
  //   isAddOn        → forces total_cost = 0, zeroes all rate fields
  //   type 4         → calcBreakBulkCost(weightRows, unitRate, { isSetRateMode })
  //   all others     → calculateTotalCostFromRates(rates, counts, containers)
  //
  // All data is passed as explicit params — no closure over component state.

  const recalculateTotalCost = useCallback(
    (formData, containers, weightRows) => {
      if (!onFormUpdateRef.current) return;

      // Add-on type (5): always zero cost
      if (isAddOn) {
        onFormUpdateRef.current({
          total_cost: 0,
          rateper_6: 0,
          rateper_12: 0,
          rateper_abnormal: 0,
          rateper_breakbulk: 0,
          unitRate: 0,
        });
        return;
      }

      // Break-bulk (type 4): three-way branch matching the original orchestrator logic
      if (String(formData.shipmentTypeId) === "4") {
        let baseCost = 0;
        if (isSetRateMode) {
          // Set-rate mode: fall back to historicalSetRate if API returns 0/""
          const rawRate = Number.parseFloat(formData.setRateAmount);
          const resolvedSetRateAmount = (!Number.isNaN(rawRate) && rawRate > 0)
            ? rawRate
            : (historicalSetRate || 0);
          baseCost = calcBreakBulkCost(weightRows, formData.unitRate || 0, {
            isSetRateMode: true,
            setRateAmount: resolvedSetRateAmount,
          });
        } else if (formData.rateWeight === "kg" || formData.rateWeight === "ton") {
          // Weight-based mode
          baseCost = calcBreakBulkCost(weightRows, formData.unitRate || 0, {
            isSetRateMode: false,
            setRateAmount: 0,
          });
        } else {
          // Container-based fallback for type 4 (rateWeight is "Container" or unset)
          baseCost = calculateTotalCostFromRates(
            formData.rateper_6 || 0,
            formData.rateper_12 || 0,
            formData.rateper_abnormal || 0,
            formData.num_six_meters || 0,
            formData.num_twelve_meters || 0,
            formData.num_abnormal || 0,
            containers
          );
        }
        onFormUpdateRef.current({ total_cost: baseCost });
        return;
      }

      // Container-based calculation (types 1, 2, 3)
      const newTotalCost = calculateTotalCostFromRates(
        formData.rateper_6 || 0,
        formData.rateper_12 || 0,
        formData.rateper_abnormal || 0,
        formData.num_six_meters || 0,
        formData.num_twelve_meters || 0,
        formData.num_abnormal || 0,
        containers
      );
      onFormUpdateRef.current({ total_cost: newTotalCost });
    },
    [isAddOn, isSetRateMode]
  );

  return {
    isSetRate,
    setIsSetRate,
    isSetRateMode,
    setRateValue,
    setSetRateValue,
    historicalSetRate,
    setHistoricalSetRate,
    showSetRateWarning,
    rateUpdateMessage,
    fetchRates,
    fetchFreshAmounts,
    recalculateTotalCost,
    availableExtraCharges,
  };
}
