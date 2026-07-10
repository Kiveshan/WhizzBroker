"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/controllerinstruction.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useInstructionData } from "../../../../hooks/useInstructionData";
import { useContainerManagement } from "../../../../hooks/useContainerManagement";
import { useRateManagement } from "../../../../hooks/useRateManagement";
import { useWeightRows } from "../../../../hooks/useWeightRows";
import { useInstructionApply } from "../../../../hooks/useInstructionApply";
import { useInstructionActions } from "../../../../hooks/useInstructionActions";
import { useUpdateFormHandlers } from "../../../../hooks/useUpdateFormHandlers";
import { validateForm as validateFormUtil } from "../../../../utils/instructions/validation";
import { checkRateCountMismatch as checkRateCountMismatchUtil } from "../../../../utils/instructions/rateCountMismatch";
import { FCcontrollerinstructionsLayout } from "./FCcontrollerinstructionsLayout";

const FCcontrollerinstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preservedFormData = location.state?.preservedFormData;
  const containerCounts = location.state?.containerCounts;
  const instructionId = location.state?.instructionId;
  const clientId = location.state?.clientId;
  const clientName = location.state?.clientName;
  const selectedMonth = location.state?.selectedMonth;
  const selectedYear = location.state?.selectedYear;
  const activeFilter = location.state?.activeFilter;

  const etaDateRef = useRef(null);
  const lastFreeDateRef = useRef(null);

  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    ksmFileRef: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    stackDate: useRef(null),
    lastFreeDate: useRef(null),
    bookingRef: useRef(null),
    clientFileRef: useRef(null),
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    rateWeight: useRef(null),
    unitRate: useRef(null),
    createdAt: useRef(null),
  };

  const [isImport, setIsImport] = useState(location.state?.isImport || false);
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const [weight, setWeight] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
    shipmentTypeId: "",
    shipmentTypeName: "",
  });
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    message: "",
    action: null,
  });
  const [prevContainerCounts, setPrevContainerCounts] = useState({
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  });
  const [preservedContainers, setPreservedContainers] = useState(
    location.state?.preservedContainers || []
  );
  const recalculateTotalCostRef = useRef(null);

  // ─── form data ───────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState(() => {
    const defaultData = {
      rateper_6: preservedFormData?.rateper_6 || 0,
      rateper_12: preservedFormData?.rateper_12 || 0,
      rateper_abnormal: preservedFormData?.rateper_abnormal || 0,
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      unitRate: "",
      quantity: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    };

    if (preservedFormData) {
      if (containerCounts) {
        const initialData = {
          ...defaultData,
          ...preservedFormData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        };
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
        return initialData;
      }
      const initialData = { ...preservedFormData, rateWeight: "Container" };
      setPrevContainerCounts({
        num_six_meters: preservedFormData.num_six_meters || 0,
        num_twelve_meters: preservedFormData.num_twelve_meters || 0,
        num_abnormal: preservedFormData.num_abnormal || 0,
      });
      return initialData;
    }

    return {
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    };
  });

  const isReadOnly = formData.status === "Completed";

  // ─── existing hooks ──────────────────────────────────────────────────────────

  const {
    weightRows,
    setWeightRows,
    weightRowsRef,
    addWeightRow,
    updateWeightRow,
    handleRequestDeleteWeightRow: hookRequestDeleteWeightRow,
    confirmDeleteWeightRow,
    cancelDeleteWeightRow,
  } = useWeightRows();

  const {
    clients,
    shipmentTypes,
    startingPoints,
    destinations,
    instructionRecord,
    isLoading,
    isLoadingComplete,
    hasRouteMismatch,
    setHasRouteMismatch,
    routeEditMode,
    setRouteEditMode,
    refetch: refetchBaseData,
  } = useInstructionData({
    fetchExisting: !!instructionId && !preservedFormData,
    instructionId,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    onFormUpdate: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  const isAddOn = (() => {
    const id = (formData.shipmentTypeId || "").toString();
    const name = (formData.shipmentTypeName || "").toLowerCase();
    const selectedType = shipmentTypes.find(
      (type) => (type.shipkey || type.id)?.toString() === id
    );
    const typeName = (selectedType?.shipmenttype || "").toLowerCase();
    return (
      id === "5" ||
      name === "add-on" ||
      name === "add on" ||
      typeName === "add-on" ||
      typeName === "add on"
    );
  })();

  const allowVgmUI = String(formData.shipmentTypeId) !== "4";

  const {
    containers,
    setContainers,
    containersRef,
    containerFieldErrors,
    setContainerFieldErrors,
    isContainerLoading,
    setIsContainerLoading,
    isContainerDataModified,
    setIsContainerDataModified,
    containerSuccessMessage,
    setContainerSuccessMessage,
    initializeContainers,
    handleContainerChange,
    changeContainersType,
    handleRequestDeleteContainer,
    confirmDeleteContainer,
    cancelDeleteContainer,
  } = useContainerManagement({
    isImport,
    isExport: String(formData.shipmentTypeId) === "2",
    isCrossHaul:
      String(formData.shipmentTypeId) === "3" ||
      String(formData.shipmentTypeId) === "4",
    isWeightBased: false,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    shipmentTypeId: formData.shipmentTypeId,
    isAddOn,
    isReadOnly,
    instructionId,
    onRecalculateTotalCost: () => recalculateTotalCostRef.current?.(),
    onUpdateFormCounts: (counts) => setFormData((prev) => ({ ...prev, ...counts })),
    onRequestConfirmation: (message) =>
      setConfirmationModal({ isOpen: true, message, action: "delete-container" }),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  const {
    isSetRate,
    setIsSetRate,
    isSetRateMode,
    setRateValue,
    historicalSetRate,
    setHistoricalSetRate,
    showSetRateWarning,
    rateUpdateMessage,
    fetchRates,
    fetchFreshAmounts,
    recalculateTotalCost,
  } = useRateManagement({
    isAddOn,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    status: formData.status,
    onFormUpdate: (partial) => setFormData((prev) => ({ ...prev, ...partial })),
    onError: (msg) => setErrorModal({ isOpen: true, message: msg }),
  });

  // ─── inline validation / mismatch (needed before hook calls) ────────────────

  const validateAllFields = useCallback(() => {
    const { isValid, fieldErrors: fErrors, containerErrors } = validateFormUtil(
      formData,
      containers,
      { mode: "update", isAddOn, isImport, isSetRate }
    );
    setFieldErrors(fErrors);
    setContainerFieldErrors(containerErrors);
    if (fErrors.containerUniqueness) {
      setErrorModal({ isOpen: true, message: fErrors.containerUniqueness });
    }
    return isValid;
  }, [formData, containers, isAddOn, isImport, isSetRate, setContainerFieldErrors]);

  const checkRateCounterMismatch = useCallback(
    () => checkRateCountMismatchUtil(formData, { isAddOn }),
    [formData, isAddOn]
  );

  // ─── new hooks ───────────────────────────────────────────────────────────────

  const { applyInstructionData } = useInstructionApply({
    setFormData,
    setContainers,
    setIsContainerDataModified,
    setWeightRows,
    setIsSetRate,
    setHistoricalSetRate,
    setPrevContainerCounts,
    setIsImport,
    initializeContainers,
    containersRef,
    setWeight,
    setErrorModal,
  });

  const {
    isInvoiced,
    checkIfInvoiced,
    handleSaveChanges,
    handleDeleteInstruction,
    performSave,
    performDelete,
    handleCreateInvoice,
    performInvoiceCreation,
  } = useInstructionActions({
    formData,
    containers,
    weightRows,
    instructionId,
    isSetRateMode,
    historicalSetRate,
    isAddOn,
    allowVgmUI,
    isSetRate,
    setRateValue,
    containersRef,
    weightRowsRef,
    fetchFreshAmounts,
    validateAllFields,
    checkRateCounterMismatch,
    recalculateTotalCost,
    setIsContainerLoading,
    setContainerSuccessMessage,
    setIsContainerDataModified,
    setErrorModal,
    setConfirmationModal,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  });

  const {
    handleClientChange,
    handleShipmentTypeChange: _handleShipmentTypeChange,
    handlePickupChange,
    handleDropoffChange,
    handleInputChange,
    handleNumericInputChange,
    handleRateChange,
    handleWeightChange,
    handleContainerCountChange,
    handleBackClick,
    handleRetryFetch,
  } = useUpdateFormHandlers({
    formData,
    setFormData,
    containers,
    setContainers,
    isImport,
    setIsImport,
    clients,
    shipmentTypes,
    initializeContainers,
    containersRef,
    fetchRates,
    setIsSetRate,
    setWeightRows,
    setFieldErrors,
    setIsContainerDataModified,
    preservedContainers,
    setPreservedContainers,
    setRouteEditMode,
    setHasRouteMismatch,
    refetchBaseData,
    setErrorModal,
    isLoading,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  });

  // Wrap handleShipmentTypeChange to catch cross-haul warning signal
  const handleShipmentTypeChange = useCallback(
    (e) => {
      const result = _handleShipmentTypeChange(e);
      if (result && result.type === "warn-crosshaul") {
        setWarningModal({
          isOpen: true,
          message:
            "Switching to Cross-Haul (Break Bulk) will reset container counts to zero. Do you want to continue?",
          onConfirm: result.onConfirm,
          shipmentTypeId: result.shipmentTypeId,
          shipmentTypeName: result.shipmentTypeName,
        });
      }
    },
    [_handleShipmentTypeChange]
  );

  // ─── inline orchestration handlers ──────────────────────────────────────────

  const handleConfirmAction = useCallback(() => {
    if (confirmationModal.action === "unlock-route") {
      setRouteEditMode("editable");
      setHasRouteMismatch(false);
      setFormData((prev) => ({ ...prev, pickup: "", dropoff: "" }));
    } else if (confirmationModal.action === "delete-container") {
      confirmDeleteContainer();
    } else if (confirmationModal.action === "delete-weight") {
      confirmDeleteWeightRow();
    } else if (confirmationModal.action === "save") {
      performSave();
    } else if (confirmationModal.action === "delete") {
      performDelete();
    } else if (confirmationModal.action === "invoice") {
      performInvoiceCreation();
    }
    setConfirmationModal({ isOpen: false, message: "", action: null });
  }, [
    confirmationModal.action,
    setRouteEditMode,
    setHasRouteMismatch,
    confirmDeleteContainer,
    confirmDeleteWeightRow,
    performSave,
    performDelete,
    performInvoiceCreation,
  ]);

  const handleCancelAction = useCallback(() => {
    setConfirmationModal({ isOpen: false, message: "", action: null });
    cancelDeleteContainer();
    cancelDeleteWeightRow();
  }, [cancelDeleteContainer, cancelDeleteWeightRow]);

  const handleRequestDeleteWeightRow = useCallback(
    (row) => {
      if (isReadOnly) return;
      hookRequestDeleteWeightRow(row);
      setConfirmationModal({
        isOpen: true,
        message: "Are you sure you want to delete this weight row?",
        action: "delete-weight",
      });
    },
    [isReadOnly, hookRequestDeleteWeightRow]
  );

  // ─── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (instructionId) checkIfInvoiced();
  }, [instructionId]);

  useEffect(() => {
    if (instructionRecord) applyInstructionData(instructionRecord);
  // applyInstructionData is stable; instructionRecord changes once on load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionRecord]);

  useEffect(() => {
    if (String(formData.shipmentTypeId) === "5" && formData.rateWeight !== "Container") {
      setFormData((prev) => ({ ...prev, rateWeight: "Container" }));
    }
  }, [formData.shipmentTypeId, formData.rateWeight]);

  useEffect(() => {
    if (String(formData.shipmentTypeId) === "4" && !isAddOn) {
      recalculateTotalCost(formData, containersRef.current, weightRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightRows, formData.unitRate, formData.shipmentTypeId]);

  const containerSurchargeKey = containers.map((c) => c.addSurcharges).join(",");
  const containerSurchargeAmountKey = containers.map((c) => c.surchargeAmount).join(",");
  const containerHazardousKey = containers.map((c) => c.hazardous).join(",");
  const containerHazardousAmountKey = containers.map((c) => c.hazardousAmount).join(",");
  const containerVgmKey = containers.map((c) => c.vgm).join(",");
  const containerVgmAmountKey = containers.map((c) => c.vgmAmount).join(",");

  useEffect(() => {
    if (containers.length > 0) {
      recalculateTotalCost(formData, containers, weightRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    containerSurchargeKey,
    containerSurchargeAmountKey,
    containerHazardousKey,
    containerHazardousAmountKey,
    containerVgmKey,
    containerVgmAmountKey,
  ]);

  recalculateTotalCostRef.current = () =>
    recalculateTotalCost(formData, containersRef.current, weightRowsRef.current);

  // ─── display values ──────────────────────────────────────────────────────────

  const nonEditableStyle = { backgroundColor: "#f0f0f0", cursor: "not-allowed" };
  const readOnlyStyle = {
    backgroundColor: "#f8f9fa",
    cursor: "not-allowed",
    color: "#6c757d",
    border: "1px solid #e9ecef",
  };

  const isLoadingCompleteWithData =
    isLoadingComplete && Object.keys(formData).length > 0;

  const hasDataFailure =
    clients.length === 0 ||
    shipmentTypes.length === 0 ||
    startingPoints.length === 0;

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <FCcontrollerinstructionsLayout
      // Loading gate
      isLoadingCompleteWithData={isLoadingCompleteWithData}
      hasDataFailure={hasDataFailure}
      handleRetryFetch={handleRetryFetch}
      // Modals
      errorModal={errorModal}
      setErrorModal={setErrorModal}
      confirmationModal={confirmationModal}
      handleConfirmAction={handleConfirmAction}
      handleCancelAction={handleCancelAction}
      warningModal={warningModal}
      setWarningModal={setWarningModal}
      // Navigation
      handleBackClick={handleBackClick}
      // Form state
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      setFieldErrors={setFieldErrors}
      instructionId={instructionId}
      fieldRefs={fieldRefs}
      clients={clients}
      shipmentTypes={shipmentTypes}
      startingPoints={startingPoints}
      destinations={destinations}
      weightRows={weightRows}
      containers={containers}
      containerFieldErrors={containerFieldErrors}
      // Computed flags
      isReadOnly={isReadOnly}
      isSetRateMode={isSetRateMode}
      isSetRate={isSetRate}
      setIsSetRate={setIsSetRate}
      isAddOn={isAddOn}
      isImport={isImport}
      historicalSetRate={historicalSetRate}
      setRateValue={setRateValue}
      showSetRateWarning={showSetRateWarning}
      routeEditMode={routeEditMode}
      hasRouteMismatch={hasRouteMismatch}
      setConfirmationModal={setConfirmationModal}
      // Styles
      readOnlyStyle={readOnlyStyle}
      nonEditableStyle={nonEditableStyle}
      // Dates
      today={today}
      lastFreeDateRef={lastFreeDateRef}
      etaDateRef={etaDateRef}
      // Loading / messages
      isContainerLoading={isContainerLoading}
      containerSuccessMessage={containerSuccessMessage}
      rateUpdateMessage={rateUpdateMessage}
      // Invoice
      isInvoiced={isInvoiced}
      // Handlers — form
      handleClientChange={handleClientChange}
      handleInputChange={handleInputChange}
      handleNumericInputChange={handleNumericInputChange}
      handleRateChange={handleRateChange}
      handleShipmentTypeChange={handleShipmentTypeChange}
      handlePickupChange={handlePickupChange}
      handleDropoffChange={handleDropoffChange}
      // Handlers — weight rows
      updateWeightRow={updateWeightRow}
      handleRequestDeleteWeightRow={handleRequestDeleteWeightRow}
      addWeightRow={addWeightRow}
      // Handlers — containers
      handleContainerChange={handleContainerChange}
      changeContainersType={changeContainersType}
      handleRequestDeleteContainer={handleRequestDeleteContainer}
      // Handlers — actions
      handleSaveChanges={handleSaveChanges}
      handleDeleteInstruction={handleDeleteInstruction}
      handleCreateInvoice={handleCreateInvoice}
    />
  );
};

export default FCcontrollerinstructions;
