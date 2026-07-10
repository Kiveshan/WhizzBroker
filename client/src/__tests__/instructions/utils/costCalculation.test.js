import {
  calcBreakBulkCost,
  calculateTotalCostFromRates,
  calcContainerBasedCost,
  resolveBaseCost,
} from "../../../utils/instructions/costCalculation";

// ── calcBreakBulkCost ────────────────────────────────────────────────────────

describe("calcBreakBulkCost", () => {
  const rows = [
    { weight: "100" },
    { weight: "200" },
    { weight: "50" },
  ];

  it("weight mode: sum(weights) × unitRate", () => {
    expect(calcBreakBulkCost(rows, 5)).toBe(1750); // 350 × 5
  });

  it("weight mode: skips null / empty / NaN weight rows", () => {
    const mixed = [{ weight: "100" }, { weight: "" }, { weight: null }, { weight: "abc" }];
    expect(calcBreakBulkCost(mixed, 10)).toBe(1000); // 100 × 10
  });

  it("weight mode: empty rows gives 0", () => {
    expect(calcBreakBulkCost([], 10)).toBe(0);
  });

  it("set-rate mode: setRateAmount × rowCount", () => {
    expect(calcBreakBulkCost(rows, 0, { isSetRateMode: true, setRateAmount: 500 })).toBe(1500);
  });

  it("set-rate mode: uses length 1 minimum when rows is empty", () => {
    expect(calcBreakBulkCost([], 0, { isSetRateMode: true, setRateAmount: 500 })).toBe(500);
  });

  it("set-rate mode: returns 0 when setRateAmount is 0 (caller must resolve historicalSetRate before passing)", () => {
    // calcBreakBulkCost has no knowledge of historicalSetRate.
    // The caller (useRateManagement / performSave) is responsible for
    // resolving the fallback before calling this function.
    expect(calcBreakBulkCost([{}], 0, { isSetRateMode: true, setRateAmount: 0 })).toBe(0);
  });
});

// ── calculateTotalCostFromRates ──────────────────────────────────────────────

describe("calculateTotalCostFromRates", () => {
  it("base cost with no containers", () => {
    expect(calculateTotalCostFromRates(100, 200, 300, 2, 1, 1)).toBe(700);
  });

  it("adds surcharge amounts for flagged containers", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 50, surcharge_12m_amount: 0 },
      { addSurcharges: true, is_12m_surcharge: true, surchargeAmount: 0, surcharge_12m_amount: 80 },
      { addSurcharges: false, surchargeAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(130);
  });

  it("adds hazardous amounts", () => {
    const containers = [
      { hazardous: true, hazardousAmount: 75 },
      { hazardous: false, hazardousAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(75);
  });

  it("adds VGM amounts", () => {
    const containers = [
      { vgm: true, vgmAmount: 30 },
      { vgm: false, vgmAmount: 999 },
    ];
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, containers)).toBe(30);
  });

  it("sums base + surcharge + hazardous + VGM", () => {
    const containers = [
      {
        addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 50, surcharge_12m_amount: 0,
        hazardous: true, hazardousAmount: 25,
        vgm: true, vgmAmount: 10,
      },
    ];
    // base: 100×1 = 100, surcharge: 50, hazardous: 25, vgm: 10 → 185
    expect(calculateTotalCostFromRates(100, 0, 0, 1, 0, 0, containers)).toBe(185);
  });
});

// ── calcContainerBasedCost ───────────────────────────────────────────────────

describe("calcContainerBasedCost", () => {
  const baseFormData = {
    sixMeterRate: "100",
    twelveMeterRate: "200",
    abnormalRate: "300",
    rateper_breakbulk: "50",
    num_six_meters: 2,
    num_twelve_meters: 1,
    num_abnormal: 1,
    num_breakbulk: 3,
    rateWeight: "Container",
  };

  it("calculates 6m + 12m + abnormal costs", () => {
    // 100×2 + 200×1 + 300×1 = 700
    expect(calcContainerBasedCost(baseFormData, [])).toBe(700);
  });

  it("includes break bulk cost only when isCrossHaul=true AND rateWeight=Container", () => {
    // 700 + 50×3 = 850
    expect(calcContainerBasedCost(baseFormData, [], { isCrossHaul: true })).toBe(850);
  });

  it("excludes break bulk when not cross-haul", () => {
    expect(calcContainerBasedCost(baseFormData, [], { isCrossHaul: false })).toBe(700);
  });

  it("excludes break bulk when rateWeight is not Container", () => {
    const fd = { ...baseFormData, rateWeight: "kg" };
    expect(calcContainerBasedCost(fd, [], { isCrossHaul: true })).toBe(700);
  });

  it("adds surcharge totals from containers", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 40, surcharge_12m_amount: 0 },
    ];
    const fd = { ...baseFormData, sixMeterRate: "0", twelveMeterRate: "0", abnormalRate: "0" };
    expect(calcContainerBasedCost(fd, containers)).toBe(40);
  });
});

// ── resolveBaseCost ──────────────────────────────────────────────────────────

describe("resolveBaseCost", () => {
  // ── Branch 1: Set-rate ───────────────────────────────────────────────────

  it("set-rate: uses setRateAmount when valid", () => {
    const formData = { setRateAmount: "300" };
    const weightRows = [{}, {}]; // 2 rows
    expect(resolveBaseCost(formData, weightRows, { isSetRateMode: true, historicalSetRate: 500 })).toBe(600); // 300 × 2
  });

  it("set-rate: falls back to historicalSetRate when setRateAmount is empty", () => {
    const formData = { setRateAmount: "" };
    const weightRows = [{}, {}]; // 2 rows
    expect(resolveBaseCost(formData, weightRows, { isSetRateMode: true, historicalSetRate: 500 })).toBe(1000); // 500 × 2
  });

  it("set-rate: falls back to historicalSetRate when setRateAmount is 0", () => {
    const formData = { setRateAmount: "0" };
    const weightRows = [{}]; // 1 row
    expect(resolveBaseCost(formData, weightRows, { isSetRateMode: true, historicalSetRate: 400 })).toBe(400); // 400 × 1
  });

  it("set-rate: skipped entirely when isAddOn=true (falls through to container branch)", () => {
    // isAddOn instructions are never set-rate; the branch is skipped
    const formData = {
      setRateAmount: "999",
      shipmentTypeId: "1",
      rateper_6: 100, num_six_meters: 2,
      rateper_12: 0,  num_twelve_meters: 0,
      rateper_abnormal: 0, num_abnormal: 0,
    };
    expect(resolveBaseCost(formData, [], { isSetRateMode: true, historicalSetRate: 999, isAddOn: true })).toBe(200);
  });

  // ── Branch 2: Weight-based type-4 ───────────────────────────────────────

  it("weight-based type-4 (rateWeight=kg): sum(weights) × unitRate", () => {
    const formData = { shipmentTypeId: "4", rateWeight: "kg", unitRate: 10 };
    const weightRows = [{ weight: "5" }, { weight: "3" }];
    expect(resolveBaseCost(formData, weightRows, { isSetRateMode: false })).toBe(80); // 8 × 10
  });

  it("weight-based type-4 (rateWeight=ton): sum(weights) × unitRate", () => {
    const formData = { shipmentTypeId: "4", rateWeight: "ton", unitRate: 50 };
    const weightRows = [{ weight: "2" }];
    expect(resolveBaseCost(formData, weightRows, { isSetRateMode: false })).toBe(100); // 2 × 50
  });

  it("weight-based branch NOT taken for non-type-4 even if rateWeight=kg", () => {
    // shipmentTypeId "1" → falls through to container branch
    const formData = {
      shipmentTypeId: "1",
      rateWeight: "kg",
      unitRate: 50,
      rateper_6: 100, num_six_meters: 3,
      rateper_12: 0,  num_twelve_meters: 0,
      rateper_abnormal: 0, num_abnormal: 0,
    };
    expect(resolveBaseCost(formData, [{ weight: "10" }], { isSetRateMode: false })).toBe(300); // 100 × 3
  });

  // ── Branch 3: Container-based ────────────────────────────────────────────

  it("container-based: rate × count for each size", () => {
    const formData = {
      shipmentTypeId: "1", rateWeight: "Container",
      rateper_6: 100,  num_six_meters: 2,
      rateper_12: 200, num_twelve_meters: 1,
      rateper_abnormal: 300, num_abnormal: 1,
    };
    expect(resolveBaseCost(formData, [], { isSetRateMode: false })).toBe(700); // 200+200+300
  });

  it("container-based: rate is zeroed when count is 0 (prevents phantom cost)", () => {
    // num_twelve_meters is 0 — rateper_12 should not contribute even though it's non-zero
    const formData = {
      shipmentTypeId: "1", rateWeight: "Container",
      rateper_6: 100,  num_six_meters: 2,
      rateper_12: 200, num_twelve_meters: 0,
      rateper_abnormal: 0, num_abnormal: 0,
    };
    expect(resolveBaseCost(formData, [], { isSetRateMode: false })).toBe(200); // only 6m contributes
  });
});
