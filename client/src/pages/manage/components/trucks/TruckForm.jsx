"use client"

import { useState } from "react"
import { extractFilenameFromUrl } from "../../utils/helpers"

const TruckForm = ({ truck, loading, isEditing, onSave, onCancel, onChange, onDeleteDocument }) => {
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState({ show: false, message: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!e.target.checkValidity()) {
      e.target.reportValidity()
      return
    }

    const success = await onSave(truck)
    if (!success) {
      return
    }
  }

  const handleFileUpload = (e) => {
    const files = e.target.files
    const maxSizeInBytes = 5 * 1024 * 1024 // 5MB in bytes

    if (files && files.length > 0) {
      const currentDocs = truck.documents || []
      const newFiles = Array.from(files).filter((file) => {
        if (file.type !== "application/pdf") {
          setAlert({ show: true, message: `File "${file.name}" is not a PDF. Only PDF files are allowed.` })
          return false
        }
        if (file.size > maxSizeInBytes) {
          setAlert({ show: true, message: `File "${file.name}" exceeds the 5MB limit.` })
          return false
        }
        return true
      })

      if (newFiles.length > 0) {
        const totalDocs = currentDocs.length + newFiles.length
        if (totalDocs > 3) {
          setAlert({ show: true, message: `Cannot add ${newFiles.length} file(s). Maximum of 3 documents allowed.` })
          const allowedFiles = newFiles.slice(0, 3 - currentDocs.length)
          if (allowedFiles.length > 0) {
            onChange("documents", [...currentDocs, ...allowedFiles])
          }
        } else {
          setAlert({ show: false, message: "" }) // Clear alert on success
          onChange("documents", [...currentDocs, ...newFiles])
        }
      }
    }
    e.target.value = ""
  }

  const removeDocument = (index) => {
    const updatedDocs = [...(truck.documents || [])]
    updatedDocs.splice(index, 1)
    onChange("documents", updatedDocs)
  }

  const closeAlert = () => {
    setAlert({ show: false, message: "" })
  }

  const isLicenseExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const isLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false
    const today = new Date()
    const expiry = new Date(expiryDate)
    return expiry < today
  }

  const handleYearChange = (e) => {
    const value = e.target.value
    onChange("year", value)

    if (value === "") {
      setErrors((prev) => ({ ...prev, year: null }))
      return
    }

    const yearNum = Number.parseInt(value, 10)
    const currentYear = new Date().getFullYear()
    if (!/^\d{4}$/.test(value)) {
      setErrors((prev) => ({ ...prev, year: "Please enter a 4-digit year" }))
    } else if (yearNum < 1900 || yearNum > currentYear + 5) {
      setErrors((prev) => ({ ...prev, year: `Year must be between 1900 and ${currentYear + 5}` }))
    } else {
      setErrors((prev) => ({ ...prev, year: null }))
    }
  }

  const handleVinChange = (e) => {
    const value = e.target.value.toUpperCase()
    onChange("vin_num", value)

    if (value === "") {
      setErrors((prev) => ({ ...prev, vin_num: null }))
    } else if (value.length !== 17) {
      setErrors((prev) => ({ ...prev, vin_num: "VIN must be exactly 17 characters long" }))
    } else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) {
      setErrors((prev) => ({ ...prev, vin_num: "VIN must contain only A-H, J-N, P, R-Z, 0-9" }))
    } else {
      setErrors((prev) => ({ ...prev, vin_num: null }))
    }
  }

  return (
    <div className="manage-add-truck-form">
      <h2>{isEditing ? "Edit Truck" : "Add New Truck"}</h2>

      <form onSubmit={handleSubmit} noValidate>
     

        <div className="manage-truck-form-grid">
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>
              Truck Registration <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              value={truck.truckregnum || ""}
              onChange={(e) => onChange("truckregnum", e.target.value)}
              required
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Trailer Size</label>
            <input
              type="text"
              value={truck.trailersize || ""}
              onChange={(e) => onChange("trailersize", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Year</label>
            <input
              type="text"
              value={truck.year || ""}
              onChange={handleYearChange}
              pattern="\d{4}"
              title="Please enter a 4-digit year"
            />
            {errors.year && <small style={{ color: "red" }}>{errors.year}</small>}
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Model</label>
            <input
              type="text"
              value={truck.model || ""}
              onChange={(e) => onChange("model", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={truck.purchase_price || ""}
              onChange={(e) => onChange("purchase_price", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Git</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={truck.git || ""}
              onChange={(e) => onChange("git", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Current Evaluation</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={truck.current_evaluation || ""}
              onChange={(e) => onChange("current_evaluation", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>VIN Number</label>
            <input
              type="text"
              value={truck.vin_num || ""}
              onChange={handleVinChange}
              pattern="[A-HJ-NPR-Z0-9]{17}"
              title="VIN must be 17 characters, containing only A-H, J-N, P, R-Z, 0-9"
            />
            {errors.vin_num && <small style={{ color: "red" }}>{errors.vin_num}</small>}
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Purchase Date</label>
            <input
              type="date"
              value={truck.truckpurchasedate ? new Date(truck.truckpurchasedate).toISOString().split("T")[0] : ""}
              onChange={(e) => onChange("truckpurchasedate", e.target.value)}
            />
          </div>

          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>
              License Expiry Date <span style={{ color: "red" }}>*</span>
              {truck.truck_license_expiry && isLicenseExpired(truck.truck_license_expiry) && (
                <span style={{ color: "red", marginLeft: "10px", fontSize: "0.9em" }}>⚠️ EXPIRED</span>
              )}
              {truck.truck_license_expiry &&
                !isLicenseExpired(truck.truck_license_expiry) &&
                isLicenseExpiringSoon(truck.truck_license_expiry) && (
                  <span style={{ color: "orange", marginLeft: "10px", fontSize: "0.9em" }}>⚠️ EXPIRES SOON</span>
                )}
            </label>
            <input
              type="date"
              value={truck.truck_license_expiry ? new Date(truck.truck_license_expiry).toISOString().split("T")[0] : ""}
              onChange={(e) => onChange("truck_license_expiry", e.target.value)}
              style={{
                borderColor:
                  truck.truck_license_expiry && isLicenseExpired(truck.truck_license_expiry)
                    ? "red"
                    : truck.truck_license_expiry && isLicenseExpiringSoon(truck.truck_license_expiry)
                      ? "orange"
                      : "",
              }}
              required
            />
            {truck.truck_license_expiry && (
              <small
                style={{
                  color: isLicenseExpired(truck.truck_license_expiry)
                    ? "red"
                    : isLicenseExpiringSoon(truck.truck_license_expiry)
                      ? "orange"
                      : "green",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {isLicenseExpired(truck.truck_license_expiry)
                  ? "License has expired!"
                  : isLicenseExpiringSoon(truck.truck_license_expiry)
                    ? `License expires in ${Math.ceil((new Date(truck.truck_license_expiry) - new Date()) / (1000 * 60 * 60 * 24))} days`
                    : "License is current"}
              </small>
            )}
          </div>
   {/* Alert Component */}
        {alert.show && (
          <div className="alert-box">
            <span>{alert.message}</span>
            <button
              type="button"
              className="alert-close"
              onClick={closeAlert}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}
          <div className="manage-form-group" style={{ gridColumn: "1 / span 3" }}>
            <label>
              <strong>Upload Documents (PDF Only, Max 3, 5MB each)</strong>
            </label>
            <div
              style={{
                border: "2px dashed #ccc",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
              }}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                disabled={(truck.documents?.length || 0) >= 3}
              />
              <small>
                {(truck.documents?.length || 0) >= 3
                  ? "Maximum of 3 PDF documents uploaded"
                  : "Upload PDF documents only (max 5MB each)"}
              </small>
            </div>

            <div style={{ marginTop: "15px" }}>
              {isEditing && truck.existingDocuments?.length > 0 && (
                <>
                  <h4>Previously Uploaded Documents</h4>
                  {truck.existingDocuments.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>{extractFilenameFromUrl(url)}</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginRight: "10px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => onDeleteDocument("truck", truck.m5truckskey, url)}
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}

              {truck.documents?.length > 0 && (
                <>
                  <h4>Newly Uploaded Documents</h4>
                  {truck.documents.map((doc, index) => (
                    <div
                      key={`new-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>{doc.name}</span>
                      <a
                        href={URL.createObjectURL(doc)}
                        download={doc.name}
                        style={{
                          marginRight: "10px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

     <div className="truck-button-container">
        <button type="submit" className="truck-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Truck" : "Add Truck"}
        </button>
        <button type="button" onClick={onCancel} className="truck-cancel-button">
          Cancel
        </button>
      </div>
      </form>
    </div>
  )
}

export default TruckForm