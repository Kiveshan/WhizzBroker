import { useState, useCallback } from "react";
import {
  fetchSetRate as fetchSetRateService,
  saveInstruction as saveInstructionService,
} from "../services/instructionService.js";
import { calcContainerBasedCost, calcBreakBulkCost } from "../utils/instructions/costCalculation.js";

/**
 * Manages the submit flow for the create instruction form.
 * Extracted from ControllerInstructions to keep that file lean.
 */
export function useCreateInstructionSubmit({
  formData,
  containers,
  isWeightBased,
  isCrossHaul,
  isImport,
  isExport,
  isSetRate,
  isSetRateMode,
  isAddOn,
  allowVgmUI,
  setRateValue,
  containersRef,
  weightRowsRef,
  navigate,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submitInstruction = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Fetch set rate on-the-fly if Set Rate checkbox is checked (prevents race condition)
      let currentSetRateValue = setRateValue;
      if (isSetRate && formData.clientId && formData.pickup && formData.dropoff) {
        try {
          const data = await fetchSetRateService(formData.clientId, formData.pickup, formData.dropoff);
          if (data && data.set_rate != null) {
            currentSetRateValue = Number(data.set_rate);
          } else {
            currentSetRateValue = 0;
          }
        } catch (err) {
          console.error("[SET RATE] Error fetching:", err);
          currentSetRateValue = 0;
        }
      }

      const calculatedSetRateValue = Number.isFinite(Number(currentSetRateValue))
        ? Number(currentSetRateValue)
        : 0;

      const currentWeightRows = weightRowsRef.current || [];
      let totalCost = 0;

      if ((isSetRateMode || isSetRate) && !isAddOn) {
        totalCost = calcBreakBulkCost(currentWeightRows, 0, {
          isSetRateMode: true,
          setRateAmount: calculatedSetRateValue,
        });
      } else if (isWeightBased && !isAddOn) {
        if (formData.shipmentTypeId === "4") {
          totalCost = calcBreakBulkCost(currentWeightRows, formData.unitrate || 0);
        } else {
          const baseWeight = Number.parseFloat(formData.weight || 0);
          const unitRate = Number.parseFloat(formData.unitrate || 0);
          totalCost = baseWeight * unitRate;
        }
      } else {
        totalCost = calcContainerBasedCost(formData, containersRef.current || [], { isCrossHaul });
      }

      if (formData.shipmentTypeId === "5") {
        totalCost = 0;
      }

      // Recalculate with set rate after cost sections (matches original double-pass logic)
      if ((isSetRateMode || isSetRate) && !isAddOn) {
        const weightRowCount = currentWeightRows.length || 1;
        totalCost = calculatedSetRateValue * weightRowCount;
      }

      const isAddOnType = formData.shipmentTypeId === "5";
      const isWeightUnit =
        formData.rateWeight === "kg" || formData.rateWeight === "ton";

      const { hazardous, surcharges, ...formDataWithoutContainerFields } = formData;

      const instructionData = {
        ...formDataWithoutContainerFields,
        total_cost: isAddOnType ? 0 : totalCost,
        is_set_rate: isSetRate,
        historical_set_rate: isSetRate ? currentSetRateValue : null,
        vessel_name: isCrossHaul ? null : formData.vesselName,
        stackdate: isCrossHaul ? null : formData.stackDate,
        rateper_6: isAddOnType
          ? 0
          : isWeightUnit
            ? 0
            : isWeightBased
              ? null
              : formData.num_six_meters === 0
                ? 0
                : formData.sixMeterRate === ""
                  ? null
                  : Number.parseFloat(formData.sixMeterRate || 0),
        rateper_12: isAddOnType
          ? 0
          : isWeightUnit
            ? 0
            : isWeightBased
              ? null
              : formData.num_twelve_meters === 0
                ? 0
                : formData.twelveMeterRate === ""
                  ? null
                  : Number.parseFloat(formData.twelveMeterRate || 0),
        rateper_abnormal: isAddOnType
          ? 0
          : isWeightUnit
            ? 0
            : isWeightBased
              ? null
              : formData.num_abnormal === 0
                ? 0
                : formData.abnormalRate === ""
                  ? null
                  : Number.parseFloat(formData.abnormalRate || 0),
        num_six_meters:
          isWeightUnit || isSetRate ? 0 : formData.num_six_meters || 0,
        num_twelve_meters:
          isWeightUnit || isSetRate ? 0 : formData.num_twelve_meters || 0,
        num_abnormal:
          isWeightUnit || isSetRate ? 0 : formData.num_abnormal || 0,
        rateper_breakbulk: isAddOnType ? 0 : null,
        num_breakbulk: 0,
        weight:
          isWeightBased && formData.shipmentTypeId !== "4"
            ? formData.weight === ""
              ? null
              : Number.parseFloat(formData.weight || 0)
            : null,
        unitrate: isAddOnType
          ? 0
          : isWeightBased
            ? formData.unitrate === ""
              ? null
              : Number.parseFloat(formData.unitrate || 0)
            : null,
        client: formData.clientId,
        shipment_type: formData.shipmentTypeId,
        pickuptime: formData.pickupTime,
        pickupdate: formData.pickupDate,
        deadline: formData.deadline,
        fileref: formData.fileRef,
        booking_ref: formData.bookingRef,
        rateweight: formData.rateWeight,
        status: "New",
        vat: formData.vat,
        addon_id: isAddOn
          ? formData.addon_id
            ? Number(formData.addon_id)
            : null
          : null,
      };

      const currentContainers = containersRef.current || [];

      const containerData =
        !isWeightBased &&
        formData.rateWeight === "Container" &&
        !isWeightUnit
          ? currentContainers.map((container) => ({
              container_type: container.containerType,
              containerNum: container.containerNum || "",
              file_ref: container.fileRef || "",
              weight:
                isImport || isExport || isCrossHaul
                  ? container.weight === ""
                    ? null
                    : Number.parseFloat(container.weight || 0)
                  : null,
              cargo_description: container.cargoDescription || "",
              Hazardous: container.hazardous || false,
              "Add Surcharges": container.addSurcharges || false,
              is_12m_surcharge: Boolean(container.is_12m_surcharge),
              surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
              vgm: allowVgmUI ? container.vgm || false : false,
            }))
          : [];

      let weightData = [];
      if (formData.shipmentTypeId === "4") {
        weightData = currentWeightRows.map((row) => {
          let numericWeight = null;
          if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
            const parsed = Number.parseFloat(row.weight);
            numericWeight = Number.isNaN(parsed) ? null : parsed;
          }
          return {
            ksm_dm_no: row.ksmDmNo || row.ksm_dm_no || null,
            ticket_no: row.ticketNo || row.ticket_no || null,
            receipt_book_no: row.receiptBookNo || row.receipt_book_no || null,
            weight: numericWeight,
          };
        });
      }

      const saveData = await saveInstructionService(instructionData, containerData, weightData);

      if (saveData.success) {
        navigate("/ControllerDashboard");
      } else {
        throw new Error(saveData.message || "Failed to save instruction");
      }
    } catch (error) {
      console.error("Error submitting instruction:", error);
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "An error occurred while saving the instruction"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    isWeightBased,
    isCrossHaul,
    isImport,
    isExport,
    isSetRate,
    isSetRateMode,
    isAddOn,
    allowVgmUI,
    setRateValue,
    containersRef,
    weightRowsRef,
    navigate,
  ]);

  return { submitInstruction, isSubmitting, submitError, setSubmitError };
}
