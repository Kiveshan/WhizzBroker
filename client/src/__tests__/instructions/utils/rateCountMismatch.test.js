import { checkRateCountMismatch } from "../../../utils/instructions/rateCountMismatch";

const noMismatch = { needsConfirmation: false, message: "" };

describe("checkRateCountMismatch", () => {
  // ── early-exit flags ───────────────────────────────────────────────────────
  it("returns no-confirmation for add-on shipments", () => {
    const fd = { rateper_6: 100, num_six_meters: 0 };
    expect(checkRateCountMismatch(fd, { isAddOn: true })).toEqual(noMismatch);
  });

  it("returns no-confirmation for weight-based shipments", () => {
    const fd = { rateper_6: 100, num_six_meters: 0 };
    expect(checkRateCountMismatch(fd, { isWeightBased: true })).toEqual(noMismatch);
  });

  it("returns no-confirmation for set-rate-mode shipments", () => {
    const fd = { rateper_6: 100, num_six_meters: 0 };
    expect(checkRateCountMismatch(fd, { isSetRateMode: true })).toEqual(noMismatch);
  });

  // ── no mismatch ────────────────────────────────────────────────────────────
  it("returns no-confirmation when all rates match counts", () => {
    const fd = {
      rateper_6: 100, num_six_meters: 2,
      rateper_12: 0, num_twelve_meters: 0,
      rateper_abnormal: 0, num_abnormal: 0,
    };
    expect(checkRateCountMismatch(fd)).toEqual(noMismatch);
  });

  // ── mismatch detected ──────────────────────────────────────────────────────
  it("flags 6m mismatch: rate > 0 but count = 0", () => {
    const fd = { rateper_6: 100, num_six_meters: 0, rateper_12: 0, num_twelve_meters: 0, rateper_abnormal: 0, num_abnormal: 0 };
    const result = checkRateCountMismatch(fd);
    expect(result.needsConfirmation).toBe(true);
    expect(result.message).toMatch(/Are you sure/);
  });

  it("flags 12m mismatch", () => {
    const fd = { rateper_6: 0, num_six_meters: 0, rateper_12: 200, num_twelve_meters: 0, rateper_abnormal: 0, num_abnormal: 0 };
    const result = checkRateCountMismatch(fd);
    expect(result.needsConfirmation).toBe(true);
  });

  it("includes containers with counts in the message", () => {
    const fd = {
      rateper_6: 100, num_six_meters: 0, // mismatch — no 6m containers
      rateper_12: 200, num_twelve_meters: 3, // counts present
      rateper_abnormal: 0, num_abnormal: 0,
    };
    const result = checkRateCountMismatch(fd);
    expect(result.needsConfirmation).toBe(true);
    expect(result.message).toContain("12m");
    expect(result.message).toContain("3 containers");
  });

  // ── create-form field names ────────────────────────────────────────────────
  it("accepts sixMeterRate / twelveMeterRate / abnormalRate field names", () => {
    const fd = { sixMeterRate: "100", num_six_meters: 0, twelveMeterRate: "0", num_twelve_meters: 0, abnormalRate: "0", num_abnormal: 0 };
    const result = checkRateCountMismatch(fd);
    expect(result.needsConfirmation).toBe(true);
  });

  // ── break-bulk (cross-haul only) ───────────────────────────────────────────
  it("checks break-bulk only when isCrossHaul=true", () => {
    const fd = { rateper_6: 0, num_six_meters: 0, rateper_12: 0, num_twelve_meters: 0, rateper_abnormal: 0, num_abnormal: 0, rateper_breakbulk: 50, num_breakbulk: 0 };
    expect(checkRateCountMismatch(fd, { isCrossHaul: false })).toEqual(noMismatch);
    expect(checkRateCountMismatch(fd, { isCrossHaul: true }).needsConfirmation).toBe(true);
  });
});
