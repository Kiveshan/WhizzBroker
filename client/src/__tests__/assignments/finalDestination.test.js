import { finalDestination } from "../../utils/assignments/finalDestination";

describe("finalDestination", () => {
  const legs = [
    { legnumber: 2, destination: "Durban Port" },
    { legnumber: 1, destination: "Depot A" },
  ];

  it("uses the instruction dropoff when there is one", () => {
    expect(finalDestination("Cato Ridge", legs)).toBe("Cato Ridge");
  });

  it("falls back to the last leg's destination when there is no dropoff", () => {
    expect(finalDestination(null, legs)).toBe("Durban Port");
    expect(finalDestination("   ", legs)).toBe("Durban Port");
  });

  it("ignores legs without a destination", () => {
    expect(
      finalDestination("", [
        { legnumber: 1, destination: "Depot A" },
        { legnumber: 2, destination: "" },
      ])
    ).toBe("Depot A");
  });

  it("returns the empty dropoff when no leg has a destination", () => {
    expect(finalDestination(null, [])).toBe(null);
    expect(finalDestination(undefined, undefined)).toBe(undefined);
  });
});
