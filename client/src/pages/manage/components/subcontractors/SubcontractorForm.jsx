"use client"
import { useState, useMemo } from "react"

const SubcontractorForm = ({ subcontractor, loading, isEditing, onSave, onCancel, onChange, onToggleDriverStatus }) => {
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate that we have at least one driver OR one truck (not both required)
    const validDrivers = (subcontractor.drivers || []).filter((driver) => driver.name && driver.name.trim())
    const validTrucks = (subcontractor.trucks || []).filter((truck) => truck.truckregnum && truck.truckregnum.trim())

    if (validDrivers.length === 0 && validTrucks.length === 0) {
      alert("Please provide at least one driver OR one truck (or both).")
      return
    }

    const success = await onSave({
      ...subcontractor,
      drivers: validDrivers,
      trucks: validTrucks,
    })

    if (!success) {
      return
    }
  }

  // Driver pagination and filtering state
  const [driverStatusFilter, setDriverStatusFilter] = useState("all")
  const [driverCurrentPage, setDriverCurrentPage] = useState(1)
  const driversPerPage = 2

  const addDriver = () => {
    const newDrivers = [{ name: "", userid: null, driverstatus: true }, ...(subcontractor.drivers || [])]
    onChange("drivers", newDrivers)
    onChange("driver_count", newDrivers.length)
    setDriverCurrentPage(1) // Reset to first page to show the new driver
  }

  const removeDriver = (index) => {
    const updatedDrivers = [...(subcontractor.drivers || [])]
    updatedDrivers.splice(index, 1)
    onChange("drivers", updatedDrivers)
    onChange("driver_count", updatedDrivers.length)
  }

  const handleDriverChange = (index, value) => {
    const updatedDrivers = [...(subcontractor.drivers || [])]
    if (!updatedDrivers[index]) {
      updatedDrivers[index] = { name: "", userid: null, driverstatus: true }
    }
    updatedDrivers[index] = { ...updatedDrivers[index], name: value }
    onChange("drivers", updatedDrivers)
  }

  // Filter drivers based on status
  const filteredDrivers = useMemo(() => {
    let filtered = subcontractor.drivers || []
    
    if (driverStatusFilter === "active") {
      filtered = filtered.filter(d => d.driverstatus !== false)
    } else if (driverStatusFilter === "disabled") {
      filtered = filtered.filter(d => d.driverstatus === false)
    }
    
    return filtered
  }, [subcontractor.drivers, driverStatusFilter])

  // Paginate drivers
  const paginatedDrivers = useMemo(() => {
    const startIndex = (driverCurrentPage - 1) * driversPerPage
    const endIndex = startIndex + driversPerPage
    return filteredDrivers.slice(startIndex, endIndex)
  }, [filteredDrivers, driverCurrentPage])

  const totalDriverPages = Math.ceil(filteredDrivers.length / driversPerPage)

  // Helper functions for button visibility
  const shouldShowDeleteButton = (driver) => {
    // Show delete button for any unsaved driver (no userid)
    // This allows deleting newly added drivers before saving
    return !driver.userid
  }

  const shouldShowToggleButton = (driver) => {
    // Show toggle only for saved drivers (have userid)
    return !!driver.userid
  }

  const handleToggleDriverStatus = async (driver, driverIndex) => {
    if (onToggleDriverStatus && driver.userid) {
      const success = await onToggleDriverStatus(driver.userid, driver.driverstatus)
      
      // If successful, update the local state immediately
      if (success) {
        const updatedDrivers = [...(subcontractor.drivers || [])]
        if (updatedDrivers[driverIndex]) {
          updatedDrivers[driverIndex] = {
            ...updatedDrivers[driverIndex],
            driverstatus: !driver.driverstatus
          }
          onChange("drivers", updatedDrivers)
        }
      }
    }
  }

  const addTruck = () => {
    const newTrucks = [
      ...(subcontractor.trucks || []),
      {
        truckregnum: "",
        trailersize: "",
        year: "",
        model: "",
        vin_num: "",
      },
    ]
    onChange("trucks", newTrucks)
    onChange("truck_count", newTrucks.length)
  }

  const removeTruck = (index) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    updatedTrucks.splice(index, 1)
    onChange("trucks", updatedTrucks)
    onChange("truck_count", updatedTrucks.length)
  }

  const handleTruckChange = (index, field, value) => {
    const updatedTrucks = [...(subcontractor.trucks || [])]
    if (!updatedTrucks[index]) {
      updatedTrucks[index] = {
        truckregnum: "",
        trailersize: "",
        year: "",
        model: "",
        vin_num: "",
      }
    }
    updatedTrucks[index] = { ...updatedTrucks[index], [field]: value }
    onChange("trucks", updatedTrucks)
  }

  // Both drivers and trucks can be empty initially
  const drivers = subcontractor.drivers || []
  const trucks = subcontractor.trucks || []

  return (
    <form onSubmit={handleSubmit} className="manage-subcontractor-form">
      <h2 className="manage-form-title" style={{ alignItems: "center", textAlign: "center" }}>
        {isEditing ? "Edit Subcontractor" : "Add Subcontractor"}
      </h2>

      {/* Company Information */}
      <div style={{ marginBottom: "20px" }}>
        <h3 className="manage-section-title">Company Information</h3>
        <div
          className="manage-subform-group"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          <label>
            <strong>Company Name *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.companyname || ""}
              onChange={(e) => onChange("companyname", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Location *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.location || ""}
              onChange={(e) => onChange("location", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Contact Person *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.contact_person || ""}
              onChange={(e) => onChange("contact_person", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Phone Number *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.cellnum || ""}
              onChange={(e) => onChange("cellnum", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Email *</strong>
            <input
              type="email"
              className="form-input"
              value={subcontractor.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
              required
            />
          </label>

          <label>
            <strong>Company Reg Number *</strong>
            <input
              type="text"
              className="form-input"
              value={subcontractor.subei_reg_num || ""}
              onChange={(e) => onChange("subei_reg_num", e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {/* Flexible Options Notice */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          borderRadius: "6px",
          border: "1px solid #ffeaa7",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>📋 Flexible Options:</h4>
        <p style={{ margin: "0", color: "#856404", fontSize: "14px" }}>You can choose to add:</p>
        <ul style={{ margin: "5px 0 0 20px", color: "#856404", fontSize: "14px" }}>
          <li>
            <strong>Drivers only</strong> - Just add drivers without trucks
          </li>
          <li>
            <strong>Trucks only</strong> - Just add trucks without drivers
          </li>
          <li>
            <strong>Both</strong> - Add both drivers and trucks
          </li>
        </ul>
        <p style={{ margin: "10px 0 0 0", color: "#856404", fontSize: "14px" }}>
          <strong>Note:</strong> At least one driver OR one truck must be provided.
        </p>
      </div>

      {/* Drivers Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <h3 className="manage-section-title" style={{ margin: 0 }}>Drivers (Optional)</h3>
            <span style={{ 
              background: "#2196F3", 
              color: "white", 
              padding: "4px 12px", 
              borderRadius: "12px", 
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              {filteredDrivers.length} {driverStatusFilter !== "all" ? driverStatusFilter : "total"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "5px", background: "#f5f5f5", padding: "4px", borderRadius: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setDriverStatusFilter("all")
                  setDriverCurrentPage(1)
                }}
                style={{
                  background: driverStatusFilter === "all" ? "#2196F3" : "transparent",
                  color: driverStatusFilter === "all" ? "white" : "#666",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: driverStatusFilter === "all" ? "600" : "500",
                  transition: "all 0.2s ease",
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setDriverStatusFilter("active")
                  setDriverCurrentPage(1)
                }}
                style={{
                  background: driverStatusFilter === "active" ? "#4CAF50" : "transparent",
                  color: driverStatusFilter === "active" ? "white" : "#666",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: driverStatusFilter === "active" ? "600" : "500",
                  transition: "all 0.2s ease",
                }}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => {
                  setDriverStatusFilter("disabled")
                  setDriverCurrentPage(1)
                }}
                style={{
                  background: driverStatusFilter === "disabled" ? "#FF9800" : "transparent",
                  color: driverStatusFilter === "disabled" ? "white" : "#666",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: driverStatusFilter === "disabled" ? "600" : "500",
                  transition: "all 0.2s ease",
                }}
              >
                Disabled
              </button>
            </div>
            <button
              type="button"
              className="add-driver-button"
              onClick={addDriver}
              style={{
                background: "#4CAF50",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              + Add Driver
            </button>
          </div>
        </div>

        {filteredDrivers.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              border: "2px dashed #ddd",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
            }}
          >
            {driverStatusFilter === "all" 
              ? "No drivers added yet. Click \"Add Driver\" to get started, or skip to add trucks only."
              : `No ${driverStatusFilter} drivers found.`}
          </div>
        ) : (
          <>
            {paginatedDrivers.map((driver, index) => {
              const actualIndex = (driverCurrentPage - 1) * driversPerPage + index
              // Find the real index in the original drivers array
              const realIndex = (subcontractor.drivers || []).findIndex(d => 
                d.userid ? d.userid === driver.userid : d === driver
              )
              const isDisabled = driver.driverstatus === false
              const isSaved = !!driver.userid
              
              return (
                <div
                  key={driver.userid || `new-${actualIndex}`}
                  className="driver-entry"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "15px",
                    alignItems: "center",
                    padding: "15px",
                    border: `2px solid ${isDisabled ? "#ffcdd2" : isSaved ? "#c8e6c9" : "#ddd"}`,
                    borderRadius: "6px",
                    marginBottom: "15px",
                    backgroundColor: isDisabled ? "#ffebee" : isSaved ? "#f1f8e9" : "#f9f9f9",
                    opacity: isDisabled ? 0.7 : 1,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <strong>Driver {actualIndex + 1}</strong>
                      {isSaved && (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background: isDisabled ? "#f44336" : "#4CAF50",
                          color: "white",
                        }}>
                          {isDisabled ? "DISABLED" : "ACTIVE"}
                        </span>
                      )}
                      {!isSaved && (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background: "#FF9800",
                          color: "white",
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={driver.name || ""}
                      onChange={(e) => handleDriverChange(realIndex, e.target.value)}
                      placeholder="e.g., John Smith"
                      style={{
                        width: "100%",
                      }}
                    />
                    <small style={{ color: "#666", fontSize: "12px" }}>
                      Enter full name (first and last name)
                    </small>
                  </div>

                  {shouldShowToggleButton(driver) && (
                    <button
                      type="button"
                      onClick={() => handleToggleDriverStatus(driver, realIndex)}
                      style={{
                        background: isDisabled ? "#4CAF50" : "#FF9800",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        height: "fit-content",
                        whiteSpace: "nowrap",
                      }}
                      title={isDisabled ? "Enable this driver" : "Disable this driver"}
                    >
                      {isDisabled ? "Enable" : "Disable"}
                    </button>
                  )}

                  {shouldShowDeleteButton(driver) && (
                    <button
                      type="button"
                      onClick={() => removeDriver(actualIndex)}
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        height: "fit-content",
                      }}
                      title="Remove this driver"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )
            })}

            {/* Pagination Controls */}
            {totalDriverPages > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
                padding: "15px",
                background: "#4169e1",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize: "14px", color: "white", fontWeight: "500" }}>
                  Showing {((driverCurrentPage - 1) * driversPerPage) + 1} - {Math.min(driverCurrentPage * driversPerPage, filteredDrivers.length)} of {filteredDrivers.length} drivers
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setDriverCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={driverCurrentPage === 1}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: driverCurrentPage === 1 ? "rgba(255,255,255,0.2)" : "white",
                      color: driverCurrentPage === 1 ? "rgba(255,255,255,0.5)" : "#4169e1",
                      cursor: driverCurrentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      opacity: driverCurrentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ← Previous
                  </button>
                  <span style={{ 
                    padding: "8px 16px", 
                    fontSize: "14px", 
                    fontWeight: "bold",
                    color: "white",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "6px",
                  }}>
                    {driverCurrentPage} / {totalDriverPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDriverCurrentPage(prev => Math.min(totalDriverPages, prev + 1))}
                    disabled={driverCurrentPage === totalDriverPages}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: driverCurrentPage === totalDriverPages ? "rgba(255,255,255,0.2)" : "white",
                      color: driverCurrentPage === totalDriverPages ? "rgba(255,255,255,0.5)" : "#4169e1",
                      cursor: driverCurrentPage === totalDriverPages ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      opacity: driverCurrentPage === totalDriverPages ? 0.5 : 1,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trucks Section */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px" }}>
          <h3 className="manage-section-title">Trucks (Optional)</h3>
          <button
            type="button"
            className="add-truck-button"
            onClick={addTruck}
            style={{
              background: "#2196F3",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            + Add Truck
          </button>
        </div>

        {trucks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              border: "2px dashed #ddd",
              borderRadius: "6px",
              backgroundColor: "#f0f8ff",
            }}
          >
            No trucks added yet. Click "Add Truck" to get started, or skip to add drivers only.
          </div>
        ) : (
          trucks.map((truck, index) => (
            <div
              key={index}
              className="truck-entry"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr) auto",
                gap: "15px",
                alignItems: "end",
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "15px",
                backgroundColor: "#f0f8ff",
              }}
            >
              <label>
                <strong>Truck Registration</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.truckregnum || ""}
                  onChange={(e) => handleTruckChange(index, "truckregnum", e.target.value)}
                  placeholder="e.g., ABC123GP"
                />
              </label>

              <label>
                <strong>Trailer Size</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.trailersize || ""}
                  onChange={(e) => handleTruckChange(index, "trailersize", e.target.value)}
                  placeholder="e.g., 34 Ton"
                />
              </label>

              <label>
                <strong>Year</strong>
                <input
                  type="number"
                  className="form-input"
                  value={truck.year || ""}
                  onChange={(e) => handleTruckChange(index, "year", e.target.value)}
                  placeholder="e.g., 2020"
                />
              </label>

              <button
                type="button"
                onClick={() => removeTruck(index)}
                style={{
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  height: "fit-content",
                }}
                title="Remove this truck"
              >
                Remove
              </button>

              <label style={{ gridColumn: "1 / 2" }}>
                <strong>Model</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.model || ""}
                  onChange={(e) => handleTruckChange(index, "model", e.target.value)}
                  placeholder="e.g., Volvo FH"
                />
              </label>

              <label style={{ gridColumn: "2 / 3" }}>
                <strong>VIN Number</strong>
                <input
                  type="text"
                  className="form-input"
                  value={truck.vin_num || ""}
                  onChange={(e) => handleTruckChange(index, "vin_num", e.target.value)}
                  placeholder="Vehicle identification number"
                />
              </label>
            </div>
          ))
        )}
      </div>

      {/* Form Actions */}
    <div className="subcontractor-button-container">
        <button type="submit" className="subcontractor-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Subcontractor" : "Add Subcontractor"}
        </button>
        <button type="button" className="subcontractor-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

    
      {/* Dynamic Summary */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e8f4fd",
          borderRadius: "6px",
          border: "1px solid #bee5eb",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#0c5460" }}>Summary:</h4>
        <p style={{ margin: "0", color: "#0c5460" }}>
          This will create{" "}
          {drivers.filter((d) => d.name).length > 0 && (
            <>
              <strong>{drivers.filter((d) => d.name).length}</strong> driver record(s)
            </>
          )}
          {drivers.filter((d) => d.name).length > 0 && trucks.filter((t) => t.truckregnum).length > 0 && " and "}
          {trucks.filter((t) => t.truckregnum).length > 0 && (
            <>
              <strong>{trucks.filter((t) => t.truckregnum).length}</strong> truck record(s)
            </>
          )}
          {drivers.filter((d) => d.name).length === 0 && trucks.filter((t) => t.truckregnum).length === 0 && (
            <span style={{ color: "#dc3545" }}>
              <strong>No records</strong> - Please add at least one driver or truck
            </span>
          )}
          {(drivers.filter((d) => d.name).length > 0 || trucks.filter((t) => t.truckregnum).length > 0) && (
            <>
              {" "}
              for <strong>{subcontractor.companyname || "this company"}</strong>
            </>
          )}
          .
        </p>
      
      </div>
    </form>
  )
}

export default SubcontractorForm
