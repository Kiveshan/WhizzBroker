"use client"

/**
 * GroupInvoiceDocument — the rendered combined group invoice (letterhead with
 * invoice meta, bill-to, one section per child instruction with its references,
 * one line per container type and a subtotal, then totals and banking).
 * Shared by the assignment preview modal and the full-page group invoice view,
 * which rasterises it to PDF with html2pdf. `data` is the payload from
 * getGroupInvoicePreview.
 *
 * Palette matches the subbie load sheet (legExport.js): steel-blue #4682b4
 * banding, pale-blue #b8d1f3 table headers. Blocks that must not split across
 * PDF pages carry `wb-inv-keep` (see the pagebreak option in GroupInvoiceView).
 */
import { BRAND_LOGO_SRC } from "../../../utils/brandLogo.js"

const money = (n) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const qtyFormat = (n) =>
  n == null ? "" : Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 3 })

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "")

/** Drops empty values so a missing field never prints as a dangling label. */
const present = (v) => v !== null && v !== undefined && String(v).trim() !== ""

export function GroupInvoiceDocument({ data }) {
  if (!data) return null
  const company = data.company || {}
  const invClient = data.client || {}
  const group = data.group || {}
  const children = data.children || []

  // One VAT % in the label when every instruction shares it (the normal case).
  const vatRates = [...new Set(children.map((c) => Number(c.vatRate || 0)))]
  const vatLabel = vatRates.length === 1 ? `VAT (${vatRates[0]}%)` : "VAT"

  const meta = [
    ["Invoice No", group.invoiceNum || "Not yet finalised"],
    ["Invoice Date", formatDate(group.invoiceDate) || "—"],
    ["Group Ref", group.groupRef || group.groupKey],
    ["Instructions", children.length],
  ]

  const banking = [
    ["Account Name", company.name_of_acc],
    ["Bank", company.bank],
    ["Account No", company.account_num],
    ["Branch Code", company.branch_code],
    ["SWIFT", company.swift_code],
  ].filter(([, v]) => present(v))

  return (
    <div className="wb-inv-paper">
      {/* Letterhead: company left, invoice meta right */}
      <div className="wb-inv-header">
        <div className="wb-inv-from">
          {/* Same-origin so html2canvas can rasterise it */}
          <img className="wb-inv-logo" src={BRAND_LOGO_SRC} alt="" />
          <div className="wb-inv-companyname">{company.companyname || "Company"}</div>
          {present(company.address) && <div>{company.address}</div>}
          {present(company.suburb) && <div>{company.suburb}</div>}
          {present(company.vat_reg_num) && <div>VAT Reg No: {company.vat_reg_num}</div>}
          {present(company.phonenumber) && <div>Tel: {company.phonenumber}</div>}
        </div>
        <div className="wb-inv-metablock">
          <div className="wb-inv-title">TAX INVOICE</div>
          <table className="wb-inv-meta">
            <tbody>
              {meta.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill to */}
      <div className="wb-inv-billto wb-inv-keep">
        <div className="wb-inv-boxlabel">Bill To</div>
        <div className="wb-inv-billname">{invClient.name}</div>
        {present(invClient.address) && <div>{invClient.address}</div>}
        {present(invClient.suburb) && <div>{invClient.suburb}</div>}
        {present(invClient.vat) && <div>VAT Reg No: {invClient.vat}</div>}
      </div>

      {children.map((child, idx) => {
        const rateText = child.rateTitle
          ? child.pickup && child.dropoff
            ? `${child.rateTitle} (${child.pickup} → ${child.dropoff})`
            : child.rateTitle
          : [child.pickup, child.dropoff].filter(Boolean).join(" → ")
        const refs = [
          ["Your Ref", child.clientFileRef],
          ["Booking Ref", child.bookingRef],
          ["Our Ref", child.companyFileRef],
          ["Vessel", child.vesselName],
        ].filter(([, v]) => present(v))

        return (
          <div key={child.m1key} className="wb-inv-child wb-inv-keep">
            <div className="wb-inv-childhead">
              <span className="wb-inv-childno">
                {idx + 1}. {child.shipmentType || "Instruction"}
              </span>
              {present(rateText) && <span className="wb-inv-childrate">{rateText}</span>}
            </div>
            {refs.length > 0 && (
              <div className="wb-inv-refs">
                {refs.map(([label, value]) => (
                  <span key={label}>
                    <b>{label}:</b> {value}
                  </span>
                ))}
              </div>
            )}

            <table className="wb-inv-lines">
              <colgroup>
                <col />
                <col className="c-qty" />
                <col className="c-money" />
                <col className="c-money" />
              </colgroup>
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
                    <td colSpan={4} className="muted">
                      No billable lines
                    </td>
                  </tr>
                ) : (
                  child.lines.map((line, i) => (
                    <tr key={i}>
                      <td>{line.description}</td>
                      <td className="num">{qtyFormat(line.quantity)}</td>
                      <td className="num">{line.rate != null ? money(line.rate) : ""}</td>
                      <td className="num">{money(line.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="num">
                    Subtotal (excl. VAT)
                  </td>
                  <td className="num">{money(child.subtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })}

      {/* Footer: banking left, totals right */}
      <div className="wb-inv-footer wb-inv-keep">
        <div className="wb-inv-bank">
          <div className="wb-inv-boxlabel">Banking Details</div>
          <table className="wb-inv-meta">
            <tbody>
              {banking.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
              <tr>
                <th>Reference</th>
                <td>
                  <b>{group.invoiceNum || "Invoice No"}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <table className="wb-inv-totals">
          <tbody>
            <tr>
              <th>Subtotal (excl. VAT)</th>
              <td>{money(data.subtotal)}</td>
            </tr>
            <tr>
              <th>{vatLabel}</th>
              <td>{money(data.vat)}</td>
            </tr>
            <tr className="grand">
              <th>Total Due</th>
              <td>{money(data.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="wb-inv-thankyou">
        Please use the invoice number as your payment reference. Thank you for your business
        {company.companyname ? ` — ${company.companyname}` : ""}.
      </div>
    </div>
  )
}

/** Shared styles for the group invoice document. */
export const groupInvoiceDocStyles = `
  .wb-inv-paper { max-width: 800px; margin: 0 auto; background: #fff; font-family: Arial, sans-serif; padding: 28px; color: #1d2433; font-size: 12.5px; line-height: 1.45; box-sizing: border-box; }
  .wb-inv-paper table { border-collapse: collapse; }
  .wb-inv-keep { page-break-inside: avoid; break-inside: avoid; }

  .wb-inv-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 16px; border-bottom: 3px solid #4682b4; }
  .wb-inv-from { color: #475467; }
  .wb-inv-logo { display: block; height: 46px; width: auto; margin-bottom: 10px; }
  .wb-inv-companyname { font-size: 15px; font-weight: bold; color: #1d2433; margin-bottom: 2px; }

  .wb-inv-metablock { text-align: right; flex-shrink: 0; }
  .wb-inv-title { font-size: 24px; font-weight: bold; letter-spacing: 1.5px; color: #4682b4; margin-bottom: 8px; }
  .wb-inv-meta th { text-align: left; font-weight: normal; color: #667085; padding: 2px 14px 2px 0; white-space: nowrap; vertical-align: top; }
  .wb-inv-meta td { text-align: right; font-weight: bold; padding: 2px 0; }
  .wb-inv-bank .wb-inv-meta td { text-align: left; font-weight: normal; }

  .wb-inv-boxlabel { font-size: 10.5px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; color: #4682b4; margin-bottom: 4px; }
  .wb-inv-billto { margin: 18px 0 6px; padding: 10px 14px; border-left: 3px solid #b8d1f3; background: #f6f9fd; }
  .wb-inv-billname { font-size: 14px; font-weight: bold; }

  .wb-inv-child { margin-top: 20px; }
  .wb-inv-childhead { display: flex; justify-content: space-between; gap: 16px; background: #4682b4; color: #fff; padding: 7px 10px; font-weight: bold; }
  .wb-inv-childrate { font-weight: normal; text-align: right; }
  .wb-inv-refs { padding: 6px 10px; background: #f6f9fd; border: 1px solid #dde5f0; border-top: none; color: #344054; }
  .wb-inv-refs span { display: inline-block; margin-right: 22px; }
  .wb-inv-refs b { color: #667085; font-weight: normal; }

  .wb-inv-lines { width: 100%; table-layout: fixed; }
  .wb-inv-lines .c-qty { width: 80px; }
  .wb-inv-lines .c-money { width: 120px; }
  .wb-inv-lines th { background: #b8d1f3; text-align: left; font-weight: bold; padding: 6px 10px; font-size: 11.5px; }
  .wb-inv-lines td { padding: 6px 10px; border-bottom: 1px solid #e4e7ec; vertical-align: top; }
  .wb-inv-lines tbody tr:nth-child(even) td { background: #fafbfc; }
  .wb-inv-lines .num { text-align: right; white-space: nowrap; }
  .wb-inv-lines .muted { color: #98a2b3; font-style: italic; }
  .wb-inv-lines tfoot td { font-weight: bold; border-bottom: 2px solid #4682b4; background: #fff; }

  .wb-inv-footer { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 28px; }
  .wb-inv-bank { flex: 1; padding: 10px 14px; border: 1px solid #dde5f0; border-radius: 4px; }
  .wb-inv-totals { width: 300px; flex-shrink: 0; }
  .wb-inv-totals th { text-align: left; font-weight: normal; color: #475467; padding: 6px 10px; }
  .wb-inv-totals td { text-align: right; font-weight: bold; padding: 6px 10px; white-space: nowrap; }
  .wb-inv-totals tr { border-bottom: 1px solid #e4e7ec; }
  .wb-inv-totals .grand th, .wb-inv-totals .grand td { background: #4682b4; color: #fff; font-weight: bold; font-size: 14.5px; padding: 9px 10px; }

  .wb-inv-thankyou { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e4e7ec; text-align: center; color: #667085; font-size: 11.5px; }
`

export default GroupInvoiceDocument
