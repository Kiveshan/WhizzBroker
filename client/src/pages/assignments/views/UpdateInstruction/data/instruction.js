import { authFetch } from "../../../../../utils/authFetch.js";

export const checkIfWeightBased = async ({
  api,
  instructionId,
  setRateWeight,
  setIsWeightBased,
  setWeightUnit,
}) => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/instructions/${instructionId}/details`);
    const rateWeightValue = response.data.rateweight;

    console.log('Rate weight value:', rateWeightValue);
    setRateWeight(rateWeightValue);

    const isWeight = rateWeightValue && rateWeightValue.toLowerCase() !== 'container';
    setIsWeightBased(isWeight);

    if (isWeight) {
      const unit = rateWeightValue.toLowerCase().includes('ton') ? 'ton' : 'kg';
      setWeightUnit(unit);
      console.log(`Weight-based instruction detected. Unit: ${unit}`);
    }
  } catch (error) {
    console.error('Error checking rate weight:', error);
  }
};

// Pulls the KSM DN Numbers (ksm_dm_no) from the instruction's weight table rows.
// Used to populate the per-driver DN dropdown for cross-haul break bulk (shipment type 4).
export const fetchDnOptions = async ({ api, instructionId, setDnOptions }) => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/api/instructions/instruction/${instructionId}`);
    const weightRows = response.data?.weight_rows;

    if (!Array.isArray(weightRows)) {
      setDnOptions([]);
      return;
    }

    const dnNumbers = [
      ...new Set(
        weightRows
          .map((row) => (row.ksm_dm_no != null ? row.ksm_dm_no.toString().trim() : ""))
          .filter((dn) => dn !== "")
      ),
    ];

    console.log("DN options from weight rows:", dnNumbers);
    setDnOptions(dnNumbers);
  } catch (error) {
    console.error("Error fetching DN options:", error);
    setDnOptions([]);
  }
};

export const fetchShipmentType = async ({ API_BASE_URL, instructionId, setShipmentType }) => {
  if (instructionId) {
    try {
      const response = await authFetch(
        `${API_BASE_URL}/instructions/${instructionId}/shipment-type`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch shipment type");
      }
      const data = await response.json();
      setShipmentType(data.shipment_type);
      console.log("Shipment type:", data.shipment_type);
    } catch (error) {
      console.error("Error fetching shipment type:", error);
    }
  }
};
