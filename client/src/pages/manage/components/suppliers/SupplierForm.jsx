"use client"

import { useState, useRef, useEffect } from "react"

const SupplierForm = ({
  supplier = {},
  loading = false,
  isEditing = false,
  onSubmit = () => {},
  onCancel = () => {},
  onChange = () => {},
  allExpenseTypes = [],
}) => {
  const [formData, setFormData] = useState({
    supplier: "",
    representative: "",
    address: "",
    suburb: "",
    postalcode: "",
    email: "",
    cellnum: "",
    vatregno: "",
    city: "",
    streetaddress: "",
    payment_type: "",
    expenseTypes: [],
    ...supplier,
  })

  const [errors, setErrors] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const emailRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    console.log("SupplierForm received supplier data:", supplier)
    if (supplier && Object.keys(supplier).length > 0) {
      setFormData({
        supplier: supplier.supplier || "",
        representative: supplier.representative || "",
        address: supplier.address || "",
        suburb: supplier.suburb || "",
        postalcode: supplier.postalcode || "",
        email: supplier.email || "",
        cellnum: supplier.cellnum || "",
        vatregno: supplier.vatregno || "",
        city: supplier.city || "",
        streetaddress: supplier.streetaddress || "",
        payment_type: supplier.payment_type || "",
        expenseTypes: supplier.expenseTypes || [],
      })
    }
  }, [supplier])

  useEffect(() => {
    console.log("SupplierForm: Received expense types:", allExpenseTypes)
    console.log("SupplierForm: Number of expense types:", allExpenseTypes.length)
    if (allExpenseTypes.length > 0) {
      console.log("SupplierForm: First few expense types:", allExpenseTypes.slice(0, 5))
    }
  }, [allExpenseTypes])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Phone number validation function
  const validatePhoneNumber = (value) => {
    // Remove all non-digit characters except a leading '+' for country code
    const cleanedValue = value.replace(/[^\d+]/g, '')
    // Extract digits only (excluding the leading '+' if present)
    const digitsOnly = cleanedValue.startsWith('+') ? cleanedValue.slice(1) : cleanedValue
    
    // Regular expression to ensure exactly 10 digits
    const phoneRegex = /^\d{10}$/
    
    if (!value) {
      return 'Cell number is required'
    }
    
    if (!phoneRegex.test(digitsOnly)) {
      return 'Cell number must be exactly 10 digits'
    }
    
    return ''
  }

  // Restrict input to digits and optional leading '+'
  const handlePhoneNumberKeyDown = (e) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
    ]
    // Allow '+' only as the first character
    const isPlusAllowed = e.key === '+' && e.target.selectionStart === 0 && !e.target.value.includes('+')
    // Allow digits and control keys
    if (!/^[0-9]$/.test(e.key) && !allowedKeys.includes(e.key) && !isPlusAllowed) {
      e.preventDefault()
    }
  }

  const handleInputChange = (field, value) => {
    console.log(`Field ${field} changed to:`, value)
    setFormData((prev) => ({ ...prev, [field]: value }))
    onChange(field, value)

    // Validate cell number in real-time
    if (field === "cellnum") {
      const error = validatePhoneNumber(value)
      setErrors((prev) => ({ ...prev, cellnum: error }))
    } else if (errors[field]) {
      // Clear other field errors when typing
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleExpenseTypeChange = (expenseTypeId) => {
    const currentExpenseTypes = formData.expenseTypes || []
    let newExpenseTypes

    if (currentExpenseTypes.includes(expenseTypeId)) {
      newExpenseTypes = currentExpenseTypes.filter((id) => id !== expenseTypeId)
    } else {
      newExpenseTypes = [...currentExpenseTypes, expenseTypeId]
    }

    handleInputChange("expenseTypes", newExpenseTypes)
  }

  const getSelectedExpenseTypesText = () => {
    if (!formData.expenseTypes || formData.expenseTypes.length === 0) {
      return "Select expense types..."
    }

    const selectedNames = formData.expenseTypes
      .map((id) => {
        const expenseType = allExpenseTypes.find((et) => et.id === id || et.expense_type_id === id)
        return expenseType ? expenseType.expense : null
      })
      .filter(Boolean)

    if (selectedNames.length === 0) return "Select expense types..."
    if (selectedNames.length === 1) return selectedNames[0]
    if (selectedNames.length <= 3) return selectedNames.join(", ")
    return `${selectedNames.slice(0, 2).join(", ")} and ${selectedNames.length - 2} more...`
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields validation
    if (!formData.supplier?.trim()) {
      newErrors.supplier = "Supplier name is required"
    }
    if (!formData.representative?.trim()) {
      newErrors.representative = "Representative is required"
    }
    if (!formData.email?.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email format is invalid"
    }
    const cellError = validatePhoneNumber(formData.cellnum || '')
    if (cellError) {
      newErrors.cellnum = cellError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Form submitted with data:", formData)
    console.log("Is editing:", isEditing)

    if (!validateForm()) {
      console.log("Form validation failed:", errors)
      if (!e.target.checkValidity()) {
        e.target.reportValidity()
      }
      return
    }

    try {
      console.log("Calling onSubmit with form data...")
      const success = await onSubmit(formData, emailRef)
      console.log("onSubmit result:", success)

      if (success) {
        console.log("Form submission successful")
      } else {
        console.log("Form submission failed")
      }
    } catch (error) {
      console.error("Error in form submission:", error)
    }
  }

  const handleCancel = () => {
    console.log("Form cancelled")
    setFormData({
      supplier: "",
      representative: "",
      address: "",
      suburb: "",
      postalcode: "",
      email: "",
      cellnum: "",
      vatregno: "",
      city: "",
      streetaddress: "",
      payment_type: "",
      expenseTypes: [],
    })
    setErrors({})
    onCancel()
  }

  return (
    <div className="manage-add-truck-form">
      <h2>{isEditing ? "Edit Supplier" : "Add New Supplier"}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="manage-truck-form-grid">
          {/* Supplier Name */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Supplier Name *</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleInputChange("supplier", e.target.value)}
              required
              style={{ borderColor: errors.supplier ? "red" : "" }}
            />
            {errors.supplier && (
              <small style={{ color: "red", display: "block", marginTop: "5px" }}>{errors.supplier}</small>
            )}
          </div>

          {/* Representative */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Representative *</label>
            <input
              type="text"
              value={formData.representative}
              onChange={(e) => handleInputChange("representative", e.target.value)}
              required
              style={{ borderColor: errors.representative ? "red" : "" }}
            />
            {errors.representative && (
              <small style={{ color: "red", display: "block", marginTop: "5px" }}>{errors.representative}</small>
            )}
          </div>

          {/* Email */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Email *</label>
            <input
              type="email"
              ref={emailRef}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              style={{ borderColor: errors.email ? "red" : "" }}
            />
            {errors.email && <small style={{ color: "red", display: "block", marginTop: "5px" }}>{errors.email}</small>}
          </div>

          {/* Cell Number */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Cell Number *</label>
            <input
              type="text"
              value={formData.cellnum}
              onChange={(e) => handleInputChange("cellnum", e.target.value)}
              onKeyDown={handlePhoneNumberKeyDown}
              required
              style={{ borderColor: errors.cellnum ? "red" : "" }}
              placeholder="e.g., 1234567890 or +1234567890"
            />
            {errors.cellnum && (
              <small style={{ color: "red", display: "block", marginTop: "5px" }}>{errors.cellnum}</small>
            )}
          </div>

          {/* Address */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
            />
          </div>

          {/* Street Address */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Street Address</label>
            <input
              type="text"
              value={formData.streetaddress}
              onChange={(e) => handleInputChange("streetaddress", e.target.value)}
            />
          </div>

          {/* Suburb */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Suburb</label>
            <input type="text" value={formData.suburb} onChange={(e) => handleInputChange("suburb", e.target.value)} />
          </div>

          {/* City */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>City</label>
            <input type="text" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
          </div>

          {/* Postal Code */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Postal Code</label>
            <input
              type="text"
              value={formData.postalcode}
              onChange={(e) => handleInputChange("postalcode", e.target.value)}
            />
          </div>

          {/* VAT Registration Number */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>VAT Registration Number</label>
            <input
              type="text"
              value={formData.vatregno}
              onChange={(e) => handleInputChange("vatregno", e.target.value)}
            />
          </div>

          {/* Payment Type */}
          <div className="manage-form-group">
            <label style={{ fontWeight: "bold" }}>Payment Type</label>
            <select value={formData.payment_type} onChange={(e) => handleInputChange("payment_type", e.target.value)} className="dropdown">
              <option value="">Select type</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="eft">EFT</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Associated Expense Types - Multi-Select Dropdown */}
          <div className="manage-form-group" style={{ gridColumn: "1 / span 3" }}>
            <label style={{ fontWeight: "bold" }}>Associated Expense Types</label>
            <div style={{ position: "relative", marginTop: "10px" }} ref={dropdownRef}>
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loading || allExpenseTypes.length === 0}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  textAlign: "left",
                  cursor: allExpenseTypes.length === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "14px",
                  color: allExpenseTypes.length === 0 ? "#999" : "#333",
                }}
              >
                <span>
                  {allExpenseTypes.length === 0
                    ? "No expense types available. Please add expense types first."
                    : getSelectedExpenseTypesText()}
                </span>
                <span style={{ fontSize: "12px", color: "#666" }}>
                  {allExpenseTypes.length > 0 ? (dropdownOpen ? "▲" : "▼") : ""}
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && allExpenseTypes.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {allExpenseTypes.map((expenseType) => {
                    const expenseTypeId = expenseType.id || expenseType.expense_type_id
                    return (
                      <label
                        key={expenseTypeId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f0f0f0",
                          backgroundColor: formData.expenseTypes?.includes(expenseTypeId) ? "#f8f9fa" : "white",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!formData.expenseTypes?.includes(expenseTypeId)) {
                            e.target.style.backgroundColor = "#f5f5f5"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!formData.expenseTypes?.includes(expenseTypeId)) {
                            e.target.style.backgroundColor = "white"
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.expenseTypes?.includes(expenseTypeId) || false}
                          onChange={() => handleExpenseTypeChange(expenseTypeId)}
                          disabled={loading}
                          style={{
                            marginRight: "12px",
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "14px", color: "#333" }}>{expenseType.expense}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected Items Display */}
            {formData.expenseTypes && formData.expenseTypes.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <small style={{ color: "#666", fontWeight: "bold" }}>Selected ({formData.expenseTypes.length}):</small>
                <div style={{ marginTop: "5px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {formData.expenseTypes.map((id) => {
                    const expenseType = allExpenseTypes.find((et) => et.id === id || et.expense_type_id === id)
                    if (!expenseType) return null
                    const expenseTypeId = expenseType.id || expenseType.expense_type_id
                    return (
                      <span
                        key={expenseTypeId}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          border: "1px solid #bbdefb",
                        }}
                      >
                        {expenseType.expense}
                        <button
                          type="button"
                          onClick={() => handleExpenseTypeChange(expenseTypeId)}
                          style={{
                            marginLeft: "6px",
                            background: "none",
                            border: "none",
                            color: "#1976d2",
                            cursor: "pointer",
                            fontSize: "14px",
                            lineHeight: "1",
                            padding: "0",
                            width: "16px",
                            height: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <br />
        <div className="supplier-button-container">
        <button type="submit" className="supplier-save-button" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Supplier" : "Add Supplier"}
        </button>
        <button type="button" onClick={handleCancel} className="supplier-cancel-button">
          Cancel
        </button>
      </div>
      </form>
    </div>
  )
}

export default SupplierForm