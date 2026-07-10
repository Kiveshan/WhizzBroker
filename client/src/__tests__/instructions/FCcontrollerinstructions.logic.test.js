/**
 * Characterization tests for FCcontrollerinstructions.jsx (update form).
 *
 * These tests document CURRENT behaviour. They are NOT tests of desired
 * behaviour — they capture what the code actually does right now, even if
 * that behaviour seems wrong or surprising.
 *
 * Each function is replicated verbatim with source-line annotations.
 */

// ---------------------------------------------------------------------------
// MIRRORS: FCcontrollerinstructions.jsx:952 — validateContainerUniqueness
// The real function calls setErrorModal on failure; here we capture that via
// a callback parameter so we can assert it was called.
// ---------------------------------------------------------------------------
function validateContainerUniqueness(containers, isAddOn, setErrorModal) {
  if (isAddOn) {
    return true;
  }
  const containerNumbers = containers
    .map((c) => c.containerNum)
    .filter((num) => num.trim() !== "");
  const uniqueNumbers = new Set(containerNumbers);

  if (containerNumbers.length !== uniqueNumbers.size) {
    setErrorModal({
      isOpen: true,
      message: "Container numbers must be unique within the same instruction.",
    });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// MIRRORS: FCcontrollerinstructions.jsx:1082 — checkRateCounterMismatch
// Returns boolean (unlike create-side which returns {needsConfirmation, message}).
// Side-effect: calls setConfirmationModal when false.
// ---------------------------------------------------------------------------
function checkRateCounterMismatch(formData, isAddOn, setConfirmationModal) {
  if (isAddOn) {
    return true;
  }
  const mismatches = [];
  const containerTypesWithCounts = [];

  if (
    (formData.rateper_6 > 0 || Number(formData.rateper_6) > 0) &&
    formData.num_six_meters === 0
  ) {
    mismatches.push("6m");
  }
  if (
    (formData.rateper_12 > 0 || Number(formData.rateper_12) > 0) &&
    formData.num_twelve_meters === 0
  ) {
    mismatches.push("12m");
  }
  if (
    (formData.rateper_abnormal > 0 || Number(formData.rateper_abnormal) > 0) &&
    formData.num_abnormal === 0
  ) {
    mismatches.push("Abnormal");
  }

  if (mismatches.length > 0) {
    if (formData.num_six_meters > 0) {
      containerTypesWithCounts.push(
        `6m (${formData.num_six_meters} containers, Rate: R${formData.rateper_6})`
      );
    }
    if (formData.num_twelve_meters > 0) {
      containerTypesWithCounts.push(
        `12m (${formData.num_twelve_meters} containers, Rate: R${formData.rateper_12})`
      );
    }
    if (formData.num_abnormal > 0) {
      containerTypesWithCounts.push(
        `Abnormal (${formData.num_abnormal} containers, Rate: R${formData.rateper_abnormal})`
      );
    }

    const message =
      containerTypesWithCounts.length > 0
        ? `You have containers with the following rates: ${containerTypesWithCounts.join(
            ", "
          )}. Are you sure you want to continue?`
        : "You have set rates for container types with 0 containers. Are you sure you want to continue?";

    setConfirmationModal({
      isOpen: true,
      message: message,
      action: "save",
    });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// MIRRORS: FCcontrollerinstructions.jsx:1354 — formatDateForDB
// Defined inside performSave; replicated as a standalone function.
// ---------------------------------------------------------------------------
function formatDateForDB(dateString) {
  if (!dateString) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    if (dateString.includes("/")) {
      const [month, day, year] = dateString.split("/");
      if (year && month && day) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// MIRRORS: FCcontrollerinstructions.jsx:2866 — calculateTotalCostFromRates
// The real function closes over the `containers` state variable.
// Here it is passed explicitly as a parameter.
// ---------------------------------------------------------------------------
function calculateTotalCostFromRates(
  rate6,
  rate12,
  rateAbnormal,
  count6,
  count12,
  countAbnormal,
  containers
) {
  const baseCost = rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal;

  const surchargeTotal = containers
    .filter((container) => container.addSurcharges === true)
    .reduce((total, container) => {
      const resolved = container.is_12m_surcharge
        ? Number(container.surcharge_12m_amount || 0)
        : Number(container.surchargeAmount || 0);
      return total + resolved;
    }, 0);

  const hazardousTotal = containers
    .filter((container) => container.hazardous === true)
    .reduce((total, container) => {
      const hazAmount = Number(container.hazardousAmount) || 0;
      return total + hazAmount;
    }, 0);

  const vgmTotal = containers
    .filter((container) => container.vgm === true)
    .reduce((total, container) => total + (Number(container.vgmAmount) || 0), 0);

  return baseCost + surchargeTotal + hazardousTotal + vgmTotal;
}

// ---------------------------------------------------------------------------
// MIRRORS: FCcontrollerinstructions.jsx:3410 — isCrossHaulShipment
// Depends on shipmentTypes array and formData.shipmentTypeId.
// ---------------------------------------------------------------------------
function isCrossHaulShipment(formData, shipmentTypes) {
  const selectedShipmentType = shipmentTypes.find(
    (type) => type.shipkey.toString() === formData.shipmentTypeId
  );
  return (
    selectedShipmentType &&
    (selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul" ||
      String(formData.shipmentTypeId) === "4")
  );
}

// ===========================================================================
// Tests — validateContainerUniqueness
// ===========================================================================
describe("validateContainerUniqueness (FC update form)", () => {
  test("isAddOn=true: always returns true regardless of duplicates", () => {
    const containers = [
      { containerNum: "ABC123" },
      { containerNum: "ABC123" },
    ];
    const mockSetError = jest.fn();
    expect(validateContainerUniqueness(containers, true, mockSetError)).toBe(true);
    expect(mockSetError).not.toHaveBeenCalled();
  });

  test("unique container numbers: returns true", () => {
    const containers = [
      { containerNum: "ABC123" },
      { containerNum: "DEF456" },
    ];
    const mockSetError = jest.fn();
    expect(validateContainerUniqueness(containers, false, mockSetError)).toBe(true);
    expect(mockSetError).not.toHaveBeenCalled();
  });

  test("duplicate container numbers: returns false and calls setErrorModal", () => {
    const containers = [
      { containerNum: "ABC123" },
      { containerNum: "ABC123" },
    ];
    const mockSetError = jest.fn();
    expect(validateContainerUniqueness(containers, false, mockSetError)).toBe(false);
    expect(mockSetError).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true })
    );
  });

  test("empty container numbers are excluded from uniqueness check", () => {
    const containers = [
      { containerNum: "" },
      { containerNum: "" },
      { containerNum: "ABC123" },
    ];
    const mockSetError = jest.fn();
    expect(validateContainerUniqueness(containers, false, mockSetError)).toBe(true);
  });
});

// ===========================================================================
// Tests — checkRateCounterMismatch (FC — returns boolean, not object)
// ===========================================================================
describe("checkRateCounterMismatch (FC update form)", () => {
  const baseFormData = {
    rateper_6: 0,
    rateper_12: 0,
    rateper_abnormal: 0,
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  };

  test("isAddOn=true: returns true without calling setConfirmationModal", () => {
    const mockSetModal = jest.fn();
    expect(checkRateCounterMismatch(baseFormData, true, mockSetModal)).toBe(true);
    expect(mockSetModal).not.toHaveBeenCalled();
  });

  test("no rates set: returns true", () => {
    const mockSetModal = jest.fn();
    expect(checkRateCounterMismatch(baseFormData, false, mockSetModal)).toBe(true);
  });

  test("rateper_6 > 0 with num_six_meters = 0: returns false and calls modal", () => {
    const mockSetModal = jest.fn();
    const fd = { ...baseFormData, rateper_6: 500 };
    expect(checkRateCounterMismatch(fd, false, mockSetModal)).toBe(false);
    expect(mockSetModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true, action: "save" })
    );
  });

  test("rateper_6 > 0 with num_six_meters > 0: no mismatch on 6m; returns true", () => {
    const mockSetModal = jest.fn();
    const fd = { ...baseFormData, rateper_6: 500, num_six_meters: 2 };
    expect(checkRateCounterMismatch(fd, false, mockSetModal)).toBe(true);
  });

  // UNCLEAR — verify this manually before refactoring:
  // FC's checkRateCounterMismatch does NOT check break bulk (unlike the create-side).
  // This may be intentional (break bulk is cross-haul only) or an omission.
  test("UNCLEAR: break bulk rate is NOT checked — no mismatch regardless of rateper_breakbulk", () => {
    const mockSetModal = jest.fn();
    const fd = { ...baseFormData, rateper_breakbulk: 300, num_breakbulk: 0 };
    expect(checkRateCounterMismatch(fd, false, mockSetModal)).toBe(true);
  });

  test("string rate '500' is coerced to number for comparison", () => {
    const mockSetModal = jest.fn();
    const fd = { ...baseFormData, rateper_6: "500", num_six_meters: 0 };
    expect(checkRateCounterMismatch(fd, false, mockSetModal)).toBe(false);
  });
});

// ===========================================================================
// Tests — formatDateForDB
// ===========================================================================
describe("formatDateForDB (FC update form)", () => {
  test("null returns null", () => {
    expect(formatDateForDB(null)).toBeNull();
  });

  test("undefined returns null", () => {
    expect(formatDateForDB(undefined)).toBeNull();
  });

  test("empty string returns null", () => {
    expect(formatDateForDB("")).toBeNull();
  });

  test("YYYY-MM-DD passthrough: returned unchanged", () => {
    expect(formatDateForDB("2026-05-15")).toBe("2026-05-15");
  });

  test("MM/DD/YYYY converted to YYYY-MM-DD", () => {
    expect(formatDateForDB("05/15/2026")).toBe("2026-05-15");
  });

  test("single-digit month/day is zero-padded", () => {
    expect(formatDateForDB("3/7/2026")).toBe("2026-03-07");
  });

  // UNCLEAR — verify this manually before refactoring:
  // ISO string parsing uses `new Date()` which interprets UTC midnight as the
  // previous local day in timezones west of UTC. The comment "Fixed timezone
  // handling" in the source suggests this was meant to be local time, but
  // the test result depends on the host timezone.
  test("UNCLEAR: ISO string '2026-05-15T00:00:00Z' result is timezone-dependent", () => {
    const result = formatDateForDB("2026-05-15T00:00:00Z");
    // In UTC: 2026-05-15. In UTC-5: could be 2026-05-14.
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("completely invalid string returns null", () => {
    expect(formatDateForDB("not-a-date")).toBeNull();
  });
});

// ===========================================================================
// Tests — calculateTotalCostFromRates (FC update form)
// Unlike create-side, this adds surcharges + hazardous + VGM.
// ===========================================================================
describe("calculateTotalCostFromRates (FC update form)", () => {
  test("no containers: base cost only", () => {
    expect(calculateTotalCostFromRates(1000, 1500, 2000, 2, 1, 0, [])).toBe(3500);
  });

  test("containers with addSurcharges=false contribute nothing", () => {
    const containers = [{ addSurcharges: false, surchargeAmount: 999 }];
    expect(calculateTotalCostFromRates(1000, 0, 0, 1, 0, 0, containers)).toBe(1000);
  });

  test("6m surcharge added from surchargeAmount when is_12m_surcharge=false", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: false, surchargeAmount: 200, surcharge_12m_amount: 0 },
    ];
    expect(calculateTotalCostFromRates(1000, 0, 0, 1, 0, 0, containers)).toBe(1200);
  });

  test("12m surcharge added from surcharge_12m_amount when is_12m_surcharge=true", () => {
    const containers = [
      { addSurcharges: true, is_12m_surcharge: true, surchargeAmount: 100, surcharge_12m_amount: 350 },
    ];
    expect(calculateTotalCostFromRates(0, 1500, 0, 0, 1, 0, containers)).toBe(1850);
  });

  test("hazardous amounts are summed and added", () => {
    const containers = [
      { hazardous: true, hazardousAmount: 500 },
      { hazardous: true, hazardousAmount: 300 },
    ];
    expect(calculateTotalCostFromRates(1000, 0, 0, 1, 0, 0, containers)).toBe(1800);
  });

  test("VGM amounts are summed and added", () => {
    const containers = [
      { vgm: true, vgmAmount: 150 },
    ];
    expect(calculateTotalCostFromRates(1000, 0, 0, 1, 0, 0, containers)).toBe(1150);
  });

  test("all extras combined: base + surcharge + hazardous + VGM", () => {
    const containers = [
      {
        addSurcharges: true,
        is_12m_surcharge: false,
        surchargeAmount: 100,
        surcharge_12m_amount: 0,
        hazardous: true,
        hazardousAmount: 200,
        vgm: true,
        vgmAmount: 50,
      },
    ];
    // base: 1000*1 = 1000, surcharge: 100, hazardous: 200, vgm: 50 => 1350
    expect(calculateTotalCostFromRates(1000, 0, 0, 1, 0, 0, containers)).toBe(1350);
  });

  test("hazardous=false containers are excluded from hazardous total", () => {
    const containers = [{ hazardous: false, hazardousAmount: 999 }];
    expect(calculateTotalCostFromRates(500, 0, 0, 1, 0, 0, containers)).toBe(500);
  });

  test("all zeros returns 0", () => {
    expect(calculateTotalCostFromRates(0, 0, 0, 0, 0, 0, [])).toBe(0);
  });
});

// ===========================================================================
// Tests — isCrossHaulShipment (FC update form)
// ===========================================================================
describe("isCrossHaulShipment (FC update form)", () => {
  const shipmentTypes = [
    { shipkey: 1, shipmenttype: "Import" },
    { shipkey: 2, shipmenttype: "Export" },
    { shipkey: 3, shipmenttype: "Cross-Haul" },
    { shipkey: 4, shipmenttype: "Cross-Haul Weight" },
    { shipkey: 5, shipmenttype: "Add-On" },
  ];

  test("shipmentTypeId '3' with name 'Cross-Haul': returns truthy", () => {
    expect(isCrossHaulShipment({ shipmentTypeId: "3" }, shipmentTypes)).toBeTruthy();
  });

  test("shipmentTypeId '4': returns truthy via hardcoded check", () => {
    expect(isCrossHaulShipment({ shipmentTypeId: "4" }, shipmentTypes)).toBeTruthy();
  });

  test("shipmentTypeId '1' (Import): returns falsy", () => {
    expect(isCrossHaulShipment({ shipmentTypeId: "1" }, shipmentTypes)).toBeFalsy();
  });

  test("unknown shipmentTypeId: returns falsy", () => {
    expect(isCrossHaulShipment({ shipmentTypeId: "99" }, shipmentTypes)).toBeFalsy();
  });

  // UNCLEAR — verify this manually before refactoring:
  // isCrossHaulShipment checks the name 'cross-haul' AND also hardcodes '4'.
  // If a future shipment type with id != 4 is named 'cross-haul' it would match.
  // But shipmentTypeId "4" ALWAYS matches even if the name isn't "cross-haul".
  test("UNCLEAR: shipmentTypeId '4' matches even if its name is not cross-haul", () => {
    const altTypes = [{ shipkey: 4, shipmenttype: "Something Else" }];
    expect(isCrossHaulShipment({ shipmentTypeId: "4" }, altTypes)).toBeTruthy();
  });
});
