import { formatDateForDB } from "./dateFormatting.js";

/**
 * Builds the update payload for an existing instruction.
 * Pure data transformation — no React state, no side effects.
 *
 * @param {object} formData
 * @param {Array}  weightRows
 * @param {Array}  currentContainers  – containersRef.current (already fetched fresh)
 * @param {object} opts
 * @param {boolean} opts.isSetRateMode
 * @param {boolean} opts.isAddOn
 * @param {boolean} opts.allowVgmUI
 * @param {boolean} opts.isSetRate
 * @param {number}  opts.setRateValue
 * @param {number}  opts.totalCost     – pre-computed total (base + surcharges + hazardous + vgm)
 * @returns {{ instructionUpdateData: object, containerData: Array, weightData: Array }}
 */
export function buildUpdatePayload(
  formData,
  weightRows,
  currentContainers,
  { isSetRateMode, isAddOn, allowVgmUI, isSetRate, setRateValue, totalCost }
) {
  const numSix = formData.num_six_meters || 0;
  const numTwelve = formData.num_twelve_meters || 0;
  const numAbnormal = formData.num_abnormal || 0;
  const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0;
  const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0;
  const ratePerAbnormal = numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0;

  const isWeightUnit =
    formData.rateWeight === "kg" || formData.rateWeight === "ton";

  const instructionUpdateData = {
    client: formData.clientId,
    ksmFileRef: formData.ksmFileRef,
    shipment_type: formData.shipmentTypeId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    stackdate: formatDateForDB(formData.stackDate),
    lastFreeDate: formatDateForDB(formData.lastFreeDate),
    clientFileRef: formData.clientFileRef,
    rateweight: formData.rateWeight,
    description: formData.description,
    status: formData.status,
    vat: formData.vat === 0 ? 0 : formData.vat || 15,
    num_six_meters: isWeightUnit || isSetRateMode ? 0 : numSix,
    num_twelve_meters: isWeightUnit || isSetRateMode ? 0 : numTwelve,
    num_abnormal: isWeightUnit || isSetRateMode ? 0 : numAbnormal,
    num_breakbulk: 0,
    weight:
      formData.rateWeight !== "Container" &&
      String(formData.shipmentTypeId) !== "4"
        ? formData.weight
          ? Number(formData.weight)
          : null
        : null,
    total_cost: isAddOn ? 0 : totalCost,
    booking_ref: formData.bookingRef,
    vessel_name: formData.vesselName,
    rateper_6: isAddOn ? 0 : isWeightUnit ? 0 : ratePer6,
    rateper_12: isAddOn ? 0 : isWeightUnit ? 0 : ratePer12,
    rateper_abnormal: isAddOn ? 0 : isWeightUnit ? 0 : ratePerAbnormal,
    rateper_breakbulk: 0,
    unitrate: isAddOn
      ? 0
      : formData.rateWeight !== "Container"
        ? formData.unitRate
          ? Number(formData.unitRate)
          : null
        : null,
    is_set_rate: isSetRate,
    historical_set_rate: isSetRate ? setRateValue : null,
    created_at: formData.createdAt || null,
    addon_id: isAddOn
      ? formData.addon_id
        ? Number(formData.addon_id)
        : null
      : null,
  };

  const containerData = isWeightUnit
    ? []
    : currentContainers.map((container) => {
        let sanitizedWeight = null;
        if (
          container.weight !== null &&
          container.weight !== undefined &&
          container.weight !== ""
        ) {
          if (typeof container.weight === "string") {
            const trimmed = container.weight.trim();
            if (trimmed !== "") {
              const parsed = Number.parseFloat(trimmed);
              if (!isNaN(parsed) && parsed >= 0) sanitizedWeight = parsed;
            }
          } else if (
            typeof container.weight === "number" &&
            container.weight >= 0
          ) {
            sanitizedWeight = container.weight;
          }
        }

        return {
          containerKey: container.containerKey,
          containernum: container.containerNum || "",
          file_ref: container.fileRef || "",
          weight: sanitizedWeight,
          container_type: container.containerType || "",
          cargo_description: container.cargoDescription || "",
          Hazardous: Boolean(container.hazardous),
          "Hazardous Amount": Number(container.hazardousAmount || 0),
          "Add Surcharges": Boolean(container.addSurcharges),
          "Surcharge Amount": Number(container.surchargeAmount || 0),
          is_12m_surcharge: Boolean(container.is_12m_surcharge),
          surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
          vgm: allowVgmUI ? Boolean(container.vgm) : false,
          "vgm amount": allowVgmUI ? Number(container.vgmAmount || 0) : 0,
        };
      });

  let weightData = [];
  if (String(formData.shipmentTypeId) === "4") {
    weightData = weightRows.map((row) => {
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

  return { instructionUpdateData, containerData, weightData };
}

/**
 * Maps raw container rows from the database into the component's container shape.
 *
 * @param {Array}  dbContainers
 * @param {object} opts
 * @param {boolean} opts.isImportType
 * @param {string|number} opts.shipmentType
 * @returns {Array}
 */
export function mapContainersFromDb(dbContainers, { isImportType, shipmentType }) {
  const shouldLoadWeight =
    isImportType ||
    String(shipmentType) === "2" ||
    String(shipmentType) === "3";

  return dbContainers.map((container, index) => {
    let weightValue;
    if (shouldLoadWeight) {
      if (container.weight !== null && container.weight !== undefined) {
        if (
          typeof container.weight === "string" &&
          container.weight.trim() !== ""
        ) {
          const parsed = parseFloat(container.weight);
          weightValue = isNaN(parsed) ? "" : parsed;
        } else {
          weightValue = container.weight;
        }
      } else {
        weightValue = "";
      }
    } else {
      weightValue = null;
    }

    let hazardousValue = false;
    if (container["Hazardous"] !== undefined) {
      hazardousValue =
        container["Hazardous"] === true || container["Hazardous"] === "true";
    }

    let addSurchargesValue = false;
    if (container["Add Surcharges"] !== undefined) {
      addSurchargesValue =
        container["Add Surcharges"] === true ||
        container["Add Surcharges"] === "true";
    }

    let vgmValue = false;
    if (container.vgm !== undefined) {
      vgmValue = container.vgm === true || container.vgm === "true";
    }

    return {
      id: container.containerkey || index + 1,
      containerKey: container.containerkey,
      containerNum: container.containernum || "",
      fileRef: container.file_ref || "",
      weight: weightValue,
      containerType: container.container_type || "6m",
      cargoDescription: container.cargo_description || "",
      hazardous: hazardousValue,
      addSurcharges: addSurchargesValue,
      surchargeAmount: Number(container["Surcharge Amount"] || 0),
      is_12m_surcharge: Boolean(container.is_12m_surcharge),
      surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
      hazardousAmount: Number(container["Hazardous Amount"] || 0),
      vgm: vgmValue,
      vgmAmount: Number(container["vgm amount"] || 0),
    };
  });
}

/**
 * Builds the create payload for a new instruction.
 * Pure data transformation — no React state, no side effects.
 *
 * @param {object} formData
 * @param {Array}  currentContainers  – containersRef.current
 * @param {Array}  currentWeightRows  – weightRowsRef.current
 * @param {number} totalCost          – pre-computed total cost (without VAT)
 * @param {number} currentSetRateValue – freshly fetched set rate value
 * @param {object} opts
 * @param {boolean} opts.isWeightBased
 * @param {boolean} opts.isCrossHaul
 * @param {boolean} opts.isImport
 * @param {boolean} opts.isExport
 * @param {boolean} opts.isSetRate
 * @param {boolean} opts.isSetRateMode
 * @param {boolean} opts.isAddOn
 * @param {boolean} opts.allowVgmUI
 * @returns {{ instructionData: object, containerData: Array, weightData: Array }}
 */
export function buildCreatePayload(
  formData,
  currentContainers,
  currentWeightRows,
  totalCost,
  currentSetRateValue,
  { isWeightBased, isCrossHaul, isImport, isExport, isSetRate, isSetRateMode, isAddOn, allowVgmUI }
) {
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
  };

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

  return { instructionData, containerData, weightData };
}
