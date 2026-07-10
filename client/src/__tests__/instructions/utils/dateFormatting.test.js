import { formatDateForDB, formatDateForInput } from "../../../utils/instructions/dateFormatting";

describe("formatDateForDB", () => {
  it("returns null for empty / falsy input", () => {
    expect(formatDateForDB(null)).toBeNull();
    expect(formatDateForDB("")).toBeNull();
    expect(formatDateForDB(undefined)).toBeNull();
  });

  it("passes through an already-YYYY-MM-DD string unchanged", () => {
    expect(formatDateForDB("2024-03-15")).toBe("2024-03-15");
  });

  it("converts MM/DD/YYYY to YYYY-MM-DD", () => {
    expect(formatDateForDB("03/15/2024")).toBe("2024-03-15");
    expect(formatDateForDB("1/5/2024")).toBe("2024-01-05");
  });

  it("returns null for an unparseable string", () => {
    expect(formatDateForDB("not-a-date")).toBeNull();
  });
});

describe("formatDateForInput", () => {
  it("returns empty string for falsy input", () => {
    expect(formatDateForInput(null)).toBe("");
    expect(formatDateForInput("")).toBe("");
    expect(formatDateForInput(undefined)).toBe("");
  });

  it("passes through an already-YYYY-MM-DD string unchanged", () => {
    expect(formatDateForInput("2024-03-15")).toBe("2024-03-15");
  });

  it("converts MM/DD/YYYY to YYYY-MM-DD", () => {
    expect(formatDateForInput("03/15/2024")).toBe("2024-03-15");
    expect(formatDateForInput("1/5/2024")).toBe("2024-01-05");
  });

  it("returns the original string when it cannot be parsed", () => {
    expect(formatDateForInput("not-a-date")).toBe("not-a-date");
  });
});
