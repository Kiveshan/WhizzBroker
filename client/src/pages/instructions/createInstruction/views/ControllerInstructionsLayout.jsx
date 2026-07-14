import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate"
import { AddonInvoicePicker } from "../../../../components/instructions/AddonInvoicePicker"
import { ContainersCard } from "../../../../components/instructions/ContainersCard"
import { ClientInfoSection } from "../../../../components/instructions/ClientInfoSection"
import { BookingDetailsSection } from "../../../../components/instructions/BookingDetailsSection"
import { UnitPerSection } from "../../../../components/instructions/UnitPerSection"
import { WeightDetailsTable } from "../../../../components/instructions/WeightDetailsTable"

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
  availableExtraCharges,
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
  groupMode = false,
  clientLocked = false,
}) {
  // BookingDetailsSection/UnitPerSection use the FC form's field names
  // (clientFileRef/ksmFileRef, unitRate); the create form's formData still
  // uses fileRef/task/unitrate, so adapt the values and translate names back
  // on change instead of touching validation/submit which key off the
  // create-mode names.
  const bookingFormData = {
    ...formData,
    clientFileRef: formData.fileRef,
    ksmFileRef: formData.task,
    unitRate: formData.unitrate,
    createdAt: today,
  }
  const bookingFieldErrors = {
    ...fieldErrors,
    clientFileRef: fieldErrors.fileRef,
    ksmFileRef: fieldErrors.task,
    unitRate: fieldErrors.unitrate,
  }
  const handleBookingInputChange = (e) => {
    const { name, value } = e.target
    const nameMap = { clientFileRef: "fileRef", ksmFileRef: "task", unitRate: "unitrate", createdAt: "createdAt" }
    const mappedName = nameMap[name] || name
    if (mappedName === "createdAt") return
    handleInputChange({ target: { name: mappedName, value, type: "text" } })
  }

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

      {!groupMode && (
        <div className="controller-instructions-header">
          <button className="controller-instructions-back-button" onClick={() => navigate("/ControllerDashboard")}>
            Back
          </button>
        </div>
      )}

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
        <ClientInfoSection
          formData={formData}
          clients={clients}
          fieldErrors={fieldErrors}
          fieldRefs={fieldRefs.current}
          isReadOnly={false}
          clientLocked={clientLocked}
          nonEditableStyle={nonEditableStyle}
          onClientChange={handleClientChange}
          onChange={handleInputChange}
          showLocations={true}
          startingPoints={clientStartingPoints}
          destinations={clientDestinations}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
        />

        <BookingDetailsSection
          formData={bookingFormData}
          fieldErrors={bookingFieldErrors}
          fieldRefs={fieldRefs.current}
          isReadOnly={false}
          isAddOn={isAddOn}
          today={today}
          lastFreeDateRef={lastFreeDateRef}
          etaDateRef={etaDateRef}
          onInputChange={handleBookingInputChange}
          onVatChange={(val) => setFormData((prev) => ({ ...prev, vat: val }))}
          shipmentTypes={shipmentTypes}
          onShipmentTypeChange={handleShipmentTypeChange}
          showCreationDate={true}
        >
          <UnitPerSection
            formData={bookingFormData}
            fieldErrors={bookingFieldErrors}
            fieldRefs={fieldRefs.current}
            isSetRate={isSetRate}
            isReadOnly={false}
            isAddOn={isAddOn}
            historicalSetRate={null}
            setRateValue={setRateValue}
            onInputChange={handleBookingInputChange}
            onSetRateChange={(checked) => {
              setIsSetRate(checked)
              if (checked) {
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
        </BookingDetailsSection>

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

        {/* Weight Details Table for shipment type 4 */}
        {formData.shipmentTypeId === "4" && (
          <WeightDetailsTable
            rows={weightRows}
            rateWeight={formData.rateWeight}
            isReadOnly={false}
            onUpdateRow={updateWeightRow}
            onDeleteRow={(row) => removeWeightRow(row.id)}
            onAddRow={addWeightRow}
          />
        )}

        {/* Container Details Section - Only show for container-based calculations */}
        {!isWeightBased && !isSetRateMode ? (
          <ContainersCard
            formData={formData}
            setFormData={setFormData}
            rateFieldsEnabled={rateFieldsEnabled}
            rateLockStatus={rateLockStatus}
            handleContainerCountChange={handleContainerCountChange}
            containers={containers}
            containerFieldErrors={containerFieldErrors}
            handleContainerChange={handleContainerChange}
            isImport={isImport}
            isExport={isExport}
            isCrossHaul={isCrossHaul}
            allowVgmUI={allowVgmUI}
            countsDisabled={isWeightBased || isSetRateMode}
            countError={fieldErrors.containers || fieldErrors.containerCount || ""}
            availableExtraCharges={availableExtraCharges}
          />
        ) : null}
        <div className="controller-instructions-button-container" style={{ margin: "20px 0" }}>
          {!groupMode && (
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
          )}
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
