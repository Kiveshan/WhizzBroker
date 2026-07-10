/**
 * useInstructionData — data-fetching lifecycle for both instruction forms.
 *
 * Manages: clients, shipment types, starting points, destinations, and
 * optionally an existing instruction record (update form only).
 * Also owns route-mismatch detection and route-sync side effects.
 *
 * @param {object} options
 * @param {boolean} [options.fetchExisting=false]   – fetch instruction on mount (update form)
 * @param {string}  [options.instructionId]         – required when fetchExisting=true
 * @param {string}  [options.clientId=""]           – reactive: re-fetches when changed
 * @param {string}  [options.pickup=""]             – reactive: re-fetches destinations when changed
 * @param {string}  [options.dropoff=""]            – used for auto-select + route sync
 * @param {function} [options.onFormUpdate]         – (partialFormData) => void
 *                                                     called when hook auto-selects a single
 *                                                     option or syncs a renamed route value.
 * @param {function} [options.onError]              – (message: string) => void
 *                                                     called on any fetch failure.
 * @param {function} [options.on404]                – () => void
 *                                                     called when starting-points returns 404
 *                                                     (create form: show "no rates" modal).
 *
 * @returns {{
 *   clients:          object[],
 *   shipmentTypes:    object[],
 *   startingPoints:   { id: string, startingpoint: string }[],
 *   destinations:     { id: string, destination: string }[],
 *   instructionRecord: object | null,   // raw API data for update form
 *   isLoading:        { clients: boolean, shipmentTypes: boolean, startingPoints: boolean, destinations: boolean, instruction: boolean },
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
  fetchStartingPoints,
  fetchDestinations,
  fetchInstruction,
} from "../services/instructionService.js";

export function useInstructionData({
  fetchExisting = false,
  instructionId = null,
  clientId = "",
  pickup = "",
  dropoff = "",
  onFormUpdate = null,
  onError = null,
  on404 = null,
} = {}) {
  const [clients, setClients] = useState([]);
  const [shipmentTypes, setShipmentTypes] = useState([]);
  const [startingPoints, setStartingPoints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [instructionRecord, setInstructionRecord] = useState(null);

  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: false,
    destinations: false,
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

  // ── Starting points (reactive on clientId) ───────────────────────────────

  useEffect(() => {
    if (!clientId) {
      setStartingPoints([]);
      setIsLoading((prev) => ({ ...prev, startingPoints: false }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading((prev) => ({ ...prev, startingPoints: true }));
      try {
        const raw = await fetchStartingPoints(clientId);
        const formatted = Array.isArray(raw)
          ? raw
              .map((point, index) => ({
                id: point.id || `point-${index}`,
                startingpoint:
                  point.starting_point || point.startingpoint || String(point),
              }))
              .filter((p) => p.startingpoint)
          : [];
        if (cancelled) return;
        setStartingPoints(formatted);
        // Auto-select single option when pickup is not yet set
        if (formatted.length === 1 && !pickup) {
          onFormUpdateRef.current?.({ pickup: formatted[0].startingpoint });
        }
      } catch (error) {
        console.error("[useInstructionData] Error fetching starting points:", error);
        if (!cancelled) {
          if (error.response?.status === 404) {
            on404Ref.current?.();
          } else {
            onErrorRef.current?.("Failed to fetch starting points. Please try again.");
          }
          setStartingPoints([]);
        }
      } finally {
        if (!cancelled) setIsLoading((prev) => ({ ...prev, startingPoints: false }));
      }
    };
    load();
    return () => { cancelled = true; };
  // pickup intentionally NOT in deps: auto-select reads snapshot at fetch time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ── Destinations (reactive on clientId + pickup) ─────────────────────────

  useEffect(() => {
    if (!clientId || !pickup) {
      setDestinations([]);
      setIsLoading((prev) => ({ ...prev, destinations: false }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading((prev) => ({ ...prev, destinations: true }));
      try {
        const raw = await fetchDestinations(clientId, pickup);
        const formatted = Array.isArray(raw)
          ? raw.map((dest) => ({
              id: dest.id || dest.destination,
              destination: dest.destination || String(dest),
            }))
          : [];
        if (cancelled) return;
        setDestinations(formatted);
        // Auto-select single option when dropoff is not yet set
        if (formatted.length === 1 && !dropoff) {
          onFormUpdateRef.current?.({ dropoff: formatted[0].destination });
        }
      } catch (error) {
        console.error("[useInstructionData] Error fetching destinations:", error);
        if (!cancelled) {
          onErrorRef.current?.("Failed to fetch destinations. Please try again.");
          setDestinations([]);
        }
      } finally {
        if (!cancelled) setIsLoading((prev) => ({ ...prev, destinations: false }));
      }
    };
    load();
    return () => { cancelled = true; };
  // dropoff intentionally NOT in deps: auto-select reads snapshot at fetch time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, pickup]);

  // ── Route mismatch detection ─────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading.destinations && clientId && pickup && destinations.length === 0) {
      console.log("[useInstructionData] Route mismatch detected:", { clientId, pickup });
      setHasRouteMismatch(true);
      setRouteEditMode("locked");
    } else if (!isLoading.destinations && destinations.length > 0) {
      setHasRouteMismatch(false);
      setRouteEditMode("editable");
    }
  }, [isLoading.destinations, destinations.length, clientId, pickup]);

  // ── Pickup route-sync (fuzzy match after API rename) ─────────────────────

  useEffect(() => {
    if (routeEditMode === "locked") return;
    if (!isLoading.startingPoints && startingPoints.length > 0 && pickup) {
      const exactMatch = startingPoints.find((p) => p.startingpoint === pickup);
      if (!exactMatch) {
        const fuzzyMatch = startingPoints.find(
          (p) =>
            p.startingpoint.toLowerCase().includes(pickup.toLowerCase()) ||
            pickup.toLowerCase().includes(p.startingpoint.toLowerCase())
        );
        if (fuzzyMatch) {
          console.log(
            `[useInstructionData] Syncing pickup "${pickup}" → "${fuzzyMatch.startingpoint}"`
          );
          onFormUpdateRef.current?.({ pickup: fuzzyMatch.startingpoint });
        }
      }
    }
  }, [isLoading.startingPoints, startingPoints, pickup, routeEditMode]);

  // ── Dropoff route-sync (fuzzy match after API rename) ────────────────────

  useEffect(() => {
    if (routeEditMode === "locked") return;
    if (!isLoading.destinations && destinations.length > 0 && dropoff) {
      const exactMatch = destinations.find((d) => d.destination === dropoff);
      if (!exactMatch) {
        const fuzzyMatch = destinations.find(
          (d) =>
            d.destination.toLowerCase().includes(dropoff.toLowerCase()) ||
            dropoff.toLowerCase().includes(d.destination.toLowerCase())
        );
        if (fuzzyMatch) {
          console.log(
            `[useInstructionData] Syncing dropoff "${dropoff}" → "${fuzzyMatch.destination}"`
          );
          onFormUpdateRef.current?.({ dropoff: fuzzyMatch.destination });
        }
      }
    }
  }, [isLoading.destinations, destinations, dropoff, routeEditMode]);

  // ── isLoadingComplete ─────────────────────────────────────────────────────

  const isLoadingComplete =
    !isLoading.clients &&
    !isLoading.shipmentTypes &&
    !isLoading.startingPoints &&
    !isLoading.destinations &&
    !isLoading.instruction;

  // ── refetch ───────────────────────────────────────────────────────────────

  const refetch = useCallback(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  return {
    clients,
    shipmentTypes,
    startingPoints,
    destinations,
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
