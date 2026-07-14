"use client"

/**
 * GroupInvoiceDocument — the rendered combined group invoice (company header,
 * bill-to, one section per child instruction with one line per container type,
 * plus totals). Shared by the assignment preview modal and the full-page
 * group invoice view. `data` is the payload from getGroupInvoicePreview.
 *
 * Styled to match the single-instruction invoice (ClientInvoice.jsx /
 * InvoiceTemplate.css): Arial, black hairline banner borders, light-blue
 * table headers, steel-blue summary header, red italic thank-you line.
 */
const money = (n) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "")

export function GroupInvoiceDocument({ data }) {
  if (!data) return null
  const company = data.company || {}
  const invClient = data.client || {}
  const group = data.group || {}

  return (
    <div className="wb-inv-paper">
      {/* Company name banner */}
      <div className="wb-inv-transport">
        <div className="wb-inv-sectiontitle">{company.companyname || "Company"}</div>
      </div>

      {/* Company details */}
      <div className="wb-inv-middle">
        <div className="wb-inv-companyinfo">
          {company.address}
          <br />
          {company.suburb}
          <br />
          VAT Reg No: {company.vat_reg_num || "—"}
          <br />
          Cellphone: {company.phonenumber}
        </div>
      </div>

      {/* Tax Invoice title + invoice number */}
      <div className="wb-inv-titlesection">
        <div className="wb-inv-title">Tax Invoice</div>
        <div className="wb-inv-docnumber">
          Invoice No: {group.invoiceNum || "(not yet finalised)"}
        </div>
      </div>

      {/* Bill to */}
      <div className="wb-inv-senderdetails">
        <div>{invClient.name}</div>
        <div>{invClient.address}</div>
        <div>{invClient.suburb}</div>
        <div>VAT Reg No: {invClient.vat || "—"}</div>
        <div>Date: {formatDate(group.invoiceDate)}</div>
      </div>

      {/* Group reference banner */}
      <div className="wb-inv-vesseldestination">
        <div className="wb-inv-vessel">Group Ref: {group.groupRef || group.groupKey}</div>
        <div className="wb-inv-destination">
          {(data.children || []).length} instruction{(data.children || []).length === 1 ? "" : "s"} included
        </div>
      </div>

      {(data.children || []).map((child) => (
        <div key={child.m1key} className="wb-inv-childsection">
          <table className="wb-inv-details-table">
            <tbody>
              <tr>
                <td className="label">Route</td>
                <td className="value">
                  {child.shipmentType} — {child.pickup} → {child.dropoff}
                </td>
              </tr>
              {child.companyFileRef && (
                <tr>
                  <td className="label">File Ref</td>
                  <td className="value">{child.companyFileRef}</td>
                </tr>
              )}
              {child.vesselName && (
                <tr>
                  <td className="label">Vessel/Ref</td>
                  <td className="value">{child.vesselName}</td>
                </tr>
              )}
            </tbody>
          </table>

          <table className="wb-inv-container-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {child.lines.length === 0 ? (
                <tr>
                  <td colSpan={4}>No billable lines</td>
                </tr>
              ) : (
                child.lines.map((line, i) => (
                  <tr key={i}>
                    <td>{line.description}</td>
                    <td className="num">{line.quantity ?? ""}</td>
                    <td className="num">{line.rate != null ? money(line.rate) : ""}</td>
                    <td className="num">{money(line.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}

      {/* Summary */}
      <div className="wb-inv-summarysection">
        <table className="wb-inv-container-table">
          <thead>
            <tr>
              <th className="summary-header" colSpan={2}>
                Invoice Summary
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="summary-label">Amount (excl. VAT)</td>
              <td className="summary-value">{money(data.subtotal)}</td>
            </tr>
            <tr>
              <td className="summary-label">VAT</td>
              <td className="summary-value">{money(data.vat)}</td>
            </tr>
            <tr className="summary-total-row">
              <td className="summary-total-label">Total Amount</td>
              <td className="summary-total-value">{money(data.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Banking */}
      <div className="wb-inv-banking">
        <div>Account Name: {company.name_of_acc}</div>
        <div>Bank Name: {company.bank}</div>
        <div>Account Number: {company.account_num}</div>
        <div>Branch Code: {company.branch_code}</div>
        <div>SWIFT Code: {company.swift_code}</div>
        <div className="wb-inv-paymentnote">
          Please ensure the invoice number is referenced when making payment.
        </div>
        <div className="wb-inv-thankyou">Thank you for choosing {company.companyname || ""}.</div>
      </div>
    </div>
  )
}

/** Shared styles for the group invoice document — mirrors InvoiceTemplate.css. */
export const groupInvoiceDocStyles = `
  .wb-inv-paper { max-width: 800px; margin: 0 auto; background: #fff; font-family: Arial, sans-serif; padding: 20px; color: #000; }

  .wb-inv-transport { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; }
  .wb-inv-sectiontitle { text-align: center; font-size: 16px; font-weight: bold; }

  .wb-inv-middle { position: relative; min-height: 90px; border-bottom: 1px solid #000; padding: 10px 0; }
  .wb-inv-companyinfo { text-align: right; font-size: 14px; line-height: 1.4; }

  .wb-inv-titlesection { position: relative; border-bottom: 1px solid #000; padding: 10px 0; }
  .wb-inv-title { text-align: center; font-size: 16px; font-weight: bold; }
  .wb-inv-docnumber { text-align: right; font-size: 14px; margin-top: 6px; }

  .wb-inv-senderdetails { padding: 10px 0; font-size: 14px; line-height: 1.4; margin-left: 10px; }
  .wb-inv-senderdetails div { margin: 0; }

  .wb-inv-vesseldestination { display: flex; border-top: 1px solid #000; border-bottom: 1px solid #000; margin-top: 20px; }
  .wb-inv-vessel, .wb-inv-destination { flex: 1; padding: 12px; text-align: center; font-size: 16px; font-weight: bold; }
  .wb-inv-vessel { border-right: 1px solid #000; }

  .wb-inv-childsection { margin-top: 24px; }

  .wb-inv-details-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; margin-bottom: 12px; }
  .wb-inv-details-table tr { border-bottom: 1px solid #ddd; }
  .wb-inv-details-table tr:last-child { border-bottom: none; }
  .wb-inv-details-table .label, .wb-inv-details-table .value { padding: 8px 12px; font-size: 14px; }
  .wb-inv-details-table .label { width: 25%; border-right: 1px solid #ddd; font-weight: normal; }

  .wb-inv-container-table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; font-size: 12px; }
  .wb-inv-container-table th { background-color: #b8d1f3; padding: 6px 8px; text-align: left; font-size: 12px; font-weight: normal; border-right: 1px solid #ddd; }
  .wb-inv-container-table th:last-child { border-right: none; }
  .wb-inv-container-table td { padding: 6px 8px; font-size: 12px; border-right: 1px solid #ddd; border-top: 1px solid #ddd; }
  .wb-inv-container-table td:last-child { border-right: none; }
  .wb-inv-container-table th.num, .wb-inv-container-table td.num { text-align: right; }

  .wb-inv-summarysection { margin-top: 24px; }
  .wb-inv-container-table .summary-header { background-color: #4682b4 !important; color: #fff !important; font-weight: bold !important; text-align: center; padding: 8px 12px !important; font-size: 13px !important; }
  .wb-inv-container-table .summary-label { font-weight: normal; padding: 8px 12px; }
  .wb-inv-container-table .summary-value { font-weight: bold; text-align: right; padding: 8px 12px; }
  .wb-inv-container-table .summary-total-row .summary-label,
  .wb-inv-container-table .summary-total-row .summary-value { font-weight: bold; font-size: 13px; border-top: 2px solid #000; }
  .wb-inv-container-table .summary-total-label { background-color: #f0f0f0; }

  .wb-inv-banking { font-size: 14px; line-height: 1.4; margin: 24px 0 0 10px; }
  .wb-inv-banking div { margin: 0; }
  .wb-inv-paymentnote { margin-top: 10px; }
  .wb-inv-thankyou { color: #ff0000; text-align: center; margin-top: 15px; font-style: italic; }
`

export default GroupInvoiceDocument
