import { useCallback } from "react";
import { formatDateForInput } from "../utils/instructions/dateFormatting.js";

/**
 * All form-change handlers for the update instruction form.
 * Extracted from FCcontrollerinstructions to keep that file lean.
 */
export function useUpdateFormHandlers({
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
}) {
  // ─── helpers ─────────────────────────────────────────────────────────────────

  const clearFieldError = useCallback(
    (fieldName) => {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
    },
    [setFieldErrors]
  );

  const updatePreservedContainers = useCallback(
    (containerType, isIncreasing, difference) => {
      const containerTypeMap = {
        num_six_meters: "6m",
        num_twelve_meters: "12m",
        num_abnormal: "Abnormal",
      };
      const type = containerTypeMap[containerType];
      if (!type) return;

      if (isIncreasing) {
        const nextId =
          preservedContainers.length > 0
            ? Math.max(...preservedContainers.map((c) => c.id)) + 1
            : 1;
        const newContainers = Array.from({ length: difference }, (_, i) => ({
          id: nextId + i,
          containerKey: null,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: type,
          cargoDescription: "",
        }));
        setPreservedContainers([...preservedContainers, ...newContainers]);
      } else {
        const ofType = preservedContainers.filter((c) => c.containerType === type);
        const toRemove = ofType.slice(ofType.length - difference);
        setPreservedContainers(
          preservedContainers.filter((c) => !toRemove.includes(c))
        );
      }
    },
    [isImport, preservedContainers, setPreservedContainers]
  );

  // ─── client ──────────────────────────────────────────────────────────────────

  const handleClientChange = useCallback(
    (e) => {
      const newClientId = e.target.value;
      const selectedClient = clients.find(
        (c) => c.m5clientkey.toString() === newClientId
      );
      if (selectedClient) {
        setFormData({
          ...formData,
          clientId: newClientId,
          representative: selectedClient.representative || "",
          contactDetails: selectedClient.cellnum || "",
          email: selectedClient.email || "",
        });
      } else {
        setFormData({
          ...formData,
          clientId: newClientId,
          representative: "",
          contactDetails: "",
          email: "",
        });
      }
      setFieldErrors((prev) => ({ ...prev, clientId: "" }));
    },
    [clients, formData, setFormData, setFieldErrors]
  );

  // ─── shipment type ───────────────────────────────────────────────────────────

  const handleShipmentTypeChange = useCallback(
    (e) => {
      const shipmentTypeId = e.target.value;
      const selectedShipmentType = shipmentTypes.find(
        (type) => type.shipkey.toString() === shipmentTypeId
      );
      const shipmentTypeName = selectedShipmentType
        ? selectedShipmentType.shipmenttype
        : "";
      const isImportType = shipmentTypeName.toLowerCase() === "import";

      // Warn before switching to cross-haul (type 4) with existing containers
      if (shipmentTypeId === "4") {
        const totalContainers =
          formData.num_six_meters +
          formData.num_twelve_meters +
          formData.num_abnormal;
        if (totalContainers > 0) {
          // The warningModal is managed in the component; we need to surface
          // this. We return a special signal object instead.
          return {
            type: "warn-crosshaul",
            shipmentTypeId,
            shipmentTypeName,
            onConfirm: () => {
              const updated = {
                ...formData,
                num_six_meters: 0,
                num_twelve_meters: 0,
                num_abnormal: 0,
                shipmentTypeId: String(shipmentTypeId),
                shipmentTypeName,
                vesselName: "",
                stackDate: "",
                rateWeight: "ton",
              };
              setFormData(updated);
              setIsImport(isImportType);
              setTimeout(() => initializeContainers([], {}), 0);
            },
          };
        }
      }

      const shouldHaveWeight =
        isImportType ||
        String(shipmentTypeId) === "2" ||
        String(shipmentTypeId) === "3";

      setIsImport(isImportType);

      if (shipmentTypeId === "4") {
        setFormData({
          ...formData,
          shipmentTypeId: String(shipmentTypeId),
          shipmentTypeName,
          vesselName: "",
          stackDate: "",
          rateWeight: "ton",
        });
        setWeightRows([
          {
            id: 1,
            ksmDmNo: "",
            ticketNo: "",
            receiptBookNo: "",
            weight: "",
          },
        ]);
      } else if (["1", "2", "3"].includes(shipmentTypeId)) {
        const previousShipmentType = formData.shipmentTypeId;
        const isContainerTypeSwitch = ["1", "2", "3"].includes(
          previousShipmentType
        );
        setFormData({
          ...formData,
          shipmentTypeId: String(shipmentTypeId),
          shipmentTypeName,
          rateWeight: "Container",
          num_six_meters: isContainerTypeSwitch ? formData.num_six_meters : 0,
          num_twelve_meters: isContainerTypeSwitch
            ? formData.num_twelve_meters
            : 0,
          num_abnormal: isContainerTypeSwitch ? formData.num_abnormal : 0,
          num_breakbulk: 0,
          rateper_6: isContainerTypeSwitch ? formData.rateper_6 : 0,
          rateper_12: isContainerTypeSwitch ? formData.rateper_12 : 0,
          rateper_abnormal: isContainerTypeSwitch
            ? formData.rateper_abnormal
            : 0,
          rateper_breakbulk: 0,
        });
        if (!isContainerTypeSwitch) {
          setTimeout(() => initializeContainers([], {}), 0);
        }
        setIsSetRate(false);
      } else {
        setFormData({
          ...formData,
          shipmentTypeId: String(shipmentTypeId),
          shipmentTypeName,
        });
      }

      setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }));

      // Update container weight fields for new shipment type
      if (containers && containers.length > 0) {
        setContainers((prev) =>
          prev.map((container) => ({
            ...container,
            weight: shouldHaveWeight
              ? container.weight !== null && container.weight !== undefined
                ? container.weight
                : ""
              : null,
          }))
        );
      }

      // Re-initialize containers when switching to/from break bulk
      const isImportExportCrossHaulSwitch =
        (["1", "2", "3"].includes(formData.shipmentTypeId) &&
          ["1", "2", "3"].includes(shipmentTypeId));

      if (
        !isImportExportCrossHaulSwitch ||
        shipmentTypeId === "4" ||
        formData.shipmentTypeId === "4"
      ) {
        const currentCounts = {
          num_six_meters: formData.num_six_meters || 0,
          num_twelve_meters: formData.num_twelve_meters || 0,
          num_abnormal: formData.num_abnormal || 0,
          num_breakbulk: formData.num_breakbulk || 0,
        };
        setTimeout(() => {
          if (
            currentCounts.num_six_meters > 0 ||
            currentCounts.num_twelve_meters > 0 ||
            currentCounts.num_abnormal > 0 ||
            currentCounts.num_breakbulk > 0
          ) {
            initializeContainers(containersRef.current, currentCounts);
          }
        }, 100);
      }

      return null;
    },
    [
      formData,
      setFormData,
      shipmentTypes,
      containers,
      setContainers,
      setIsImport,
      setIsSetRate,
      setWeightRows,
      setFieldErrors,
      initializeContainers,
      containersRef,
    ]
  );

  // ─── pickup / dropoff ────────────────────────────────────────────────────────

  const handlePickupChange = useCallback(
    async (e) => {
      const pickupLocation = e.target.value;
      setFormData((prev) => ({
        ...prev,
        pickup: pickupLocation,
        dropoff: "",
      }));
      clearFieldError("pickup");
      if (formData.clientId && pickupLocation) {
        await fetchRates(formData.clientId, pickupLocation);
      }
    },
    [formData.clientId, setFormData, clearFieldError, fetchRates]
  );

  const handleDropoffChange = useCallback(
    async (e) => {
      const dropoffLocation = e.target.value;
      setFormData((prev) => ({ ...prev, dropoff: dropoffLocation }));
      clearFieldError("dropoff");
      if (formData.pickup && dropoffLocation) {
        await fetchRates(formData.clientId, formData.pickup, dropoffLocation);
      }
    },
    [formData.clientId, formData.pickup, setFormData, clearFieldError, fetchRates]
  );

  // ─── generic input ───────────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      let processedValue = type === "checkbox" ? checked : value;

      if (type === "date") {
        processedValue = formatDateForInput(value);
      }
      if (name === "imoNo") {
        processedValue = value.replace(/[^0-9]/g, "").slice(0, 15);
      } else if (name === "flagReg") {
        processedValue = value.replace(/[^a-zA-Z\s\-']/g, "");
      }

      setFormData((prev) => ({ ...prev, [name]: processedValue }));
      clearFieldError(name);
    },
    [setFormData, clearFieldError]
  );

  // ─── numeric / container counts ──────────────────────────────────────────────

  const handleNumericInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      if (
        ["num_six_meters", "num_twelve_meters", "num_abnormal", "num_breakbulk"].includes(
          name
        )
      ) {
        const numValue = Number.parseInt(value);
        const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
        const prevValue = formData[name];
        const isIncreasing = validValue > prevValue;
        const difference = Math.abs(validValue - prevValue);

        const updatedFormData = { ...formData, [name]: validValue };

        setFormData(updatedFormData);

        const containerTypeMap = {
          num_six_meters: "6m",
          num_twelve_meters: "12m",
          num_abnormal: "Abnormal",
          num_breakbulk: "BreakBulk",
        };
        const containerType = containerTypeMap[name];

        if (containerType) {
          if (isIncreasing) {
            const nextId =
              containers.length > 0
                ? Math.max(...containers.map((c) => c.id)) + 1
                : 1;
            const newContainers = Array.from({ length: difference }, (_, i) => ({
              id: nextId + i,
              containerKey: null,
              containerNum: "",
              weight:
                isImport ||
                formData.shipmentTypeId === "2" ||
                formData.shipmentTypeId === "3"
                  ? ""
                  : null,
              containerType,
              cargoDescription: "",
            }));
            setContainers([...containers, ...newContainers]);
            setIsContainerDataModified(true);
          } else {
            const ofType = containers.filter(
              (c) => c.containerType === containerType
            );
            // Remove the last `difference` rows of this type, capped at how many
            // actually exist (guards against a count/row desync producing a
            // negative slice index that would under-remove).
            const toRemove = ofType.slice(
              Math.max(0, ofType.length - difference)
            );
            setContainers(
              containers.filter((c) => !toRemove.includes(c))
            );
            setIsContainerDataModified(true);
          }
          if (preservedContainers) {
            updatePreservedContainers(name, isIncreasing, difference);
          }
        }

        // Recalculate total cost
        const sixRate = Number(formData.rateper_6 || 0);
        const twelveRate = Number(formData.rateper_12 || 0);
        const abnormalRateNum = Number(formData.rateper_abnormal || 0);
        const breakBulkRate = Number(formData.rateper_breakbulk || 0);

        const totalCost =
          (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) *
            sixRate +
          (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) *
            twelveRate +
          (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) *
            abnormalRateNum +
          (name === "num_breakbulk" ? validValue : updatedFormData.num_breakbulk || 0) *
            breakBulkRate;

        updatedFormData.total_cost = totalCost;
        setFormData(updatedFormData);
        // Note: preservedContainers is updated once, inside the `if
        // (containerType)` block above — do not call it again here or the delta
        // is applied twice.
        setFieldErrors((prev) => ({ ...prev, containers: "" }));
      } else if (name === "rateWeight") {
        setFormData({ ...formData, [name]: value, total_cost: 0 });
        setFieldErrors((prev) => ({
          ...prev,
          rateWeight: "",
          weight: "",
        }));
      } else if (name === "pickupDate") {
        setFormData({
          ...formData,
          [name]: value,
          stackDate:
            formData.stackDate && new Date(formData.stackDate) <= new Date(value)
              ? ""
              : formData.stackDate,
          lastFreeDate:
            formData.lastFreeDate &&
            new Date(formData.lastFreeDate) <= new Date(value)
              ? ""
              : formData.lastFreeDate,
        });
        setFieldErrors((prev) => ({ ...prev, pickupDate: "" }));
      } else {
        setFormData({ ...formData, [name]: value });
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [
      formData,
      setFormData,
      containers,
      setContainers,
      isImport,
      setIsContainerDataModified,
      preservedContainers,
      updatePreservedContainers,
      setFieldErrors,
    ]
  );

  // ─── rate / weight ───────────────────────────────────────────────────────────

  const handleRateChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        const updated = { ...formData, [name]: value === "" ? "" : value };
        const sixRate = Number(updated.rateper_6 || 0);
        const twelveRate = Number(updated.rateper_12 || 0);
        const abnormalRateNum = Number(updated.rateper_abnormal || 0);
        updated.total_cost =
          (updated.num_six_meters || 0) * sixRate +
          (updated.num_twelve_meters || 0) * twelveRate +
          (updated.num_abnormal || 0) * abnormalRateNum;
        setFormData(updated);
      }
    },
    [formData, setFormData]
  );

  const handleWeightChange = useCallback(
    (e, setWeight) => {
      const value = e.target.value;
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        if (setWeight) setWeight(value);
        setFieldErrors((prev) => ({ ...prev, weight: "" }));
      }
    },
    [setFieldErrors]
  );

  // ─── container count (direct) ─────────────────────────────────────────────────

  const handleContainerCountChange = useCallback(
    (type, value) => {
      const numValue = Number.parseInt(value);
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
      const prevValue = formData[type];
      const isIncreasing = validValue > prevValue;
      const difference = Math.abs(validValue - prevValue);

      const updated = { ...formData, [type]: validValue };

      const sixRate = Number(formData.rateper_6 || 0);
      const twelveRate = Number(formData.rateper_12 || 0);
      const abnormalRateNum = Number(formData.rateper_abnormal || 0);

      updated.total_cost =
        (type === "num_six_meters" ? validValue : updated.num_six_meters) *
          sixRate +
        (type === "num_twelve_meters"
          ? validValue
          : updated.num_twelve_meters) *
          twelveRate +
        (type === "num_abnormal" ? validValue : updated.num_abnormal) *
          abnormalRateNum;

      setFormData(updated);
      updatePreservedContainers(type, isIncreasing, difference);
      setFieldErrors((prev) => ({ ...prev, containers: "" }));
    },
    [formData, setFormData, updatePreservedContainers, setFieldErrors]
  );

  // ─── navigation / retry ──────────────────────────────────────────────────────

  const handleBackClick = useCallback(() => {
    navigate("/instructions", {
      state: { clientId, clientName, selectedMonth, selectedYear, activeFilter },
    });
  }, [navigate, clientId, clientName, selectedMonth, selectedYear, activeFilter]);

  const handleRetryFetch = useCallback(() => {
    if (
      isLoading.clients ||
      isLoading.shipmentTypes ||
      isLoading.startingPoints ||
      isLoading.destinations
    ) {
      return;
    }
    refetchBaseData();
    setErrorModal({ isOpen: false, message: "" });
  }, [isLoading, refetchBaseData, setErrorModal]);

  return {
    handleClientChange,
    handleShipmentTypeChange,
    handlePickupChange,
    handleDropoffChange,
    handleInputChange,
    handleNumericInputChange,
    handleRateChange,
    handleWeightChange,
    handleContainerCountChange,
    handleBackClick,
    handleRetryFetch,
    clearFieldError,
  };
}
