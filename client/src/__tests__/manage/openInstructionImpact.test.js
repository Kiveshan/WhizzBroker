import { findTitleChanges, cleanTitle } from "../../pages/manage/components/rateCards/openInstructionImpact"

jest.mock("../../api.js", () => ({ post: jest.fn() }))
jest.mock("../../pages/manage/utils/alertUtils.js", () => ({ showConfirmDialog: jest.fn() }))

describe("findTitleChanges", () => {
  const original = [
    { client_rate_id: 1, title: "Durban Port Run" },
    { client_rate_id: 2, title: "Local  Delivery" },
    { client_rate_id: 3, title: "Express" },
  ]

  it("reports real renames of existing rates", () => {
    const current = [
      { client_rate_id: 1, title: "Durban Port Run X" },
      { client_rate_id: 3, title: "Express" },
    ]
    expect(findTitleChanges(original, current, "client_rate_id", "client")).toEqual([
      { source: "client", id: 1, oldTitle: "Durban Port Run", newTitle: "Durban Port Run X" },
    ])
  })

  it("ignores whitespace-only edits, new rates and removed rates", () => {
    const current = [
      { client_rate_id: 2, title: " Local Delivery " },
      { title: "Brand new" },
    ]
    expect(findTitleChanges(original, current, "client_rate_id", "client")).toEqual([])
  })

  it("cleans titles the same way the server does", () => {
    expect(cleanTitle("  A   B \t")).toBe("A B")
  })
})
