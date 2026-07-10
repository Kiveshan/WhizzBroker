import ErrorModal from "../../../../components/ErrorModal";
import { ErrorTooltip } from "../../../../components/instructions/ErrorTooltip";
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal";
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate";
import { InstructionBanners } from "../../../../components/instructions/InstructionBanners";
import { ActionButtons } from "../../../../components/instructions/ActionButtons";
import { ClientInfoSection } from "../../../../components/instructions/ClientInfoSection";
import { ContainerCountsSection } from "../../../../components/instructions/ContainerCountsSection";
import { UnitPerSection } from "../../../../components/instructions/UnitPerSection";
import { BookingDetailsSection } from "../../../../components/instructions/BookingDetailsSection";
import { WeightDetailsTable } from "../../../../components/instructions/WeightDetailsTable";
import { ContainerDetailsTable } from "../../../../components/instructions/ContainerDetailsTable";
import { AddonInvoicePicker } from "../../../../components/instructions/AddonInvoicePicker";

export function FCcontrollerinstructionsLayout({
  // Loading gate
  isLoadingCompleteWithData,
  hasDataFailure,
  handleRetryFetch,
  // Modals
  errorModal,
  setErrorModal,
  confirmationModal,
  handleConfirmAction,
  handleCancelAction,
  warningModal,
  setWarningModal,
  // Navigation
  handleBackClick,
  // Form state
  formData,
  setFormData,
  fieldErrors,
  setFieldErrors,
  fieldRefs,
  instructionId,
  clients,
  shipmentTypes,
  startingPoints,
  destinations,
  weightRows,
  containers,
  containerFieldErrors,
  // Computed flags
  isReadOnly,
  isSetRateMode,
  isSetRate,
  setIsSetRate,
  isAddOn,
  isImport,
  historicalSetRate,
  setRateValue,
  showSetRateWarning,
  routeEditMode,
  hasRouteMismatch,
  setConfirmationModal,
  // Styles
  readOnlyStyle,
  nonEditableStyle,
  // Dates
  today,
  lastFreeDateRef,
  etaDateRef,
  // Loading / messages
  isContainerLoading,
  containerSuccessMessage,
  rateUpdateMessage,
  // Invoice
  isInvoiced,
  // Handlers — form
  handleClientChange,
  handleInputChange,
  handleNumericInputChange,
  handleRateChange,
  handleShipmentTypeChange,
  handlePickupChange,
  handleDropoffChange,
  // Handlers — weight rows
  updateWeightRow,
  handleRequestDeleteWeightRow,
  addWeightRow,
  // Handlers — containers
  handleContainerChange,
  changeContainersType,
  handleRequestDeleteContainer,
  // Handlers — actions
  handleSaveChanges,
  handleDeleteInstruction,
  handleCreateInvoice,
}) {
  return (
    <InstructionLoadingGate
      isLoadingComplete={isLoadingCompleteWithData}
      hasDataFailure={hasDataFailure}
      onRetry={handleRetryFetch}
    >
    <div className="controller-instructions-root">
      <div className="controller-instructions-unique-wrapper">
        {errorModal.isOpen &&
          errorModal.message.includes("Failed to fetch") && (
            <ErrorModal
              isOpen={errorModal.isOpen}
              message={errorModal.message}
              onClose={() => setErrorModal({ isOpen: false, message: "" })}
              type="error"
            />
          )}
        <div className="controller-instructions-header">
          <button
            className="controller-instructions-back-button"
            onClick={() => handleBackClick()}
          >
            Back
          </button>
        </div>
        <div
          className="controller-instructions-form-container"
          style={{ maxWidth: "1200px" }}
        >
          <InstructionBanners
            isReadOnly={isReadOnly}
            status={formData.status}
            showSetRateWarning={showSetRateWarning}
            historicalSetRate={historicalSetRate}
            setRateValue={setRateValue}
          />
          <ClientInfoSection
            formData={formData}
            clients={clients}
            fieldErrors={fieldErrors}
            fieldRefs={fieldRefs}
            isReadOnly={isReadOnly}
            clientLocked={true}
            readOnlyStyle={readOnlyStyle}
            nonEditableStyle={nonEditableStyle}
            onClientChange={handleClientChange}
            onChange={handleInputChange}
            showCreationDate={true}
          />
          <div className="controller-instructions-form-section">
            {false && (
              <div
                className="controller-instructions-form-row"
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 180px", maxWidth: "220px" }}
                >
                  <label>Shipment Type</label>
                  <div
                    className="controller-instructions-select-wrapper"
                    ref={fieldRefs.shipmentTypeId}
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
                      disabled={isReadOnly}
                      style={isReadOnly ? readOnlyStyle : {}}
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
                    <ErrorTooltip
                      message={fieldErrors.shipmentTypeId}
                    />
                  </div>
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Pickup Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.pickup}
                      value={formData.pickup || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.pickup}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.pickup
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="pickup"
                        value={formData.pickup || ""}
                        onChange={handlePickupChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Pickup
                        </option>
                        {startingPoints.map((point) => (
                          <option key={point.id} value={point.startingpoint}>
                            {point.startingpoint}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.pickup} />
                    </div>
                  )}
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Dropoff Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.dropoff}
                      value={formData.dropoff || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.dropoff}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.dropoff
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="dropoff"
                        value={formData.dropoff || ""}
                        onChange={handleDropoffChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Dropoff
                        </option>
                        {destinations.map((dest) => (
                          <option key={dest.id} value={dest.destination}>
                            {dest.destination}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.dropoff} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="controller-instructions-form-section">
            <div className="controller-instructions-form-row controller-instructions-trailer-container">
              <div
                className="controller-instructions-trailer-title"
                style={{ display: "none" }}
              >
                <h3>Trailer Size</h3>
              </div>
              <hr
                className="controller-instructions-divider"
                style={{ display: "none" }}
              />
              <div
                className="controller-instructions-container-section"
              >
                <ContainerCountsSection
                  formData={formData}
                  fieldErrors={fieldErrors}
                  fieldRefs={fieldRefs}
                  isSetRateMode={isSetRateMode}
                  isReadOnly={isReadOnly}
                  readOnlyStyle={readOnlyStyle}
                  onCountChange={handleNumericInputChange}
                  onRateChange={handleRateChange}
                />
                {/* Main form section */}
                <div
                  className="controller-instructions-booking-vertical-group"
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxWidth: "220px",
                  }}
                >
                  <div className="controller-instructions-form-field">
                    <label>Shipment Type</label>
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.shipmentTypeId}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.shipmentTypeId
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
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
                      <ErrorTooltip
                        message={fieldErrors.shipmentTypeId}
                      />
                    </div>
                  </div>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.pickup || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <ErrorTooltip message={fieldErrors.pickup} />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field">
                        <label>Dropoff Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.dropoff || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <ErrorTooltip message={fieldErrors.dropoff} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.pickup
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="pickup"
                            value={formData.pickup || ""}
                            onChange={handlePickupChange}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          >
                            <option value="" disabled>
                              Select Pickup
                            </option>
                            {startingPoints.map((point) => (
                              <option key={point.id} value={point.startingpoint}>
                                {point.startingpoint}
                              </option>
                            ))}
                          </select>
                          <ErrorTooltip message={fieldErrors.pickup} />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field">
                        <label>Dropoff Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.dropoff
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="dropoff"
                            value={formData.dropoff || ""}
                            onChange={handleDropoffChange}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          >
                            <option value="" disabled>
                              Select Dropoff
                            </option>
                            {destinations.map((dest) => (
                              <option key={dest.id} value={dest.destination}>
                                {dest.destination}
                              </option>
                            ))}
                          </select>
                          <ErrorTooltip message={fieldErrors.dropoff} />
                        </div>
                      </div>
                    </>
                  )}
                  {/* This surcharges section has been moved to be next to the checkbox */}

                  <UnitPerSection
                    formData={formData}
                    fieldErrors={fieldErrors}
                    fieldRefs={fieldRefs}
                    isSetRate={isSetRate}
                    isReadOnly={isReadOnly}
                    isAddOn={isAddOn}
                    historicalSetRate={historicalSetRate}
                    setRateValue={setRateValue}
                    readOnlyStyle={readOnlyStyle}
                    onInputChange={handleInputChange}
                    onSetRateChange={setIsSetRate}
                  />
                </div>
                {/* End of main form section */}

                {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
                <BookingDetailsSection
                  formData={formData}
                  fieldErrors={fieldErrors}
                  fieldRefs={fieldRefs}
                  isReadOnly={isReadOnly}
                  isAddOn={isAddOn}
                  today={today}
                  readOnlyStyle={readOnlyStyle}
                  lastFreeDateRef={lastFreeDateRef}
                  etaDateRef={etaDateRef}
                  onInputChange={handleInputChange}
                  onVatChange={(val) =>
                    setFormData((prev) => ({ ...prev, vat: val }))
                  }
                />

                {/* Add-On Invoice link (add-on shipment type only) */}
                {isAddOn && (
                  <AddonInvoicePicker
                    clientId={formData.clientId}
                    instructionId={instructionId}
                    value={formData.addon_id}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, addon_id: val }));
                      if (setFieldErrors) {
                        setFieldErrors((prev) => ({ ...prev, addon_id: "" }));
                      }
                    }}
                    disabled={isReadOnly}
                    error={fieldErrors.addon_id}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Weight Details Table for shipment type 4 */}
          {String(formData.shipmentTypeId) === "4" && weightRows.length > 0 && (
            <WeightDetailsTable
              rows={weightRows}
              rateWeight={formData.rateWeight}
              isReadOnly={isReadOnly}
              onUpdateRow={updateWeightRow}
              onDeleteRow={handleRequestDeleteWeightRow}
              onAddRow={addWeightRow}
            />
          )}

          {/* Container Details Table */}
          {/* Only show when shipment type is NOT cross-haul (break bulk) (type 4) */}
          {containers.length > 0 && formData.shipmentTypeId !== "4" && (
            <ContainerDetailsTable
              containers={containers}
              containerFieldErrors={containerFieldErrors}
              shipmentTypeId={formData.shipmentTypeId}
              isImport={isImport}
              isReadOnly={isReadOnly}
              readOnlyStyle={readOnlyStyle}
              isLoading={isContainerLoading}
              successMessage={containerSuccessMessage || rateUpdateMessage}
              sectionStyle={
                String(formData.shipmentTypeId) === "2"
                  ? { marginTop: "-40px", paddingTop: "0" }
                  : undefined
              }
              onContainerChange={handleContainerChange}
              onDeleteContainer={handleRequestDeleteContainer}
              onChangeContainersType={changeContainersType}
            />
          )}
          <ActionButtons
            isReadOnly={isReadOnly}
            status={formData.status}
            isInvoiced={isInvoiced}
            onSave={handleSaveChanges}
            onDelete={handleDeleteInstruction}
            onInvoice={handleCreateInvoice}
          />
        </div>
        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          title={
            confirmationModal.action === "delete" ? "Delete Instruction" :
            confirmationModal.action === "invoice" ? "Create Invoice" :
            confirmationModal.action === "delete-container" ? "Delete Container" :
            confirmationModal.action === "delete-weight" ? "Delete Weight Row" :
            confirmationModal.action === "unlock-route" ? "Unlock Route" :
            "Confirm"
          }
          message={confirmationModal.message}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
        {/* Warning Modal (shipment type change) */}
        <ConfirmationModal
          isOpen={warningModal.isOpen}
          title="Warning"
          message={warningModal.message}
          onConfirm={() => {
            warningModal.onConfirm?.();
            setWarningModal((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setWarningModal((prev) => ({ ...prev, isOpen: false }))}
          confirmText="Reset Counts & Continue"
          cancelText="Cancel"
          variant="warning"
        />
      </div>
    </div>
    </InstructionLoadingGate>
  );
}
