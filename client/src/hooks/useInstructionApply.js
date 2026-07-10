import { useCallback } from "react";
import { formatDateForInput } from "../utils/instructions/dateFormatting.js";
import { calculateTotalCostFromRates } from "../utils/instructions/costCalculation.js";
import { mapContainersFromDb } from "../utils/instructions/payloadBuilders.js";

/**
 * Provides applyInstructionData — applies a fetched instruction record to
 * all relevant form/container/weight state setters.
 * Extracted from FCcontrollerinstructions to keep that file lean.
 */
export function useInstructionApply({
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
}) {
  const applyInstructionData = useCallback(
    (data) => {
      if (!data) return;

      try {
        const isSetRateFlag =
          data.is_set_rate === true ||
          data.is_set_rate === "true" ||
          data.is_set_rate === 1;

        const newFormData = {
          clientId: data.client ? data.client.toString() : "",
          representative: data.representative || "",
          contactDetails: data.cellnum || "",
          email: data.email || "",
          shipmentTypeId: data.shipment_type
            ? data.shipment_type.toString()
            : "",
          shipmentTypeName: data.shipmenttype || "",
          ksmFileRef: data.ksmFileRef || "",
          pickup: data.pickup || "",
          dropoff: data.dropoff || "",
          stackDate: formatDateForInput(data.stackdate) || "",
          lastFreeDate: data.lastFreeDate
            ? formatDateForInput(data.lastFreeDate)
            : "",
          clientFileRef: data.clientFileRef || "",
          bookingRef: data.booking_ref || "",
          rateWeight: data.rateweight || "Container",
          weight: data.weight || "",
          setRateAmount: isSetRateFlag
            ? data.total_cost != null
              ? data.total_cost.toString()
              : ""
            : "",
          num_six_meters: data.num_six_meters || 0,
          num_twelve_meters: data.num_twelve_meters || 0,
          num_abnormal: data.num_abnormal || 0,
          num_breakbulk: data.num_breakbulk || 0,
          vat: data.vat === 0 ? 0 : data.vat || 15,
          description: data.description || "",
          vesselName: data.vessel_name || "",
          unitRate: data.unitrate || 0,
          total_cost: calculateTotalCostFromRates(
            data.rateper_6 || 0,
            data.rateper_12 || 0,
            data.rateper_abnormal || 0,
            data.num_six_meters || 0,
            data.num_twelve_meters || 0,
            data.num_abnormal || 0
          ),
          rateper_6: data.rateper_6 || 0,
          rateper_12: data.rateper_12 || 0,
          rateper_abnormal: data.rateper_abnormal || 0,
          rateper_breakbulk: data.rateper_breakbulk || 0,
          status: data.status || "",
          createdAt: formatDateForInput(data.created_at) || "",
          addon_id: data.addon_id != null ? data.addon_id.toString() : "",
          addon_invoice_number: data.addon_invoice_number || "",
        };

        setFormData(newFormData);

        setIsSetRate(isSetRateFlag);

        if (data.is_set_rate && data.historical_set_rate) {
          setHistoricalSetRate(Number(data.historical_set_rate));
        } else {
          setHistoricalSetRate(null);
        }

        if (
          String(data.shipment_type) === "4" &&
          Array.isArray(data.weight_rows)
        ) {
          const mappedRows = data.weight_rows.map((row, index) => ({
            id: row.weight_pk || index + 1,
            ksmDmNo: row.ksm_dm_no || "",
            ticketNo: row.ticket_no || "",
            receiptBookNo: row.receipt_book_no || "",
            weight:
              row.weight === null || row.weight === undefined
                ? ""
                : String(row.weight),
          }));
          setWeightRows(
            mappedRows.length > 0
              ? mappedRows
              : [
                  {
                    id: 1,
                    ksmDmNo: "",
                    ticketNo: "",
                    receiptBookNo: "",
                    weight: "",
                  },
                ]
          );
        } else {
          setWeightRows([]);
        }

        const isImportType =
          data.shipmenttype &&
          data.shipmenttype.toLowerCase() === "import";
        setIsImport(isImportType);

        setPrevContainerCounts({
          num_six_meters: data.num_six_meters || 0,
          num_twelve_meters: data.num_twelve_meters || 0,
          num_abnormal: data.num_abnormal || 0,
        });

        // Apply individual rates as strings (for controlled inputs)
        setFormData((prev) => ({
          ...prev,
          rateper_6: (data.rateper_6 || 0).toString(),
          rateper_12: (data.rateper_12 || 0).toString(),
          rateper_abnormal: (data.rateper_abnormal || 0).toString(),
        }));

        setWeight("");

        if (data.containers && data.containers.length > 0) {
          const containersList = mapContainersFromDb(data.containers, {
            isImportType,
            shipmentType: data.shipment_type,
          });
          setContainers(containersList);
          setIsContainerDataModified(false);
        } else {
          initializeContainers(containersRef.current, {
            num_six_meters: data.num_six_meters || 0,
            num_twelve_meters: data.num_twelve_meters || 0,
            num_abnormal: data.num_abnormal || 0,
            num_breakbulk: data.num_breakbulk || 0,
          });
        }
      } catch (error) {
        console.error("Error applying instruction data:", error);
        setErrorModal({
          isOpen: true,
          message: "Failed to apply instruction data. Please try again.",
        });
      }
    },
    [
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
    ]
  );

  return { applyInstructionData };
}
