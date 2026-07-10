/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useContainerManagement } from "../../../hooks/useContainerManagement";

jest.mock("../../../services/instructionService", () => ({
  fetchRates: jest.fn(),
  checkContainerLegsExist: jest.fn(),
}));

import {
  fetchRates,
  checkContainerLegsExist,
} from "../../../services/instructionService";

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderContainerHook(opts = {}) {
  return renderHook(() => useContainerManagement(opts));
}

const COUNTS_1 = { num_six_meters: 1, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 };
const COUNTS_2 = { num_six_meters: 2, num_twelve_meters: 1, num_abnormal: 0, num_breakbulk: 0 };

// ── initializeContainers ─────────────────────────────────────────────────────

describe("initializeContainers", () => {
  it("creates the correct number of containers by type", () => {
    const { result } = renderContainerHook();
    act(() => {
      result.current.initializeContainers([], {
        num_six_meters: 2,
        num_twelve_meters: 1,
        num_abnormal: 1,
        num_breakbulk: 0,
      });
    });
    expect(result.current.containers).toHaveLength(4);
    expect(result.current.containers.filter((c) => c.containerType === "6m")).toHaveLength(2);
    expect(result.current.containers.filter((c) => c.containerType === "12m")).toHaveLength(1);
    expect(result.current.containers.filter((c) => c.containerType === "Abnormal")).toHaveLength(1);
  });

  it("preserves existing container data when count stays the same", () => {
    const { result } = renderContainerHook();
    // First init
    act(() => {
      result.current.initializeContainers([], COUNTS_2);
    });
    // Enter data in container 0
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c, i) => (i === 0 ? { ...c, containerNum: "ABCD1234567" } : c))
      );
    });
    const previous = result.current.containers;
    // Re-init with same counts
    act(() => {
      result.current.initializeContainers(result.current.containersRef.current, COUNTS_2);
    });
    expect(result.current.containers[0].containerNum).toBe("ABCD1234567");
  });

  it("does not reset existing containers when all counts are zero", () => {
    const { result } = renderContainerHook();
    act(() => {
      result.current.initializeContainers([], COUNTS_1);
    });
    const existing = result.current.containers;
    // Re-init with zero counts — should keep existing
    act(() => {
      result.current.initializeContainers(existing, { num_six_meters: 0, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 });
    });
    expect(result.current.containers).toHaveLength(1);
  });

  it("sets weight to '' for import shipment type", () => {
    const { result } = renderContainerHook({ isImport: true });
    act(() => {
      result.current.initializeContainers([], COUNTS_1);
    });
    expect(result.current.containers[0].weight).toBe("");
  });

  it("sets weight to null for non-import/export types", () => {
    const { result } = renderContainerHook({ isImport: false, isExport: false });
    act(() => {
      result.current.initializeContainers([], COUNTS_1);
    });
    expect(result.current.containers[0].weight).toBeNull();
  });

  it("marks 12m containers with is_12m_surcharge=true", () => {
    const { result } = renderContainerHook();
    act(() => {
      result.current.initializeContainers([], { num_six_meters: 0, num_twelve_meters: 1, num_abnormal: 0, num_breakbulk: 0 });
    });
    expect(result.current.containers[0].is_12m_surcharge).toBe(true);
  });
});

// ── handleContainerChange — containerNum ─────────────────────────────────────

describe("handleContainerChange — containerNum", () => {
  function setupOneContainer() {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    return result;
  }

  it("accepts valid alphanumeric container numbers", async () => {
    const result = setupOneContainer();
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "containerNum", "ABCD1234567");
    });
    expect(result.current.containers[0].containerNum).toBe("ABCD1234567");
  });

  it("rejects container numbers longer than 20 chars", async () => {
    const result = setupOneContainer();
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "containerNum", "A".repeat(21));
    });
    expect(result.current.containers[0].containerNum).toBe(""); // unchanged
  });

  it("rejects non-alphanumeric characters", async () => {
    const result = setupOneContainer();
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "containerNum", "ABCD-1234");
    });
    expect(result.current.containers[0].containerNum).toBe(""); // unchanged
  });
});

// ── handleContainerChange — weight ───────────────────────────────────────────

describe("handleContainerChange — weight", () => {
  it("sanitizes valid numeric weight", async () => {
    const { result } = renderContainerHook({ isImport: true });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "weight", "1500.5");
    });
    expect(result.current.containers[0].weight).toBe(1500.5);
  });

  it("ignores weight change when shipment type does not support weight", async () => {
    const { result } = renderContainerHook({ isImport: false, shipmentTypeId: "5" });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "weight", "100");
    });
    expect(result.current.containers[0].weight).toBeNull();
  });

  it("rejects alphabetic weight input", async () => {
    const { result } = renderContainerHook({ isImport: true });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "weight", "abc");
    });
    expect(result.current.containers[0].weight).toBe(""); // unchanged from initial
  });
});

// ── handleContainerChange — hazardous checkbox ───────────────────────────────

describe("handleContainerChange — hazardous", () => {
  it("fetches hazardous rate and updates container when checked", async () => {
    fetchRates.mockResolvedValue({ hazardous: 250 });
    const { result } = renderContainerHook({
      clientId: "1", pickup: "Cape Town", dropoff: "Durban",
    });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "hazardous", true);
    });
    expect(result.current.containers[0].hazardous).toBe(true);
    expect(result.current.containers[0].hazardousAmount).toBe(250);
  });

  it("resets hazardousAmount to 0 when unchecked", async () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    // Set hazardous first
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hazardous: true, hazardousAmount: 250 } : c))
      );
    });
    await act(async () => {
      await result.current.handleContainerChange(id, "hazardous", false);
    });
    expect(result.current.containers[0].hazardous).toBe(false);
    expect(result.current.containers[0].hazardousAmount).toBe(0);
  });

  it("falls back to hazardousAmount=0 when API fails", async () => {
    fetchRates.mockRejectedValue(new Error("API error"));
    const { result } = renderContainerHook({
      clientId: "1", pickup: "Cape Town", dropoff: "Durban",
    });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "hazardous", true);
    });
    expect(result.current.containers[0].hazardous).toBe(true);
    expect(result.current.containers[0].hazardousAmount).toBe(0);
  });
});

// ── handleContainerChange — addSurcharges checkbox ───────────────────────────

describe("handleContainerChange — addSurcharges", () => {
  it("fetches surcharge and updates container when checked", async () => {
    fetchRates.mockResolvedValue({ surcharge: 100, surcharge_12m: 0 });
    const onRecalc = jest.fn();
    const { result } = renderContainerHook({
      clientId: "1", pickup: "Cape Town", dropoff: "Durban",
      onRecalculateTotalCost: onRecalc,
    });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "addSurcharges", true);
    });
    // Give async surcharge fetch time to run
    await act(async () => {});
    expect(result.current.containers[0].addSurcharges).toBe(true);
  });

  it("resets surchargeAmount to 0 when unchecked", async () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, addSurcharges: true, surchargeAmount: 100 } : c))
      );
    });
    await act(async () => {
      await result.current.handleContainerChange(id, "addSurcharges", false);
    });
    expect(result.current.containers[0].addSurcharges).toBe(false);
    expect(result.current.containers[0].surchargeAmount).toBe(0);
  });
});

// ── handleContainerChange — fileRef ──────────────────────────────────────────

describe("handleContainerChange — fileRef", () => {
  it("updates fileRef and marks container data as modified", async () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "fileRef", "ABC123");
    });
    expect(result.current.containers[0].fileRef).toBe("ABC123");
    expect(result.current.isContainerDataModified).toBe(true);
  });
});

// ── handleContainerChange — addSurcharges 12m branching ──────────────────────

describe("handleContainerChange — addSurcharges 12m surcharge branching", () => {
  it("updates surcharge_12m_amount (not surchargeAmount) when container is_12m_surcharge=true", async () => {
    fetchRates.mockResolvedValue({ surcharge: 40, surcharge_12m: 80 });
    const { result } = renderContainerHook({
      clientId: "1", pickup: "Cape Town", dropoff: "Durban",
    });
    // Initialize a 12m container (is_12m_surcharge=true by default)
    act(() => result.current.initializeContainers([], {
      num_six_meters: 0, num_twelve_meters: 1, num_abnormal: 0, num_breakbulk: 0,
    }));
    const id = result.current.containers[0].id;
    expect(result.current.containers[0].is_12m_surcharge).toBe(true);

    await act(async () => {
      await result.current.handleContainerChange(id, "addSurcharges", true);
    });
    await act(async () => {}); // flush async surcharge fetch

    // 12m container: surcharge_12m_amount should be set, not surchargeAmount
    expect(result.current.containers[0].is_12m_surcharge).toBe(true);
    expect(result.current.containers[0].surcharge_12m_amount).toBeGreaterThan(0);
  });
});

// ── validateContainerUniqueness ───────────────────────────────────────────────

describe("validateContainerUniqueness", () => {
  it("returns true when all container numbers are unique", () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], { num_six_meters: 2, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 }));
    act(() => {
      result.current.setContainers((prev) => [
        { ...prev[0], containerNum: "AAAA1111111" },
        { ...prev[1], containerNum: "BBBB2222222" },
      ]);
    });
    expect(result.current.validateContainerUniqueness()).toBe(true);
  });

  it("returns false when two containers share a number", () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], { num_six_meters: 2, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 }));
    act(() => {
      result.current.setContainers((prev) => [
        { ...prev[0], containerNum: "AAAA1111111" },
        { ...prev[1], containerNum: "AAAA1111111" },
      ]);
    });
    expect(result.current.validateContainerUniqueness()).toBe(false);
  });

  it("always returns true when isAddOn=true", () => {
    const { result } = renderContainerHook({ isAddOn: true });
    act(() => result.current.initializeContainers([], { num_six_meters: 2, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 }));
    act(() => {
      result.current.setContainers((prev) => [
        { ...prev[0], containerNum: "AAAA1111111" },
        { ...prev[1], containerNum: "AAAA1111111" },
      ]);
    });
    expect(result.current.validateContainerUniqueness()).toBe(true);
  });
});

// ── delete flow ───────────────────────────────────────────────────────────────

describe("delete flow", () => {
  it("skips legs check when container has no containerNum", async () => {
    const onRequestConfirmation = jest.fn();
    const { result } = renderContainerHook({ onRequestConfirmation });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const container = result.current.containers[0]; // containerNum is ""
    await act(async () => {
      await result.current.handleRequestDeleteContainer(container);
    });
    expect(checkContainerLegsExist).not.toHaveBeenCalled();
    expect(onRequestConfirmation).toHaveBeenCalledWith(
      "Are you sure you want to delete this container?"
    );
    expect(result.current.containerToDelete).toBe(container);
  });

  it("shows legs warning message when container has legs", async () => {
    checkContainerLegsExist.mockResolvedValue({ hasLegs: true });
    const onRequestConfirmation = jest.fn();
    const { result } = renderContainerHook({
      instructionId: "10", onRequestConfirmation,
    });
    act(() => result.current.initializeContainers([], COUNTS_1));
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c) => ({ ...c, containerNum: "ABCD1234567" }))
      );
    });
    const container = { ...result.current.containers[0] };
    await act(async () => {
      await result.current.handleRequestDeleteContainer(container);
    });
    expect(onRequestConfirmation).toHaveBeenCalledWith(
      expect.stringContaining("legs assigned")
    );
  });

  it("confirmDeleteContainer removes the container and calls onUpdateFormCounts", async () => {
    const onUpdateFormCounts = jest.fn();
    const onRequestConfirmation = jest.fn();
    const { result } = renderContainerHook({ onUpdateFormCounts, onRequestConfirmation });
    act(() => result.current.initializeContainers([], COUNTS_2)); // 2x6m, 1x12m = 3 containers
    expect(result.current.containers).toHaveLength(3);
    const toDelete = result.current.containers[0]; // first 6m container

    // Trigger delete request (sets containerToDelete internally)
    await act(async () => {
      await result.current.handleRequestDeleteContainer(toDelete);
    });
    expect(result.current.containerToDelete).toBe(toDelete);

    // Confirm the deletion
    act(() => {
      result.current.confirmDeleteContainer();
    });

    expect(result.current.containers).toHaveLength(2);
    expect(result.current.containerToDelete).toBeNull();
    expect(onUpdateFormCounts).toHaveBeenCalledWith(
      expect.objectContaining({ num_six_meters: 1, num_twelve_meters: 1 })
    );
  });

  it("confirmDeleteContainer is a no-op when no containerToDelete is pending", () => {
    const onUpdateFormCounts = jest.fn();
    const { result } = renderContainerHook({ onUpdateFormCounts });
    act(() => result.current.initializeContainers([], COUNTS_1));
    act(() => {
      result.current.confirmDeleteContainer();
    });
    expect(result.current.containers).toHaveLength(1); // unchanged
    expect(onUpdateFormCounts).not.toHaveBeenCalled();
  });

  it("cancelDeleteContainer clears the pending container", async () => {
    const onRequestConfirmation = jest.fn();
    const { result } = renderContainerHook({ onRequestConfirmation });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const container = result.current.containers[0];
    await act(async () => {
      await result.current.handleRequestDeleteContainer(container);
    });
    expect(result.current.containerToDelete).toBe(container);
    act(() => {
      result.current.cancelDeleteContainer();
    });
    expect(result.current.containerToDelete).toBeNull();
  });

  it("does not delete when isReadOnly is true", async () => {
    const onRequestConfirmation = jest.fn();
    const { result } = renderContainerHook({ isReadOnly: true, onRequestConfirmation });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const container = result.current.containers[0];
    await act(async () => {
      await result.current.handleRequestDeleteContainer(container);
    });
    expect(onRequestConfirmation).not.toHaveBeenCalled();
  });

  it("calls onError when legs check fails", async () => {
    checkContainerLegsExist.mockRejectedValue(new Error("Network"));
    const onError = jest.fn();
    const { result } = renderContainerHook({ instructionId: "10", onError });
    act(() => result.current.initializeContainers([], COUNTS_1));
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c) => ({ ...c, containerNum: "ABCD1234567" }))
      );
    });
    const container = { ...result.current.containers[0] };
    await act(async () => {
      await result.current.handleRequestDeleteContainer(container);
    });
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Failed to verify"));
  });
});

// ── containersRef stays in sync ───────────────────────────────────────────────

describe("containersRef sync", () => {
  it("containersRef.current matches containers state after init", () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    expect(result.current.containersRef.current).toEqual(result.current.containers);
    expect(result.current.containersRef.current).toHaveLength(1);
  });

  it("containersRef.current updates after handleContainerChange", async () => {
    const { result } = renderContainerHook({ isImport: true });
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "weight", "1000");
    });
    expect(result.current.containersRef.current[0].weight).toBe(1000);
  });
});

// ── in-place container type change (6m ↔ 12m) ─────────────────────────────────

describe("handleContainerChange — containerType (in-place switch)", () => {
  it("switches a container's type in place while preserving its data", async () => {
    const onUpdateFormCounts = jest.fn();
    const { result } = renderContainerHook({ isImport: true, onUpdateFormCounts });
    act(() => result.current.initializeContainers([], COUNTS_1)); // one 6m
    const id = result.current.containers[0].id;
    // Enter data on the 6m row
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, containerNum: "ABCD1234567", weight: "5000", cargoDescription: "Steel" }
            : c
        )
      );
    });
    // Switch it to 12m
    await act(async () => {
      await result.current.handleContainerChange(id, "containerType", "12m");
    });
    const row = result.current.containersRef.current[0];
    expect(row.containerType).toBe("12m");
    expect(row.id).toBe(id); // identity is stable — no renumbering
    expect(row.containerNum).toBe("ABCD1234567");
    expect(row.weight).toBe("5000");
    expect(row.cargoDescription).toBe("Steel");
  });

  it("re-derives form counts after a type switch (6m-- / 12m++)", async () => {
    const onUpdateFormCounts = jest.fn();
    const { result } = renderContainerHook({ onUpdateFormCounts });
    act(() => result.current.initializeContainers([], COUNTS_2)); // 2×6m, 1×12m
    const sixId = result.current.containers.find((c) => c.containerType === "6m").id;
    await act(async () => {
      await result.current.handleContainerChange(sixId, "containerType", "12m");
    });
    expect(onUpdateFormCounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ num_six_meters: 1, num_twelve_meters: 2 })
    );
  });

  it("ignores invalid container types", async () => {
    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id = result.current.containers[0].id;
    await act(async () => {
      await result.current.handleContainerChange(id, "containerType", "99m");
    });
    expect(result.current.containersRef.current[0].containerType).toBe("6m");
  });
});

// ── changeContainersType (mass edit) ──────────────────────────────────────────

describe("changeContainersType", () => {
  it("switches multiple selected containers to a type in one call, preserving data", () => {
    const onUpdateFormCounts = jest.fn();
    const { result } = renderContainerHook({ onUpdateFormCounts });
    act(() => result.current.initializeContainers([], COUNTS_2)); // 2×6m, 1×12m
    // Tag the two 6m rows with data
    act(() => {
      result.current.setContainers((prev) =>
        prev.map((c, i) =>
          c.containerType === "6m" ? { ...c, containerNum: `NUM${i}` } : c
        )
      );
    });
    const sixIds = result.current.containers
      .filter((c) => c.containerType === "6m")
      .map((c) => c.id);
    act(() => result.current.changeContainersType(sixIds, "12m"));
    const list = result.current.containersRef.current;
    // All three are now 12m and data is preserved on the switched rows
    expect(list.filter((c) => c.containerType === "12m")).toHaveLength(3);
    expect(list.filter((c) => c.containerType === "6m")).toHaveLength(0);
    sixIds.forEach((id) => {
      const row = list.find((c) => c.id === id);
      expect(row.containerNum).toMatch(/^NUM/);
    });
    expect(onUpdateFormCounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ num_six_meters: 0, num_twelve_meters: 3 })
    );
  });

  it("ignores invalid types and does nothing when read-only", () => {
    const { result: ro } = renderContainerHook({ isReadOnly: true });
    act(() => ro.current.initializeContainers([], COUNTS_1));
    const id = ro.current.containers[0].id;
    act(() => ro.current.changeContainersType([id], "12m"));
    expect(ro.current.containersRef.current[0].containerType).toBe("6m");

    const { result } = renderContainerHook();
    act(() => result.current.initializeContainers([], COUNTS_1));
    const id2 = result.current.containers[0].id;
    act(() => result.current.changeContainersType([id2], "99m"));
    expect(result.current.containersRef.current[0].containerType).toBe("6m");
  });
});
