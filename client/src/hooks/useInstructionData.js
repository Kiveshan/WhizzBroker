/**
 * useInstructionData — data-fetching lifecycle for both instruction forms.
 *
 * Manages: clients, shipment types, the selected client's rates (one per
 * title, for the Rate dropdown), and optionally an existing instruction
 * record (update form only). Also owns rate-mismatch detection: an existing
 * instruction whose rate title is no longer on the client's rates (or an
 * older instruction priced by route, with no title) starts locked.
 *
 * @param {object} options
 * @param {boolean} [options.fetchExisting=false]   – fetch instruction on mount (update form)
 * @param {string}  [options.instructionId]         – required when fetchExisting=true
 * @param {string}  [options.clientId=""]           – reactive: re-fetches when changed
 * @param {string}  [options.rateTitle=""]          – the instruction's rate title
 * @param {string}  [options.pickup=""]             – route of an older instruction without a title
 * @param {string}  [options.dropoff=""]
 * @param {function} [options.onFormUpdate]         – (partialFormData) => void
 *                                                     called when the hook syncs a title's
 *                                                     capitalisation to the client's rate.
 * @param {function} [options.onError]              – (message: string) => void
 *                                                     called on any fetch failure.
 * @param {function} [options.on404]                – () => void
 *                                                     called when the client has no rates.
 *
 * @returns {{
 *   clients:          object[],
 *   shipmentTypes:    object[],
 *   rateOptions:      { title, starting_point, destination, rate_source, rate_card_name }[],
 *   instructionRecord: object | null,   // raw API data for update form
 *   isLoading:        { clients: boolean, shipmentTypes: boolean, rateOptions: boolean, instruction: boolean },
 *   isLoadingComplete: boolean,
 *   hasRouteMismatch:    boolean,
 *   setHasRouteMismatch: function,
 *   routeEditMode:      "editable" | "locked",
 *   setRouteEditMode:   function,
 *   refetch:          () => void,
 * }}
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchClients,
  fetchShipmentTypes,
  fetchRateTitles,
  fetchInstruction,
} from "../services/instructionService.js";

export function useInstructionData({
  fetchExisting = false,
  instructionId = null,
  clientId = "",
  rateTitle = "",
  pickup = "",
  dropoff = "",
  onFormUpdate = null,
  onError = null,
  on404 = null,
} = {}) {
  const [clients, setClients] = useState([]);
  const [shipmentTypes, setShipmentTypes] = useState([]);
  const [rateOptions, setRateOptions] = useState([]);
  const [instructionRecord, setInstructionRecord] = useState(null);

  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    rateOptions: false,
    instruction: fetchExisting && !!instructionId,
  });

  const [hasRouteMismatch, setHasRouteMismatch] = useState(false);
  const [routeEditMode, setRouteEditMode] = useState("editable");

  // Stable refs so callbacks never cause effect re-fires
  const onFormUpdateRef = useRef(onFormUpdate);
  const onErrorRef = useRef(onError);
  const on404Ref = useRef(on404);
  useEffect(() => { onFormUpdateRef.current = onFormUpdate; }, [onFormUpdate]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { on404Ref.current = on404; }, [on404]);

  // ── Clients + shipment types (once on mount) ──────────────────────────────

  const fetchBaseData = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, clients: true, shipmentTypes: true }));
    try {
      const [clientsData, shipmentTypesData] = await Promise.all([
        fetchClients(),
        fetchShipmentTypes(),
      ]);
      setClients(clientsData);
      setShipmentTypes(shipmentTypesData);
    } catch (error) {
      console.error("[useInstructionData] Error fetching base data:", error);
      onErrorRef.current?.("Failed to load initial data. Please try again.");
      setClients([]);
      setShipmentTypes([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, clients: false, shipmentTypes: false }));
    }
  }, []);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // ── Existing instruction (update form only) ──────────────────────────────

  useEffect(() => {
    if (!fetchExisting || !instructionId) {
      setIsLoading((prev) => ({ ...prev, instruction: false }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading((prev) => ({ ...prev, instruction: true }));
      try {
        const data = await fetchInstruction(instructionId);
        if (!cancelled) setInstructionRecord(data);
      } catch (error) {
        console.error("[useInstructionData] Error fetching instruction:", error);
        if (!cancelled) {
          onErrorRef.current?.("Failed to load instruction data. Please try again.");
        }
      } finally {
        if (!cancelled) setIsLoading((prev) => ({ ...prev, instruction: false }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchExisting, instructionId]);

  // ── Client rates (reactive on clientId) ──────────────────────────────────

  useEffect(() => {
    if (!clientId) {
      setRateOptions([]);
      setIsLoading((prev) => ({ ...prev, rateOptions: false }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading((prev) => ({ ...prev, rateOptions: true }));
      try {
        const raw = await fetchRateTitles(clientId);
        if (cancelled) return;
        const options = Array.isArray(raw) ? raw.filter((r) => r && r.title) : [];
        setRateOptions(options);
        if (options.length === 0) on404Ref.current?.();
      } catch (error) {
        console.error("[useInstructionData] Error fetching client rates:", error);
        if (!cancelled) {
          onErrorRef.current?.("Failed to fetch the client's rates. Please try again.");
          setRateOptions([]);
        }
      } finally {
        if (!cancelled) setIsLoading((prev) => ({ ...prev, rateOptions: false }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [clientId]);

  // ── Rate mismatch detection ──────────────────────────────────────────────
  // Lock when the instruction's rate can't be picked from the client's current
  // rates: its title was renamed/removed, or it is an older instruction priced
  // by route with no title. Unlocking (confirmed by the user) lets them choose.

  const titleKey = (t) => String(t ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  useEffect(() => {
    if (isLoading.rateOptions || !clientId) return;
    const matched = rateTitle && rateOptions.some((r) => titleKey(r.title) === titleKey(rateTitle));
    const legacyRouteOnly = !rateTitle && pickup && dropoff;
    if ((rateTitle && !matched) || legacyRouteOnly) {
      setHasRouteMismatch(true);
      setRouteEditMode("locked");
    } else {
      setHasRouteMismatch(false);
      setRouteEditMode("editable");
    }
  // Only re-evaluate when the rate list loads or the client changes; once the
  // user unlocks, choosing a rate must not re-lock it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading.rateOptions, rateOptions, clientId]);

  // ── Title sync (same rate, different capitalisation/spacing) ─────────────

  useEffect(() => {
    if (routeEditMode === "locked" || !rateTitle) return;
    const match = rateOptions.find((r) => titleKey(r.title) === titleKey(rateTitle));
    if (match && match.title !== rateTitle) {
      onFormUpdateRef.current?.({ rate_title: match.title });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateOptions, rateTitle, routeEditMode]);

  // ── isLoadingComplete ─────────────────────────────────────────────────────

  const isLoadingComplete =
    !isLoading.clients &&
    !isLoading.shipmentTypes &&
    !isLoading.rateOptions &&
    !isLoading.instruction;

  // ── refetch ───────────────────────────────────────────────────────────────

  const refetch = useCallback(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  return {
    clients,
    shipmentTypes,
    rateOptions,
    instructionRecord,
    isLoading,
    isLoadingComplete,
    hasRouteMismatch,
    setHasRouteMismatch,
    routeEditMode,
    setRouteEditMode,
    refetch,
  };
}
