"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { fetchGroupInvoicePreview } from "../../../services/assignmentService"
import { GroupInvoiceDocument, groupInvoiceDocStyles } from "./GroupInvoiceDocument"

/**
 * Full-page combined group invoice, opened from the invoices list for a
 * finalised group. Renders the shared GroupInvoiceDocument with back + print.
 */
const GroupInvoiceView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")
    fetchGroupInvoicePreview(groupId)
      .then((res) => {
        if (!alive) return
        if (res.success) setData(res.data)
        else setError(res.message || "Failed to load invoice")
      })
      .catch((e) => alive && setError(e.response?.data?.message || e.message || "Failed to load invoice"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [groupId])

  const goBack = () => navigate("/invoices", { state: location.state })

  return (
    <div className="wb-ginv-page">
      <div className="wb-ginv-bar">
        <button className="wb-ginv-btn" onClick={goBack}>
          ← Back to Invoices
        </button>
        {!loading && !error && (
          <button className="wb-ginv-btn primary" onClick={() => window.print()}>
            🖨 Print / Download
          </button>
        )}
      </div>

      <div className="wb-ginv-sheet">
        {loading && <div className="wb-ginv-state">Loading invoice…</div>}
        {error && <div className="wb-ginv-state err">{error}</div>}
        {!loading && !error && data && <GroupInvoiceDocument data={data} />}
      </div>

      <style>{`
        .wb-ginv-page { min-height: 100vh; background: #eef8fa; padding: 20px; box-sizing: border-box; }
        .wb-ginv-bar { max-width: 860px; margin: 0 auto 16px; display: flex; justify-content: space-between; }
        .wb-ginv-btn { background: #fff; border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 13.5px; color: #344054; cursor: pointer; }
        .wb-ginv-btn.primary { background: #4aa8e0; border-color: #4aa8e0; color: #fff; }
        .wb-ginv-sheet { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,24,40,0.1); }
        .wb-ginv-state { padding: 60px; text-align: center; color: #667085; }
        .wb-ginv-state.err { color: #b42318; }
        @media print {
          .wb-ginv-page { background: #fff; padding: 0; }
          .wb-ginv-bar { display: none; }
          .wb-ginv-sheet { box-shadow: none; border-radius: 0; max-width: none; }
        }
        ${groupInvoiceDocStyles}
      `}</style>
    </div>
  )
}

export default GroupInvoiceView
