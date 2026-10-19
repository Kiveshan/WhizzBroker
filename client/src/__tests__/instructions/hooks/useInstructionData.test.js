/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInstructionData } from "../../../hooks/useInstructionData";

jest.mock("../../../services/instructionService", () => ({
  fetchClients: jest.fn(),
  fetchShipmentTypes: jest.fn(),
  fetchRateTitles: jest.fn(),
  fetchInstruction: jest.fn(),
}));

import {
  fetchClients,
  fetchShipmentTypes,
  fetchRateTitles,
  fetchInstruction,
} from "../../../services/instructionService";

const CLIENTS = [{ m5clientkey: 1, name: "ACME" }];
const SHIPMENT_TYPES = [{ shipkey: 1, shipmenttype: "Import" }];
const RATE_TITLES = [
  { title: "DBN-JHB Express", starting_point: "Durban", destination: "Johannesburg", rate_source: "client" },
  { title: "Local delivery", starting_point: null, destination: null, rate_source: "card" },
];

function defaultMocks() {
  fetchClients.mockResolvedValue(CLIENTS);
  fetchShipmentTypes.mockResolvedValue(SHIPMENT_TYPES);
  fetchRateTitles.mockResolvedValue(RATE_TITLES);
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

// ── Client rates ─────────────────────────────────────────────────────────────

describe("client rates", () => {
  it("fetches the client's rates when clientId is provided", async () => {
    const { result } = renderHook(() => useInstructionData({ clientId: "1" }));
    await waitFor(() => expect(result.current.rateOptions).toEqual(RATE_TITLES));
    expect(fetchRateTitles).toHaveBeenCalledWith("1");
  });

  it("does NOT fetch rates when clientId is empty", async () => {
    const { result } = renderHook(() => useInstructionData({ clientId: "" }));
    await waitFor(() => expect(result.current.isLoadingComplete).toBe(true));
    expect(fetchRateTitles).not.toHaveBeenCalled();
    expect(result.current.rateOptions).toEqual([]);
  });

  it("calls on404 when the client has no rates", async () => {
    fetchRateTitles.mockResolvedValue([]);
    const on404 = jest.fn();
    renderHook(() => useInstructionData({ clientId: "1", on404 }));
    await waitFor(() => expect(on404).toHaveBeenCalledTimes(1));
  });

  it("calls onError when the rate fetch fails", async () => {
    fetchRateTitles.mockRejectedValue(new Error("boom"));
    const onError = jest.fn();
    const { result } = renderHook(() => useInstructionData({ clientId: "1", onError }));
    await waitFor(() => expect(result.current.isLoading.rateOptions).toBe(false));
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("rates"));
    expect(result.current.rateOptions).toEqual([]);
  });
});

// ── Rate mismatch detection ──────────────────────────────────────────────────

describe("rate mismatch detection", () => {
  it("stays editable when the instruction's title is on the client's rates", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", rateTitle: "DBN-JHB Express" })
    );
    await waitFor(() => expect(result.current.rateOptions.length).toBe(2));
    expect(result.current.hasRouteMismatch).toBe(false);
    expect(result.current.routeEditMode).toBe("editable");
  });

  it("locks when the title is no longer on the client's rates", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", rateTitle: "Renamed rate" })
    );
    await waitFor(() => expect(result.current.routeEditMode).toBe("locked"));
    expect(result.current.hasRouteMismatch).toBe(true);
  });

  it("locks an older instruction priced by route with no title", async () => {
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", rateTitle: "", pickup: "Cape Town", dropoff: "Durban" })
    );
    await waitFor(() => expect(result.current.routeEditMode).toBe("locked"));
    expect(result.current.hasRouteMismatch).toBe(true);
  });

  it("stays editable for a new instruction with nothing chosen yet", async () => {
    const { result } = renderHook(() => useInstructionData({ clientId: "1" }));
    await waitFor(() => expect(result.current.rateOptions.length).toBe(2));
    expect(result.current.routeEditMode).toBe("editable");
  });
});

// ── Title sync ───────────────────────────────────────────────────────────────

describe("title sync", () => {
  it("syncs the title's capitalisation/spacing to the client's rate", async () => {
    const onFormUpdate = jest.fn();
    renderHook(() =>
      useInstructionData({ clientId: "1", rateTitle: "dbn-jhb  express", onFormUpdate })
    );
    await waitFor(() =>
      expect(onFormUpdate).toHaveBeenCalledWith({ rate_title: "DBN-JHB Express" })
    );
  });

  it("does not sync when the title already matches exactly", async () => {
    const onFormUpdate = jest.fn();
    const { result } = renderHook(() =>
      useInstructionData({ clientId: "1", rateTitle: "Local delivery", onFormUpdate })
    );
    await waitFor(() => expect(result.current.rateOptions.length).toBe(2));
    expect(onFormUpdate).not.toHaveBeenCalled();
  });
});

// ── Instruction record ───────────────────────────────────────────────────────

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
