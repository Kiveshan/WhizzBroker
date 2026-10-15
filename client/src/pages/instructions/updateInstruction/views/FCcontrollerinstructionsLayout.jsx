import ErrorModal from "../../../../components/ErrorModal";
import { ErrorTooltip } from "../../../../components/instructions/ErrorTooltip";
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal";
import { InstructionLoadingGate } from "../../../../components/instructions/InstructionLoadingGate";
import { InstructionBanners } from "../../../../components/instructions/InstructionBanners";
import { ActionButtons } from "../../../../components/instructions/ActionButtons";
import { ClientInfoSection } from "../../../../components/instructions/ClientInfoSection";
import { UnitPerSection } from "../../../../components/instructions/UnitPerSection";
import { BookingDetailsSection } from "../../../../components/instructions/BookingDetailsSection";
import { WeightDetailsTable } from "../../../../components/instructions/WeightDetailsTable";
import { ContainersCard } from "../../../../components/instructions/ContainersCard";
import { AddonInvoicePicker } from "../../../../components/instructions/AddonInvoicePicker";
import { InstructionValueCard } from "../../../../components/instructions/InstructionValueCard";
import { instructionValue } from "../../../../utils/instructions/instructionValue";

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
  groupMode = false,
  // Form state
  formData,
  setFormData,
  fieldErrors,
  setFieldErrors,
  fieldRefs,
  instructionId,
  clients,
  shipmentTypes,
  rateOptions,
  weightRows,
  containers,
  containerFieldErrors,
  availableExtraCharges,
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
  handleRateTitleChange,
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
        {/* Group page owns navigation; the embedded form hides its own Back */}
        {!groupMode && (
          <div className="controller-instructions-header">
            <button
              className="controller-instructions-back-button"
              onClick={() => handleBackClick()}
            >
              Back
            </button>
          </div>
        )}
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
            showLocations={true}
            rateOptions={rateOptions}
            onRateChange={handleRateTitleChange}
            pickupLocked={routeEditMode === "locked" && hasRouteMismatch}
            onLockedRouteClick={() =>
              setConfirmationModal({
                isOpen: true,
                message:
                  formData.rate_title
                    ? `The rate "${formData.rate_title}" is no longer on this client's rates. To change it you will need to choose one of the client's current rates. Containers already on this instruction keep their saved amounts. Do you want to continue?`
                    : "This instruction was priced by route before rate titles were introduced. To change it you will need to choose one of the client's current rates. Containers already on this instruction keep their saved amounts. Do you want to continue?",
                action: "unlock-route",
              })
            }
          />
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
            shipmentTypes={shipmentTypes}
            onShipmentTypeChange={handleShipmentTypeChange}
            showCreationDate={true}
          >
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
          </BookingDetailsSection>

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

          {/* Containers card: type quantities + rates + one row per container. */}
          {/* Hidden for break bulk (type 4), which uses the weight table above. */}
          {String(formData.shipmentTypeId) !== "4" && (
            <ContainersCard
              formData={formData}
              setFormData={setFormData}
              rateFieldsEnabled={{
                sixMeter: !isSetRateMode,
                twelveMeter: !isSetRateMode,
                abnormal: !isSetRateMode,
              }}
              rateLockStatus={{}}
              rateFieldNames={{
                "6m": "rateper_6",
                "12m": "rateper_12",
                Abnormal: "rateper_abnormal",
              }}
              onRateChange={(field, value) =>
                handleRateChange({ target: { name: field, value } })
              }
              handleContainerCountChange={(field, value) =>
                handleNumericInputChange({ target: { name: field, value } })
              }
              containers={containers}
              containerFieldErrors={containerFieldErrors}
              handleContainerChange={handleContainerChange}
              isImport={isImport}
              isExport={String(formData.shipmentTypeId) === "2"}
              isCrossHaul={String(formData.shipmentTypeId) === "3"}
              allowVgmUI={String(formData.shipmentTypeId) !== "4"}
              availableExtraCharges={availableExtraCharges}
              countsDisabled={isSetRateMode}
              countError={fieldErrors.containers || ""}
              isReadOnly={isReadOnly}
              onDeleteContainer={handleRequestDeleteContainer}
              showTypeSelect={true}
              isLoading={isContainerLoading}
              successMessage={containerSuccessMessage || rateUpdateMessage}
            />
          )}
          <InstructionValueCard
            value={instructionValue({
              shipmentTypeId: formData.shipmentTypeId,
              rateWeight: formData.rateWeight,
              // Set rate: the entered rate, falling back to the one saved on
              // the instruction (same as the save path, resolveBaseCost).
              setRate:
                isSetRate && !isAddOn
                  ? Number.parseFloat(formData.setRateAmount) > 0
                    ? Number.parseFloat(formData.setRateAmount)
                    : historicalSetRate || 0
                  : null,
              unitRate: formData.unitRate,
              weight: formData.weight,
              weightRows,
              counts: {
                six: formData.num_six_meters,
                twelve: formData.num_twelve_meters,
                abnormal: formData.num_abnormal,
              },
              rates: {
                six: formData.rateper_6,
                twelve: formData.rateper_12,
                abnormal: formData.rateper_abnormal,
              },
              containers: String(formData.shipmentTypeId) === "4" ? [] : containers,
              vat: formData.vat,
            })}
          />
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
            confirmationModal.action === "invoice" ? "Create Group Invoice" :
            confirmationModal.action === "delete-container" ? "Delete Container" :
            confirmationModal.action === "delete-weight" ? "Delete Weight Row" :
            confirmationModal.action === "unlock-route" ? "Change this instruction's rate?" :
            "Confirm"
          }
          message={confirmationModal.message}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
          {...(confirmationModal.action === "unlock-route"
            ? { confirmText: "Yes, choose a rate", cancelText: "No, keep it" }
            : {})}
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
