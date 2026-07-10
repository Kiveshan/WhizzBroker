/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInstructionData } from "../../../hooks/useInstructionData";

jest.mock("../../../services/instructionService", () => ({
  fetchClients: jest.fn(),
  fetchShipmentTypes: jest.fn(),
  fetchStartingPoints: jest.fn(),
  fetchDestinations: jest.fn(),
  fetchInstruction: jest.fn(),
}));

import {
  fetchClients,
  fetchShipmentTypes,
  fetchStartingPoints,
  fetchDestinations,
  fetchInstruction,
} from "../../../services/instructionService";

const CLIENTS = [{ m5clientkey: 1, name: "ACME" }];
const SHIPMENT_TYPES = [{ shipkey: 1, shipmenttype: "Import" }];
const STARTING_POINTS_RAW = [{ starting_point: "Cape Town" }];
const DESTINATIONS_RAW = [{ destination: "Durban" }];

function defaultMocks() {
  fetchClients.mockResolvedValue(CLIENTS);
  fetchShipmentTypes.mockResolvedValue(SHIPMENT_TYPES);
  fetchStartingPoints.mockResolvedValue(STARTING_POINTS_RAW);
  fetchDestinations.mockResolvedValue(DESTINATIONS_RAW);
  fetchInstruction.mockResolvedValue(null);
}

beforeEach(() => {
  jest.clearAllMocks();
  defaultMocks();
});

// ── Base data loading ────────────────────────────────────────────────────────

describe("base data loading", () => {
  it("fetches clients and shipmentTypes on mount and sets isLoadingComplete", async () => {
    const { result } = renderHook(() => useInstructionData());
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(result.current.clients).toEqual(CLIENTS);
    expect(result.current.shipmentTypes).toEqual(SHIPMENT_TYPES);
    expect(fetchClients).toHaveBeenCalledTimes(1);
    expect(fetchShipmentTypes).toHaveBeenCalledTimes(1);
  });

  it("calls onError when base fetch fails", async () => {
    fetchClients.mockRejectedValue(new Error("Network error"));
    const onError = jest.fn();
    const { result } = renderHook(() => useInstructionData({ onError }));
    await waitFor(() => expect(result.current.isLoading.clients).toBe(false));
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Failed to load initial data"));
    expect(result.current.clients).toEqual([]);
  });
});

// ── Starting points ──────────────────────────────────────────────────────────

describe("starting points", () => {
  it("fetches starting points when clientId is provided", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "", dropoff: "" })
    );
    await waitFor(() => expect(result.current.isLoading.startingPoints).toBe(false));
    expect(fetchStartingPoints).toHaveBeenCalledWith("1");
    expect(result.current.startingPoints).toEqual([
      { id: "point-0", startingpoint: "Cape Town" },
    ]);
  });

  it("does NOT fetch starting points when clientId is empty", async () => {
    const { result } = renderHook(() => useInstructionData({ clientId: "" }));
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(fetchStartingPoints).not.toHaveBeenCalled();
    expect(result.current.startingPoints).toEqual([]);
  });

  it("auto-selects pickup when only one starting point and pickup is empty", async () => {
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "", dropoff: "", onFormUpdate })
    );
    await waitFor(() => expect(onFormUpdate).toHaveBeenCalled());
    expect(onFormUpdate).toHaveBeenCalledWith({ pickup: "Cape Town" });
  });

  it("does NOT auto-select pickup when pickup is already set", async () => {
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "Cape Town", dropoff: "", onFormUpdate })
    );
    await waitFor(() => expect(fetchStartingPoints).toHaveBeenCalled());
    // Give time for any spurious calls
    await new Promise((r) => setTimeout(r, 50));
    expect(onFormUpdate).not.toHaveBeenCalledWith({ pickup: expect.anything() });
  });

  it("calls on404 when starting-points returns 404", async () => {
    fetchStartingPoints.mockRejectedValue({ response: { status: 404 } });
    const on404 = jest.fn();
    renderHook(() => useInstructionData({ clientId: "1", on404 }));
    await waitFor(() => expect(on404).toHaveBeenCalledTimes(1));
  });

  it("calls onError (not on404) for non-404 failures", async () => {
    fetchStartingPoints.mockRejectedValue(new Error("500"));
    const onError = jest.fn();
    const on404 = jest.fn();
    renderHook(() => useInstructionData({ clientId: "1", onError, on404 }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(on404).not.toHaveBeenCalled();
  });
});

// ── Destinations ─────────────────────────────────────────────────────────────

describe("destinations", () => {
  it("fetches destinations when clientId and pickup are provided", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "Cape Town", dropoff: "" })
    );
    await waitFor(() => expect(result.current.isLoading.destinations).toBe(false));
    expect(fetchDestinations).toHaveBeenCalledWith("1", "Cape Town");
    expect(result.current.destinations).toEqual([
      { id: "Durban", destination: "Durban" },
    ]);
  });

  it("does NOT fetch destinations when pickup is empty", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "", dropoff: "" })
    );
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(fetchDestinations).not.toHaveBeenCalled();
  });

  it("auto-selects dropoff when only one destination and dropoff is empty", async () => {
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "Cape Town", dropoff: "", onFormUpdate })
    );
    await waitFor(() => expect(onFormUpdate).toHaveBeenCalledWith({ dropoff: "Durban" }));
  });

  it("does NOT auto-select dropoff when dropoff is already set", async () => {
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({
        clientId: "1",
        pickup: "Cape Town",
        dropoff: "Durban",
        onFormUpdate,
      })
    );
    await waitFor(() => expect(fetchDestinations).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(onFormUpdate).not.toHaveBeenCalledWith({ dropoff: expect.anything() });
  });
});

// ── Route mismatch ───────────────────────────────────────────────────────────

describe("route mismatch detection", () => {
  it("sets hasRouteMismatch=true and routeEditMode=locked when destinations empty", async () => {
    fetchDestinations.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "Cape Town", dropoff: "" })
    );
    await waitFor(() => expect(result.current.isLoading.destinations).toBe(false));
    expect(result.current.hasRouteMismatch).toBe(true);
    expect(result.current.routeEditMode).toBe("locked");
  });

  it("clears hasRouteMismatch when destinations are found", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", pickup: "Cape Town", dropoff: "" })
    );
    await waitFor(() => expect(result.current.isLoading.destinations).toBe(false));
    expect(result.current.hasRouteMismatch).toBe(false);
    expect(result.current.routeEditMode).toBe("editable");
  });
});

// ── Route sync ───────────────────────────────────────────────────────────────

describe("pickup route-sync", () => {
  it("syncs pickup when API renames it (fuzzy match)", async () => {
    fetchStartingPoints.mockResolvedValue([{ starting_point: "Cape Town Port" }]);
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({
        clientId: "1",
        pickup: "Cape Town", // stale name
        dropoff: "Durban",
        onFormUpdate,
      })
    );
    await waitFor(() =>
      expect(onFormUpdate).toHaveBeenCalledWith({ pickup: "Cape Town Port" })
    );
  });

  it("skips pickup sync when routeEditMode is locked", async () => {
    fetchDestinations.mockResolvedValue([]); // triggers mismatch → locked
    fetchStartingPoints.mockResolvedValue([{ starting_point: "Cape Town Port" }]);
    const onFormUpdate = jest.fn();
    const { result } = renderHook(() =>
      useInstructionData({
        clientId: "1",
        pickup: "Cape Town",
        dropoff: "Durban",
        onFormUpdate,
      })
    );
    await waitFor(() => expect(result.current.routeEditMode).toBe("locked"));
    // After lock, sync should NOT have fired for pickup
    const pickupUpdates = onFormUpdate.mock.calls.filter(
      ([arg]) => arg && "pickup" in arg
    );
    expect(pickupUpdates).toHaveLength(0);
  });
});

describe("dropoff route-sync", () => {
  it("syncs dropoff when API renames it (fuzzy match)", async () => {
    fetchDestinations.mockResolvedValue([{ destination: "Durban Harbour" }]);
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({
        clientId: "1",
        pickup: "Cape Town",
        dropoff: "Durban", // stale name
        onFormUpdate,
      })
    );
    await waitFor(() =>
      expect(onFormUpdate).toHaveBeenCalledWith({ dropoff: "Durban Harbour" })
    );
  });
});

// ── fetchExisting (update form) ───────────────────────────────────────────────

describe("fetchExisting — instruction record", () => {
  it("returns null instructionRecord when fetchExisting=false", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ fetchExisting: false, instructionId: "99" })
    );
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(fetchInstruction).not.toHaveBeenCalled();
    expect(result.current.instructionRecord).toBeNull();
  });

  it("fetches and returns instructionRecord when fetchExisting=true", async () => {
    const record = { id: 99, pickup: "Cape Town" };
    fetchInstruction.mockResolvedValue(record);
    const { result } = renderHook(() =>
      useInstructionData({ fetchExisting: true, instructionId: "99" })
    );
    await waitFor(() => expect(result.current.instructionRecord).toEqual(record));
    expect(fetchInstruction).toHaveBeenCalledWith("99");
  });

  it("calls onError when instruction fetch fails", async () => {
    fetchInstruction.mockRejectedValue(new Error("404"));
    const onError = jest.fn();
    renderHook(() =>
      useInstructionData({ fetchExisting: true, instructionId: "99", onError })
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load instruction data")
    );
  });
});

// ── isLoadingComplete ─────────────────────────────────────────────────────────

describe("isLoadingComplete", () => {
  it("is false while any loading flag is true", async () => {
    // Delay resolution to catch the loading state
    fetchClients.mockImplementation(() => new Promise((r) => setTimeout(() => r(CLIENTS), 50)));
    const { result } = renderHook(() => useInstructionData());
    expect(result.current.isLoadingComplete).toBe(false);
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
  });

  it("instruction flag contributes when fetchExisting=true", async () => {
    fetchInstruction.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ id: 1 }), 50))
    );
    const { result } = renderHook(() =>
      useInstructionData({ fetchExisting: true, instructionId: "1" })
    );
    // Should not be complete until instruction loads
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(result.current.instructionRecord).toEqual({ id: 1 });
  });
});

// ── refetch ───────────────────────────────────────────────────────────────────

describe("refetch", () => {
  it("re-fetches clients and shipmentTypes when called", async () => {
    const { result } = renderHook(() => useInstructionData());
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));

    fetchClients.mockClear();
    fetchShipmentTypes.mockClear();

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(fetchClients).toHaveBeenCalledTimes(1));
    expect(fetchShipmentTypes).toHaveBeenCalledTimes(1);
  });
});
