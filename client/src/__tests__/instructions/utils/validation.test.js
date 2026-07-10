import { isFieldValid, validateForm } from "../../../utils/instructions/validation";

// ── isFieldValid ─────────────────────────────────────────────────────────────

describe("isFieldValid", () => {
  it("required text fields are invalid when empty", () => {
    for (const field of ["clientId", "shipmentTypeId", "pickup", "dropoff", "bookingRef"]) {
      expect(isFieldValid(field, "")).toBe(false);
      expect(isFieldValid(field, "   ")).toBe(false);
      expect(isFieldValid(field, null)).toBe(false);
    }
  });

  it("required text fields are valid when non-empty", () => {
    expect(isFieldValid("clientId", "abc")).toBe(true);
  });

  it("stackDate is valid when cross-haul regardless of value", () => {
    expect(isFieldValid("stackDate", "", { isCrossHaul: true })).toBe(true);
    expect(isFieldValid("stackDate", null, { isCrossHaul: true })).toBe(true);
  });

  it("stackDate is invalid when not cross-haul and empty", () => {
    expect(isFieldValid("stackDate", "", { isCrossHaul: false })).toBe(false);
  });

  it("unitrate is valid when cross-haul + setRate", () => {
    expect(isFieldValid("unitrate", "", { isCrossHaul: true, isSetRate: true })).toBe(true);
  });

  it("unitrate is invalid for weight-based when not cross-haul set-rate", () => {
    expect(isFieldValid("unitrate", "", { isWeightBased: true, isCrossHaul: false, isSetRate: false })).toBe(false);
  });

  it("unknown fields always valid", () => {
    expect(isFieldValid("someUnknownField", "")).toBe(true);
  });
});

// ── validateForm — create mode ───────────────────────────────────────────────

describe("validateForm — create mode", () => {
  const base = {
    clientId: "1", shipmentTypeId: "1", pickup: "Cape Town", dropoff: "Durban",
    task: "KSM001", lastFreeDate: "2024-01-01", bookingRef: "B001", fileRef: "F001",
    description: "Test", vesselName: "MV Test", stackDate: "2024-01-15",
    num_six_meters: 1, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0,
    rateWeight: "Container",
  };

  it("valid base form returns isValid=true with empty errors", () => {
    const { isValid, fieldErrors } = validateForm(base, [], { mode: "create" });
    expect(isValid).toBe(true);
    expect(Object.keys(fieldErrors)).toHaveLength(0);
  });

  it("missing clientId produces fieldError", () => {
    const { isValid, fieldErrors } = validateForm({ ...base, clientId: "" }, [], { mode: "create" });
    expect(isValid).toBe(false);
    expect(fieldErrors.clientId).toBeDefined();
  });

  it("missing task when not add-on produces fieldError", () => {
    const { fieldErrors } = validateForm({ ...base, task: "" }, [], { mode: "create", isAddOn: false });
    expect(fieldErrors.task).toBeDefined();
  });

  it("task not required for add-on", () => {
    const { isValid } = validateForm({ ...base, task: "" }, [], { mode: "create", isAddOn: true });
    // other required fields still populated
    expect(isValid).toBe(true);
  });

  it("vesselName and stackDate not required for cross-haul", () => {
    const fd = { ...base, vesselName: "", stackDate: "" };
    const { isValid, fieldErrors } = validateForm(fd, [], { mode: "create", isCrossHaul: true, isAddOn: false });
    expect(fieldErrors.vesselName).toBeUndefined();
    expect(fieldErrors.stackDate).toBeUndefined();
  });

  it("weight required for weight-based non-type-4", () => {
    const fd = { ...base, weight: "", shipmentTypeId: "1", rateWeight: "ton" };
    const { fieldErrors } = validateForm(fd, [], { mode: "create", isWeightBased: true });
    expect(fieldErrors.weight).toBeDefined();
  });

  it("weight not required for type-4 weight-based", () => {
    const fd = { ...base, weight: "", shipmentTypeId: "4", rateWeight: "ton" };
    const { fieldErrors } = validateForm(fd, [], { mode: "create", isWeightBased: true });
    expect(fieldErrors.weight).toBeUndefined();
  });

  it("zero containers fails when container-based and not add-on", () => {
    const fd = { ...base, num_six_meters: 0, num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0 };
    const { fieldErrors } = validateForm(fd, [], { mode: "create", isAddOn: false, isWeightBased: false, isSetRateMode: false });
    expect(fieldErrors.containerCount).toBeDefined();
  });
});

// ── validateForm — update mode ───────────────────────────────────────────────

describe("validateForm — update mode", () => {
  const base = {
    clientId: "1", shipmentTypeId: "1", pickup: "Cape Town", dropoff: "Durban",
    ksmFileRef: "KSM001", clientFileRef: "CF001", bookingRef: "B001",
    description: "Test", vesselName: "MV Test", stackDate: "2024-01-15",
  };

  it("valid base form returns isValid=true", () => {
    const { isValid } = validateForm(base, [], { mode: "update" });
    expect(isValid).toBe(true);
  });

  it("missing ksmFileRef produces error", () => {
    const { fieldErrors } = validateForm({ ...base, ksmFileRef: "" }, [], { mode: "update" });
    expect(fieldErrors.ksmFileRef).toBeDefined();
  });

  it("vesselName required for type 1 (import) when not add-on", () => {
    const fd = { ...base, vesselName: "", shipmentTypeId: "1" };
    const { fieldErrors } = validateForm(fd, [], { mode: "update", isAddOn: false });
    expect(fieldErrors.vesselName).toBeDefined();
  });

  it("vesselName not required for type 4", () => {
    const fd = { ...base, vesselName: "", shipmentTypeId: "4" };
    const { fieldErrors } = validateForm(fd, [], { mode: "update", isAddOn: false });
    expect(fieldErrors.vesselName).toBeUndefined();
  });

  it("container number required for non-export types", () => {
    const containers = [{ id: 1, containerNum: "" }];
    const { containerErrors, isValid } = validateForm(
      { ...base, shipmentTypeId: "1" },
      containers,
      { mode: "update", isAddOn: false }
    );
    expect(isValid).toBe(false);
    expect(containerErrors["container-1"]).toBeDefined();
  });

  it("container number not required for export (type 2)", () => {
    const containers = [{ id: 1, containerNum: "" }];
    const { containerErrors } = validateForm(
      { ...base, shipmentTypeId: "2" },
      containers,
      { mode: "update", isAddOn: false }
    );
    expect(containerErrors["container-1"]).toBeUndefined();
  });

  it("duplicate container numbers produce containerUniqueness error", () => {
    const containers = [
      { id: 1, containerNum: "ABC123" },
      { id: 2, containerNum: "ABC123" },
    ];
    const { fieldErrors, isValid } = validateForm(base, containers, { mode: "update", isAddOn: false });
    expect(isValid).toBe(false);
    expect(fieldErrors.containerUniqueness).toBeDefined();
  });
});
