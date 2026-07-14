"use client"

/**
 * GroupInvoiceDocument — the rendered combined group invoice (company header,
 * bill-to, one section per child instruction with one line per container type,
 * plus totals). Shared by the assignment preview modal and the full-page
 * group invoice view. `data` is the payload from getGroupInvoicePreview.
 */
const money = (n) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function GroupInvoiceDocument({ data }) {
  if (!data) return null
  const company = data.company || {}
  const invClient = data.client || {}
  const group = data.group || {}

  return (
    <div className="wb-inv-doc">
      <div className="wb-inv-top">
        <div>
          <div className="wb-inv-company">{company.companyname || "Company"}</div>
          <div className="wb-inv-muted">{company.address}</div>
          <div className="wb-inv-muted">{company.suburb}</div>
          <div className="wb-inv-muted">VAT: {company.vat_reg_num || "—"}</div>
          <div className="wb-inv-muted">{company.phonenumber}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="wb-inv-title">TAX INVOICE</div>
          <div className="wb-inv-muted">
            {group.invoiceNum ? `No: ${group.invoiceNum}` : "(not yet finalised)"}
          </div>
          <div className="wb-inv-muted">
            {group.invoiceDate ? new Date(group.invoiceDate).toLocaleDateString("en-GB") : ""}
          </div>
          <div className="wb-inv-muted">Group {group.groupRef || group.groupKey}</div>
        </div>
      </div>

      <div className="wb-inv-billto">
        <div className="wb-inv-billlabel">BILL TO</div>
        <div className="wb-inv-billname">{invClient.name}</div>
        <div className="wb-inv-muted">{invClient.address}</div>
        <div className="wb-inv-muted">{invClient.suburb}</div>
        <div className="wb-inv-muted">VAT: {invClient.vat || "—"}</div>
      </div>

      {(data.children || []).map((child) => (
        <div key={child.m1key} className="wb-inv-section">
          <div className="wb-inv-sectionhead">
            <span>
              {child.shipmentType} — {child.pickup} → {child.dropoff}
            </span>
            <span className="wb-inv-muted">
              {child.companyFileRef ? `Ref ${child.companyFileRef}` : ""}
              {child.vesselName ? ` · ${child.vesselName}` : ""}
            </span>
          </div>
          <table className="wb-inv-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Rate</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {child.lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="wb-inv-muted">No billable lines</td>
                </tr>
              ) : (
                child.lines.map((line, i) => (
                  <tr key={i}>
                    <td>{line.description}</td>
                    <td style={{ textAlign: "right" }}>{line.quantity ?? ""}</td>
                    <td style={{ textAlign: "right" }}>{line.rate != null ? money(line.rate) : ""}</td>
                    <td style={{ textAlign: "right" }}>{money(line.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}

      <div className="wb-inv-totals">
        <div className="wb-inv-totrow">
          <span>Subtotal</span>
          <span>{money(data.subtotal)}</span>
        </div>
        <div className="wb-inv-totrow">
          <span>VAT</span>
          <span>{money(data.vat)}</span>
        </div>
        <div className="wb-inv-totrow grand">
          <span>Total</span>
          <span>{money(data.total)}</span>
        </div>
      </div>
    </div>
  )
}

/** Shared styles for the group invoice document (used by modal + full view). */
export const groupInvoiceDocStyles = `
  .wb-inv-doc { padding: 26px 30px 34px; color: #101828; }
  .wb-inv-top { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 2px solid #101828; }
  .wb-inv-company { font-size: 18px; font-weight: 700; }
  .wb-inv-title { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; }
  .wb-inv-muted { font-size: 12px; color: #667085; margin-top: 2px; }
  .wb-inv-billto { margin: 18px 0 8px; }
  .wb-inv-billlabel { font-size: 10.5px; letter-spacing: 0.05em; color: #98a2b3; font-weight: 700; }
  .wb-inv-billname { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .wb-inv-section { margin-top: 20px; }
  .wb-inv-sectionhead { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; font-weight: 700; padding: 8px 10px; background: #f5f8fb; border-radius: 8px; }
  .wb-inv-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .wb-inv-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #667085; padding: 8px 10px; border-bottom: 1px solid #eaecf0; }
  .wb-inv-table td { font-size: 13px; padding: 8px 10px; border-bottom: 1px solid #f2f4f7; }
  .wb-inv-totals { margin-top: 22px; margin-left: auto; width: 280px; }
  .wb-inv-totrow { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; }
  .wb-inv-totrow.grand { font-size: 16px; font-weight: 800; border-top: 2px solid #101828; margin-top: 6px; padding-top: 10px; }
`

export default GroupInvoiceDocument
