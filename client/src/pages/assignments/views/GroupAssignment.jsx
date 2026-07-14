"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/GroupAssignment.css"
import GroupInvoicePreviewModal from "./GroupInvoicePreviewModal"
import {
  fetchGroupForAssignment,
  fetchSubbies,
  fetchTruckRegNums,
  assignSubbie,
  finaliseGroup,
  fetchInstructionDocuments,
  uploadInstructionDocument,
  deleteInstructionDocument,
} from "../../../services/assignmentService"

/**
 * Group assignment carousel: works through every child instruction of a group,
 * assigning one subcontractor + truck and uploading documents for each. The
 * carousel only advances once the current instruction is complete (assigned +
 * documented); the whole group is finalised together, producing one invoice.
 */
const GroupAssignment = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const groupId = location.state?.groupId
  const listState = location.state || {}

  const [group, setGroup] = useState(null)
  const [children, setChildren] = useState([])
  const [current, setCurrent] = useState(0)
  const [subbies, setSubbies] = useState([])
  const [trucks, setTrucks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Per-child editable state, keyed by m1key.
  const [selections, setSelections] = useState({}) // { m1key: { subbieId, truck } }
  const [docsByChild, setDocsByChild] = useState({}) // { m1key: [{id,name}] }

  // Accordions (collapsed by default like the mockup).
  const [openInfo, setOpenInfo] = useState(false)
  const [openContainers, setOpenContainers] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [finalising, setFinalising] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const fileInputRef = useRef(null)

  // Once the group is finalised the whole carousel becomes read-only.
  const readOnly = group?.status === "Completed"

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchGroupForAssignment(groupId)
      setGroup(data)
      const kids = data.instructions || []
      setChildren(kids)
      const sel = {}
      const docs = {}
      kids.forEach((c) => {
        sel[c.m1key] = {
          subbieId: c.assignment?.subbieId ? String(c.assignment.subbieId) : "",
          truck: c.assignment?.truck || "",
        }
        docs[c.m1key] = c.documents || []
      })
      setSelections(sel)
      setDocsByChild(docs)
      return data
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load the group")
      return null
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    if (!groupId) {
      navigate("/instructions", { state: listState })
      return
    }
    loadGroup()
    fetchSubbies().then((d) => setSubbies(Array.isArray(d) ? d : [])).catch(() => {})
    fetchTruckRegNums().then((d) => setTrucks(Array.isArray(d) ? d : [])).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const child = children[current] || null
  const m1key = child?.m1key
  const sel = m1key ? selections[m1key] || { subbieId: "", truck: "" } : { subbieId: "", truck: "" }
  const docs = m1key ? docsByChild[m1key] || [] : []

  const childComplete = (c) => {
    if (!c) return false
    const s = selections[c.m1key] || {}
    const d = docsByChild[c.m1key] || []
    return Boolean(s.subbieId && s.truck && d.length > 0)
  }

  const currentComplete = childComplete(child)
  const allComplete = children.length > 0 && children.every(childComplete)

  // Persist a subbie/truck selection: both must be set to write the assignment.
  const persistAssignment = useCallback(
    async (subbieId, truck) => {
      if (!m1key || !subbieId || !truck) return
      try {
        setError("")
        await assignSubbie(m1key, subbieId, truck)
        setNotice("Assignment saved.")
        setTimeout(() => setNotice(""), 1500)
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to save assignment")
      }
    },
    [m1key],
  )

  const updateSelection = (field, value) => {
    const next = { ...sel, [field]: value }
    setSelections((prev) => ({ ...prev, [m1key]: next }))
    if (next.subbieId && next.truck) persistAssignment(next.subbieId, next.truck)
  }

  // ── Documents (scoped to the current carousel instruction) ──
  const refreshDocs = useCallback(async () => {
    if (!m1key) return
    try {
      const list = await fetchInstructionDocuments(m1key)
      setDocsByChild((prev) => ({
        ...prev,
        [m1key]: list.map((d) => ({ id: d.id, name: d.name, type: d.type })),
      }))
    } catch {
      /* keep existing */
    }
  }, [m1key])

  const handleFiles = async (files) => {
    if (!m1key || !files || files.length === 0) return
    try {
      setError("")
      for (const file of files) {
        await uploadInstructionDocument(m1key, file, file.name)
      }
      await refreshDocs()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to upload document")
    }
  }

  const handleRemoveDoc = async (docId) => {
    try {
      await deleteInstructionDocument(docId)
      await refreshDocs()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to remove document")
    }
  }

  const goNext = () => {
    if (current < children.length - 1 && currentComplete) setCurrent((i) => i + 1)
  }
  const goTo = (i) => {
    // Free to go back; forward only into an already-complete instruction.
    if (i <= current || childComplete(children[i - 1])) setCurrent(i)
  }

  const handleFinalise = async () => {
    setError("")
    setFinalising(true)
    try {
      const result = await finaliseGroup(groupId)
      setNotice(`Group finalised. Invoice ${result.invoiceNum} created.`)
      await loadGroup()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to finalise the group")
    } finally {
      setFinalising(false)
    }
  }

  if (loading && !group) {
    return (
      <div className="wb-assign-wrapper">
        <p style={{ textAlign: "center", padding: 40 }}>Loading assignments…</p>
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="wb-assign-wrapper">
        <div className="wb-assign-inner">
          <div className="wb-assign-alert err">{error}</div>
          <button className="wb-assign-back" onClick={() => navigate("/instructions", { state: listState })}>
            Back
          </button>
        </div>
      </div>
    )
  }

  const info = child
    ? [
        ["Client", group?.client_name],
        ["Shipment Type", child.shipmenttype],
        ["Booking Ref", child.booking_ref],
        ["Client File Reference", child.clientFileRef],
        ["Company File Reference", child.ksmFileRef],
        ["Pickup", child.pickup],
        ["Drop-Off", child.dropoff],
        ["Vessel Name", child.vessel_name],
      ]
    : []

  return (
    <div className="wb-assign-wrapper">
      <div className="wb-assign-inner">
        <button className="wb-assign-back" onClick={() => navigate("/instructions", { state: listState })}>
          Back
        </button>

        {error && <div className="wb-assign-alert err">{error}</div>}
        {notice && <div className="wb-assign-alert ok">{notice}</div>}
        {readOnly && (
          <div className="wb-assign-alert ok">
            This group has been finalised and is read-only.
            {group?.invoiceNum ? ` Invoice ${group.invoiceNum}.` : ""}
          </div>
        )}

        {/* ── Instructions card ── */}
        <div className="wb-assign-card">
          <h3>
            Instructions
            {children.length > 0 && (
              <span style={{ fontWeight: 400, color: "#667085", fontSize: 13 }}>
                {"  "}— Instruction {current + 1} of {children.length}
              </span>
            )}
          </h3>

          {/* Instruction Information accordion */}
          <div className="wb-accordion">
            <button className="wb-accordion-head" onClick={() => setOpenInfo((o) => !o)}>
              <span>
                <div className="wb-accordion-title">Instruction Information</div>
                <div className="wb-accordion-sub">Client, shipment and reference details for this instruction.</div>
              </span>
              <span className={`wb-accordion-chevron ${openInfo ? "open" : ""}`}>▾</span>
            </button>
            {openInfo && (
              <div className="wb-accordion-body">
                <div className="wb-info-grid">
                  {info.map(([label, value]) => (
                    <div className="wb-info-item" key={label}>
                      <div className="wb-info-label">{label}</div>
                      <div className="wb-info-value">{value || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Containers accordion */}
          <div className="wb-accordion">
            <button className="wb-accordion-head" onClick={() => setOpenContainers((o) => !o)}>
              <span>
                <div className="wb-accordion-title">Containers</div>
                <div className="wb-accordion-sub">Trailer quantities and container details.</div>
              </span>
              <span className={`wb-accordion-chevron ${openContainers ? "open" : ""}`}>▾</span>
            </button>
            {openContainers && (
              <div className="wb-accordion-body">
                <table className="wb-assign-table">
                  <thead>
                    <tr>
                      <th>Container Type</th>
                      <th>Container Number</th>
                      <th>Weight</th>
                      <th>Cargo Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(child?.containers || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: "#98a2b3" }}>No containers</td>
                      </tr>
                    ) : (
                      child.containers.map((c) => (
                        <tr key={c.containerkey}>
                          <td>{c.container_type}</td>
                          <td>{c.containernum || "—"}</td>
                          <td>{c.weight ?? "—"}</td>
                          <td>{c.cargo_description || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subbie / Truck / Next */}
          <div className="wb-assign-controls">
            <div className="wb-assign-field">
              <label>Select Subcontractor</label>
              <select
                value={sel.subbieId}
                disabled={readOnly}
                onChange={(e) => updateSelection("subbieId", e.target.value)}
              >
                <option value="">Select Subcontractor</option>
                {subbies.map((s) => (
                  <option key={s.userid} value={s.userid}>
                    {s.name} {s.surname}
                  </option>
                ))}
              </select>
            </div>
            <div className="wb-assign-field">
              <label>Truck</label>
              <select value={sel.truck} disabled={readOnly} onChange={(e) => updateSelection("truck", e.target.value)}>
                <option value="">Truck</option>
                {trucks.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="wb-assign-spacer" />
            <button
              className="wb-next-btn"
              onClick={goNext}
              disabled={current >= children.length - 1 || !currentComplete}
              title={
                !currentComplete
                  ? "Assign a subcontractor + truck and upload a document to continue"
                  : ""
              }
            >
              Next →
            </button>
          </div>

          {/* Carousel dots */}
          {children.length > 1 && (
            <div className="wb-dots">
              {children.map((c, i) => (
                <button
                  key={c.m1key}
                  className={`wb-dot ${i === current ? "active" : ""} ${
                    childComplete(c) ? "complete" : ""
                  }`}
                  onClick={() => goTo(i)}
                  aria-label={`Instruction ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Documents card (scoped to current instruction) ── */}
        <div className="wb-assign-card">
          <div className="wb-docs-head">
            <div>
              <h3 style={{ margin: 0 }}>Documents</h3>
              <div className="wb-docs-sub">Upload PODs and any supporting documentation.</div>
            </div>
            {!readOnly && (
              <button className="wb-upload-btn" onClick={() => fileInputRef.current?.click()}>
                ⬆ Upload Document
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          />

          {!readOnly && (
            <div
              className={`wb-dropzone ${dragging ? "drag" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                handleFiles(Array.from(e.dataTransfer.files || []))
              }}
            >
              <div style={{ fontSize: 22 }}>⬆</div>
              <div className="wb-drop-main">Drop files here or click to upload</div>
              <div className="wb-drop-sub">PDF, PNG or JPG up to 10MB</div>
            </div>
          )}

          {docs.length === 0 && readOnly && (
            <div className="wb-drop-sub" style={{ padding: "10px 0" }}>No documents uploaded.</div>
          )}

          {docs.map((d) => (
            <div className="wb-doc-row" key={d.id}>
              <div className="wb-doc-icon">📎</div>
              <div className="wb-doc-meta">
                <div className="wb-doc-name">{d.name}</div>
                <div className="wb-doc-sub">{d.type || "Instruction Document"}</div>
              </div>
              <span className="wb-doc-check">✓</span>
              {!readOnly && (
                <button className="wb-doc-remove" onClick={() => handleRemoveDoc(d.id)} aria-label="Remove">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Footer actions ── */}
        <div className="wb-assign-actions">
          {!readOnly && (
            <button className="wb-btn-outline" onClick={loadGroup}>
              ⟳ Save Changes
            </button>
          )}
          <button className="wb-btn-outline" onClick={() => setShowInvoice(true)}>
            🧾 Preview Invoice
          </button>
          {!readOnly && (
            <button
              className="wb-btn-finalise"
              disabled={!allComplete || finalising}
              onClick={handleFinalise}
              title={!allComplete ? "Complete every instruction first" : ""}
            >
              {finalising ? "Finalising…" : "✓ Finalise Instruction"}
            </button>
          )}
        </div>
      </div>

      <GroupInvoicePreviewModal
        groupId={groupId}
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
      />
    </div>
  )
}

export default GroupAssignment
