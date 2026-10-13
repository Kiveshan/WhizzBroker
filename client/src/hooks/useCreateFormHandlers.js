import { useCallback } from "react";
import { fetchRateTitles as fetchRateTitlesService } from "../services/instructionService.js";

/**
 * Provides all change handlers for the create instruction form.
 * Extracted from ControllerInstructions to keep that file lean.
 */
export function useCreateFormHandlers({
  formData,
  setFormData,
  clients,
  shipmentTypes,
  initializeContainers,
  containersRef,
  setWeightRows,
  setFieldErrors,
  setRateLockStatus,
  clientRateOptions,
  setClientRateOptions,
  setIsLoadingLocations,
  setShowNoRatesModal,
}) {
  const handleClientChange = useCallback(
    async (e) => {
      const clientId = e.target.value;
      const selectedClient = clients.find(
        (client) => client.m5clientkey === Number.parseInt(clientId, 10)
      );

      setFormData((prev) => ({
        ...prev,
        clientId: clientId,
        clientName: selectedClient?.companyname || "",
        representative: selectedClient?.representative || "",
        contactDetails: selectedClient?.cellnum || "",
        email: selectedClient?.email || "",
        rate_title: "",
        pickup: "",
        dropoff: "",
        selectedStartingPoint: "",
        selectedDestination: "",
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
      }));
      setRateLockStatus({ sixMeter: false, twelveMeter: false });

      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.clientId;
        return newErrors;
      });

      if (clientId) {
        setIsLoadingLocations(true);
        try {
          const rateOptions = await fetchRateTitlesService(clientId);
          setClientRateOptions(Array.isArray(rateOptions) ? rateOptions : []);
          if (!Array.isArray(rateOptions) || rateOptions.length === 0) {
            setShowNoRatesModal(true);
          }
        } catch (error) {
          console.error("Error loading client rates:", error);
          setClientRateOptions([]);
        } finally {
          setIsLoadingLocations(false);
        }
      } else {
        setClientRateOptions([]);
      }
    },
    [clients]
  );

  // Picking a rate by title also fills in its route (blank when the rate
  // has none). Prices are then fetched by the page's rate effect.
  const handleRateChange = useCallback(
    (e) => {
      const title = e.target.value;
      const rate = (clientRateOptions || []).find((r) => r.title === title);
      setFormData((prev) => ({
        ...prev,
        rate_title: title,
        pickup: rate?.starting_point || "",
        dropoff: rate?.destination || "",
        selectedStartingPoint: rate?.starting_point || "",
        selectedDestination: rate?.destination || "",
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
        surcharges: false,
      }));
      setRateLockStatus({ sixMeter: false, twelveMeter: false });

      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.rate_title;
        delete newErrors.pickup;
        delete newErrors.dropoff;
        return newErrors;
      });
    },
    [clientRateOptions]
  );

  const handleShipmentTypeChange = useCallback(
    (e) => {
      const shipmentTypeId = e.target.value;
      const selectedType = shipmentTypes.find((type) => type.shipkey === shipmentTypeId);
      const isCrossHaulType = shipmentTypeId === "3" || shipmentTypeId === "4";
      const isBreakBulkType = shipmentTypeId === "4";
      const isImportType = shipmentTypeId === "1";
      const isExportType = shipmentTypeId === "2";
      const isRegularCrossHaulType = shipmentTypeId === "3";

      let newRateWeight = (prev) => prev.rateWeight;
      if (isImportType || isExportType || isRegularCrossHaulType) {
        newRateWeight = "Container";
      } else if (isBreakBulkType) {
        newRateWeight = "ton";
      }

      setFormData((prev) => ({
        ...prev,
        shipmentTypeId: shipmentTypeId,
        shipmentTypeName: selectedType?.shipmenttype || "",
        ...(isCrossHaulType && {
          vesselName: "",
          stackDate: "",
        }),
        rateWeight: newRateWeight,
      }));

      if (isBreakBulkType) {
        setWeightRows((prev) =>
          prev.length > 0
            ? prev
            : [{ id: 1, ksmDmNo: "", ticketNo: "", receiptBookNo: "", weight: "" }]
        );
      } else {
        setWeightRows([]);
      }

      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.shipmentTypeId;
        return newErrors;
      });
    },
    [shipmentTypes]
  );

  const handleContainerCountChange = useCallback(
    (field, value) => {
      const numValue = Number.parseInt(value, 10) || 0;
      setFormData((prev) => ({
        ...prev,
        [field]: numValue,
      }));

      if (formData.rateWeight === "Container") {
        const newCounts = {
          num_six_meters: field === "num_six_meters" ? numValue : formData.num_six_meters,
          num_twelve_meters: field === "num_twelve_meters" ? numValue : formData.num_twelve_meters,
          num_abnormal: field === "num_abnormal" ? numValue : formData.num_abnormal,
          num_breakbulk: field === "num_breakbulk" ? numValue : formData.num_breakbulk,
        };
        initializeContainers(containersRef.current, newCounts);
      }
    },
    [
      formData.rateWeight,
      formData.num_six_meters,
      formData.num_twelve_meters,
      formData.num_abnormal,
      formData.num_breakbulk,
      initializeContainers,
    ]
  );

  const openCalendar = useCallback((ref) => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  return {
    handleClientChange,
    handleRateChange,
    handleShipmentTypeChange,
    handleContainerCountChange,
    openCalendar,
  };
}
