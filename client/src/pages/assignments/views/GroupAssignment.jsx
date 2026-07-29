"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/GroupAssignment.css"
import GroupInvoicePreviewModal from "./GroupInvoicePreviewModal"
import { exportLegToExcel } from "../../../utils/assignments/legExport"
import {
  fetchGroupForAssignment,
  fetchSubbies,
  fetchRouteOptions,
  createAssignment,
  deleteAssignment,
  finaliseGroup,
  fetchInstructionDocuments,
  uploadInstructionDocument,
  deleteInstructionDocument,
} from "../../../services/assignmentService"

/**
 * Group assignment: pick the instruction, pick which of its containers a
 * subcontractor is taking, save — then hit "+" to add the next assignment, and
 * keep going until every container is spoken for. Each assignment is one leg,
 * so an instruction can be split across several subcontractors, and each leg
 * exports as a load sheet for its subbie. The group is finalised once every
 * container is assigned, producing one invoice.
 */
// Renders standalone (route + location.state) by default. The Director's
// read-only counterpart (DirectorGroupAssignment) passes viewOnly to force
// read-only rendering regardless of the group's status, and backRoute so
// "Back" returns to the director's instruction list instead of the FC one.
const today = new Date().toISOString().split("T")[0]

const emptyForm = { subbieId: "", startingpoint: "", destination: "", legDate: today }

// Break bulk (cross-haul) is weight-based and has no container rows, so its
// assignment covers the whole instruction and it is "done" once it has a leg.
const isBreakBulk = (child) => String(child?.shipment_type) === "4"

// Anything with no containers to hand out is assigned as a whole instruction —
// break bulk, and also the odd container instruction captured without any
// container rows, which would otherwise be impossible to assign or finalise.
const isWholeInstruction = (child) => isBreakBulk(child) || (child?.containerCount || 0) === 0

const hasWorkLeft = (child) =>
  isWholeInstruction(child)
    ? (child?.assignments || []).length === 0
    : (child?.unassignedContainerCount || 0) > 0

const refOf = (c) => c?.ksmFileRef || c?.clientFileRef || c?.booking_ref || `Instruction ${c?.m1key}`

const GroupAssignment = ({ viewOnly = false, backRoute = "/instructions" } = {}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const groupId = location.state?.groupId
  const listState = location.state || {}

  const [group, setGroup] = useState(null)
  const [children, setChildren] = useState([])
  const [subbies, setSubbies] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Which instruction everything on the page is pointed at.
  const [selectedM1key, setSelectedM1key] = useState("")
  const [draftOpen, setDraftOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [pickedContainers, setPickedContainers] = useState([]) // containerkeys
  const [docsByChild, setDocsByChild] = useState({}) // { m1key: [{id,name}] }

  // Accordions (collapsed by default like the mockup).
  const [openInfo, setOpenInfo] = useState(false)
  const [openContainers, setOpenContainers] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [finalising, setFinalising] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const fileInputRef = useRef(null)

  // Once the group is finalised (or the caller forces view-only mode) the
  // whole screen becomes read-only.
  const readOnly = viewOnly || group?.status === "Completed"

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchGroupForAssignment(groupId)
      setGroup(data)
      const kids = data.instructions || []
      setChildren(kids)
      const docs = {}
      kids.forEach((c) => {
        docs[c.m1key] = c.documents || []
      })
      setDocsByChild(docs)

      // Keep the operator on the instruction they were working on, but move
      // them along once it has nothing left to assign.
      setSelectedM1key((prev) => {
        const stillOpen = kids.find((c) => String(c.m1key) === String(prev) && hasWorkLeft(c))
        if (stillOpen) return prev
        const next = kids.find(hasWorkLeft) || kids[0]
        return next ? String(next.m1key) : ""
      })
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
      navigate(backRoute, { state: listState })
      return
    }
    loadGroup()
    fetchSubbies().then((d) => setSubbies(Array.isArray(d) ? d : [])).catch(() => {})
    fetchRouteOptions()
      .then(({ startingPoints: sp, destinations: dest }) => {
        setStartingPoints(sp)
        setDestinations(dest)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const child = useMemo(
    () => children.find((c) => String(c.m1key) === String(selectedM1key)) || null,
    [children, selectedM1key],
  )
  const m1key = child?.m1key
  const breakBulk = isBreakBulk(child)
  const wholeInstruction = isWholeInstruction(child)
  const docs = m1key ? docsByChild[m1key] || [] : []
  const assignments = child?.assignments || []

  const availableContainers = useMemo(
    () => (child?.containers || []).filter((c) => !c.legkey),
    [child],
  )

  // Switching instruction resets the draft — container keys from one
  // instruction are meaningless on another. The first assignment opens its
  // draft straight away since there is no "+" to click yet.
  useEffect(() => {
    setPickedContainers([])
    setForm(emptyForm)
    setDraftOpen(!readOnly && assignments.length === 0 && hasWorkLeft(child))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedM1key])

  const totals = useMemo(() => {
    let total = 0
    let assigned = 0
    for (const c of children) {
      total += c.containerCount || 0
      assigned += (c.containerCount || 0) - (c.unassignedContainerCount || 0)
    }
    return { total, assigned }
  }, [children])

  const allComplete = children.length > 0 && children.every((c) => c.complete)

  const toggleContainer = (containerkey) => {
    setPickedContainers((prev) =>
      prev.includes(containerkey) ? prev.filter((k) => k !== containerkey) : [...prev, containerkey],
    )
  }

  const toggleAllContainers = () => {
    setPickedContainers((prev) =>
      prev.length === availableContainers.length ? [] : availableContainers.map((c) => c.containerkey),
    )
  }

  const canSave = Boolean(
    m1key &&
      form.subbieId &&
      form.startingpoint &&
      form.destination &&
      (wholeInstruction || pickedContainers.length > 0),
  )

  const handleSaveAssignment = async () => {
    if (!canSave) return
    try {
      setError("")
      setSaving(true)
      const result = await createAssignment(m1key, {
        subbieId: form.subbieId,
        containerKeys: wholeInstruction ? [] : pickedContainers,
        startingpoint: form.startingpoint,
        destination: form.destination,
        legDate: form.legDate,
      })
      setPickedContainers([])
      setForm(emptyForm)
      // Close the draft: the next one is added deliberately, via "+".
      setDraftOpen(false)
      setNotice(
        `Assignment saved — subcontractor rate R${Number(result.driverrate).toFixed(2)}${
          wholeInstruction ? "" : ` for ${result.containerKeys.length} container(s)`
        }.`,
      )
      setTimeout(() => setNotice(""), 3000)
      await loadGroup()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to save assignment")
      // A lost race means someone else took a container; reload so the picker
      // stops offering it.
      if (e.response?.status === 409) await loadGroup()
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (legkey) => {
    try {
      setError("")
      await deleteAssignment(legkey)
      await loadGroup()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to remove assignment")
    }
  }

  const handleExportLeg = async (leg) => {
    try {
      setError("")
      await exportLegToExcel({ leg, instruction: child, group })
    } catch (e) {
      setError(e.message || "Failed to export this assignment")
    }
  }

  // ── Documents (scoped to the selected instruction) ──
  const refreshDocs = useCallback(async () => {
    if (!m1key) return
    try {
      const list = await fetchInstructionDocuments(m1key)
      setDocsByChild((prev) => ({
        ...prev,
        [m1key]: list.map((d) => ({ id: d.id, name: d.name, type: d.type, url: d.url })),
      }))
    } catch {
      /* keep existing */
    }
  }, [m1key])

  // The group fetch returns documents without signed URLs; fetch the full list
  // (with viewable URLs) whenever the selected instruction changes.
  useEffect(() => {
    if (m1key) refreshDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m1key])

  const handleFiles = async (files) => {
    if (!m1key || !files || files.length === 0) return
    try {
      setError("")
      for (const file of files) {
        await uploadInstructionDocument(m1key, file, file.name)
      }
      await refreshDocs()
      await loadGroup()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to upload document")
    }
  }

  const handleRemoveDoc = async (docId) => {
    try {
      await deleteInstructionDocument(docId)
      await refreshDocs()
      await loadGroup()
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to remove document")
    }
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

  const instructionLabel = (c) => {
    if (isWholeInstruction(c)) {
      const done = (c.assignments || []).length > 0
      return `${refOf(c)} — ${isBreakBulk(c) ? "break bulk" : "whole instruction"}${done ? " · assigned" : ""}`
    }
    return `${refOf(c)} — ${c.unassignedContainerCount} of ${c.containerCount} left`
  }

  const subbieOf = (id) => {
    const s = subbies.find((x) => String(x.userid) === String(id))
    return s ? `${s.name} ${s.surname}` : ""
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
          <button className="wb-assign-back" onClick={() => navigate(backRoute, { state: listState })}>
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
        <button className="wb-assign-back" onClick={() => navigate(backRoute, { state: listState })}>
          Back
        </button>

        {error && <div className="wb-assign-alert err">{error}</div>}
        {notice && <div className="wb-assign-alert ok">{notice}</div>}
        {readOnly && (
          <div className="wb-assign-alert ok">
            {group?.status === "Completed"
              ? "This group has been finalised and is read-only."
              : "Viewing this group's assignments in read-only mode."}
            {group?.invoiceNum ? ` Invoice ${group.invoiceNum}.` : ""}
          </div>
        )}

        {/* ── Instructions card ── */}
        <div className="wb-assign-card">
          <h3>
            Instructions
            <span style={{ fontWeight: 400, color: "#667085", fontSize: 13 }}>
              {"  "}— {totals.assigned} of {totals.total} containers assigned across {children.length} instruction
              {children.length === 1 ? "" : "s"}
            </span>
          </h3>

          <div className="wb-progress">
            <div
              className="wb-progress-bar"
              style={{ width: totals.total > 0 ? `${(totals.assigned / totals.total) * 100}%` : "0%" }}
            />
          </div>

          {/* Which instruction this assignment is for. */}
          <div className="wb-assign-controls">
            <div className="wb-assign-field" style={{ flexBasis: "100%" }}>
              <label>Instruction</label>
              <select value={selectedM1key} onChange={(e) => setSelectedM1key(e.target.value)}>
                <option value="">Select Instruction</option>
                {children.map((c) => (
                  <option key={c.m1key} value={c.m1key}>
                    {instructionLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          {/* Containers / Weight details accordion */}
          <div className="wb-accordion">
            <button className="wb-accordion-head" onClick={() => setOpenContainers((o) => !o)}>
              <span>
                <div className="wb-accordion-title">{breakBulk ? "Weight Details" : "Containers"}</div>
                <div className="wb-accordion-sub">
                  {breakBulk
                    ? "KSM DN, ticket and receipt book weight entries."
                    : "Every container on this instruction and who is taking it."}
                </div>
              </span>
              <span className={`wb-accordion-chevron ${openContainers ? "open" : ""}`}>▾</span>
            </button>
            {openContainers && (
              <div className="wb-accordion-body">
                {breakBulk ? (
                  <table className="wb-assign-table">
                    <thead>
                      <tr>
                        <th>DN Number</th>
                        <th>Ticket Number</th>
                        <th>Receipt Book Number</th>
                        <th>Weight{child?.rateweight ? ` (${child.rateweight})` : ""}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(child?.weightRows || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ color: "#98a2b3" }}>No weight entries</td>
                        </tr>
                      ) : (
                        child.weightRows.map((w) => (
                          <tr key={w.weight_pk}>
                            <td>{w.ksm_dm_no || "—"}</td>
                            <td>{w.ticket_no || "—"}</td>
                            <td>{w.receipt_book_no || "—"}</td>
                            <td>{w.weight ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="wb-assign-table">
                    <thead>
                      <tr>
                        <th>Container Type</th>
                        <th>Container Number</th>
                        <th>Weight</th>
                        <th>Cargo Description</th>
                        <th>Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(child?.containers || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ color: "#98a2b3" }}>No containers</td>
                        </tr>
                      ) : (
                        child.containers.map((c) => {
                          const holder = assignments.find((a) => a.legkey === c.legkey)
                          return (
                            <tr key={c.containerkey}>
                              <td>{c.container_type}</td>
                              <td>{c.containernum || "—"}</td>
                              <td>{c.weight ?? "—"}</td>
                              <td>{c.cargo_description || "—"}</td>
                              <td style={{ color: holder ? undefined : "#98a2b3" }}>
                                {holder?.subbieName || "Unassigned"}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Assignments for the selected instruction ── */}
        {child && (
          <div className="wb-assign-card">
            <h3>
              Assignments
              <span style={{ fontWeight: 400, color: "#667085", fontSize: 13 }}>
                {"  "}— {refOf(child)}
                {!wholeInstruction && `, ${child.unassignedContainerCount} of ${child.containerCount} still to assign`}
              </span>
            </h3>

            {assignments.length === 0 && !draftOpen && (
              <div className="wb-drop-sub" style={{ padding: "8px 0" }}>
                No assignments on this instruction yet.
              </div>
            )}

            {/* Saved assignments — one block per subcontractor load. */}
            {assignments.map((a, i) => (
              <div className="wb-assignment-block" key={a.legkey}>
                <div className="wb-assignment-head">
                  <div className="wb-assignment-title">
                    Assignment {i + 1}
                    <span className="wb-assignment-sub">{a.subbieName || "Unassigned subcontractor"}</span>
                  </div>
                  <div className="wb-assignment-actions">
                    <button
                      className="wb-btn-outline wb-btn-sm"
                      onClick={() => handleExportLeg(a)}
                      title="Export this assignment as a load sheet"
                    >
                      ⬇ Export Excel
                    </button>
                    {!readOnly && (
                      <button
                        className="wb-doc-remove"
                        onClick={() => handleRemoveAssignment(a.legkey)}
                        title="Remove this assignment and release its containers"
                        aria-label="Remove assignment"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {!wholeInstruction && (
                  <div className="wb-chip-row">
                    {a.containers.length === 0 ? (
                      <span className="wb-drop-sub">No containers on this assignment</span>
                    ) : (
                      a.containers.map((ct) => (
                        <span className="wb-chip" key={ct.containerkey}>
                          {ct.containernum || `#${ct.containerkey}`}
                          <span className="wb-chip-meta">{ct.container_type}</span>
                        </span>
                      ))
                    )}
                  </div>
                )}

                <div className="wb-assign-controls">
                  <div className="wb-assign-field">
                    <label>Route</label>
                    <input type="text" readOnly value={a.startingpoint || "—"} />
                  </div>
                  <div className="wb-assign-field">
                    <label>Destination</label>
                    <input type="text" readOnly value={a.destination || "—"} />
                  </div>
                  <div className="wb-assign-field">
                    <label>Date</label>
                    <input type="text" readOnly value={a.legDate ? String(a.legDate).split("T")[0] : "—"} />
                  </div>
                  <div className="wb-assign-field">
                    <label>Subcontractor Rate</label>
                    <input
                      type="text"
                      readOnly
                      value={Number(a.driverrate) > 0 ? `R ${Number(a.driverrate).toFixed(2)}` : "Not rated"}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Draft assignment — the one being captured now. */}
            {draftOpen && !readOnly && (
              <div className="wb-assignment-block draft">
                <div className="wb-assignment-head">
                  <div className="wb-assignment-title">
                    Assignment {assignments.length + 1}
                    <span className="wb-assignment-sub">
                      {subbieOf(form.subbieId) || "New — pick containers, route and subcontractor"}
                    </span>
                  </div>
                  <div className="wb-assignment-actions">
                    <button
                      className="wb-doc-remove"
                      onClick={() => {
                        setDraftOpen(false)
                        setPickedContainers([])
                        setForm(emptyForm)
                      }}
                      title="Discard this assignment"
                      aria-label="Discard assignment"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Container picker — only containers not already on a leg. */}
                {!wholeInstruction ? (
                  <div className="wb-container-picker">
                    <div className="wb-container-picker-head">
                      <span>Containers this subcontractor is taking</span>
                      {availableContainers.length > 0 && (
                        <button type="button" className="wb-link-btn" onClick={toggleAllContainers}>
                          {pickedContainers.length === availableContainers.length ? "Clear all" : "Select all"}
                        </button>
                      )}
                    </div>
                    {availableContainers.length === 0 ? (
                      <div className="wb-drop-sub">No unassigned containers left on this instruction.</div>
                    ) : (
                      <div className="wb-container-options">
                        {availableContainers.map((c) => (
                          <label className="wb-container-option" key={c.containerkey}>
                            <input
                              type="checkbox"
                              checked={pickedContainers.includes(c.containerkey)}
                              onChange={() => toggleContainer(c.containerkey)}
                            />
                            <span className="wb-container-num">{c.containernum || `#${c.containerkey}`}</span>
                            <span className="wb-container-meta">
                              {c.container_type}
                              {c.weight ? ` · ${c.weight}` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="wb-drop-sub" style={{ padding: "8px 0" }}>
                    {breakBulk
                      ? "Break bulk is weight-based — this assignment covers the whole instruction."
                      : "This instruction has no containers captured — the assignment covers the whole instruction."}
                  </div>
                )}

                {/* Route — what the subcontractor is paid on. These lists come
                    from m5_driver_rate, not the instruction's pickup/drop-off. */}
                <div className="wb-assign-controls">
                  <div className="wb-assign-field">
                    <label>Route</label>
                    <select
                      value={form.startingpoint}
                      onChange={(e) => setForm((f) => ({ ...f, startingpoint: e.target.value }))}
                    >
                      <option value="">Select Route</option>
                      {startingPoints.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="wb-assign-field">
                    <label>Destination</label>
                    <select
                      value={form.destination}
                      onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                    >
                      <option value="">Select Destination</option>
                      {destinations.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="wb-assign-field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={form.legDate || ""}
                      onChange={(e) => setForm((f) => ({ ...f, legDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="wb-assign-controls">
                  <div className="wb-assign-field">
                    <label>Select Subcontractor</label>
                    <select
                      value={form.subbieId}
                      onChange={(e) => setForm((f) => ({ ...f, subbieId: e.target.value }))}
                    >
                      <option value="">Select Subcontractor</option>
                      {subbies.map((s) => (
                        <option key={s.userid} value={s.userid}>
                          {s.name} {s.surname}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="wb-assign-spacer" />
                  <button
                    className="wb-next-btn"
                    onClick={handleSaveAssignment}
                    disabled={!canSave || saving}
                    title={
                      !canSave
                        ? "Pick containers, a route that resolves a rate and a subcontractor"
                        : ""
                    }
                  >
                    {saving ? "Saving…" : "Save Assignment"}
                  </button>
                </div>
              </div>
            )}

            {/* "+" to start the next assignment, until nothing is left. */}
            {!readOnly && !draftOpen && (
              hasWorkLeft(child) ? (
                <button className="wb-add-assignment" onClick={() => setDraftOpen(true)}>
                  ＋ Add Assignment
                </button>
              ) : (
                <div className="wb-drop-sub" style={{ padding: "10px 0" }}>
                  {wholeInstruction
                    ? "This instruction is fully assigned."
                    : "Every container on this instruction has been assigned."}
                </div>
              )
            )}
          </div>
        )}

        {/* ── Documents card (scoped to selected instruction) ── */}
        {child && (
          <div className="wb-assign-card">
            <div className="wb-docs-head">
              <div>
                <h3 style={{ margin: 0 }}>Documents</h3>
                <div className="wb-docs-sub">PODs and supporting documentation for {refOf(child)}.</div>
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
                  {d.url ? (
                    <a
                      className="wb-doc-name wb-doc-link"
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <div className="wb-doc-name">{d.name}</div>
                  )}
                  <div className="wb-doc-sub">{d.type || "Instruction Document"}</div>
                </div>
                {d.url && (
                  <a
                    className="wb-doc-view"
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open document"
                  >
                    View
                  </a>
                )}
                <span className="wb-doc-check">✓</span>
                {!readOnly && (
                  <button className="wb-doc-remove" onClick={() => handleRemoveDoc(d.id)} aria-label="Remove">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="wb-assign-actions">
          {!readOnly && (
            <button className="wb-btn-outline" onClick={loadGroup}>
              ⟳ Refresh
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
              title={
                !allComplete ? "Every container must be assigned and every instruction must have a document" : ""
              }
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
