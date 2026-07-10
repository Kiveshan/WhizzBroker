/**
 * UnitPerSection — "Unit per" dropdown, weight-based rate + weight inputs,
 * and Break Bulk Set Rate checkbox (shipment type 4 only).
 *
 * Count/rate inputs are disabled when `isReadOnly`. The dropdown is also
 * disabled when `isAddOn`. Weight-based inputs are only shown when
 * `rateWeight` is "kg", "m³", or "ton".
 *
 * @param {object}      props
 * @param {object}      props.formData          rateWeight, shipmentTypeId, unitRate, weight
 * @param {object}      props.fieldErrors        unitRate, weight, quantity
 * @param {object}      props.fieldRefs          rateWeight, unitRate, weight
 * @param {boolean}     props.isSetRate
 * @param {boolean}     props.isReadOnly
 * @param {boolean}     props.isAddOn
 * @param {number|null} props.historicalSetRate
 * @param {number}      props.setRateValue
 * @param {object}      [props.readOnlyStyle]
 * @param {function}    props.onInputChange      Handles rateWeight, unitRate, weight fields
 * @param {function}    props.onSetRateChange    Called with (boolean) when Set Rate checkbox changes
 */
import { ErrorTooltip } from "./ErrorTooltip";

export function UnitPerSection({
  formData,
  fieldErrors,
  fieldRefs,
  isSetRate,
  isReadOnly,
  isAddOn,
  historicalSetRate,
  setRateValue,
  readOnlyStyle = {},
  onInputChange,
  onSetRateChange,
}) {
  const isWeightBased =
    formData.rateWeight === "kg" ||
    formData.rateWeight === "m³" ||
    formData.rateWeight === "ton";

  return (
    <div className="controller-instructions-form-field">
      <label>Unit per</label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          width: "100%",
        }}
      >
        {/* Unit per dropdown */}
        <div
          className="controller-instructions-select-wrapper"
          style={{ minWidth: "100px", marginTop: 0 }}
        >
          <select
            className="controller-instructions-dropdown"
            name="rateWeight"
            value={formData.rateWeight || "Container"}
            onChange={onInputChange}
            style={{
              width: "100%",
              padding: "4px 8px",
              ...(isReadOnly ? readOnlyStyle : {}),
            }}
            ref={fieldRefs?.rateWeight}
            disabled={isReadOnly || isAddOn}
          >
            {/* kg and ton only for Cross-haul (break bulk) - type 4 */}
            {formData.shipmentTypeId === "4" && (
              <>
                <option value="kg">kg</option>
                <option value="ton">ton</option>
              </>
            )}
            {/* Container for Import, Export, Cross-haul, Add-on - types 1, 2, 3, 5 */}
            {(formData.shipmentTypeId === "1" ||
              formData.shipmentTypeId === "2" ||
              formData.shipmentTypeId === "3" ||
              String(formData.shipmentTypeId) === "5") && (
              <option value="Container">Container</option>
            )}
          </select>
        </div>

        {/* Rate per unit + weight inputs (weight-based only) */}
        {isWeightBased && (
          <div
            style={{
              display: "flex",
              gap: "15px",
              width: "100%",
              alignItems: "center",
            }}
          >
            {/* Unit Rate Field */}
            <div
              className="controller-instructions-form-field"
              style={{
                flex: 1,
                minWidth: "150px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              <span
                style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}
              >
                {`Rate per ${formData.rateWeight}`}
              </span>
              <div
                className="controller-instructions-input-wrapper"
                ref={fieldRefs?.unitRate}
                style={{ width: "100%" }}
              >
                <input
                  type="text"
                  className={`controller-instructions-form-input ${
                    fieldErrors.unitRate ? "controller-instructions-error-field" : ""
                  }`}
                  name="unitRate"
                  value={formData.unitRate || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                      onInputChange(e);
                    }
                  }}
                  disabled={isReadOnly}
                  style={isReadOnly ? readOnlyStyle : {}}
                />
                <ErrorTooltip message={fieldErrors.unitRate} />
              </div>
            </div>

            {/* Weight Field — not shown for type 4 (break bulk uses weight rows table) */}
            {String(formData.shipmentTypeId) !== "4" && (
              <div
                className="controller-instructions-form-field"
                style={{ flex: 1, minWidth: "150px" }}
              >
                <label>{`Weight (${formData.rateWeight})`}</label>
                <div
                  className="controller-instructions-input-wrapper"
                  ref={fieldRefs?.weight}
                  style={{ width: "100%" }}
                >
                  <input
                    type="text"
                    className={`controller-instructions-form-input ${
                      fieldErrors.weight ? "controller-instructions-error-field" : ""
                    }`}
                    name="weight"
                    value={formData.weight || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                        onInputChange(e);
                      }
                    }}
                    disabled={isReadOnly}
                    style={isReadOnly ? readOnlyStyle : {}}
                  />
                  <ErrorTooltip message={fieldErrors.quantity} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Break Bulk Set Rate — type 4 only */}
      {formData.shipmentTypeId === "4" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}
        >
          <label
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
          >
            <input
              type="checkbox"
              checked={isSetRate}
              onChange={(e) => onSetRateChange(e.target.checked)}
              disabled={isReadOnly}
            />
            Break Bulk Set Rate
          </label>
          {isSetRate && (
            <div
              className="controller-instructions-input-wrapper"
              style={{ width: "140px" }}
            >
              <input
                type="text"
                className="controller-instructions-form-input"
                value={
                  isReadOnly && historicalSetRate !== null
                    ? String(historicalSetRate)
                    : Number.isFinite(Number(setRateValue))
                      ? String(setRateValue)
                      : ""
                }
                readOnly
                disabled
                style={{ ...readOnlyStyle, width: "100%" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
