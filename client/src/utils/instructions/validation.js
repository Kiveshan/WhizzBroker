/**
 * Pure validation utilities for instruction forms.
 * No React state, no side-effects.
 *
 * Both forms call validateForm and apply state at the call site:
 *   const { isValid, fieldErrors, containerErrors } = validateForm(formData, containers, flags);
 *   if (!isValid) { setFieldErrors(fieldErrors); ... }
 */

/**
 * Single-field validity check used for real-time inline validation.
 *
 * @param {string}  fieldName
 * @param {*}       value
 * @param {object}  flags
 * @param {boolean} [flags.isCrossHaul=false]
 * @param {boolean} [flags.isWeightBased=false]
 * @param {boolean} [flags.isSetRate=false]
 * @returns {boolean}
 */
export function isFieldValid(fieldName, value, {
  isCrossHaul = false,
  isWeightBased = false,
  isSetRate = false,
} = {}) {
  switch (fieldName) {
    case "clientId":
    case "shipmentTypeId":
    case "task":
    case "pickup":
    case "dropoff":
    case "pickupTime":
    case "pickupDate":
    case "deadline":
    case "bookingRef":
    case "fileRef":
    case "description":
      return !!(value && value.trim() !== "");
    case "stackDate":
      return isCrossHaul || !!(value && value.trim() !== "");
    case "vesselName":
      return isCrossHaul || !!(value && value.trim() !== "");
    case "weight":
    case "unitrate":
      if (fieldName === "unitrate" && isCrossHaul && isSetRate) return true;
      return !isWeightBased || !!(value && value.trim() !== "");
    default:
      return true;
  }
}

/**
 * Full form validation. Returns a unified shape so both forms can apply the
 * result at their own call sites without the function touching React state.
 *
 * @param {object} formData
 * @param {Array}  containers
 * @param {object} flags
 * @param {"create"|"update"} [flags.mode="create"]
 * @param {boolean} [flags.isAddOn=false]
 * @param {boolean} [flags.isCrossHaul=false]
 * @param {boolean} [flags.isWeightBased=false]
 * @param {boolean} [flags.isSetRate=false]
 * @param {boolean} [flags.isSetRateMode=false]
 * @param {boolean} [flags.isImport=false]
 * @returns {{ isValid: boolean, fieldErrors: object, containerErrors: object }}
 */
export function validateForm(formData, containers = [], flags = {}) {
  const {
    mode = "create",
    isAddOn = false,
    isCrossHaul = false,
    isWeightBased = false,
    isSetRate = false,
    isSetRateMode = false,
    isImport = false,
  } = flags;

  const fieldErrors = {};
  const containerErrors = {};
  let isValid = true;

  const fail = (key, msg) => { fieldErrors[key] = msg; isValid = false; };

  // ── Common required fields ────────────────────────────────────────────────
  if (!formData.clientId) fail("clientId", "Client is required");
  if (!formData.shipmentTypeId) fail("shipmentTypeId", "Shipment type is required");
  if (!formData.pickup) fail("pickup", "Pickup location is required");
  if (!formData.dropoff) fail("dropoff", "Dropoff location is required");

  // ── Create-form rules ─────────────────────────────────────────────────────
  if (mode === "create") {
    if (!isAddOn) {
      if (!formData.task) fail("task", "KSM File Reference is required");
      if (!formData.lastFreeDate) fail("lastFreeDate", "Last Free Date is required");
      if (!formData.bookingRef) fail("bookingRef", "Booking reference is required");
      if (!formData.fileRef) fail("fileRef", "Client File Reference is required");
      if (!formData.description) fail("description", "Description is required");
    }

    if (!isCrossHaul && !isAddOn) {
      if (!formData.vesselName) fail("vesselName", "Vessel name is required");
      if (!formData.stackDate) fail("stackDate", "Stack date is required");
    }

    if (isWeightBased) {
      if (String(formData.shipmentTypeId) !== "4" && (!formData.weight || formData.weight === "")) {
        fail("weight", "Weight is required for weight-based calculations");
      }
      const isCrossHaulSetRate = String(formData.shipmentTypeId) === "4" && isSetRate;
      if (!isCrossHaulSetRate && (!formData.unitrate || formData.unitrate === "")) {
        fail("unitrate", "Unit rate is required for weight-based calculations");
      }
    } else if (isSetRateMode) {
      if (!formData.setRateAmount || formData.setRateAmount === "") {
        fail("setRateAmount", "Set rate amount is required when unit type is Set Rate");
      }
    } else if (!isAddOn) {
      const totalContainers =
        (formData.num_six_meters || 0) +
        (formData.num_twelve_meters || 0) +
        (formData.num_abnormal || 0) +
        (isCrossHaul && formData.rateWeight === "Container" ? (formData.num_breakbulk || 0) : 0);
      if (totalContainers === 0) {
        fail("containerCount", "At least one container is required");
      }
      if (isCrossHaul && (formData.num_breakbulk || 0) > 0 && formData.rateWeight === "Container") {
        if (!formData.rateper_breakbulk || formData.rateper_breakbulk === "") {
          fail(
            "rateper_breakbulk",
            "Break bulk rate is required when break bulk count > 0 and unit type is Container"
          );
        }
      }
    }

  // ── Update-form rules ─────────────────────────────────────────────────────
  } else if (mode === "update") {
    if (!isAddOn) {
      if (!formData.ksmFileRef) fail("ksmFileRef", "KSM File Reference is required");
      if (!formData.clientFileRef) fail("clientFileRef", "Client File Reference is required");
      if (!formData.bookingRef) fail("bookingRef", "Booking Reference is required");
      if (!formData.description) fail("description", "Description is required");
    }

    if (!isAddOn && (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2")) {
      if (!formData.vesselName) fail("vesselName", "Vessel Name is required");
      const stackLabel = formData.shipmentTypeId === "1" ? "ETA Date" : "Stack Date";
      if (!formData.stackDate) fail("stackDate", `${stackLabel} is required`);
    }

    if (formData.rateWeight === "ton" || formData.rateWeight === "kg") {
      if (String(formData.shipmentTypeId) !== "4") {
        if (!formData.weight) fail("weight", `Weight (${formData.rateWeight}) is required`);
      }
      if (!isSetRate && !formData.unitRate) {
        fail("unitRate", `Rate per ${formData.rateWeight} is required`);
      }
    }

    // Container validation
    if (!isAddOn) {
      containers.forEach((container) => {
        if (String(formData.shipmentTypeId) !== "2" && !container.containerNum) {
          containerErrors[`container-${container.id}`] = "Container number is required";
          isValid = false;
        }
        if (
          isImport &&
          container.weight &&
          container.weight !== "" &&
          !/^[0-9]*\.?[0-9]*$/.test(container.weight)
        ) {
          containerErrors[`weight-${container.id}`] = "Weight must be a valid number";
          isValid = false;
        }
      });

      // Uniqueness check — component must also call setErrorModal when this fires
      const nums = containers
        .map((c) => c.containerNum)
        .filter((n) => n && n.trim() !== "");
      if (nums.length !== new Set(nums).size) {
        fieldErrors.containerUniqueness =
          "Container numbers must be unique within the same instruction.";
        isValid = false;
      }
    }
  }

  return { isValid, fieldErrors, containerErrors };
}
