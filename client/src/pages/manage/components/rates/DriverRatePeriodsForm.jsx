"use client"

import { useState } from "react"
import api from "../../../../api.js"
import Swal from "sweetalert2"

const isCoveredByPeriods = (dateStr, periods) =>
  periods.some((card) => {
    if (!card.effective_from) return false
    if (dateStr < card.effective_from) return false
    if (card.effective_to && dateStr > card.effective_to) return false
    return true
  })

const DriverRatePeriodsForm = ({
  route,
  periods,
  legDates = [],
  loading,
  onSave,
  onCancel,
  onAddPeriod,
  onRemovePeriod,
  onChangePeriod,
}) => {
  const { startingpoint: originalStartingpoint, destination: originalDestination } = route
  const [editStartingpoint, setEditStartingpoint] = useState(originalStartingpoint)
  const [editDestination, setEditDestination] = useState(originalDestination)
  const [showCoverageModal, setShowCoverageModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [cardErrors, setCardErrors] = useState({})

  const routeChanged =
    editStartingpoint.trim().toLowerCase() !== originalStartingpoint.trim().toLowerCase() ||
    editDestination.trim().toLowerCase() !== originalDestination.trim().toLowerCase()

  // Compute coverage gaps on every render — fires automatically when periods change
  const uncoveredByInstruction = legDates.reduce((acc, leg) => {
    const d = leg.date ? leg.date.toString().split("T")[0] : null
    if (!d || isCoveredByPeriods(d, periods)) return acc
    if (!acc[leg.m1key]) acc[leg.m1key] = []
    acc[leg.m1key].push(d)
    return acc
  }, {})
  const uncoveredInstructions = Object.entries(uncoveredByInstruction)

  const startingpoint = editStartingpoint
  const destination = editDestination

  const periodsOverlap = (a, b) => {
    if (!a.effective_from || !b.effective_from) return false
    const aEndsBeforeB = a.effective_to && a.effective_to < b.effective_from
    const bEndsBeforeA = b.effective_to && b.effective_to < a.effective_from
    return !aEndsBeforeB && !bEndsBeforeA
  }

  const recheckAllOverlaps = (updatedPeriods) => {
    updatedPeriods.forEach((card, index) => {
      const overlaps = updatedPeriods.some((other, i) => i !== index && periodsOverlap(card, other))
      const warning = overlaps ? "This period's dates overlap with another period in this rate" : null
      if (card._overlapWarning !== warning) {
        onChangePeriod(index, "_overlapWarning", warning)
        if (!warning) clearCardError(index)
      }
    })
  }

  const clearCardError = (index) => {
    if (cardErrors[index]) {
      setCardErrors((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  const handleDateChange = (index, field, value) => {
    const updatedPeriods = periods.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    onChangePeriod(index, field, value)
    clearCardError(index)
    recheckAllOverlaps(updatedPeriods)
  }

  const handleRateChange = (index, field, value) => {
    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      onChangePeriod(index, field, value)
      clearCardError(index)
    }
  }

  const handleRemovePeriod = async (index) => {
    const card = periods[index]

    // New unsaved cards have no m5ratekey — safe to remove without a check
    if (!card.m5ratekey) {
      onRemovePeriod(index)
      return
    }

    // Check if this saved period is in use by any in-progress instruction
    try {
      const usageResp = await api.get(`/api/driver-rates/${card.m5ratekey}/usage`)
      const usageData = usageResp.data

      if (usageData?.inUse) {
        const instructions = Array.isArray(usageData.instructions) ? usageData.instructions : []
        const instrText = instructions.length ? instructions.join(", ") : "unknown"
        const result = await Swal.fire({
          title: "Period In Use",
          html: `<div style="text-align:left;">
            <div style="margin-bottom:8px;">This rate period is currently used by in-progress instruction(s): <strong>${instrText}</strong></div>
            <div>Removing it means those legs may lose their rate when you save. Are you sure?</div>
          </div>`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Remove anyway",
          confirmButtonColor: "#e74c3c",
          cancelButtonText: "Keep it",
          customClass: {
            popup: "custom-swal-popup",
            title: "custom-swal-title",
            confirmButton: "custom-swal-confirm",
            cancelButton: "custom-swal-cancel",
          },
        })
        if (result.isConfirmed) {
          onRemovePeriod(index)
        }
        return
      }
    } catch (_) {
      // If the usage check fails, fall through and allow removal
    }

    onRemovePeriod(index)
  }

  const openSaveModal = () => {
    if (!editStartingpoint.trim() || !editDestination.trim()) {
      alert("Starting point and destination cannot be empty.")
      return
    }

    // Validate every card and collect errors by index
    const errors = {}
    periods.forEach((card, index) => {
      const msgs = []
      if (!card.effective_from) {
        msgs.push("Effective From date is required")
      } else if (card.effective_to && card.effective_to < card.effective_from) {
        msgs.push("Effective To cannot be before Effective From")
      }
      const hasRate =
        (card.driver_six_meter_rate !== "" && card.driver_six_meter_rate != null) ||
        (card.driver_twelve_meter_rate !== "" && card.driver_twelve_meter_rate != null) ||
        (card.subie_six_meter_rate !== "" && card.subie_six_meter_rate != null) ||
        (card.subie_twelve_meter_rate !== "" && card.subie_twelve_meter_rate != null)
      if (!hasRate) {
        msgs.push("At least one rate value is required")
      }
      if (card._overlapWarning) {
        msgs.push("This period overlaps with another — fix the dates before saving")
      }
      if (msgs.length) errors[index] = msgs
    })

    setCardErrors(errors)
    if (Object.keys(errors).length > 0) return

    setShowSaveModal(true)
  }

  const normalizeName = (s) => s.trim().replace(/\s+/g, " ")

  const confirmSave = async () => {
    setShowSaveModal(false)
    await onSave(
      normalizeName(editStartingpoint),
      normalizeName(editDestination),
      periods,
      originalStartingpoint,
      originalDestination,
    )
  }

  const newPeriodCount = periods.filter((p) => !p.m5ratekey).length
  const existingPeriodCount = periods.filter((p) => p.m5ratekey).length
  const affectedInstructionNums = [...new Set(legDates.map((l) => l.m1key))].sort((a, b) => a - b)
  const inProgressLegsAffected = affectedInstructionNums.length > 0

  const rateFields = [
    { field: "driver_six_meter_rate", label: "Driver Rate (6m)" },
    { field: "driver_twelve_meter_rate", label: "Driver Rate (12m)" },
    { field: "subie_six_meter_rate", label: "Subbie Rate (6m)" },
    { field: "subie_twelve_meter_rate", label: "Subbie Rate (12m)" },
  ]

  return (
    <div className="drf-wrapper">
      {/* Page header */}
      <div className="drf-page-header">
        <div className="drf-route-badge">
          <input
            type="text"
            className="drf-route-input"
            value={editStartingpoint}
            onChange={(e) => setEditStartingpoint(e.target.value)}
            placeholder="Starting point"
            aria-label="Starting point"
          />
          <span className="drf-route-arrow">→</span>
          <input
            type="text"
            className="drf-route-input"
            value={editDestination}
            onChange={(e) => setEditDestination(e.target.value)}
            placeholder="Destination"
            aria-label="Destination"
          />
          {routeChanged && (
            <span className="drf-route-rename-badge">Renaming</span>
          )}
        </div>
        <div className="drf-header-actions">
          <button className="driver-rate-cancel-button" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="driver-rate-save-button" type="button" onClick={openSaveModal} disabled={loading}>
            {loading ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Coverage gap banner — compact strip with modal for details */}
      {uncoveredInstructions.length > 0 && (
        <div className="drf-coverage-warning">
          <span className="drf-warning-icon">⚠</span>
          <span className="drf-coverage-summary">
            <strong>{uncoveredInstructions.length}</strong> instruction{uncoveredInstructions.length > 1 ? "s have" : " has"} legs outside the current periods and will have no rate.
          </span>
          <button
            type="button"
            className="drf-coverage-details-btn"
            onClick={() => setShowCoverageModal(true)}
          >
            View details
          </button>
        </div>
      )}

      {/* Coverage gap modal */}
      {showCoverageModal && (
        <div className="drf-modal-overlay" onClick={() => setShowCoverageModal(false)}>
          <div className="drf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drf-modal-header">
              <span className="drf-warning-icon">⚠</span>
              <h3 className="drf-modal-title">Uncovered Leg Dates</h3>
              <button
                type="button"
                className="drf-modal-close"
                onClick={() => setShowCoverageModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="drf-modal-intro">
              The following instructions have legs on dates not covered by any period. Ensure you add or extend a period to cover these dates before saving.
            </p>
            <ul className="drf-coverage-list">
              {uncoveredInstructions.map(([instrNum, dates]) => (
                <li key={instrNum} className="drf-coverage-list-item">
                  <span className="drf-coverage-instr">Instruction <strong>#{instrNum}</strong></span>
                  <span className="drf-coverage-dates">{dates.join(", ")}</span>
                </li>
              ))}
            </ul>
            <div className="drf-modal-footer">
              <button
                type="button"
                className="driver-rate-cancel-button"
                onClick={() => setShowCoverageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="drf-cards-grid">
        {periods.map((card, index) => (
          <div key={index} className={`drf-card${cardErrors[index] ? " drf-card--error" : ""}`}>
            {/* Card header */}
            <div className="drf-card-header">
              <span className="drf-period-label">Period {index + 1}</span>
              {periods.length > 1 && (
                <button
                  type="button"
                  className="drf-remove-btn"
                  onClick={() => handleRemovePeriod(index)}
                  title="Remove period"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="drf-card-body">
              {/* Dates row */}
              <div className="drf-dates-row">
                <div className="drf-field">
                  <label className="drf-label">Effective From <span className="drf-required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={card.effective_from || ""}
                    onChange={(e) => handleDateChange(index, "effective_from", e.target.value)}
                    required
                  />
                </div>
                <div className="drf-field">
                  <label className="drf-label">Effective To</label>
                  <input
                    type="date"
                    className="form-input"
                    value={card.effective_to || ""}
                    min={card.effective_from || undefined}
                    onChange={(e) => handleDateChange(index, "effective_to", e.target.value || "")}
                  />
                  <span className="drf-hint">Leave empty for no expiry</span>
                </div>
              </div>

              {/* Rate fields */}
              <div className="drf-rates-grid">
                {rateFields.map(({ field, label }) => (
                  <div key={field} className="drf-field">
                    <label className="drf-label">{label}</label>
                    <div className="drf-input-prefix-wrapper">
                      <span className="drf-prefix">R</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input drf-rate-input"
                        value={card[field] ?? ""}
                        onChange={(e) => handleRateChange(index, field, e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Validation errors */}
              {cardErrors[index] && (
                <div className="drf-card-errors">
                  {cardErrors[index].map((msg) => (
                    <div key={msg} className="drf-card-error-msg">
                      <span className="drf-warning-icon">✕</span> {msg}
                    </div>
                  ))}
                </div>
              )}

              {/* Overlap warning */}
              {card._overlapWarning && (
                <div className="drf-overlap-warning">
                  <span className="drf-warning-icon">⚠</span>
                  {card._overlapWarning}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Period tile */}
        <div className="drf-add-tile" onClick={onAddPeriod} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onAddPeriod()}>
          <span className="drf-add-icon">+</span>
          <span className="drf-add-label">Add Period</span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="driver-rate-button-container">
        <button className="driver-rate-save-button" type="button" onClick={openSaveModal} disabled={loading}>
          {loading ? "Saving…" : "Save All"}
        </button>
        <button className="driver-rate-cancel-button" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>

      {/* Save confirmation modal */}
      {showSaveModal && (
        <div className="drf-modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="drf-modal drf-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drf-modal-header">
              <h3 className="drf-modal-title">Confirm Save</h3>
              <button type="button" className="drf-modal-close" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>

            <div className="drf-save-modal-body">
              {/* Route */}
              <div className="drf-save-section">
                <div className="drf-save-label">Route</div>
                {routeChanged ? (
                  <div className="drf-save-rename">
                    <span className="drf-save-route-old">{originalStartingpoint} → {originalDestination}</span>
                    <span className="drf-save-rename-arrow">will be renamed to</span>
                    <span className="drf-save-route-new">{editStartingpoint} → {editDestination}</span>
                  </div>
                ) : (
                  <div className="drf-save-route-current">{editStartingpoint} → {editDestination}</div>
                )}
              </div>

              {/* Periods */}
              <div className="drf-save-section">
                <div className="drf-save-label">Periods</div>
                <ul className="drf-save-list">
                  {existingPeriodCount > 0 && (
                    <li>{existingPeriodCount} existing period{existingPeriodCount > 1 ? "s" : ""} will be updated</li>
                  )}
                  {newPeriodCount > 0 && (
                    <li>{newPeriodCount} new period{newPeriodCount > 1 ? "s" : ""} will be added</li>
                  )}
                </ul>
              </div>

              {/* Impact on in-progress instructions */}
              {inProgressLegsAffected && (
                <div className="drf-save-section drf-save-impact">
                  <div className="drf-save-label">In-progress instructions affected</div>
                  <div className="drf-save-instr-chips">
                    {affectedInstructionNums.map((num) => (
                      <span key={num} className="drf-save-instr-chip">#{num}</span>
                    ))}
                  </div>
                  <ul className="drf-save-list">
                    {routeChanged && (
                      <li>Legs matching the old route name will have their starting point and destination updated to the new name</li>
                    )}
                    <li>If any rate values changed, affected leg rates will be recalculated to match the new periods</li>
                  </ul>
                </div>
              )}

              {uncoveredInstructions.length > 0 && (
                <div className="drf-save-section drf-save-warning">
                  <span className="drf-warning-icon">⚠</span>
                  <span>{uncoveredInstructions.length} instruction{uncoveredInstructions.length > 1 ? "s have" : " has"} legs on dates not covered by any period — those legs will have no rate.</span>
                </div>
              )}
            </div>

            <div className="drf-modal-footer">
              <button type="button" className="driver-rate-cancel-button" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button type="button" className="driver-rate-save-button" onClick={confirmSave}>
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverRatePeriodsForm
