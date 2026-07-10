"use client"

import { useState, useEffect } from "react"
import api from "../../../../api.js"
import { normalize, findClosestRoute } from "./routeSimilarity.js"
import RouteAutocompleteInput from "./RouteAutocompleteInput.jsx"

const DriverRateForm = ({ driverRate, loading, isEditing, onSave, onCancel, onChange }) => {
  const [routeOptions, setRouteOptions] = useState([])
  const [duplicateWarning, setDuplicateWarning] = useState("")
  const [suggestedRoute, setSuggestedRoute] = useState(null)

  // Distinct existing values for autocomplete on the route inputs
  const startingPointOptions = [...new Set(routeOptions.map((r) => r.startingpoint).filter(Boolean))].sort()
  const destinationOptions = [...new Set(routeOptions.map((r) => r.destination).filter(Boolean))].sort()

  // Load existing routes for autocomplete once on mount
  useEffect(() => {
    api.get("/api/driver-rates/route-options")
      .then((res) => setRouteOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRouteOptions([]))
  }, [])

  // Warn if the typed route already exists (exact match), otherwise suggest the
  // closest existing route so misspellings don't create phantom duplicates.
  useEffect(() => {
    if (!driverRate.startingpoint || !driverRate.destination) {
      setDuplicateWarning("")
      setSuggestedRoute(null)
      return
    }
    const sp = normalize(driverRate.startingpoint)
    const dest = normalize(driverRate.destination)
    const exists = routeOptions.some(
      (r) =>
        normalize(r.startingpoint) === sp &&
        normalize(r.destination) === dest,
    )
    setDuplicateWarning(
      exists
        ? "This route already exists. Use Edit on the route to add a new period instead."
        : "",
    )
    // Only offer a "did you mean?" suggestion when it isn't already an exact match.
    setSuggestedRoute(
      exists ? null : findClosestRoute(driverRate.startingpoint, driverRate.destination, routeOptions),
    )
  }, [driverRate.startingpoint, driverRate.destination, routeOptions])

  const hasOverlap = Boolean(driverRate?._overlapWarning)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    if (hasOverlap) {
      alert("Please select a date range that does not overlap with an existing rate before saving.")
      return
    }

    if (
      driverRate.effective_from &&
      driverRate.effective_to &&
      driverRate.effective_to < driverRate.effective_from
    ) {
      alert("Effective To date cannot be before Effective From date.")
      return
    }

    const success = await onSave(driverRate)
    if (!success) {
      return
    }
  }

  const handleNumberChange = (field, value) => {
    // Allow empty values or valid positive numbers for all rate fields
    if (value === "" || (!isNaN(Number.parseFloat(value)) && Number.parseFloat(value) >= 0)) {
      onChange(field, value)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="manage-driver-rate-form" noValidate>
      <h2 className="manage-form-title">{isEditing ? "Edit Rate" : "New Route"}</h2>

      <div className="manage-form-group">
        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Starting Point *</strong>
            </label>
            <RouteAutocompleteInput
              value={driverRate.startingpoint || ""}
              onChange={(val) => onChange("startingpoint", val)}
              options={startingPointOptions}
              required
            />
          </div>
          <div className="form-field">
            <label>
              <strong>Destination *</strong>
            </label>
            <RouteAutocompleteInput
              value={driverRate.destination || ""}
              onChange={(val) => onChange("destination", val)}
              options={destinationOptions}
              required
            />
          </div>
        </div>

        {duplicateWarning && (
          <div
            style={{
              padding: "10px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              marginBottom: "10px",
              color: "#856404",
            }}
          >
            <strong>⚠ Note:</strong> {duplicateWarning}
          </div>
        )}

        {!duplicateWarning && suggestedRoute && (
          <div
            style={{
              padding: "10px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              marginBottom: "10px",
              color: "#856404",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span>
              <strong>Did you mean:</strong> {suggestedRoute.startingpoint} → {suggestedRoute.destination}? This looks
              like an existing route — using a different spelling will create a duplicate.
            </span>
            <button
              type="button"
              className="driver-rate-save-button"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => {
                onChange("startingpoint", suggestedRoute.startingpoint)
                onChange("destination", suggestedRoute.destination)
                setSuggestedRoute(null)
              }}
            >
              Use this route
            </button>
          </div>
        )}

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Driver Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_six_meter_rate", e.target.value)}
              
            />
          </div>
          <div className="form-field">
            <label>
              <strong>Driver Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.driver_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("driver_twelve_meter_rate", e.target.value)}
              
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Subbie Rate (6m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_six_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_six_meter_rate", e.target.value)}
              
            />
          </div>
          <div className="form-field">
            <label>
              <strong>Subbie Rate (12m)</strong>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={driverRate.subie_twelve_meter_rate || ""}
              onChange={(e) => handleNumberChange("subie_twelve_meter_rate", e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>
              <strong>Effective From *</strong>
            </label>
            <input
              type="date"
              className="form-input"
              value={driverRate.effective_from || ""}
              onChange={(e) => onChange("effective_from", e.target.value)}
              required
            />
            <small className="form-hint">Rate becomes effective on this date</small>
          </div>
          <div className="form-field">
            <label>
              <strong>Effective To</strong>
            </label>
            <input
              type="date"
              className="form-input"
              value={driverRate.effective_to || ""}
              min={driverRate.effective_from || undefined}
              onChange={(e) => onChange("effective_to", e.target.value || null)}
            />
            <small className="form-hint">Leave empty for no expiration</small>
          </div>
        </div>

        {driverRate._overlapWarning && (
          <div className="form-warning" style={{ 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '4px',
            marginTop: '10px',
            color: '#856404'
          }}>
            <strong>Warning:</strong> {driverRate._overlapWarning}
          </div>
        )}
      </div>

      <div className="driver-rate-button-container">
        <button type="submit" className="driver-rate-save-button" disabled={loading || hasOverlap || !!duplicateWarning}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" className="driver-rate-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DriverRateForm