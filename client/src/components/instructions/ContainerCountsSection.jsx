/**
 * ContainerCountsSection — 6m / 12m / Abnormal container count + rate inputs.
 *
 * Count inputs are disabled when `rateWeight !== "Container"`, `isSetRateMode`,
 * or `isReadOnly`. Rate inputs are disabled when `rateWeight !== "Container"` or
 * `isReadOnly`.
 *
 * @param {object}   props
 * @param {object}   props.formData
 * @param {object}   props.fieldErrors
 * @param {object}   props.fieldRefs        Refs for rateper_6, rateper_12, rateper_abnormal
 * @param {boolean}  props.isSetRateMode
 * @param {boolean}  props.isReadOnly
 * @param {object}   [props.readOnlyStyle]
 * @param {function} props.onCountChange    Handler for count (number) inputs
 * @param {function} props.onRateChange     Handler for rate (text) inputs
 */
import { ErrorTooltip } from "./ErrorTooltip";

export function ContainerCountsSection({
  formData,
  fieldErrors,
  fieldRefs,
  isSetRateMode,
  isReadOnly,
  readOnlyStyle = {},
  onCountChange,
  onRateChange,
}) {
  const countDisabled =
    formData.rateWeight !== "Container" || isReadOnly || isSetRateMode;
  const rateDisabled = formData.rateWeight !== "Container" || isReadOnly;

  return (
    <div className="controller-instructions-container-group">
      <div className="controller-instructions-container-label">
        <span className="controller-instructions-trailer-size-label">
          Trailer Size
        </span>
        <label>No. of Containers</label>
        {fieldErrors.containers && (
          <div className="controller-instructions-container-error-message">
            {fieldErrors.containers}
          </div>
        )}
      </div>
      <div className="controller-instructions-container-inputs">
        {/* 6m */}
        <div className="controller-instructions-container-input">
          <label>6m</label>
          <div className="controller-instructions-container-rate-group">
            <input
              type="number"
              className={
                fieldErrors.containers
                  ? "controller-instructions-error-field"
                  : ""
              }
              value={formData.num_six_meters}
              min="0"
              name="num_six_meters"
              onChange={onCountChange}
              disabled={countDisabled}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <div
              className="controller-instructions-input-wrapper controller-instructions-rate-input"
              ref={fieldRefs?.rateper_6}
            >
              <input
                type="text"
                className={`controller-instructions-form-input ${
                  fieldErrors.rateper_6
                    ? "controller-instructions-error-field"
                    : ""
                }`}
                placeholder="Rate"
                value={formData.rateper_6 || ""}
                name="rateper_6"
                onChange={onRateChange}
                disabled={rateDisabled}
                style={isReadOnly ? readOnlyStyle : {}}
              />
              <ErrorTooltip message={fieldErrors.rateper_6} />
            </div>
          </div>
        </div>
        {/* 12m */}
        <div className="controller-instructions-container-input">
          <label>12m</label>
          <div className="controller-instructions-container-rate-group">
            <input
              type="number"
              className={
                fieldErrors.containers
                  ? "controller-instructions-error-field"
                  : ""
              }
              value={formData.num_twelve_meters}
              min="0"
              name="num_twelve_meters"
              onChange={onCountChange}
              disabled={countDisabled}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <div
              className="controller-instructions-input-wrapper controller-instructions-rate-input"
              ref={fieldRefs?.rateper_12}
            >
              <input
                type="text"
                className={`controller-instructions-form-input ${
                  fieldErrors.rateper_12
                    ? "controller-instructions-error-field"
                    : ""
                }`}
                placeholder="Rate"
                value={formData.rateper_12 || ""}
                name="rateper_12"
                onChange={onRateChange}
                disabled={rateDisabled}
                style={isReadOnly ? readOnlyStyle : {}}
              />
              <ErrorTooltip message={fieldErrors.rateper_12} />
            </div>
          </div>
        </div>
        {/* Abnormal */}
        <div className="controller-instructions-container-input">
          <label>Abnormal</label>
          <div className="controller-instructions-container-rate-group">
            <input
              type="number"
              className={
                fieldErrors.containers
                  ? "controller-instructions-error-field"
                  : ""
              }
              value={formData.num_abnormal}
              min="0"
              name="num_abnormal"
              onChange={onCountChange}
              disabled={countDisabled}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <div
              className="controller-instructions-input-wrapper controller-instructions-rate-input"
              ref={fieldRefs?.rateper_abnormal}
            >
              <input
                type="text"
                className={`controller-instructions-form-input ${
                  fieldErrors.rateper_abnormal
                    ? "controller-instructions-error-field"
                    : ""
                }`}
                placeholder="Rate"
                value={formData.rateper_abnormal || ""}
                name="rateper_abnormal"
                onChange={onRateChange}
                disabled={rateDisabled}
                style={isReadOnly ? readOnlyStyle : {}}
              />
              <ErrorTooltip message={fieldErrors.rateper_abnormal} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
