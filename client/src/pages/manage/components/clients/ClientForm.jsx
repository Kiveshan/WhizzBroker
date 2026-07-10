"use client"

import { useRef, useState } from "react"

const ClientForm = ({ client, loading, isEditing, onSave, onCancel, onChange }) => {
  const emailRef = useRef(null)
  const [cellnumError, setCellnumError] = useState('')

  // Phone number validation function
  const validateCellNumber = (value) => {
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
  const handleCellNumberKeyDown = (e) => {
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

  // Handle cell number input
  const handleNumberChange = (field, value) => {
    if (field === "cellnum") {
      const error = validateCellNumber(value)
      setCellnumError(error)
      onChange(field, value)
    } else {
      onChange(field, value)
    }
  }

  // Validate all required fields on submit
  const validateForm = () => {
    let isValid = true
    
    // Validate cell number
    const cellError = validateCellNumber(client.cellnum || '')
    setCellnumError(cellError)
    if (cellError) isValid = false

    // Validate email
    if (!emailRef.current?.checkValidity()) {
      emailRef.current?.setCustomValidity("Please enter a valid email address")
      isValid = false
    } else {
      emailRef.current?.setCustomValidity("")
    }

    // Validate required fields
    const requiredFields = ['client', 'email', 'cellnum']
    requiredFields.forEach(field => {
      if (!client[field]) {
        isValid = false
      }
    })

    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Perform custom validation
    if (!validateForm()) {
      e.target.reportValidity()
      return
    }

    console.log("Client form data before save:", client)

    const success = await onSave(client, emailRef)
    if (!success) {
      return
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? "Edit Client" : "Add New Client"}</h2>

      <div className="client-form-grid">
        <div className="client-form-group">
          <label>
            <strong>Client Name</strong>
          </label>
          <input
            type="text"
            value={client.client || ""}
            onChange={(e) => onChange("client", e.target.value)}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Representative Name</strong>
          </label>
          <input
            type="text"
            value={client.representative || ""}
            onChange={(e) => onChange("representative", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Insurance (R)</strong>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={client.insurance ?? ""}
            onChange={(e) => onChange("insurance", e.target.value)}
            placeholder="e.g., 1500.00"
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Cell Number</strong>
          </label>
          <input
            type="text"
            value={client.cellnum || ""}
            onChange={(e) => handleNumberChange("cellnum", e.target.value)}
            onKeyDown={handleCellNumberKeyDown}
            className={cellnumError ? 'input-error' : ''}
            placeholder="e.g., 1234567890 or +1234567890"
            required
          />
          {cellnumError && <span className="error-message">{cellnumError}</span>}
        </div>

        <div className="client-form-group">
          <label>
            <strong>Email Address</strong>
          </label>
          <input
            ref={emailRef}
            type="email"
            value={client.email || ""}
            onChange={(e) => {
              emailRef.current?.setCustomValidity("")
              onChange("email", e.target.value)
            }}
            required
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Street Address</strong>
          </label>
          <input
            type="text"
            value={client.streetaddress || ""}
            onChange={(e) => onChange("streetaddress", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>City</strong>
          </label>
          <input
            type="text"
            value={client.city || ""}
            onChange={(e) => onChange("city", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Suburb</strong>
          </label>
          <input
            type="text"
            value={client.suburb || ""}
            onChange={(e) => onChange("suburb", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Postal Code</strong>
          </label>
          <input
            type="text"
            value={client.postalcode || ""}
            onChange={(e) => onChange("postalcode", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Company Address</strong>
          </label>
          <input
            type="text"
            value={client.companyaddress || ""}
            onChange={(e) => onChange("companyaddress", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Client Reg. Number</strong>
          </label>
          <input
            type="text"
            value={client.client_reg_num || ""}
            onChange={(e) => onChange("client_reg_num", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>VAT Reg. Number</strong>
          </label>
          <input
            type="text"
            value={client.vatregno || ""}
            onChange={(e) => onChange("vatregno", e.target.value)}
          />
        </div>

        <div className="client-form-group">
          <label>
            <strong>Payment Type</strong>
          </label>
          <select
            className="client-dropdown"
            value={client.payment_type || ""}
            onChange={(e) => onChange("payment_type", e.target.value)}
          >
            <option value="">Select Payment Type</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      <div className="client-button-container">
        <button type="submit" className="client-save-button" disabled={loading}>
          {loading ? "Saving..." : "Save Client"}
        </button>
        <button type="button" onClick={onCancel} className="client-cancel-button">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ClientForm