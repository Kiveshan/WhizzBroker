"use client"

import { useState, useEffect } from "react"
import { FaTrash } from "react-icons/fa";

const ClientRatesForm = ({ clientData, loading, onSave, onCancel }) => {
  const [rates, setRates] = useState([
    {
      starting_point: "",
      destination: "",
      "6m_rate": "",
      "12m_rate": "",
      surcharge6M: "",
      surcharge12m: "",
      hazardous: "",
      vgm: "",
      set_rate: "",
      fuel_surcharge: "",
      extra_charges: [],
    },
  ])
  const [isFormValid, setIsFormValid] = useState(false)
  const [fuelSurchargeAll, setFuelSurchargeAll] = useState("")

  useEffect(() => {
    console.log("ClientRatesForm received clientData:", clientData)
    if (clientData) {
      if (clientData.rates && clientData.rates.length > 0) {
        setRates(
          clientData.rates.map((rate) => ({
            client_rate_id: rate.client_rate_id,
            starting_point: rate.starting_point || "",
            destination: rate.destination || "",
            "6m_rate": rate["6m_rate"] !== null && rate["6m_rate"] !== undefined ? rate["6m_rate"] : "",
            "12m_rate": rate["12m_rate"] !== null && rate["12m_rate"] !== undefined ? rate["12m_rate"] : "",
            surcharge6M:
              rate.surcharge6M !== null && rate.surcharge6M !== undefined
                ? rate.surcharge6M
                : rate.surcharges !== null && rate.surcharges !== undefined
                  ? rate.surcharges
                  : "",
            surcharge12m: rate.surcharge12m !== null && rate.surcharge12m !== undefined ? rate.surcharge12m : "",
            hazardous: rate.hazardous !== null && rate.hazardous !== undefined ? rate.hazardous : "",
            vgm: rate.vgm !== null && rate.vgm !== undefined ? rate.vgm : "",
            set_rate: rate.set_rate !== null && rate.set_rate !== undefined ? rate.set_rate : "",
            fuel_surcharge:
              rate.fuel_surcharge !== null && rate.fuel_surcharge !== undefined ? rate.fuel_surcharge : "",
            extra_charges: Array.isArray(rate.extra_charges)
              ? rate.extra_charges.map((c) => ({ charge_name: c.charge_name || "", amount: c.amount ?? "" }))
              : [],
          })),
        )

      } else {
        setRates([
          {
            starting_point: "",
            destination: "",
            "6m_rate": "",
            "12m_rate": "",
            surcharge6M: "",
            surcharge12m: "",
            hazardous: "",
            vgm: "",
            set_rate: "",
            fuel_surcharge: "",
            extra_charges: [],
          },
        ])
      }
    }
  }, [clientData])

  useEffect(() => {
    const isValid = rates.every(
      (rate) =>
        rate.starting_point.trim() &&
        rate.destination.trim() &&
        (rate["6m_rate"] !== "" && rate["6m_rate"] !== undefined || rate["12m_rate"] !== "" && rate["12m_rate"] !== undefined),
    )
    setIsFormValid(isValid)
  }, [rates])

  if (loading) {
    return <div className="loading">Loading client rates...</div>
  }

  if (!clientData) {
    return <div className="error">Error: No client data available</div>
  }

  const handleRateChange = (index, field, value) => {
    const updatedRates = [...rates]
    updatedRates[index] = {
      ...updatedRates[index],
      [field]: value,
    }
    setRates(updatedRates)
  }

  const addRate = () => {
    setRates([
      ...rates,
      {
        starting_point: "",
        destination: "",
        "6m_rate": "",
        "12m_rate": "",
        surcharge6M: "",
        surcharge12m: "",
        hazardous: "",
        vgm: "",
        set_rate: "",
        fuel_surcharge: "",
        extra_charges: [],
      },
    ])
  }

  const addExtraCharge = (rateIndex) => {
    const updatedRates = [...rates]
    updatedRates[rateIndex] = {
      ...updatedRates[rateIndex],
      extra_charges: [...updatedRates[rateIndex].extra_charges, { charge_name: "", amount: "" }],
    }
    setRates(updatedRates)
  }

  const handleExtraChargeChange = (rateIndex, chargeIndex, field, value) => {
    const updatedRates = [...rates]
    const updatedCharges = [...updatedRates[rateIndex].extra_charges]
    updatedCharges[chargeIndex] = { ...updatedCharges[chargeIndex], [field]: value }
    updatedRates[rateIndex] = { ...updatedRates[rateIndex], extra_charges: updatedCharges }
    setRates(updatedRates)
  }

  const removeExtraCharge = (rateIndex, chargeIndex) => {
    const updatedRates = [...rates]
    updatedRates[rateIndex] = {
      ...updatedRates[rateIndex],
      extra_charges: updatedRates[rateIndex].extra_charges.filter((_, i) => i !== chargeIndex),
    }
    setRates(updatedRates)
  }

  // Apply a single fuel surcharge percentage to every rate at once.
  const applyFuelSurchargeToAll = (value) => {
    setRates((prev) => prev.map((rate) => ({ ...rate, fuel_surcharge: value })))
  }

  const removeRate = (index) => {
    if (rates.length > 1) {
      const updatedRates = rates.filter((rate, i) => i !== index)
      console.log("Current rates before removing:", rates)
      console.log("Updated rates after removing:", updatedRates)
      setRates(updatedRates)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) {
      alert("Please provide at least one complete rate with starting point, destination, and either 6m or 12m rate for each route.")
      return
    }
    const success = await onSave(rates)
    if (success) {
      // Form will be closed by parent component
    }
  }

  const rateRows = []
  for (let i = 0; i < rates.length; i += 3) {
    rateRows.push(rates.slice(i, i + 3))
  }

  console.log("Current rates state:", rates)
  console.log("Rate rows for rendering:", rateRows)

  return (
    <>
      <style jsx>{`
        .remove-rate-button {
          color: red;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
        }
        .remove-rate-button:hover {
          color: darkred;
        }
        .extra-charges-section {
          margin-top: 1rem;
          padding-top: 0.9rem;
          border-top: 1px dashed #dfe4ff;
        }
        .extra-charges-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        }
        .extra-charges-header strong {
          color: #2c3e50;
          font-size: 0.95rem;
        }
        .add-extra-charge-button {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #eef1ff;
          color: #4169e1;
          border: 1px solid #c7d0ff;
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .add-extra-charge-button:hover {
          background: #dfe4ff;
          border-color: #4169e1;
        }
        .extra-charges-column-labels {
          display: grid;
          grid-template-columns: 2fr 1fr 32px;
          gap: 0.6rem;
          margin-bottom: 0.35rem;
          padding: 0 0.75rem;
        }
        .extra-charges-column-labels span {
          font-size: 0.72rem;
          font-weight: 600;
          color: #8a93a6;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .extra-charge-row {
          display: grid;
          grid-template-columns: 2fr 1fr 32px;
          gap: 0.6rem;
          align-items: center;
          background: #f8f9fd;
          border: 1px solid #e6e9f5;
          border-radius: 6px;
          padding: 0.4rem 0.75rem;
          margin-bottom: 0.5rem;
        }
        .extra-charge-row input {
          border: 1px solid #dfe4ff;
          border-radius: 5px;
          background: #fff;
          height: 42px;
          padding: 0 10px;
        }
        .extra-charge-row input:focus {
          outline: none;
          border-color: #4169e1;
          box-shadow: 0 0 4px rgba(65, 105, 225, 0.25);
        }
        .extra-charge-row .remove-rate-button {
          justify-self: center;
          font-size: 1rem;
        }
        .extra-charges-empty {
          font-size: 0.82rem;
          color: #8a93a6;
          font-style: italic;
          padding: 0.25rem 0.75rem 0.5rem;
        }
      `}</style>
      <form className="manage-add-client-rate-form" onSubmit={handleSubmit} noValidate>
        <div className="rates-section">
          <div className="rates-header">
            <h3>Client Rates</h3>
            <div className="fuel-surcharge-all">
              <label>
                <strong>Fuel Surcharge (%)</strong>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fuelSurchargeAll}
                onChange={(e) => setFuelSurchargeAll(e.target.value)}
                placeholder="e.g., 10"
              />
              <button
                type="button"
                className="fuel-surcharge-apply-btn"
                onClick={() => applyFuelSurchargeToAll(fuelSurchargeAll)}
              >
                Apply to all rates
              </button>
            </div>
          </div>

          {rateRows.map((row, rowIndex) => (
            <div key={rowIndex} className="rate-row">
              {row.map((rate, index) => (
                <div key={rowIndex * 3 + index} className="rate-entry">
                  <div className="rate-entry-header">
                    <h4>Rate #{rowIndex * 3 + index + 1}</h4>
                    {rates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRate(rowIndex * 3 + index)}
                        className="remove-rate-button"
                        aria-label="Remove rate"
                      >
                         <FaTrash />
                      </button>
                    )}
                  </div>

                  <div className="manage-form-grid">
                    <div className="manage-form-group">
                      <label>
                        <strong>Starting Point *</strong>
                      </label>
                      <input
                        type="text"
                        value={rate.starting_point}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "starting_point", e.target.value)}
                        placeholder="e.g., Johannesburg"
                        required
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Destination *</strong>
                      </label>
                      <input
                        type="text"
                        value={rate.destination}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "destination", e.target.value)}
                        placeholder="e.g., Cape Town"
                        required
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>6m Rate (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate["6m_rate"]}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "6m_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>12m Rate (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate["12m_rate"]}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "12m_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Surcharge 6M (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.surcharge6M}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "surcharge6M", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Surcharge 12M (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.surcharge12m}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "surcharge12m", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Hazardous (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.hazardous}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "hazardous", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>VGM (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.vgm}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "vgm", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Break Bulk (R)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.set_rate}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "set_rate", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="manage-form-group">
                      <label>
                        <strong>Fuel Surcharge (%)</strong>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.fuel_surcharge}
                        onChange={(e) => handleRateChange(rowIndex * 3 + index, "fuel_surcharge", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="extra-charges-section">
                    <div className="extra-charges-header">
                      <strong>Optional Extra Charges</strong>
                      <button
                        type="button"
                        className="add-extra-charge-button"
                        onClick={() => addExtraCharge(rowIndex * 3 + index)}
                      >
                        + Add Charge
                      </button>
                    </div>
                    {rate.extra_charges.length === 0 ? (
                      <p className="extra-charges-empty">No extra charges added for this rate.</p>
                    ) : (
                      <>
                        <div className="extra-charges-column-labels">
                          <span>Charge Name</span>
                          <span>Amount (R)</span>
                          <span />
                        </div>
                        {rate.extra_charges.map((charge, chargeIndex) => (
                          <div key={chargeIndex} className="extra-charge-row">
                            <input
                              type="text"
                              value={charge.charge_name}
                              onChange={(e) =>
                                handleExtraChargeChange(
                                  rowIndex * 3 + index,
                                  chargeIndex,
                                  "charge_name",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g., Toll fee"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={charge.amount}
                              onChange={(e) =>
                                handleExtraChargeChange(rowIndex * 3 + index, chargeIndex, "amount", e.target.value)
                              }
                              placeholder="0.00"
                            />
                            <button
                              type="button"
                              className="remove-rate-button"
                              aria-label="Remove extra charge"
                              onClick={() => removeExtraCharge(rowIndex * 3 + index, chargeIndex)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="rates-summary">
            <p>
              <strong>Total Rates:</strong>{" "}
              {
                rates.filter(
                  (rate) =>
                    rate.starting_point.trim() &&
                    rate.destination.trim() &&
                    (rate["6m_rate"] !== "" && rate["6m_rate"] !== undefined || rate["12m_rate"] !== "" && rate["12m_rate"] !== undefined),
                ).length
              }
            </p>
            <p className="rates-note">* At least one rate (6m or 12m) is required for each route</p>
          </div>
        </div>

        <div className="manage-button-container">
          <button type="submit" className="manage-save-button" disabled={loading || !isFormValid}>
            {loading ? "Saving..." : "Save"}
          </button>
          
          <button type="button" onClick={addRate} className="add-rate-button">
            + Add
          </button>
        </div>
      </form>
    </>
  )
}

export default ClientRatesForm