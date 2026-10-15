import { instructionValue, savedInstructionValue } from "../../../utils/instructions/instructionValue"

describe("instructionValue", () => {
  it("prices containers plus per-container charges, then VAT (matches saved instruction 1941)", () => {
    const v = instructionValue({
      shipmentTypeId: "1",
      rateWeight: "Container",
      counts: { six: 1, twelve: 1 },
      rates: { six: 1000, twelve: 1500 },
      containers: [
        { vgm: true, vgmAmount: 150, selectedExtraCharges: [{ charge_name: "Weighbridge", amount: 60 }] },
        { hazardous: true, hazardousAmount: 200 },
      ],
      vat: 15,
    })
    expect(v.lines.map((l) => [l.label, l.amount])).toEqual([
      ["6m", 1000],
      ["12m", 1500],
      ["Hazardous", 200],
      ["VGM", 150],
      ["Weighbridge", 60],
    ])
    expect(v.subtotal).toBe(2910)
    expect(v.vatAmount).toBe(436.5)
    expect(v.total).toBe(3346.5)
  })

  it("uses the 12m surcharge amount for 12m surcharges and counts surcharges even at R0", () => {
    const v = instructionValue({
      shipmentTypeId: "1",
      counts: { twelve: 1 },
      rates: { twelve: 900 },
      containers: [{ addSurcharges: true, is_12m_surcharge: true, surcharge_12m_amount: "35.00", surchargeAmount: 0 }],
      vat: 0,
    })
    expect(v.subtotal).toBe(935)
    expect(v.vatAmount).toBe(0)
  })

  it("set rate is the rate per load with nothing added on top", () => {
    const v = instructionValue({
      shipmentTypeId: "4",
      rateWeight: "ton",
      setRate: 4000,
      weightRows: [{ weight: 25 }, { weight: 10 }],
      containers: [{ hazardous: true, hazardousAmount: 999 }],
      vat: 15,
    })
    expect(v.subtotal).toBe(8000)
    expect(v.total).toBe(9200)
  })

  it("break bulk by weight is total weight × unit rate, without VGM", () => {
    const v = instructionValue({
      shipmentTypeId: "4",
      rateWeight: "ton",
      unitRate: "100",
      weightRows: [{ weight: "12.5" }, { weight: "" }, { weight: 7.5 }],
      containers: [{ vgm: true, vgmAmount: 150 }],
      vat: 15,
    })
    expect(v.subtotal).toBe(2000)
  })

  it("add-ons have no value of their own", () => {
    const v = instructionValue({ shipmentTypeId: "5", counts: { six: 2 }, rates: { six: 300 } })
    expect(v.isAddOn).toBe(true)
    expect(v.total).toBe(0)
  })
})

describe("savedInstructionValue", () => {
  const value = instructionValue({ shipmentTypeId: "1", counts: { six: 1 }, rates: { six: 1000 }, vat: 15 })

  it("keeps the breakdown when it adds up to the saved total", () => {
    expect(savedInstructionValue(value, 1000)).toBe(value)
  })

  it("falls back to the saved total when it does not", () => {
    const saved = savedInstructionValue(value, 900)
    expect(saved.lines).toEqual([{ label: "Instruction total", detail: "as saved", amount: 900 }])
    expect(saved.total).toBe(1035)
  })
})
