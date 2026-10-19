/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRateManagement } from "../../../hooks/useRateManagement";

jest.mock("../../../services/instructionService", () => ({
  fetchRates: jest.fn(),
  fetchSetRate: jest.fn(),
  fetchDestinations: jest.fn(),
}));

jest.mock("../../../utils/instructions/costCalculation", () => ({
  calculateTotalCostFromRates: jest.fn(
    (r6, r12, rAbn, n6, n12, nAbn) => r6 * n6 + r12 * n12 + rAbn * nAbn
  ),
  calcBreakBulkCost: jest.fn((rows, rate) => rows.length * rate),
}));

import {
  fetchRates,
  fetchSetRate,
  fetchDestinations,
} from "../../../services/instructionService";
import {
  calculateTotalCostFromRates,
  calcBreakBulkCost,
} from "../../../utils/instructions/costCalculation";

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderRateHook(opts = {}) {
  const onFormUpdate = opts.onFormUpdate ?? jest.fn();
  const onError = opts.onError ?? jest.fn();
  const result = renderHook(() =>
    useRateManagement({ ...opts, onFormUpdate, onError })
  );
  return { ...result, onFormUpdate, onError };
}

const BASE_FORM = {
  shipmentTypeId: "1",
  rateper_6: 100,
  rateper_12: 200,
  rateper_abnormal: 150,
  num_six_meters: 2,
  num_twelve_meters: 1,
  num_abnormal: 0,
  unitRate: 0,
  setRateAmount: 0,
  clientId: "c1",
  pickup: "PickupA",
  dropoff: "DropoffB",
};

// ── isSetRateMode sync ────────────────────────────────────────────────────────

describe("isSetRateMode sync", () => {
  it("isSetRateMode starts false", () => {
    const { result } = renderRateHook();
    expect(result.current.isSetRateMode).toBe(false);
  });

  it("isSetRateMode becomes true when isSetRate is set to true", async () => {
    const { result } = renderRateHook();
    act(() => result.current.setIsSetRate(true));
    await waitFor(() => expect(result.current.isSetRateMode).toBe(true));
  });

  it("isSetRateMode returns to false when isSetRate is unchecked", async () => {
    const { result } = renderRateHook();
    act(() => result.current.setIsSetRate(true));
    await waitFor(() => expect(result.current.isSetRateMode).toBe(true));
    act(() => result.current.setIsSetRate(false));
    await waitFor(() => expect(result.current.isSetRateMode).toBe(false));
  });
});

// ── showSetRateWarning ────────────────────────────────────────────────────────

describe("showSetRateWarning", () => {
  it("is false by default", () => {
    const { result } = renderRateHook({ status: "New" });
    expect(result.current.showSetRateWarning).toBe(false);
  });

  it("shows warning when all conditions met: isSetRate, active status, mismatch", async () => {
    const { result } = renderRateHook({ status: "New" });
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(500);
      result.current.setSetRateValue(600);
    });
    await waitFor(() => expect(result.current.showSetRateWarning).toBe(true));
  });

  it("hides warning when status is Completed", async () => {
    const { result } = renderRateHook({ status: "Completed" });
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(500);
      result.current.setSetRateValue(600);
    });
    await waitFor(() => expect(result.current.showSetRateWarning).toBe(false));
  });

  it("hides warning when historicalSetRate equals setRateValue", async () => {
    const { result } = renderRateHook({ status: "In Progress" });
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(500);
      result.current.setSetRateValue(500);
    });
    await waitFor(() => expect(result.current.showSetRateWarning).toBe(false));
  });

  it("hides warning when isSetRate is false", async () => {
    const { result } = renderRateHook({ status: "New" });
    act(() => {
      result.current.setIsSetRate(false);
      result.current.setHistoricalSetRate(500);
      result.current.setSetRateValue(600);
    });
    await waitFor(() => expect(result.current.showSetRateWarning).toBe(false));
  });

  it("hides warning when historicalSetRate is null", async () => {
    const { result } = renderRateHook({ status: "New" });
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(null);
      result.current.setSetRateValue(600);
    });
    await waitFor(() => expect(result.current.showSetRateWarning).toBe(false));
  });
});

// ── fetchSetRate effect ───────────────────────────────────────────────────────

describe("fetchSetRate effect", () => {
  it("does not fetch when isSetRate is false", async () => {
    renderRateHook({
      clientId: "c1",
      pickup: "A",
      dropoff: "B",
    });
    await waitFor(() => expect(fetchSetRate).not.toHaveBeenCalled());
  });

  it("fetches set_rate when isSetRate=true and full route is present", async () => {
    fetchSetRate.mockResolvedValueOnce({ set_rate: 750 });
    const { result, onFormUpdate } = renderRateHook({
      clientId: "c1",
      pickup: "A",
      dropoff: "B",
    });
    act(() => result.current.setIsSetRate(true));
    // Wait for both the fetch call AND the state update to settle
    await waitFor(() => {
      expect(fetchSetRate).toHaveBeenCalledWith("c1", "A", "B", "");
      expect(result.current.setRateValue).toBe(750);
    });
    expect(onFormUpdate).toHaveBeenCalledWith({ setRateAmount: "750" });
  });

  it("sets setRateValue to 0 when API fails", async () => {
    fetchSetRate.mockRejectedValueOnce(new Error("network"));
    const { result } = renderRateHook({
      clientId: "c1",
      pickup: "A",
      dropoff: "B",
    });
    act(() => result.current.setIsSetRate(true));
    await waitFor(() => expect(result.current.setRateValue).toBe(0));
  });
});

// ── recalculateTotalCost ──────────────────────────────────────────────────────

describe("recalculateTotalCost", () => {
  it("calls calculateTotalCostFromRates for non-special shipment types", () => {
    calculateTotalCostFromRates.mockReturnValueOnce(450);
    const { result, onFormUpdate } = renderRateHook();
    act(() => {
      result.current.recalculateTotalCost(BASE_FORM, [], []);
    });
    expect(calculateTotalCostFromRates).toHaveBeenCalledWith(
      100, 200, 150, 2, 1, 0, []
    );
    expect(onFormUpdate).toHaveBeenCalledWith({ total_cost: 450 });
  });

  it("forces zeros for isAddOn", () => {
    const { result, onFormUpdate } = renderRateHook({ isAddOn: true });
    act(() => {
      result.current.recalculateTotalCost({ ...BASE_FORM }, [], []);
    });
    expect(onFormUpdate).toHaveBeenCalledWith({
      total_cost: 0,
      rateper_6: 0,
      rateper_12: 0,
      rateper_abnormal: 0,
      rateper_breakbulk: 0,
      unitRate: 0,
    });
    expect(calculateTotalCostFromRates).not.toHaveBeenCalled();
  });

  it("calls calcBreakBulkCost (weight-based) for shipmentTypeId=4 with rateWeight=ton", () => {
    calcBreakBulkCost.mockReturnValueOnce(300);
    const { result, onFormUpdate } = renderRateHook();
    const formData4 = {
      ...BASE_FORM,
      shipmentTypeId: "4",
      rateWeight: "ton",
      unitRate: 50,
      setRateAmount: 0,
    };
    const weightRows = [{ id: 1, weight: 10 }, { id: 2, weight: 15 }];
    act(() => {
      result.current.recalculateTotalCost(formData4, [], weightRows);
    });
    expect(calcBreakBulkCost).toHaveBeenCalledWith(weightRows, 50, {
      isSetRateMode: false,
      setRateAmount: 0,
    });
    expect(onFormUpdate).toHaveBeenCalledWith({ total_cost: 300 });
  });

  it("type 4 container-based fallback: calls calculateTotalCostFromRates when rateWeight=Container", () => {
    calculateTotalCostFromRates.mockReturnValueOnce(400);
    const { result, onFormUpdate } = renderRateHook();
    const formData4 = {
      shipmentTypeId: "4",
      rateWeight: "Container",
      rateper_6: 200,
      rateper_12: 0,
      rateper_abnormal: 0,
      num_six_meters: 2,
      num_twelve_meters: 0,
      num_abnormal: 0,
      unitRate: 0,
      setRateAmount: 0,
    };
    act(() => {
      result.current.recalculateTotalCost(formData4, [], []);
    });
    expect(calculateTotalCostFromRates).toHaveBeenCalledWith(
      200, 0, 0, 2, 0, 0, []
    );
    expect(onFormUpdate).toHaveBeenCalledWith({ total_cost: 400 });
  });

  it("type 4 set-rate: falls back to historicalSetRate when setRateAmount is empty", async () => {
    calcBreakBulkCost.mockReturnValueOnce(1000);
    const { result, onFormUpdate } = renderRateHook();
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(500);
    });
    await waitFor(() => expect(result.current.isSetRateMode).toBe(true));
    const formData4 = {
      ...BASE_FORM,
      shipmentTypeId: "4",
      rateWeight: "ton",
      setRateAmount: "",   // empty — API returned nothing
      unitRate: 0,
    };
    act(() => {
      result.current.recalculateTotalCost(formData4, [], [{}, {}]);
    });
    expect(calcBreakBulkCost).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Number),
      expect.objectContaining({ isSetRateMode: true, setRateAmount: 500 })
    );
  });

  it("type 4 set-rate: uses setRateAmount directly when it is a valid positive number", async () => {
    calcBreakBulkCost.mockReturnValueOnce(300);
    const { result } = renderRateHook();
    act(() => {
      result.current.setIsSetRate(true);
      result.current.setHistoricalSetRate(500); // should be ignored
    });
    await waitFor(() => expect(result.current.isSetRateMode).toBe(true));
    const formData4 = {
      ...BASE_FORM,
      shipmentTypeId: "4",
      rateWeight: "ton",
      setRateAmount: "300",  // valid — historicalSetRate should NOT be used
      unitRate: 0,
    };
    act(() => {
      result.current.recalculateTotalCost(formData4, [], [{}]);
    });
    expect(calcBreakBulkCost).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Number),
      expect.objectContaining({ isSetRateMode: true, setRateAmount: 300 })
    );
  });

  it("uses isSetRateMode=true inside calcBreakBulkCost after toggle", async () => {
    calcBreakBulkCost.mockReturnValue(999);
    const { result } = renderRateHook();
    act(() => result.current.setIsSetRate(true));
    await waitFor(() => expect(result.current.isSetRateMode).toBe(true));
    const formData4 = { ...BASE_FORM, shipmentTypeId: "4", unitRate: 10, setRateAmount: "999" };
    act(() => {
      result.current.recalculateTotalCost(formData4, [], [{ id: 1 }]);
    });
    expect(calcBreakBulkCost).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Number),
      expect.objectContaining({ isSetRateMode: true })
    );
  });

  it("does nothing when onFormUpdate is not provided", () => {
    const { result } = renderHook(() =>
      useRateManagement({ onFormUpdate: null })
    );
    // Should not throw
    expect(() => {
      act(() => result.current.recalculateTotalCost(BASE_FORM, [], []));
    }).not.toThrow();
  });
});

// ── fetchRates ────────────────────────────────────────────────────────────────

describe("fetchRates", () => {
  it("calls onFormUpdate with rate fields on success", async () => {
    fetchRates.mockResolvedValueOnce({
      rateper_6: 100,
      rateper_12: 200,
      rateper_abnormal: 50,
      surcharge: 10,
    });
    const { result, onFormUpdate } = renderRateHook();
    await act(() => result.current.fetchRates("c1", "A", "B"));
    expect(fetchRates).toHaveBeenCalledWith("c1", "A", "B", null);
    expect(onFormUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rateper_6: 100, rateper_12: 200 })
    );
  });

  it("resolves dropoff from destinations when not provided", async () => {
    fetchDestinations.mockResolvedValueOnce([{ destination: "DefaultDrop" }]);
    fetchRates.mockResolvedValueOnce({ rateper_6: 99 });
    const { result } = renderRateHook();
    await act(() => result.current.fetchRates("c1", "A", null));
    expect(fetchDestinations).toHaveBeenCalledWith("c1", "A");
    expect(fetchRates).toHaveBeenCalledWith("c1", "A", "DefaultDrop", null);
  });

  it("looks a rate up by title without resolving destinations", async () => {
    fetchRates.mockResolvedValueOnce({ sixMeterRate: 120 });
    const { result, onFormUpdate } = renderRateHook();
    await act(() => result.current.fetchRates("c1", null, null, "DBN-JHB Express"));
    expect(fetchDestinations).not.toHaveBeenCalled();
    expect(fetchRates).toHaveBeenCalledWith("c1", null, null, "DBN-JHB Express");
    expect(onFormUpdate).toHaveBeenCalledWith(expect.objectContaining({ rateper_6: 120 }));
  });

  it("returns early when no dropoff can be resolved", async () => {
    fetchDestinations.mockResolvedValueOnce([]);
    const { result, onFormUpdate } = renderRateHook();
    await act(() => result.current.fetchRates("c1", "A", null));
    expect(onFormUpdate).not.toHaveBeenCalled();
  });

  it("calls onError on API failure", async () => {
    fetchRates.mockRejectedValueOnce(new Error("network"));
    const { result, onError } = renderRateHook();
    await act(() => result.current.fetchRates("c1", "A", "B"));
    expect(onError).toHaveBeenCalledWith(expect.any(String));
  });

  it("returns early when clientId is empty", async () => {
    const { result, onFormUpdate } = renderRateHook();
    await act(() => result.current.fetchRates("", "A", "B"));
    expect(fetchRates).not.toHaveBeenCalled();
    expect(onFormUpdate).not.toHaveBeenCalled();
  });

  it("sets rateUpdateMessage then clears after timeout", async () => {
    jest.useFakeTimers();
    fetchRates.mockResolvedValueOnce({ rateper_6: 50 });
    const { result } = renderRateHook();
    await act(() => result.current.fetchRates("c1", "A", "B"));
    expect(result.current.rateUpdateMessage).toMatch(/prices updated/i);
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.rateUpdateMessage).toBe("");
    jest.useRealTimers();
  });
});

// ── fetchFreshAmounts ─────────────────────────────────────────────────────────

describe("fetchFreshAmounts", () => {
  const formData = { clientId: "c1", pickup: "A", dropoff: "B" };

  it("passes through containers with no flags", async () => {
    const containers = [
      { id: 1, containerType: "6m", addSurcharges: false, hazardous: false, vgm: false },
    ];
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts(containers, formData);
    });
    expect(fresh).toHaveLength(1);
    expect(fetchRates).not.toHaveBeenCalled();
  });

  it("refetches amounts for containers with addSurcharges flag", async () => {
    fetchRates.mockResolvedValueOnce({
      surcharge: 30,
      surcharge12m: 0,
      hazardous: 0,
      vgm: 0,
    });
    const containers = [
      {
        id: 1,
        containerType: "6m",
        addSurcharges: true,
        hazardous: false,
        vgm: false,
        surchargeAmount: 0,
        is_12m_surcharge: false,
        surcharge_12m_amount: 0,
        hazardousAmount: 0,
        vgmAmount: 0,
      },
    ];
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts(containers, formData);
    });
    expect(fresh[0].surchargeAmount).toBe(30);
  });

  it("refetches hazardous amount for containers with hazardous flag", async () => {
    fetchRates.mockResolvedValueOnce({ hazardous: 75, surcharge: 0, vgm: 0 });
    const containers = [
      {
        id: 1,
        containerType: "6m",
        addSurcharges: false,
        hazardous: true,
        vgm: false,
        hazardousAmount: 0,
        surchargeAmount: 0,
        is_12m_surcharge: false,
        surcharge_12m_amount: 0,
        vgmAmount: 0,
      },
    ];
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts(containers, formData);
    });
    expect(fresh[0].hazardousAmount).toBe(75);
  });

  it("returns original container on API error", async () => {
    fetchRates.mockRejectedValueOnce(new Error("fail"));
    const original = {
      id: 1,
      containerType: "6m",
      addSurcharges: true,
      hazardous: false,
      vgm: false,
      surchargeAmount: 99,
    };
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts([original], formData);
    });
    expect(fresh[0].surchargeAmount).toBe(99);
  });

  // Rate changes apply to new instructions only: saved containers keep the
  // amounts they were saved with for flags that were already on.
  const savedContainer = (overrides = {}) => ({
    id: 1,
    containerKey: 10,
    containerType: "6m",
    addSurcharges: true,
    hazardous: true,
    vgm: true,
    surchargeAmount: 999,
    hazardousAmount: 999,
    vgmAmount: 999,
    is_12m_surcharge: false,
    surcharge_12m_amount: 0,
    selectedExtraCharges: [{ charge_name: "Toll", amount: 999 }],
    _saved: {
      containerType: "6m",
      addSurcharges: true,
      surchargeAmount: 30,
      is_12m_surcharge: false,
      surcharge_12m_amount: 0,
      hazardous: true,
      hazardousAmount: 50,
      vgm: true,
      vgmAmount: 20,
      extraCharges: [{ charge_name: "Toll", amount: 350 }],
    },
    ...overrides,
  });

  it("keeps saved amounts for flags that were already on, without fetching", async () => {
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts([savedContainer()], formData);
    });
    expect(fetchRates).not.toHaveBeenCalled();
    expect(fresh[0].surchargeAmount).toBe(30);
    expect(fresh[0].hazardousAmount).toBe(50);
    expect(fresh[0].vgmAmount).toBe(20);
    expect(fresh[0].selectedExtraCharges).toEqual([{ charge_name: "Toll", amount: 350 }]);
  });

  it("prices a flag newly ticked on a saved container from the current rate", async () => {
    fetchRates.mockResolvedValueOnce({ hazardous: 75, surcharges: 40, vgm: 0 });
    const container = savedContainer({
      _saved: { ...savedContainer()._saved, hazardous: false, hazardousAmount: 0 },
    });
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts([container], formData);
    });
    expect(fresh[0].hazardousAmount).toBe(75);
    expect(fresh[0].surchargeAmount).toBe(30);
  });

  it("re-prices the surcharge when the container type changed", async () => {
    fetchRates.mockResolvedValueOnce({ surcharges: 40, surcharge12m: 60 });
    const container = savedContainer({ containerType: "12m" });
    const { result } = renderRateHook();
    let fresh;
    await act(async () => {
      fresh = await result.current.fetchFreshAmounts([container], formData);
    });
    expect(fresh[0].surcharge_12m_amount).toBe(60);
    expect(fresh[0].hazardousAmount).toBe(50);
  });

  it("looks the current rate up by title when the instruction has one", async () => {
    fetchRates.mockResolvedValueOnce({ hazardous: 75 });
    const container = { id: 2, containerType: "6m", hazardous: true, addSurcharges: false, vgm: false };
    const { result } = renderRateHook();
    await act(async () => {
      await result.current.fetchFreshAmounts([container], { clientId: "c1", rate_title: "DBN-JHB Express" });
    });
    expect(fetchRates).toHaveBeenCalledWith("c1", undefined, undefined, "DBN-JHB Express");
  });
});
