"use client"

import { useEffect, useState } from "react"
import { fetchGroupInvoicePreview } from "../../../services/assignmentService"

/**
 * Combined group invoice preview modal. Loads the aggregated invoice for a
 * group (one line per container type per child instruction, plus surcharge
 * lines) and renders it as a read-only invoice document.
 */
const money = (n) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const GroupInvoicePreviewModal = ({ groupId, isOpen, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isOpen || !groupId) return
    let alive = true
    setLoading(true)
    setError("")
    fetchGroupInvoicePreview(groupId)
      .then((res) => {
        if (!alive) return
        if (res.success) setData(res.data)
        else setError(res.message || "Failed to load invoice preview")
      })
      .catch((e) => alive && setError(e.response?.data?.message || e.message || "Failed to load invoice preview"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [isOpen, groupId])

  if (!isOpen) return null

  const company = data?.company || {}
  const invClient = data?.client || {}
  const group = data?.group || {}

  return (
    <div className="wb-inv-overlay" onClick={onClose}>
      <div className="wb-inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-inv-modalhead">
          <h2>Invoice Preview</h2>
          <button className="wb-inv-close" onClick={onClose}>
            × Close
          </button>
        </div>

        {loading && <div className="wb-inv-state">Generating invoice preview…</div>}
        {error && <div className="wb-inv-state err">{error}</div>}

        {!loading && !error && data && (
          <div className="wb-inv-doc">
            {/* Company / invoice header */}
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

            {/* Bill to */}
            <div className="wb-inv-billto">
              <div className="wb-inv-billlabel">BILL TO</div>
              <div className="wb-inv-billname">{invClient.name}</div>
              <div className="wb-inv-muted">{invClient.address}</div>
              <div className="wb-inv-muted">{invClient.suburb}</div>
              <div className="wb-inv-muted">VAT: {invClient.vat || "—"}</div>
            </div>

            {/* One section per child instruction */}
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
                          <td style={{ textAlign: "right" }}>
                            {line.rate != null ? money(line.rate) : ""}
                          </td>
                          <td style={{ textAlign: "right" }}>{money(line.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Totals */}
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
        )}
      </div>

      <style>{`
        .wb-inv-overlay { position: fixed; inset: 0; background: rgba(16,24,40,0.5); display: flex; align-items: flex-start; justify-content: center; z-index: 2000; padding: 30px 16px; overflow-y: auto; }
        .wb-inv-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 820px; box-shadow: 0 20px 48px rgba(16,24,40,0.24); }
        .wb-inv-modalhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #eaecf0; }
        .wb-inv-modalhead h2 { margin: 0; font-size: 16px; color: #101828; }
        .wb-inv-close { background: none; border: none; cursor: pointer; color: #667085; font-size: 14px; }
        .wb-inv-state { padding: 48px; text-align: center; color: #667085; }
        .wb-inv-state.err { color: #b42318; }
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
      `}</style>
    </div>
  )
}

export default GroupInvoicePreviewModal
