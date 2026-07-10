import { ErrorTooltip as SharedErrorTooltip } from "../../../../components/instructions/ErrorTooltip"
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate"
import { AddonInvoicePicker } from "../../../../components/instructions/AddonInvoicePicker"

const ErrorTooltip = (props) => <SharedErrorTooltip {...props} disabled />

export function ControllerInstructionsLayout({
  spinnerKeyframes,
  showConfirmationPopup,
  confirmationMessage,
  handleConfirmSubmit,
  handleCancelSubmit,
  showNoRatesModal,
  setShowNoRatesModal,
  isLoadingLocations,
  isLoadingComplete,
  hasDataFailure,
  handleSubmit,
  formData,
  setFormData,
  clients,
  fieldErrors,
  setFieldErrors,
  fieldRefs,
  handleClientChange,
  handlePickupChange,
  clientStartingPoints,
  handleDropoffChange,
  clientDestinations,
  isLoading,
  isWeightBased,
  isSetRateMode,
  isSetRate,
  setIsSetRate,
  setRateValue,
  rateFieldsEnabled,
  rateLockStatus,
  handleInputChange,
  handleShipmentTypeChange,
  handleContainerCountChange,
  shipmentTypes,
  isCrossHaul,
  isImport,
  isExport,
  isAddOn,
  instructionId,
  lastFreeDateRef,
  etaDateRef,
  today,
  showContainerDetails,
  allowVgmUI,
  containers,
  containerFieldErrors,
  handleContainerChange,
  isSubmitting,
  submitError,
  weightRows,
  updateWeightRow,
  removeWeightRow,
  addWeightRow,
  vesselNameStyles,
  nonEditableStyle,
  disabledRateStyle,
  navigate,
  openCalendar,
}) {
  return (
    <div className="controller-instructions-unique-wrapper">
      <style>{spinnerKeyframes}</style>

      {/* Confirmation Popup */}
      <ConfirmationModal
        isOpen={showConfirmationPopup}
        title="Confirm Submission"
        message={confirmationMessage}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />

      {/* No Rates Modal */}
      {showNoRatesModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>No Rates Available</h3>
            <p>This client has no rates configured. Please contact the manager to set up rates.</p>
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#4a90e2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
              onClick={() => setShowNoRatesModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>

      {isLoadingLocations && <div style={{ height: "20px" }}></div>}

      <InstructionLoadingGate
        isLoadingComplete={isLoadingComplete}
        hasDataFailure={hasDataFailure}
        onRetry={() => window.location.reload()}
      >
      <form
        onSubmit={handleSubmit}
        className="controller-instructions-form-container"
        style={{ maxWidth: "1200px", width: "calc(100% - 40px)", margin: "0 auto", boxSizing: "border-box" }}
      >
        <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.clientId}>
                <select
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleClientChange}
                >
                  <option value="" disabled>
                    Select Client
                  </option>
                  {clients.map((client) => (
                    <option key={client.m5clientkey} value={client.m5clientkey}>
                      {client.companyname}
                    </option>
                  ))}
                </select>
                <ErrorTooltip message={fieldErrors.clientId} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Pick-Up Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.pickup}>
                <select
                  className={`dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                  name="pickup"
                  value={formData.pickup}
                  onChange={handlePickupChange}
                  disabled={!formData.clientId || isLoadingLocations}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {Array.isArray(clientStartingPoints) &&
                    clientStartingPoints.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.pickup} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Drop-Off Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.dropoff}>
                <select
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleDropoffChange}
                  disabled={!formData.clientId || !formData.pickup || isLoading.destinations}
                  className={
                    !formData.clientId || !formData.pickup
                      ? "controller-instructions-form-input disabled-field"
                      : "controller-instructions-form-input"
                  }
                >
                  {!formData.clientId || !formData.pickup ? (
                    <option value="">Please select client and pickup first</option>
                  ) : (
                    <option value="">Select Destination</option>
                  )}
                  {Array.isArray(clientDestinations) &&
                    clientDestinations.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.dropoff} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Representative</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                name="representative"
                value={formData.representative}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Contact Details</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                name="contactDetails"
                value={formData.contactDetails}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Email</label>
              <input
                type="email"
                className="controller-instructions-form-input"
                name="email"
                value={formData.email}
                readOnly
                style={nonEditableStyle}
              />
            </div>
          </div>
        </div>
        {false && (
          <div className="controller-instructions-form-section">
            <div className="controller-instructions-form-row">
              <div className="controller-instructions-form-field">
                <label>Shipment Type</label>
                <div
                  className="controller-instructions-select-wrapper"
                  ref={fieldRefs.current.shipmentTypeId}
                >
                  <select
                    className={`dropdown ${
                      fieldErrors.shipmentTypeId
                        ? "controller-instructions-error-field"
                        : ""
                    }`}
                    name="shipmentTypeId"
                    value={formData.shipmentTypeId}
                    onChange={handleShipmentTypeChange}
                    disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                  >
                    <option value="" disabled>
                      Select Shipment
                    </option>
                    {shipmentTypes.map((type) => (
                      <option key={type.shipkey} value={type.shipkey}>
                        {type.shipmenttype}
                      </option>
                    ))}
                  </select>
                  <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main container + booking section: two columns side by side */}
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-container-section">
            {/* LEFT: Trailer size / containers / unit per */}
            <div className="controller-instructions-container-group">
              <div className="controller-instructions-container-label">
                <span className="controller-instructions-trailer-size-label">Trailer Size</span>
                <label>No. of Containers</label>
                {fieldErrors.containers && (
                  <div className="controller-instructions-container-error-message">{fieldErrors.containers}</div>
                )}
              </div>
              <div
                className="controller-instructions-container-inputs"
                style={{
                  opacity: isWeightBased || isSetRateMode ? 0.5 : 1,
                  pointerEvents: isWeightBased || isSetRateMode ? "none" : "auto",
                }}
              >
                <div className="controller-instructions-container-input">
                  <label>6m</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.sixMeterRate !== undefined && formData.sixMeterRate !== ""
                            ? Number.parseFloat(formData.sixMeterRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.sixMeterRate) {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: Number.parseFloat(prev.sixMeterRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.sixMeterRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: Number.parseFloat(prev.sixMeterRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor:
                            rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                              ? "#fff"
                              : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor:
                            rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                              ? "text"
                              : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.sixMeter || isWeightBased || rateLockStatus.sixMeter}
                        placeholder={
                          rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter ? "0.00" : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="controller-instructions-container-input">
                  <label>12m</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.twelveMeterRate !== undefined && formData.twelveMeterRate !== ""
                            ? Number.parseFloat(formData.twelveMeterRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.twelveMeterRate) {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: Number.parseFloat(prev.twelveMeterRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.twelveMeterRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: Number.parseFloat(prev.twelveMeterRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor:
                            rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                              ? "#fff"
                              : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor:
                            rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                              ? "text"
                              : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.twelveMeter || isWeightBased || rateLockStatus.twelveMeter}
                        placeholder={
                          rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter ? "0.00" : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="controller-instructions-container-input">
                  <label>Abnormal</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.abnormalRate !== undefined && formData.abnormalRate !== ""
                            ? Number.parseFloat(formData.abnormalRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.abnormalRate) {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: Number.parseFloat(prev.abnormalRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.abnormalRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: Number.parseFloat(prev.abnormalRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor: rateFieldsEnabled.abnormal && !isWeightBased ? "#fff" : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor: rateFieldsEnabled.abnormal && !isWeightBased ? "text" : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.abnormal || isWeightBased}
                        placeholder={rateFieldsEnabled.abnormal && !isWeightBased ? "0.00" : ""}
                      />
                    </div>
                  </div>
                </div>

                {fieldErrors.containerCount && (
                  <div
                    className="controller-instructions-error-message"
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.75rem",
                      marginTop: "4px",
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "4px 8px",
                      backgroundColor: "#ffebee",
                      borderRadius: "4px",
                    }}
                  >
                    {fieldErrors.containerCount}
                  </div>
                )}
              </div>

              {/* Unit per / weight rate row */}
              <div className="controller-instructions-form-row" style={{ margin: "16px 0", padding: "0 10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "nowrap",
                    width: "100%",
                    justifyContent: "flex-start",
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>Unit per:</span>
                        <div className="controller-instructions-select-wrapper" style={{ width: "100px" }}>
                          <select
                            className="controller-instructions-dropdown"
                            name="rateWeight"
                            value={String(formData.rateWeight || "Container")}
                            onChange={handleInputChange}
                            disabled={
                              formData.shipmentTypeId === "1" ||
                              formData.shipmentTypeId === "2" ||
                              formData.shipmentTypeId === "3" ||
                              formData.shipmentTypeId === "5"
                            }
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "13px",
                              backgroundColor:
                                formData.shipmentTypeId === "1" ||
                                formData.shipmentTypeId === "2" ||
                                formData.shipmentTypeId === "3" ||
                                formData.shipmentTypeId === "4" ||
                                formData.shipmentTypeId === "5"
                                  ? "#e9ecef"
                                  : "#fff",
                              height: "32px",
                              lineHeight: "1",
                              cursor:
                                formData.shipmentTypeId === "1" ||
                                formData.shipmentTypeId === "2" ||
                                formData.shipmentTypeId === "3" ||
                                formData.shipmentTypeId === "5"
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2" ||
                            formData.shipmentTypeId === "3" ||
                            formData.shipmentTypeId === "5" ? (
                              <option value="Container">Container</option>
                            ) : formData.shipmentTypeId === "4" ? (
                              <>
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                              </>
                            ) : (
                              <>
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                                <option value="Container">Container</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    {isWeightBased && formData.shipmentTypeId !== "4" && (
                      <div
                        className="controller-instructions-weight-input-group"
                        ref={fieldRefs.current.weight}
                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                              placeholder="Wt"
                              name="weight"
                              value={formData.weight}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                              }}
                            />
                          </div>
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.unitrate ? "controller-instructions-error-field" : ""}`}
                              placeholder="Rate"
                              name="unitrate"
                              value={formData.unitrate || ""}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                              }}
                            />
                          </div>
                          <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>
                            {formData.rateWeight}
                          </span>
                        </div>
                        <ErrorTooltip message={fieldErrors.weight} />
                        <ErrorTooltip message={fieldErrors.unitrate} />
                      </div>
                    )}
                    {isWeightBased && formData.shipmentTypeId === "4" && (
                      <div>
                        <div
                          className="controller-instructions-weight-input-group"
                          ref={fieldRefs.current.weight}
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.unitrate ? "controller-instructions-error-field" : ""}`}
                              placeholder="Rate"
                              name="unitrate"
                              value={formData.unitrate || ""}
                              disabled={isSetRate}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                                backgroundColor: isSetRate ? "#e9ecef" : "#fff",
                                cursor: isSetRate ? "not-allowed" : "text",
                              }}
                            />
                          </div>
                          <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>
                            {formData.rateWeight}
                          </span>
                          <ErrorTooltip message={fieldErrors.unitrate} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Set Rate checkbox - positioned below Unit per with spacing, completely outside flex row */}
              {formData.shipmentTypeId === "4" && (
                <div style={{ margin: "24px 10px 0", padding: "0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={isSetRate}
                        onChange={(e) => {
                          const nextChecked = e.target.checked
                          setIsSetRate(nextChecked)
                          if (nextChecked) {
                            setFormData((prev) => ({ ...prev, unitrate: "" }))
                            setFieldErrors((prev) => {
                              if (!prev.unitrate) return prev
                              const next = { ...prev }
                              delete next.unitrate
                              return next
                            })
                          }
                        }}
                      />
                      Break Bulk Set Rate
                    </label>
                    {isSetRate && (
                      <div className="controller-instructions-input-wrapper" style={{ width: "140px" }}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          value={Number.isFinite(Number(setRateValue)) ? String(setRateValue) : ""}
                          readOnly
                          disabled
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            fontSize: "12px",
                            height: "28px",
                            lineHeight: "1",
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Booking + dates + VAT/vessel/description */}
            {true && (
              <div className="controller-instructions-booking-rates-group">
                {/* Top row: shipment type + refs */}
                <div
                  className="controller-instructions-booking-rates-row"
                  style={{ marginBottom: "8px", flexWrap: "wrap" }}
                >
                  {/* Shipment Type (normal shipments) */}
                  <div
                    className="controller-instructions-form-field"
                    style={{ flex: "1 1 160px" }}
                  >
                    <label>Shipment Type</label>
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.current.shipmentTypeId}
                    >
                      <select
                        className={`dropdown ${
                          fieldErrors.shipmentTypeId
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={
                          isLoading.shipmentTypes || shipmentTypes.length === 0
                        }
                      >
                        <option value="" disabled>
                          Select Shipment
                        </option>
                        {shipmentTypes.map((type) => (
                          <option key={type.shipkey} value={type.shipkey}>
                            {type.shipmenttype}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                    </div>
                  </div>

                  {/* Booking Ref */}
                  <div
                    className="controller-instructions-form-field"
                    style={{ flex: "1 1 180px" }}
                  >
                    <label>Booking Ref</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.bookingRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Booking ref"
                        name="bookingRef"
                        value={formData.bookingRef}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.bookingRef} />
                    </div>
                  </div>

                  {/* Add-On Invoice link (add-on shipment type only) */}
                  {isAddOn && (
                    <AddonInvoicePicker
                      clientId={formData.clientId}
                      instructionId={instructionId}
                      value={formData.addon_id}
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, addon_id: val }))
                        setFieldErrors((prev) => ({ ...prev, addon_id: "" }))
                      }}
                      error={fieldErrors.addon_id}
                    />
                  )}

                  {/* File Ref */}
                  <div className="controller-instructions-form-field" style={{ flex: "1 1 120px" }}>
                    <label>Client File Reference</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.fileRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Client File Reference"
                        name="fileRef"
                        value={formData.fileRef}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.fileRef} />
                    </div>
                  </div>

                  {/* Name of Task */}
                  <div className="controller-instructions-form-field" style={{ flex: "1 1 160px" }}>
                    <label>KSM File Reference</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.task}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                        placeholder="KSM File Reference"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                </div>

                {/* Date / description rows */}
                {isCrossHaul ? (
                  <>
                    {/* Cross-haul: Last Free Date row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ marginBottom: "8px", flexWrap: "wrap" }}
                    >
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>Last Free Date</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.lastFreeDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.lastFreeDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={lastFreeDateRef}
                            placeholder="Date here"
                            name="lastFreeDate"
                            value={formData.lastFreeDate}
                            onChange={handleInputChange}
                            min={today}
                            style={{ width: "100%" }}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.lastFreeDate} />
                        </div>
                      </div>
                    </div>

                    {/* Cross-haul: Description row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ flexWrap: "wrap" }}
                    >
                      <div
                        className="controller-instructions-form-field"
                        style={{ width: "100%" }}
                      >
                        <label>Description from Client</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.description}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.description
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Description from Client"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              height: "36px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.description} />
                        </div>
                      </div>
                    </div>
                    {formData.shipmentTypeId === "4" && (
                      <div
                        className="controller-instructions-form-row"
                        style={{ margin: "24px 0 8px", padding: "0 10px" }}
                      >
                        <div style={{ width: "100%" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "170px",
                                  }}
                                >
                                  KSM DN Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "150px",
                                  }}
                                >
                                  Ticket Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "180px",
                                  }}
                                >
                                  Receipt Book Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "140px",
                                  }}
                                >
                                  Weight ({formData.rateWeight})
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    minWidth: "110px",
                                  }}
                                ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {weightRows.map((row) => (
                                <tr key={row.id}>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ksmDmNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ksmDmNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ticketNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ticketNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.receiptBookNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "receiptBookNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.weight || ""}
                                      onChange={(e) => updateWeightRow(row.id, "weight", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeWeightRow(row.id)}
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #dc3545",
                                        backgroundColor: "#fff",
                                        color: "#dc3545",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{ padding: "10px 14px", textAlign: "left", backgroundColor: "#f4f8ff" }}
                                >
                                  <button
                                    type="button"
                                    onClick={addWeightRow}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "13px",
                                      borderRadius: "4px",
                                      border: "1px solid #4a90e2",
                                      backgroundColor: "#4a90e2",
                                      color: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Row
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Import/Export: Stack Date + Last Free Date row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ marginBottom: "8px", flexWrap: "wrap" }}
                    >
                      {/* Stack/ETA Date */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>{isImport ? "ETA" : "Stack Date"}</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={etaDateRef}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.stackDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={etaDateRef}
                            name="stackDate"
                            value={formData.stackDate}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "13px",
                              height: "32px",
                            }}
                            min={today}
                            disabled={false}
                            onClick={() => openCalendar(etaDateRef)}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.stackDate} />
                        </div>
                      </div>

                      {/* Last Free Date */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>Last Free Date</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.lastFreeDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.lastFreeDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={lastFreeDateRef}
                            placeholder="Date here"
                            name="lastFreeDate"
                            value={formData.lastFreeDate}
                            onChange={handleInputChange}
                            min={today}
                            style={{ width: "100%" }}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.lastFreeDate} />
                        </div>
                      </div>
                    </div>

                    {/* Import/Export: VAT + Vessel + Description row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ flexWrap: "wrap" }}
                    >
                      {/* VAT toggle */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 120px", minWidth: "100px" }}
                      >
                        <label>VAT</label>
                        <div className="controller-instructions-input-wrapper">
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontSize: "12px" }}>0%</span>
                            <input
                              type="checkbox"
                              checked={formData.vat !== 0}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  vat: e.target.checked ? 15 : 0,
                                }))
                              }
                              style={{ display: "none" }}
                            />
                            <span
                              className="vat-toggle-slider"
                              style={{
                                position: "relative",
                                width: "40px",
                                height: "20px",
                                borderRadius: "10px",
                                backgroundColor: formData.vat !== 0 ? "#4a90e2" : "#ccc",
                                transition: "background-color 0.2s ease",
                                display: "inline-block",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: "2px",
                                  left: formData.vat !== 0 ? "22px" : "2px",
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  backgroundColor: "#fff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  transition: "left 0.2s ease",
                                }}
                              />
                            </span>
                            <span style={{ fontSize: "12px" }}>15%</span>
                          </label>
                        </div>
                      </div>

                      {/* Vessel Name */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "1 1 160px", minWidth: "140px" }}
                      >
                        <label>Vessel Name</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.vesselName}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input vessel-name-input ${
                              fieldErrors.vesselName
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Vessel name"
                            name="vesselName"
                            value={formData.vesselName}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "12px",
                              height: "30px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.vesselName} />
                        </div>
                      </div>

                      {/* Description */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "2 1 200px", minWidth: "160px" }}
                      >
                        <label>Description</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.description}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.description
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "12px",
                              height: "30px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.description} />
                        </div>
                      </div>
                    </div>
                    {formData.shipmentTypeId === "4" && (
                      <div
                        className="controller-instructions-form-row"
                        style={{ margin: "24px 0 8px", padding: "0 10px" }}
                      >
                        <div style={{ width: "100%" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "170px",
                                  }}
                                >
                                  KSM DN Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "150px",
                                  }}
                                >
                                  Ticket Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "180px",
                                  }}
                                >
                                  Receipt Book Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "140px",
                                  }}
                                >
                                  Weight ({formData.rateWeight})
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    minWidth: "110px",
                                  }}
                                ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {weightRows.map((row) => (
                                <tr key={row.id}>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ksmDmNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ksmDmNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ticketNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ticketNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.receiptBookNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "receiptBookNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.weight || ""}
                                      onChange={(e) => updateWeightRow(row.id, "weight", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeWeightRow(row.id)}
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #dc3545",
                                        backgroundColor: "#fff",
                                        color: "#dc3545",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{ padding: "10px 14px", textAlign: "left", backgroundColor: "#f4f8ff" }}
                                >
                                  <button
                                    type="button"
                                    onClick={addWeightRow}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "13px",
                                      borderRadius: "4px",
                                      border: "1px solid #4a90e2",
                                      backgroundColor: "#4a90e2",
                                      color: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Row
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Container Details Section - Only show for container-based calculations */}
        {!isWeightBased && showContainerDetails ? (
          <div className="container-details-section" style={{ margin: "20px 0", width: "100%" }}>
            <div
              className="controller-instructions-form-section"
              style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "4px" }}
            >
              <h4 style={{ marginBottom: "15px", color: "#0d6efd" }}>Container Details</h4>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ marginBottom: "0", backgroundColor: "white" }}>
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "15%" }}>Container Type</th>
                      <th style={{ width: "15%" }}>Container Number</th>
                      {(isExport || formData.shipmentTypeId === "2") && <th style={{ width: "15%" }}>File Reference</th>}
                      {(isImport || isExport || isCrossHaul) && <th style={{ width: "10%" }}>Weight</th>}
                      <th style={{ width: (isImport || isExport || isCrossHaul) ? "25%" : "40%" }}>Cargo Description</th>
                      <th style={{ width: "80px", textAlign: "center" }}>Hazardous</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Add Surcharges</th>
                      {allowVgmUI && (
                        <th style={{ width: "60px", textAlign: "center" }}>VGM</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id}>
                        <td>{container.id}</td>
                        <td>{container.containerType}</td>
                        <td>
                          <div style={{ position: "relative" }}>
                            <input
                              type="text"
                              className={`form-control form-control-sm ${containerFieldErrors[`container-${container.id}`] ? "is-invalid" : ""}`}
                              value={container.containerNum}
                              onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                              placeholder="Enter container number"
                              maxLength={20}
                              style={{
                                minWidth: "120px",
                                backgroundColor: containerFieldErrors[`container-${container.id}`]
                                  ? "#ffebee"
                                  : "white",
                                borderColor: containerFieldErrors[`container-${container.id}`] ? "#f44336" : "#ced4da",
                              }}
                            />
                            {containerFieldErrors[`container-${container.id}`] && (
                              <div
                                style={{
                                  position: "fixed",
                                  zIndex: 9999,
                                  backgroundColor: "#f44336",
                                  color: "white",
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                  transform: "translateY(4px)",
                                  pointerEvents: "none",
                                  maxWidth: "250px",
                                }}
                                ref={(el) => {
                                  if (el) {
                                    const input = el.previousElementSibling
                                    if (input) {
                                      const rect = input.getBoundingClientRect()
                                      el.style.left = `${rect.left}px`
                                      el.style.top = `${rect.bottom + 4}px`
                                    }
                                  }
                                }}
                              >
                                {containerFieldErrors[`container-${container.id}`]}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "-4px",
                                    left: "10px",
                                    width: "0",
                                    height: "0",
                                    borderLeft: "4px solid transparent",
                                    borderRight: "4px solid transparent",
                                    borderBottom: "4px solid #f44336",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        {(isExport || formData.shipmentTypeId === "2") && (
                          <td>
                            <div style={{ position: "relative" }}>
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`file-ref-${container.id}`] ? "is-invalid" : ""}`}
                                value={container.fileRef || ""}
                                onChange={(e) => handleContainerChange(container.id, "fileRef", e.target.value)}
                                placeholder="Enter file reference"
                                maxLength={20}
                                style={{
                                  minWidth: "120px",
                                  backgroundColor: containerFieldErrors[`file-ref-${container.id}`]
                                    ? "#ffebee"
                                    : "white",
                                  borderColor: containerFieldErrors[`file-ref-${container.id}`] ? "#f44336" : "#ced4da",
                                }}
                              />
                              {containerFieldErrors[`file-ref-${container.id}`] && (
                                <div
                                  style={{
                                    position: "fixed",
                                    zIndex: 9999,
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    padding: "6px 10px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                    transform: "translateY(4px)",
                                    pointerEvents: "none",
                                    maxWidth: "250px",
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const input = el.previousElementSibling
                                      if (input) {
                                        const rect = input.getBoundingClientRect()
                                        el.style.left = `${rect.left}px`
                                        el.style.top = `${rect.bottom + 4}px`
                                      }
                                    }
                                  }}
                                >
                                  {containerFieldErrors[`file-ref-${container.id}`]}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      left: "10px",
                                      width: "0",
                                      height: "0",
                                      borderLeft: "4px solid transparent",
                                      borderRight: "4px solid transparent",
                                      borderBottom: "4px solid #f44336",
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {(isImport || isExport || isCrossHaul) && (
                          <td>
                            <div style={{ position: "relative" }}>
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`weight-${container.id}`] ? "is-invalid" : ""}`}
                                value={container.weight || ""}
                                onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                                placeholder="Enter weight"
                                style={{
                                  minWidth: "80px",
                                  backgroundColor: containerFieldErrors[`weight-${container.id}`] ? "#ffebee" : "white",
                                  borderColor: containerFieldErrors[`weight-${container.id}`] ? "#f44336" : "#ced4da",
                                }}
                              />
                              {containerFieldErrors[`weight-${container.id}`] && (
                                <div
                                  style={{
                                    position: "fixed",
                                    zIndex: 9999,
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    padding: "6px 10px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                    transform: "translateY(4px)",
                                    pointerEvents: "none",
                                    maxWidth: "250px",
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const input = el.previousElementSibling
                                      if (input) {
                                        const rect = input.getBoundingClientRect()
                                        el.style.left = `${rect.left}px`
                                        el.style.top = `${rect.bottom + 4}px`
                                      }
                                    }
                                  }}
                                >
                                  {containerFieldErrors[`weight-${container.id}`]}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      left: "10px",
                                      width: "0",
                                      height: "0",
                                      borderLeft: "4px solid transparent",
                                      borderRight: "4px solid transparent",
                                      borderBottom: "4px solid #f44336",
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={container.cargoDescription}
                            onChange={(e) => handleContainerChange(container.id, "cargoDescription", e.target.value)}
                            placeholder="Enter cargo description"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={container.hazardous || false}
                              onChange={(e) => handleContainerChange(container.id, "hazardous", e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={container.addSurcharges || false}
                              onChange={(e) => handleContainerChange(container.id, "addSurcharges", e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </td>
                        {allowVgmUI && (
                          <td style={{ textAlign: "center" }}>
                            <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={container.vgm || false}
                                onChange={(e) => handleContainerChange(container.id, "vgm", e.target.checked)}
                                style={{ cursor: "pointer" }}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        <div className="controller-instructions-button-container" style={{ margin: "20px 0" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: "8px 24px",
              fontSize: "16px",
              fontWeight: "500",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              backgroundColor: "#4a90e2",
              borderColor: "#4a90e2",
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              "Submit Instruction"
            )}
          </button>
          {submitError && (
            <div className="alert alert-danger mt-3" role="alert" style={{ marginTop: "15px" }}>
              {submitError}
            </div>
          )}
        </div>
      </form>
      </InstructionLoadingGate>
    </div>
  )

}