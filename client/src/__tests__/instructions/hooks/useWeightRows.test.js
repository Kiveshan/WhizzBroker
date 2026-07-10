/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useWeightRows } from "../../../hooks/useWeightRows";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWeightHook() {
  return renderHook(() => useWeightRows());
}

const BLANK_ROW = { ksmDmNo: "", ticketNo: "", receiptBookNo: "", weight: "" };

// ── Initial state ─────────────────────────────────────────────────────────────

describe("initial state", () => {
  it("weightRows starts empty", () => {
    const { result } = renderWeightHook();
    expect(result.current.weightRows).toEqual([]);
  });

  it("weightRowToDelete starts null", () => {
    const { result } = renderWeightHook();
    expect(result.current.weightRowToDelete).toBeNull();
  });

  it("weightRowsRef starts as empty array", () => {
    const { result } = renderWeightHook();
    expect(result.current.weightRowsRef.current).toEqual([]);
  });
});

// ── addWeightRow ──────────────────────────────────────────────────────────────

describe("addWeightRow", () => {
  it("adds a blank row with id=1 to an empty list", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    expect(result.current.weightRows).toHaveLength(1);
    expect(result.current.weightRows[0]).toMatchObject({ id: 1, ...BLANK_ROW });
  });

  it("increments id from the last row", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    const ids = result.current.weightRows.map((r) => r.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it("preserves existing rows when adding a new one", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() =>
      result.current.updateWeightRow(1, "ksmDmNo", "DM-001")
    );
    act(() => result.current.addWeightRow());
    expect(result.current.weightRows[0].ksmDmNo).toBe("DM-001");
    expect(result.current.weightRows).toHaveLength(2);
  });
});

// ── updateWeightRow ───────────────────────────────────────────────────────────

describe("updateWeightRow", () => {
  it("updates the correct field on the correct row", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    act(() => result.current.updateWeightRow(2, "weight", "1500"));
    expect(result.current.weightRows[1].weight).toBe("1500");
    expect(result.current.weightRows[0].weight).toBe(""); // unaffected
  });

  it("does not mutate rows with a different id", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    const before = { ...result.current.weightRows[0] };
    act(() => result.current.updateWeightRow(2, "ticketNo", "T-999"));
    expect(result.current.weightRows[0]).toEqual(before);
  });

  it("updates multiple fields independently", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.updateWeightRow(1, "ksmDmNo", "DM-X"));
    act(() => result.current.updateWeightRow(1, "ticketNo", "TK-Y"));
    expect(result.current.weightRows[0].ksmDmNo).toBe("DM-X");
    expect(result.current.weightRows[0].ticketNo).toBe("TK-Y");
  });
});

// ── weightRowsRef sync ────────────────────────────────────────────────────────

describe("weightRowsRef", () => {
  it("stays in sync after addWeightRow", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    expect(result.current.weightRowsRef.current).toHaveLength(1);
    expect(result.current.weightRowsRef.current[0].id).toBe(1);
  });

  it("stays in sync after updateWeightRow", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.updateWeightRow(1, "weight", "500"));
    expect(result.current.weightRowsRef.current[0].weight).toBe("500");
  });

  it("stays in sync after setWeightRows bulk replacement", () => {
    const { result } = renderWeightHook();
    const bulk = [
      { id: 10, ksmDmNo: "A", ticketNo: "B", receiptBookNo: "C", weight: "100" },
    ];
    act(() => result.current.setWeightRows(bulk));
    expect(result.current.weightRowsRef.current).toEqual(bulk);
  });
});

// ── deletion flow ─────────────────────────────────────────────────────────────

describe("deletion flow", () => {
  it("handleRequestDeleteWeightRow sets weightRowToDelete", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    const row = result.current.weightRows[0];
    act(() => result.current.handleRequestDeleteWeightRow(row));
    expect(result.current.weightRowToDelete).toEqual(row);
  });

  it("cancelDeleteWeightRow clears weightRowToDelete without removing the row", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    const row = result.current.weightRows[0];
    act(() => result.current.handleRequestDeleteWeightRow(row));
    act(() => result.current.cancelDeleteWeightRow());
    expect(result.current.weightRowToDelete).toBeNull();
    expect(result.current.weightRows).toHaveLength(1);
  });

  it("confirmDeleteWeightRow removes the pending row and clears weightRowToDelete", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    const rowToDelete = result.current.weightRows[0];
    act(() => result.current.handleRequestDeleteWeightRow(rowToDelete));
    act(() => result.current.confirmDeleteWeightRow());
    expect(result.current.weightRowToDelete).toBeNull();
    expect(result.current.weightRows).toHaveLength(1);
    expect(result.current.weightRows[0].id).toBe(2);
  });

  it("confirmDeleteWeightRow with null pending row does nothing", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    // No pending deletion set — calling confirm should be a no-op
    act(() => result.current.confirmDeleteWeightRow());
    expect(result.current.weightRows).toHaveLength(1);
    expect(result.current.weightRowToDelete).toBeNull();
  });
});

// ── setWeightRows (bulk) ──────────────────────────────────────────────────────

describe("setWeightRows", () => {
  it("replaces all rows when called directly", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.addWeightRow());
    const fresh = [
      { id: 5, ksmDmNo: "X", ticketNo: "", receiptBookNo: "", weight: "200" },
    ];
    act(() => result.current.setWeightRows(fresh));
    expect(result.current.weightRows).toEqual(fresh);
  });

  it("resets to empty array", () => {
    const { result } = renderWeightHook();
    act(() => result.current.addWeightRow());
    act(() => result.current.setWeightRows([]));
    expect(result.current.weightRows).toEqual([]);
  });
});
