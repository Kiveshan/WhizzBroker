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
 *   fetchRates:          (clientId, pickup, dropoff) => Promise<void>,
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

  // Stable refs for callbacks (prevent effect re-fires)
  const onFormUpdateRef = useRef(onFormUpdate);
  const onErrorRef = useRef(onError);
  useEffect(() => { onFormUpdateRef.current = onFormUpdate; }, [onFormUpdate]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // ── Keep isSetRateMode in sync with the checkbox ────────────────────────────

  useEffect(() => {
    setIsSetRateMode(isSetRate);
  }, [isSetRate]);

  // ── Fetch set_rate when checkbox is on + full route is available ─────────────

  useEffect(() => {
    if (!isSetRate || !clientId || !pickup || !dropoff) return;
    let cancelled = false;
    const load = async () => {
      try {
        const setRateData = await fetchSetRateService(clientId, pickup, dropoff);
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
  }, [isSetRate, clientId, pickup, dropoff]);

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
  // Fetches container rates for a client + route and applies them via onFormUpdate.
  // Also resolves the dropoff from destinations when only pickup is provided.

  const fetchRates = useCallback(
    async (fetchClientId, fetchPickup, fetchDropoff = null) => {
      if (!fetchClientId || !fetchPickup) return;
      try {
        let destinationToUse = fetchDropoff;
        if (!destinationToUse) {
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
          destinationToUse
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

        setRateUpdateMessage("Rates updated based on selected route");
        setTimeout(() => setRateUpdateMessage(""), 3000);
      } catch (error) {
        console.error("[useRateManagement] Error fetching rates:", error);
        onErrorRef.current?.(
          "Failed to fetch rates for selected route. Please check your selection or try again."
        );
      }
    },
    [] // stable — only reads from refs at call time
  );

  // ── fetchFreshAmounts ───────────────────────────────────────────────────────
  // Pre-save race-condition fix: re-fetches surcharge/hazardous/VGM for every
  // container that has those flags enabled. Returns an updated container array.

  const fetchFreshAmounts = useCallback(
    async (containers, formData) => {
      const freshContainers = await Promise.all(
        containers.map(async (container) => {
          if (
            (container.addSurcharges || container.hazardous || container.vgm) &&
            formData.clientId &&
            formData.pickup &&
            formData.dropoff
          ) {
            try {
              const ratesData = await fetchRatesService(
                formData.clientId,
                formData.pickup,
                formData.dropoff
              );

              const sixMeterSurcharge =
                ratesData.surcharges ?? ratesData.surcharge ?? 0;
              const twelveMeterSurcharge =
                ratesData.surcharge12m ??
                ratesData.surcharge_12m ??
                ratesData.surcharge12 ??
                ratesData.surcharge_12 ??
                ratesData.surcharges ??
                ratesData.surcharge ??
                0;
              const isTwelveMeter = container.containerType === "12m";
              const resolvedSurcharge = isTwelveMeter
                ? twelveMeterSurcharge
                : sixMeterSurcharge;

              return {
                ...container,
                surchargeAmount: container.addSurcharges
                  ? isTwelveMeter
                    ? 0
                    : Number(resolvedSurcharge || 0)
                  : container.surchargeAmount,
                is_12m_surcharge: isTwelveMeter,
                surcharge_12m_amount: container.addSurcharges
                  ? isTwelveMeter
                    ? Number(resolvedSurcharge || 0)
                    : 0
                  : container.surcharge_12m_amount || 0,
                hazardousAmount: container.hazardous
                  ? Number(ratesData.hazardous || 0)
                  : container.hazardousAmount,
                vgmAmount: container.vgm
                  ? Number(ratesData.vgm || 0)
                  : container.vgmAmount,
              };
            } catch (error) {
              console.error(
                "[useRateManagement] Error fetching fresh amounts:",
                error
              );
              return container;
            }
          }
          return container;
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
  };
}
