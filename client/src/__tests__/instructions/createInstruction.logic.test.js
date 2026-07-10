/**
 * Characterization tests for ControllerInstructions.jsx (create form).
 *
 * These tests document CURRENT behaviour. They are NOT tests of desired
 * behaviour — they capture what the code actually does right now, even if
 * that behaviour seems wrong or surprising.
 *
 * Each function is replicated here verbatim (with source-line annotations)
 * because the functions live inside a React component body and cannot be
 * imported directly.
 */

// ---------------------------------------------------------------------------
// MIRRORS: ControllerInstructions.jsx:237 — isFieldValid
// Dependencies captured as plain parameters instead of closure variables.
// ---------------------------------------------------------------------------
function isFieldValid(fieldName, value, { isCrossHaul, isWeightBased, isSetRate }) {
  switch (fieldName) {
    case "clientId":
    case "shipmentTypeId":
    case "task":
    case "pickup":
    case "dropoff":
    case "pickupTime":
    case "pickupDate":
    case "deadline":
    case "bookingRef":
    case "fileRef":
    case "description":
      return value && value.trim() !== "";
    case "stackDate":
      return !isCrossHaul ? value && value.trim() !== "" : true;
    case "vesselName":
      return !isCrossHaul ? value && value.trim() !== "" : true;
    case "weight":
    case "unitrate":
      if (fieldName === "unitrate" && isCrossHaul && isSetRate) return true;
      return !isWeightBased || (value && value.trim() !== "");
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// MIRRORS: ControllerInstructions.jsx:1176 — validateForm
// ---------------------------------------------------------------------------
function validateForm(formData, { isCrossHaul, isWeightBased, isAddOn, isSetRate, isSetRateMode }) {
  const errors = {};

  if (!formData.clientId) errors.clientId = "Client is required";
  if (!formData.shipmentTypeId) errors.shipmentTypeId = "Shipment type is required";
  if (!formData.pickup) errors.pickup = "Pickup location is required";
  if (!formData.dropoff) errors.dropoff = "Dropoff location is required";

  if (!isAddOn) {
    if (!formData.task) errors.task = "KSM File Reference is required";
    if (!formData.lastFreeDate) errors.lastFreeDate = "Last Free Date is required";
    if (!formData.bookingRef) errors.bookingRef = "Booking reference is required";
    if (!formData.fileRef) errors.fileRef = "Client File Reference is required";
    if (!formData.description) errors.description = "Description is required";
  }

  if (!isCrossHaul && !isAddOn) {
    if (!formData.vesselName) errors.vesselName = "Vessel name is required";
    if (!formData.stackDate) errors.stackDate = "Stack date is required";
  }

  if (isWeightBased) {
    if (formData.shipmentTypeId !== "4") {
      if (!formData.weight || formData.weight === "") {
        errors.weight = "Weight is required for weight-based calculations";
      }
    }
    const isCrossHaulSetRate = formData.shipmentTypeId === "4" && isSetRate;
    if (!isCrossHaulSetRate && (!formData.unitrate || formData.unitrate === "")) {
      errors.unitrate = "Unit rate is required for weight-based calculations";
    }
  } else if (isSetRateMode) {
    if (!formData.setRateAmount || formData.setRateAmount === "") {
      errors.setRateAmount = "Set rate amount is required when unit type is Set Rate";
    }
  } else if (!isAddOn) {
    const totalContainers =
      formData.num_six_meters +
      formData.num_twelve_meters +
      formData.num_abnormal +
      (isCrossHaul && formData.rateWeight === "Container" ? formData.num_breakbulk : 0);
    if (totalContainers === 0) {
      errors.containerCount = "At least one container is required";
    }
    if (isCrossHaul && formData.num_breakbulk > 0 && formData.rateWeight === "Container") {
      if (!formData.rateper_breakbulk || formData.rateper_breakbulk === "") {
        errors.rateper_breakbulk =
          "Break bulk rate is required when break bulk count > 0 and unit type is Container";
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// MIRRORS: ControllerInstructions.jsx:1289 — checkRateCountMismatch
// Returns { needsConfirmation: boolean, message: string }
// ---------------------------------------------------------------------------
function checkRateCountMismatch(formData, { isWeightBased, isSetRateMode, isAddOn, isCrossHaul }) {
  if (isWeightBased || isSetRateMode || isAddOn) {
    return { needsConfirmation: false, message: "" };
  }

  const containerTypesWithRatesButZeroCount = [];
  const containerTypesWithCountAndRates = [];

  const sixMeterRate = Number.parseFloat(formData.sixMeterRate) || 0;
  const sixMeterCount = formData.num_six_meters || 0;
  if (sixMeterRate > 0 && sixMeterCount === 0) containerTypesWithRatesButZeroCount.push("6m");
  if (sixMeterCount > 0 && sixMeterRate > 0)
    containerTypesWithCountAndRates.push(`6m (${sixMeterCount} containers, Rate: R${sixMeterRate.toFixed(2)})`);

  const twelveMeterRate = Number.parseFloat(formData.twelveMeterRate) || 0;
  const twelveMeterCount = formData.num_twelve_meters || 0;
  if (twelveMeterRate > 0 && twelveMeterCount === 0) containerTypesWithRatesButZeroCount.push("12m");
  if (twelveMeterCount > 0 && twelveMeterRate > 0)
    containerTypesWithCountAndRates.push(
      `12m (${twelveMeterCount} containers, Rate: R${twelveMeterRate.toFixed(2)})`
    );

  const abnormalRate = Number.parseFloat(formData.abnormalRate) || 0;
  const abnormalCount = formData.num_abnormal || 0;
  if (abnormalRate > 0 && abnormalCount === 0) containerTypesWithRatesButZeroCount.push("Abnormal");
  if (abnormalCount > 0 && abnormalRate > 0)
    containerTypesWithCountAndRates.push(
      `Abnormal (${abnormalCount} containers, Rate: R${abnormalRate.toFixed(2)})`
    );

  if (isCrossHaul) {
    const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0;
    const breakBulkCount = formData.num_breakbulk || 0;
    if (breakBulkRate > 0 && breakBulkCount === 0) containerTypesWithRatesButZeroCount.push("Break Bulk");
    if (breakBulkCount > 0 && breakBulkRate > 0)
      containerTypesWithCountAndRates.push(
        `Break Bulk (${breakBulkCount} containers, Rate: R${breakBulkRate.toFixed(2)})`
      );
  }

  if (containerTypesWithRatesButZeroCount.length > 0) {
    let message = "You have containers with the following rates: ";
    if (containerTypesWithCountAndRates.length > 0) {
      message += containerTypesWithCountAndRates.join(", ");
      message += ". Are you sure you want to continue?";
    } else {
      message = "You have set rates for container types with 0 containers. Are you sure you want to continue?";
    }
    return { needsConfirmation: true, message };
  }

  return { needsConfirmation: false, message: "" };
}

// ---------------------------------------------------------------------------
// MIRRORS: ControllerInstructions.jsx:1492–1561 — container-based cost calc
// Extracted from submitInstruction. surchargeTotal uses containers array.
// ---------------------------------------------------------------------------
function calcContainerBasedCost(formData, containers, { isCrossHaul }) {
  const sixMeterRate = Number.parseFloat(formData.sixMeterRate) || 0;
  const twelveMeterRate = Number.parseFloat(formData.twelveMeterRate) || 0;
  const abnormalRate = Number.parseFloat(formData.abnormalRate) || 0;
  const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0;

  const sixMeterCount = formData.num_six_meters || 0;
  const twelveMeterCount = formData.num_twelve_meters || 0;
  const abnormalCount = formData.num_abnormal || 0;
  const breakBulkCount = formData.num_breakbulk || 0;

  const sixMeterCost = sixMeterRate * sixMeterCount;
  const twelveMeterCost = twelveMeterRate * twelveMeterCount;
  const abnormalCost = abnormalRate * abnormalCount;
  const breakBulkCost =
    isCrossHaul && formData.rateWeight === "Container" ? breakBulkRate * breakBulkCount : 0;

  const surchargeTotal = containers.reduce((sum, c) => {
    if (c.addSurcharges) {
      const resolved = c.is_12m_surcharge
        ? Number(c.surcharge_12m_amount) || 0
        : Number(c.surchargeAmount) || 0;
      return sum + resolved;
    }
    return sum;
  }, 0);

  const totalCost = sixMeterCost + twelveMeterCost + abnormalCost + breakBulkCost + surchargeTotal;

  // MIRRORS: ControllerInstructions.jsx:1558 — add-on force-zero
  if (formData.shipmentTypeId === "5") return 0;

  return totalCost;
}

// ===========================================================================
// Tests — isFieldValid
// ===========================================================================
describe("isFieldValid (create form)", () => {
  const base = { isCrossHaul: false, isWeightBased: false, isSetRate: false };

  test("standard required field with value returns true", () => {
    expect(isFieldValid("clientId", "42", base)).toBe(true);
  });

  test("standard required field with empty string returns falsy", () => {
    expect(isFieldValid("clientId", "", base)).toBeFalsy();
  });

  test("standard required field with whitespace-only returns falsy", () => {
    expect(isFieldValid("pickup", "   ", base)).toBeFalsy();
  });

  test("stackDate required when not cross-haul and value missing returns falsy", () => {
    expect(isFieldValid("stackDate", "", { ...base, isCrossHaul: false })).toBeFalsy();
  });

  test("stackDate returns true when cross-haul regardless of value", () => {
    expect(isFieldValid("stackDate", "", { ...base, isCrossHaul: true })).toBe(true);
  });

  test("vesselName returns true when cross-haul regardless of value", () => {
    expect(isFieldValid("vesselName", "", { ...base, isCrossHaul: true })).toBe(true);
  });

  test("unitrate returns true when cross-haul AND isSetRate (cross-haul set-rate override)", () => {
    expect(isFieldValid("unitrate", "", { ...base, isCrossHaul: true, isSetRate: true })).toBe(true);
  });

  test("weight returns true when not weight-based (weight field irrelevant)", () => {
    expect(isFieldValid("weight", "", { ...base, isWeightBased: false })).toBe(true);
  });

  test("weight returns falsy when weight-based and empty", () => {
    expect(isFieldValid("weight", "", { ...base, isWeightBased: true })).toBeFalsy();
  });

  test("unknown field name always returns true", () => {
    expect(isFieldValid("someFutureField", "", base)).toBe(true);
  });
});

// ===========================================================================
// Tests — validateForm
// ===========================================================================
describe("validateForm (create form)", () => {
  const validBase = {
    clientId: "1",
    shipmentTypeId: "1",
    pickup: "Cape Town",
    dropoff: "Durban",
    task: "KSM-001",
    lastFreeDate: "2026-05-01",
    bookingRef: "BR-001",
    fileRef: "FR-001",
    description: "Test shipment",
    vesselName: "MV Test",
    stackDate: "2026-05-10",
    num_six_meters: 1,
    num_twelve_meters: 0,
    num_abnormal: 0,
    num_breakbulk: 0,
    rateWeight: "Container",
    sixMeterRate: "1000",
  };

  const flags = { isCrossHaul: false, isWeightBased: false, isAddOn: false, isSetRate: false, isSetRateMode: false };

  test("fully valid non-cross-haul form returns no errors", () => {
    const errors = validateForm(validBase, flags);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  test("missing clientId produces clientId error", () => {
    const errors = validateForm({ ...validBase, clientId: null }, flags);
    expect(errors.clientId).toBeDefined();
  });

  test("missing pickup produces pickup error", () => {
    const errors = validateForm({ ...validBase, pickup: null }, flags);
    expect(errors.pickup).toBeDefined();
  });

  test("cross-haul: vesselName and stackDate are NOT required", () => {
    const errors = validateForm(
      { ...validBase, vesselName: null, stackDate: null },
      { ...flags, isCrossHaul: true }
    );
    expect(errors.vesselName).toBeUndefined();
    expect(errors.stackDate).toBeUndefined();
  });

  test("add-on: task, lastFreeDate, bookingRef, fileRef, description not required", () => {
    const errors = validateForm(
      { ...validBase, task: null, lastFreeDate: null, bookingRef: null, fileRef: null, description: null },
      { ...flags, isAddOn: true }
    );
    expect(errors.task).toBeUndefined();
    expect(errors.lastFreeDate).toBeUndefined();
    expect(errors.bookingRef).toBeUndefined();
    expect(errors.fileRef).toBeUndefined();
    expect(errors.description).toBeUndefined();
  });

  test("add-on: container count of 0 does NOT produce containerCount error", () => {
    const errors = validateForm(
      { ...validBase, num_six_meters: 0, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 },
      { ...flags, isAddOn: true }
    );
    expect(errors.containerCount).toBeUndefined();
  });

  test("container-based non-add-on with 0 containers produces containerCount error", () => {
    const errors = validateForm(
      { ...validBase, num_six_meters: 0, num_twelve_meters: 0, num_abnormal: 0 },
      flags
    );
    expect(errors.containerCount).toBeDefined();
  });

  test("weight-based: weight required unless shipmentTypeId is '4'", () => {
    const errors = validateForm(
      { ...validBase, weight: "", unitrate: "50" },
      { ...flags, isWeightBased: true }
    );
    expect(errors.weight).toBeDefined();
  });

  test("weight-based shipmentTypeId '4': weight NOT required", () => {
    const errors = validateForm(
      { ...validBase, shipmentTypeId: "4", weight: "", unitrate: "50" },
      { ...flags, isWeightBased: true }
    );
    expect(errors.weight).toBeUndefined();
  });

  test("weight-based with shipmentTypeId '4' AND isSetRate: unitrate NOT required", () => {
    const errors = validateForm(
      { ...validBase, shipmentTypeId: "4", weight: "", unitrate: "" },
      { ...flags, isWeightBased: true, isSetRate: true }
    );
    expect(errors.unitrate).toBeUndefined();
  });

  test("set-rate mode: setRateAmount required", () => {
    const errors = validateForm(
      { ...validBase, setRateAmount: "" },
      { ...flags, isSetRateMode: true }
    );
    expect(errors.setRateAmount).toBeDefined();
  });

  test("cross-haul with breakbulk count > 0 and Container rate-weight: rateper_breakbulk required", () => {
    const errors = validateForm(
      { ...validBase, num_six_meters: 0, num_breakbulk: 2, rateWeight: "Container", rateper_breakbulk: "" },
      { ...flags, isCrossHaul: true }
    );
    expect(errors.rateper_breakbulk).toBeDefined();
  });

  test("cross-haul breakbulk count > 0 but rateWeight is NOT Container: rateper_breakbulk not required", () => {
    const errors = validateForm(
      { ...validBase, num_six_meters: 1, num_breakbulk: 2, rateWeight: "ton", rateper_breakbulk: "" },
      { ...flags, isCrossHaul: true }
    );
    expect(errors.rateper_breakbulk).toBeUndefined();
  });

  // UNCLEAR — verify this manually before refactoring:
  // isSetRateMode=true and isAddOn=true — the isSetRateMode branch is entered
  // (before the !isAddOn branch), so setRateAmount would still be required.
  test("UNCLEAR: set-rate mode + add-on: setRateAmount still required because isSetRateMode branch runs first", () => {
    const errors = validateForm(
      { ...validBase, setRateAmount: "" },
      { ...flags, isSetRateMode: true, isAddOn: true }
    );
    expect(errors.setRateAmount).toBeDefined();
  });
});

// ===========================================================================
// Tests — checkRateCountMismatch
// ===========================================================================
describe("checkRateCountMismatch (create form)", () => {
  const baseFormData = {
    sixMeterRate: "0",
    twelveMeterRate: "0",
    abnormalRate: "0",
    rateper_breakbulk: "0",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    num_breakbulk: 0,
  };

  test("no rates set: no confirmation needed", () => {
    const result = checkRateCountMismatch(baseFormData, {
      isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: false,
    });
    expect(result.needsConfirmation).toBe(false);
  });

  test("isWeightBased=true: always returns no confirmation", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, sixMeterRate: "500", num_six_meters: 0 },
      { isWeightBased: true, isSetRateMode: false, isAddOn: false, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(false);
    expect(result.message).toBe("");
  });

  test("isAddOn=true: always returns no confirmation", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, sixMeterRate: "500", num_six_meters: 0 },
      { isWeightBased: false, isSetRateMode: false, isAddOn: true, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(false);
  });

  test("rate set for 6m but count is 0: confirmation needed", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, sixMeterRate: "500" },
      { isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(true);
    expect(result.message).toContain("Are you sure you want to continue?");
  });

  test("rate set and count > 0 for 6m: no confirmation needed", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, sixMeterRate: "500", num_six_meters: 2 },
      { isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(false);
  });

  test("cross-haul: break bulk rate > 0 with 0 count triggers confirmation", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, rateper_breakbulk: "200", num_breakbulk: 0 },
      { isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: true }
    );
    expect(result.needsConfirmation).toBe(true);
  });

  test("non-cross-haul: break bulk rate > 0 with 0 count does NOT trigger confirmation", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, rateper_breakbulk: "200", num_breakbulk: 0 },
      { isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(false);
  });

  test("mixed: some rates set with counts, others without — confirmation needed; message lists types with counts", () => {
    const result = checkRateCountMismatch(
      { ...baseFormData, sixMeterRate: "500", num_six_meters: 2, twelveMeterRate: "800", num_twelve_meters: 0 },
      { isWeightBased: false, isSetRateMode: false, isAddOn: false, isCrossHaul: false }
    );
    expect(result.needsConfirmation).toBe(true);
    expect(result.message).toContain("6m (2 containers");
  });
});

// ===========================================================================
// Tests — container-based cost calculation
// ===========================================================================
describe("calcContainerBasedCost (create form)", () => {
  const baseFormData = {
    sixMeterRate: "1000",
    twelveMeterRate: "1500",
    abnormalRate: "2000",
    rateper_breakbulk: "500",
    num_six_meters: 2,
    num_twelve_meters: 1,
    num_abnormal: 0,
    num_breakbulk: 0,
    rateWeight: "Container",
    shipmentTypeId: "1",
  };

  test("simple container calculation: sum of rate × count per type", () => {
    const cost = calcContainerBasedCost(baseFormData, [], { isCrossHaul: false });
    // 2*1000 + 1*1500 + 0*2000 = 3500
    expect(cost).toBe(3500);
  });

  test("surcharges on containers are added to total", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 300, surcharge_12m_amount: 0 },
    ];
    const cost = calcContainerBasedCost(baseFormData, containers, { isCrossHaul: false });
    expect(cost).toBe(3800);
  });

  test("12m surcharge resolved from surcharge_12m_amount when is_12m_surcharge=true", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: true, surchargeAmount: 100, surcharge_12m_amount: 400 },
    ];
    const cost = calcContainerBasedCost(baseFormData, containers, { isCrossHaul: false });
    expect(cost).toBe(3900); // 3500 + 400
  });

  test("break bulk cost only applies when isCrossHaul AND rateWeight is Container", () => {
    const fd = { ...baseFormData, num_breakbulk: 3 };
    const crossHaulCost = calcContainerBasedCost(fd, [], { isCrossHaul: true });
    const nonCrossHaulCost = calcContainerBasedCost(fd, [], { isCrossHaul: false });
    expect(crossHaulCost).toBe(3500 + 3 * 500); // 5000
    expect(nonCrossHaulCost).toBe(3500);
  });

  test("break bulk excluded when isCrossHaul but rateWeight is not Container", () => {
    const fd = { ...baseFormData, num_breakbulk: 3, rateWeight: "ton" };
    const cost = calcContainerBasedCost(fd, [], { isCrossHaul: true });
    expect(cost).toBe(3500);
  });

  test("shipmentTypeId '5' (add-on): total cost forced to 0 regardless of rates", () => {
    const fd = { ...baseFormData, shipmentTypeId: "5" };
    const cost = calcContainerBasedCost(fd, [], { isCrossHaul: false });
    expect(cost).toBe(0);
  });

  test("all counts zero: cost is 0", () => {
    const fd = {
      ...baseFormData,
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
    };
    const cost = calcContainerBasedCost(fd, [], { isCrossHaul: false });
    expect(cost).toBe(0);
  });

  test("containers without addSurcharges are ignored in surcharge total", () => {
    const containers = [
      { addSurcharges: false, surchargeAmount: 999, is_12m_surcharge: false, surcharge_12m_amount: 0 },
    ];
    const cost = calcContainerBasedCost(baseFormData, containers, { isCrossHaul: false });
    expect(cost).toBe(3500);
  });
});
