/**
 * useContainerManagement — container list state and operations for instruction forms.
 *
 * Manages: container array, field errors, loading/modified flags, delete flow
 * (including legs-exist check). Rate amount fetching (surcharge, hazardous, VGM)
 * is handled internally via fetchRatesService.
 *
 * @param {object} options
 * @param {boolean} [options.isImport]           – true for import shipment type
 * @param {boolean} [options.isExport]           – true for export shipment type
 * @param {boolean} [options.isCrossHaul]        – true for cross-haul shipment type
 * @param {boolean} [options.isWeightBased]      – true when weight-based rate mode
 * @param {string}  [options.clientId]           – current client (for rate fetching)
 * @param {string}  [options.pickup]             – current pickup location
 * @param {string}  [options.dropoff]            – current dropoff location
 * @param {string}  [options.shipmentTypeId]     – current shipment type id string
 * @param {boolean} [options.isAddOn]            – skip uniqueness check for add-on type
 * @param {boolean} [options.isReadOnly]         – guard: block delete if true
 * @param {string}  [options.instructionId]      – for container legs-exist check
 * @param {function} [options.onRecalculateTotalCost] – () => void — triggers cost recalc
 * @param {function} [options.onUpdateFormCounts]     – ({ num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk }) => void
 *                                                      called after a container is confirmed-deleted so form counts stay in sync
 * @param {function} [options.onRequestConfirmation]  – (message) => void
 *                                                      called by handleRequestDeleteContainer to open the delete-container modal
 * @param {function} [options.onError]               – (message) => void — called on API errors
 *
 * @returns {{
 *   containers:               object[],
 *   setContainers:            function,
 *   containersRef:            React.MutableRefObject<object[]>,
 *   containerFieldErrors:     object,
 *   setContainerFieldErrors:  function,
 *   isContainerLoading:       boolean,
 *   setIsContainerLoading:    function,
 *   isContainerDataModified:  boolean,
 *   setIsContainerDataModified: function,
 *   containerSuccessMessage:  string,
 *   setContainerSuccessMessage: function,
 *   containerToDelete:        object | null,
 *   initializeContainers:     (currentContainers: object[], counts: object) => void,
 *   handleContainerChange:    (id, field, value) => Promise<void>,
 *   validateContainerUniqueness: () => boolean,
 *   handleRequestDeleteContainer: (container) => Promise<void>,
 *   confirmDeleteContainer:   () => void,
 *   cancelDeleteContainer:    () => void,
 * }}
 */

import { useState, useRef, useCallback } from "react";
import {
  fetchRates as fetchRatesService,
  checkContainerLegsExist as checkContainerLegsExistService,
} from "../services/instructionService.js";

// Valid container types, and a pure helper to derive form counts from the
// container rows. In the row-as-source-of-truth model the counts are always a
// projection of the container list, never edited directly.
const CONTAINER_TYPES = ["6m", "12m", "Abnormal", "BreakBulk"];

export function deriveCounts(list = []) {
  return {
    num_six_meters: list.filter((c) => c.containerType === "6m").length,
    num_twelve_meters: list.filter((c) => c.containerType === "12m").length,
    num_abnormal: list.filter((c) => c.containerType === "Abnormal").length,
    num_breakbulk: list.filter((c) => c.containerType === "BreakBulk").length,
  };
}

export function useContainerManagement({
  isImport = false,
  isExport = false,
  isCrossHaul = false,
  isWeightBased = false,
  clientId = "",
  pickup = "",
  dropoff = "",
  shipmentTypeId = "",
  isAddOn = false,
  isReadOnly = false,
  instructionId = null,
  onRecalculateTotalCost = null,
  onUpdateFormCounts = null,
  onRequestConfirmation = null,
  onError = null,
} = {}) {
  const [containers, setContainers] = useState([]);
  const containersRef = useRef([]);

  const [containerFieldErrors, setContainerFieldErrors] = useState({});
  const [containerSuccessMessage, setContainerSuccessMessage] = useState("");
  const [isContainerLoading, setIsContainerLoading] = useState(false);
  const [isContainerDataModified, setIsContainerDataModified] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);

  // Keep containersRef in sync (called imperatively, not via useEffect, to avoid
  // stale-closure issues in synchronous save handlers)
  const syncRef = useCallback((newContainers) => {
    containersRef.current = newContainers;
  }, []);

  // Wrap setContainers to keep the ref in sync
  const setContainersAndRef = useCallback((updater) => {
    setContainers((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      containersRef.current = next;
      return next;
    });
  }, []);

  // ── clearContainerFieldError ────────────────────────────────────────────────

  const clearContainerFieldError = useCallback((containerId, fieldType) => {
    setContainerFieldErrors((prev) => ({
      ...prev,
      [`${fieldType}-${containerId}`]: "",
    }));
  }, []);

  // ── initializeContainers ────────────────────────────────────────────────────
  // Explicit-parameter version (Flag 4): no closure over containers state.

  const initializeContainers = useCallback(
    (currentContainers = [], counts = {}) => {
      const numSix = counts.num_six_meters ?? counts["6m"] ?? 0;
      const numTwelve = counts.num_twelve_meters ?? counts["12m"] ?? 0;
      const numAbnormal = counts.num_abnormal ?? counts["Abnormal"] ?? 0;
      const numBreakBulk = counts.num_breakbulk ?? counts["BreakBulk"] ?? 0;

      // Guard: if all counts are zero and there are existing containers, keep them
      if (
        currentContainers.length > 0 &&
        numSix === 0 &&
        numTwelve === 0 &&
        numAbnormal === 0 &&
        numBreakBulk === 0
      ) {
        return;
      }

      // Group existing containers by type for data-preservation
      const byType = { "6m": [], "12m": [], Abnormal: [], BreakBulk: [] };
      currentContainers.forEach((c) => {
        if (byType[c.containerType]) byType[c.containerType].push(c);
      });

      const needsWeight =
        isImport ||
        isExport ||
        String(shipmentTypeId) === "2" ||
        String(shipmentTypeId) === "3";

      const containersList = [];
      let nextId = 1;

      const getOrCreate = (type, index) => {
        const existing = byType[type];
        if (index < existing.length) {
          return { ...existing[index], id: nextId++ };
        }
        return {
          id: nextId++,
          containerKey: null,
          containerNum: "",
          fileRef: "",
          weight: needsWeight ? "" : null,
          containerType: type,
          cargoDescription: "",
          hazardous: false,
          addSurcharges: false,
          surchargeAmount: 0,
          is_12m_surcharge: type === "12m",
          surcharge_12m_amount: 0,
          hazardousAmount: 0,
          vgm: false,
          vgmAmount: 0,
        };
      };

      for (let i = 0; i < numSix; i++) containersList.push(getOrCreate("6m", i));
      for (let i = 0; i < numTwelve; i++) containersList.push(getOrCreate("12m", i));
      for (let i = 0; i < numAbnormal; i++) containersList.push(getOrCreate("Abnormal", i));
      if (isCrossHaul || numBreakBulk > 0) {
        for (let i = 0; i < numBreakBulk; i++) containersList.push(getOrCreate("BreakBulk", i));
      }

      setContainersAndRef(containersList);
      setIsContainerLoading(false);
    },
    [isImport, isExport, isCrossHaul, isWeightBased, shipmentTypeId, setContainersAndRef]
  );

  // ── Rate amount helpers ─────────────────────────────────────────────────────

  const fetchSurchargeForContainer = useCallback(
    async (containerId) => {
      if (!clientId || !pickup || !dropoff) return;
      try {
        const ratesData = await fetchRatesService(clientId, pickup, dropoff);
        const amount = ratesData?.surcharge || 0;
        const is12mSurcharge = Boolean(ratesData?.surcharge_12m);
        const amount12m = ratesData?.surcharge_12m || 0;
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId
              ? { ...c, surchargeAmount: Number(amount), is_12m_surcharge: is12mSurcharge, surcharge_12m_amount: Number(amount12m) }
              : c
          )
        );
        onRecalculateTotalCost?.();
      } catch (error) {
        console.error("[useContainerManagement] Error fetching surcharge amount:", error);
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId ? { ...c, surchargeAmount: 0 } : c
          )
        );
      }
    },
    [clientId, pickup, dropoff, setContainersAndRef, onRecalculateTotalCost]
  );

  const fetchHazardousForContainer = useCallback(
    async (containerId) => {
      if (!clientId || !pickup || !dropoff) return;
      try {
        const ratesData = await fetchRatesService(clientId, pickup, dropoff);
        const amount = ratesData?.hazardous || 0;
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId
              ? { ...c, hazardousAmount: Number(amount) }
              : c
          )
        );
        setTimeout(() => onRecalculateTotalCost?.(), 0);
      } catch (error) {
        console.error("[useContainerManagement] Error fetching hazardous amount:", error);
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId ? { ...c, hazardousAmount: 0 } : c
          )
        );
      }
    },
    [clientId, pickup, dropoff, setContainersAndRef, onRecalculateTotalCost]
  );

  const fetchVgmForContainer = useCallback(
    async (containerId) => {
      if (!clientId || !pickup || !dropoff) return;
      try {
        const ratesData = await fetchRatesService(clientId, pickup, dropoff);
        const amount = ratesData?.vgm || 0;
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId ? { ...c, vgmAmount: Number(amount) } : c
          )
        );
        onRecalculateTotalCost?.();
      } catch (error) {
        console.error("[useContainerManagement] Error fetching VGM amount:", error);
        setContainersAndRef((prev) =>
          prev.map((c) =>
            c.id === containerId ? { ...c, vgmAmount: 0 } : c
          )
        );
      }
    },
    [clientId, pickup, dropoff, setContainersAndRef, onRecalculateTotalCost]
  );

  // ── changeContainersType ────────────────────────────────────────────────────
  // Switch one or more containers to a new type in place, preserving each row's
  // data (number, weight, cargo, hazardous, VGM) and its stable id. Counts are
  // re-derived from the rows. Shared by the per-row type dropdown and the
  // multi-select "set selected to type" action.

  const changeContainersType = useCallback(
    (ids, newType) => {
      if (isReadOnly) return;
      if (!CONTAINER_TYPES.includes(newType)) return;
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      if (idSet.size === 0) return;
      const surchargedIds = [];
      setContainersAndRef((prev) => {
        const next = prev.map((c) => {
          if (!idSet.has(c.id)) return c;
          if (c.addSurcharges) surchargedIds.push(c.id);
          return {
            ...c,
            containerType: newType,
            // 12m surcharge only applies to 12m rows; re-fetched below if needed
            is_12m_surcharge: newType === "12m" ? c.is_12m_surcharge : false,
            surcharge_12m_amount: newType === "12m" ? c.surcharge_12m_amount : 0,
          };
        });
        onUpdateFormCounts?.(deriveCounts(next));
        return next;
      });
      setIsContainerDataModified(true);
      // Surcharge amounts can differ by type, so re-fetch affected surcharged
      // rows; otherwise just recalculate the total.
      if (surchargedIds.length > 0) {
        surchargedIds.forEach((cid) => fetchSurchargeForContainer(cid));
      } else {
        onRecalculateTotalCost?.();
      }
    },
    [
      isReadOnly, setContainersAndRef, onUpdateFormCounts,
      fetchSurchargeForContainer, onRecalculateTotalCost,
    ]
  );

  // ── handleContainerChange ───────────────────────────────────────────────────

  const handleContainerChange = useCallback(
    async (id, field, value) => {
      // Normalize field name alias
      if (field === "file_ref") field = "fileRef";

      // ── containerNum validation ──
      if (field === "containerNum") {
        if (value.length > 20) return;
        let newValue = "";
        for (const char of value) {
          if (/^[a-zA-Z0-9]$/.test(char)) newValue += char;
        }
        if (newValue !== value) return;
        clearContainerFieldError(id, "container");
      }

      // ── fileRef ──
      if (field === "fileRef") {
        if (value.length > 20) return;
        setContainersAndRef((prev) =>
          prev.map((c) => (c.id === id ? { ...c, fileRef: value } : c))
        );
        setIsContainerDataModified(true);
        return;
      }

      // ── weight sanitization ──
      if (field === "weight") {
        clearContainerFieldError(id, "weight");
        const needsWeight =
          isImport ||
          String(shipmentTypeId) === "2" ||
          String(shipmentTypeId) === "3";
        if (!needsWeight) return;

        let sanitized = "";
        if (value && value.trim() !== "") {
          if (/^[0-9]*\.?[0-9]*$/.test(value.trim())) {
            const num = parseFloat(value.trim());
            sanitized = !isNaN(num) && num >= 0 ? num : value;
          } else {
            return; // invalid format
          }
        }
        setContainersAndRef((prev) =>
          prev.map((c) => (c.id === id ? { ...c, weight: sanitized } : c))
        );
        setIsContainerDataModified(true);
        return;
      }

      // ── checkbox fields (hazardous, addSurcharges, vgm) ──
      if (field === "hazardous" || field === "addSurcharges" || field === "vgm") {
        if (field === "addSurcharges") {
          if (value) {
            setContainersAndRef((prev) =>
              prev.map((c) => (c.id === id ? { ...c, addSurcharges: true } : c))
            );
            fetchSurchargeForContainer(id);
          } else {
            setContainersAndRef((prev) =>
              prev.map((c) =>
                c.id === id
                  ? { ...c, addSurcharges: false, surchargeAmount: 0, is_12m_surcharge: false, surcharge_12m_amount: 0 }
                  : c
              )
            );
            onRecalculateTotalCost?.();
          }
        } else if (field === "hazardous") {
          if (value) {
            try {
              const ratesData = await fetchRatesService(clientId, pickup, dropoff);
              const amount = ratesData?.hazardous || 0;
              setContainersAndRef((prev) =>
                prev.map((c) =>
                  c.id === id ? { ...c, hazardous: true, hazardousAmount: Number(amount) } : c
                )
              );
              setTimeout(() => onRecalculateTotalCost?.(), 0);
            } catch {
              setContainersAndRef((prev) =>
                prev.map((c) => (c.id === id ? { ...c, hazardous: true, hazardousAmount: 0 } : c))
              );
            }
          } else {
            setContainersAndRef((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, hazardous: false, hazardousAmount: 0 } : c
              )
            );
            onRecalculateTotalCost?.();
          }
        } else if (field === "vgm") {
          if (value) {
            setContainersAndRef((prev) =>
              prev.map((c) => (c.id === id ? { ...c, vgm: true } : c))
            );
            fetchVgmForContainer(id);
          } else {
            setContainersAndRef((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, vgm: false, vgmAmount: 0 } : c
              )
            );
            onRecalculateTotalCost?.();
          }
        }
        setIsContainerDataModified(true);
        return;
      }

      // ── containerType (in-place 6m ↔ 12m ↔ Abnormal switch) ──
      // Delegates to the batch helper so single-row and multi-row (mass edit)
      // switches share one code path.
      if (field === "containerType") {
        changeContainersType([id], value);
        return;
      }

      // ── default field update ──
      setContainersAndRef((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
      setIsContainerDataModified(true);
    },
    [
      isImport, shipmentTypeId, clientId, pickup, dropoff,
      clearContainerFieldError, setContainersAndRef,
      fetchSurchargeForContainer, fetchVgmForContainer,
      changeContainersType, onRecalculateTotalCost,
    ]
  );

  // ── validateContainerUniqueness ─────────────────────────────────────────────

  const validateContainerUniqueness = useCallback(() => {
    if (isAddOn) return true;
    const nums = containersRef.current
      .map((c) => c.containerNum)
      .filter((n) => n.trim() !== "");
    const unique = new Set(nums);
    return nums.length === unique.size;
  }, [isAddOn]);

  // ── Delete flow ─────────────────────────────────────────────────────────────

  const handleRequestDeleteContainer = useCallback(
    async (container) => {
      if (isReadOnly) return;
      try {
        let hasLegs = false;
        if (instructionId && container.containerNum) {
          const legsData = await checkContainerLegsExistService(instructionId, container.containerNum);
          hasLegs = Boolean(legsData?.hasLegs);
        }
        const message = hasLegs
          ? "This container currently has legs assigned. Deleting this container will also remove all associated assignments. Are you sure you want to continue?"
          : "Are you sure you want to delete this container?";
        setContainerToDelete(container);
        onRequestConfirmation?.(message);
      } catch (error) {
        console.error("[useContainerManagement] Error checking container legs:", error);
        onError?.("Failed to verify container assignments before delete. Please try again.");
      }
    },
    [isReadOnly, instructionId, onRequestConfirmation, onError]
  );

  const confirmDeleteContainer = useCallback(() => {
    if (!containerToDelete) return;
    setContainersAndRef((prev) => {
      const updated = prev.filter((c) => c.id !== containerToDelete.id);
      onUpdateFormCounts?.(deriveCounts(updated));
      return updated;
    });
    setIsContainerDataModified(true);
    setContainerToDelete(null);
  }, [containerToDelete, setContainersAndRef, onUpdateFormCounts]);

  const cancelDeleteContainer = useCallback(() => {
    setContainerToDelete(null);
  }, []);

  return {
    containers,
    setContainers: setContainersAndRef,
    containersRef,
    containerFieldErrors,
    setContainerFieldErrors,
    isContainerLoading,
    setIsContainerLoading,
    isContainerDataModified,
    setIsContainerDataModified,
    containerSuccessMessage,
    setContainerSuccessMessage,
    containerToDelete,
    initializeContainers,
    handleContainerChange,
    changeContainersType,
    validateContainerUniqueness,
    handleRequestDeleteContainer,
    confirmDeleteContainer,
    cancelDeleteContainer,
  };
}
