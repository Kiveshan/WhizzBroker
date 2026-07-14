"use client"

import { useEffect, useState } from "react"
import { fetchGroupInvoicePreview } from "../../../services/assignmentService"
import {
  GroupInvoiceDocument,
  groupInvoiceDocStyles,
} from "../../invoices/views/GroupInvoiceDocument"

/**
 * Combined group invoice preview modal. Loads the aggregated invoice for a
 * group and renders it via the shared GroupInvoiceDocument.
 */
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
        {!loading && !error && data && <GroupInvoiceDocument data={data} />}
      </div>

      <style>{`
        .wb-inv-overlay { position: fixed; inset: 0; background: rgba(16,24,40,0.5); display: flex; align-items: flex-start; justify-content: center; z-index: 2000; padding: 30px 16px; overflow-y: auto; }
        .wb-inv-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 820px; box-shadow: 0 20px 48px rgba(16,24,40,0.24); }
        .wb-inv-modalhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #eaecf0; }
        .wb-inv-modalhead h2 { margin: 0; font-size: 16px; color: #101828; }
        .wb-inv-close { background: none; border: none; cursor: pointer; color: #667085; font-size: 14px; }
        .wb-inv-state { padding: 48px; text-align: center; color: #667085; }
        .wb-inv-state.err { color: #b42318; }
        ${groupInvoiceDocStyles}
      `}</style>
    </div>
  )
}

export default GroupInvoicePreviewModal
