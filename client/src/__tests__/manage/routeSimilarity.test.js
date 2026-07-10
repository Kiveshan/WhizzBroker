import {
  normalize,
  levenshtein,
  similarity,
  findClosestRoute,
} from "../../pages/manage/components/rates/routeSimilarity.js"

describe("normalize", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    expect(normalize("  Cape   Town ")).toBe("cape town")
    expect(normalize("")).toBe("")
    expect(normalize(null)).toBe("")
  })
})

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("durban", "durban")).toBe(0)
  })
  it("counts single-character edits", () => {
    expect(levenshtein("durban", "durbn")).toBe(1) // deletion
    expect(levenshtein("cape town", "cpae town")).toBe(2) // transposition = 2 edits
  })
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3)
    expect(levenshtein("abc", "")).toBe(3)
  })
})

describe("similarity", () => {
  it("is 1 for identical and lower for different", () => {
    expect(similarity("durban", "durban")).toBe(1)
    expect(similarity("", "")).toBe(1)
    expect(similarity("durban", "durbn")).toBeGreaterThan(0.8)
  })
})

describe("findClosestRoute", () => {
  const routes = [
    { startingpoint: "Cape Town", destination: "Durban" },
    { startingpoint: "Bloemfontein", destination: "Kimberley" },
  ]

  it("returns null on an exact (normalized) match", () => {
    expect(findClosestRoute("cape town", " Durban ", routes)).toBeNull()
  })

  it("suggests the closest route for a misspelling", () => {
    const match = findClosestRoute("Cpae Town", "Durban", routes)
    expect(match).toEqual({ startingpoint: "Cape Town", destination: "Durban" })
  })

  it("returns null for a genuinely new route", () => {
    expect(findClosestRoute("Polokwane", "Nelspruit", routes)).toBeNull()
  })

  it("returns null when either field is empty", () => {
    expect(findClosestRoute("Cape Town", "", routes)).toBeNull()
    expect(findClosestRoute("", "Durban", routes)).toBeNull()
  })
})
