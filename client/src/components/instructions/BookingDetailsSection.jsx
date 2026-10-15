/**
 * BookingDetailsSection — the second "instruction details" card, mirroring the
 * controller create form's layout:
 *   Row 1: Shipment Type, Booking Ref, Client File Reference, Company File Reference
 *   Row 2: Creation Date, ETA/Stack Date, Last Free Date
 *   Row 3: VAT toggle, Vessel Name
 *   Row 4: Description
 *
 * Stack/ETA Date is only shown for Import (type 1), Export (type 2), and
 * Add-on (type 5). Vessel Name is hidden for Cross-haul/Break-bulk (type 4).
 *
 * @param {object}   props.formData
 * @param {object}   props.fieldErrors
 * @param {object}   props.fieldRefs
 * @param {boolean}  props.isReadOnly
 * @param {boolean}  props.isAddOn
 * @param {string}   props.today
 * @param {object}   [props.readOnlyStyle]
 * @param {object}   props.lastFreeDateRef
 * @param {object}   props.etaDateRef
 * @param {function} props.onInputChange
 * @param {function} props.onVatChange
 * @param {Array}    [props.shipmentTypes]         Enables the Shipment Type select
 * @param {function} [props.onShipmentTypeChange]
 * @param {boolean}  [props.showCreationDate]      Render the Creation Date field
 * @param {React.ReactNode} [props.children]       Extra controls (e.g. UnitPerSection)
 */
import { ErrorTooltip } from "./ErrorTooltip";

export function BookingDetailsSection({
  formData,
  fieldErrors,
  fieldRefs,
  isReadOnly,
  isAddOn,
  today,
  readOnlyStyle = {},
  lastFreeDateRef,
  etaDateRef,
  onInputChange,
  onVatChange,
  shipmentTypes = null,
  onShipmentTypeChange,
  showCreationDate = false,
  children,
}) {
  const showStackDate =
    isAddOn ||
    String(formData.shipmentTypeId) === "1" ||
    String(formData.shipmentTypeId) === "2";

  const showVesselName = String(formData.shipmentTypeId) !== "4";

  const stackDateLabel =
    String(formData.shipmentTypeId) === "1" ? "ETA Date" : "Stack Date";

  const stackDateRequired =
    String(formData.shipmentTypeId) === "1" ||
    String(formData.shipmentTypeId) === "2";

  return (
    <div className="controller-instructions-form-section">
      {/* Row 1: Shipment Type + references */}
      <div className="controller-instructions-form-row">
        {shipmentTypes && (
          <div className="controller-instructions-form-field">
            <label>
              Shipment Type <span className="wb-required">*</span>
            </label>
            <div
              className="controller-instructions-select-wrapper"
              ref={fieldRefs?.shipmentTypeId}
            >
              <select
                className={`dropdown ${
                  fieldErrors.shipmentTypeId
                    ? "controller-instructions-error-field"
                    : ""
                }`}
                name="shipmentTypeId"
                value={formData.shipmentTypeId}
                onChange={onShipmentTypeChange}
                disabled={isReadOnly}
                style={isReadOnly ? readOnlyStyle : {}}
              >
                <option value="" disabled>
                  Select Shipment
                </option>
                {shipmentTypes.map((type) => (
                  <option key={type.shipkey} value={type.shipkey}>
                    {type.shipmenttype}
                  </option>
                ))}
              </select>
              <ErrorTooltip message={fieldErrors.shipmentTypeId} />
            </div>
          </div>
        )}
        <div className="controller-instructions-form-field">
          <label>Booking Ref</label>
          <div
            className="controller-instructions-input-wrapper"
            ref={fieldRefs?.bookingRef}
          >
            <input
              type="text"
              className={`controller-instructions-form-input ${
                fieldErrors.bookingRef ? "controller-instructions-error-field" : ""
              }`}
              placeholder="Enter booking ref"
              name="bookingRef"
              value={formData.bookingRef}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <ErrorTooltip message={fieldErrors.bookingRef} />
          </div>
        </div>
        <div className="controller-instructions-form-field">
          <label>Client File Reference</label>
          <div
            className="controller-instructions-input-wrapper"
            ref={fieldRefs?.clientFileRef}
          >
            <input
              type="text"
              className={`controller-instructions-form-input ${
                fieldErrors.clientFileRef ? "controller-instructions-error-field" : ""
              }`}
              placeholder="Enter client file ref"
              name="clientFileRef"
              value={formData.clientFileRef}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <ErrorTooltip message={fieldErrors.clientFileRef} />
          </div>
        </div>
        <div className="controller-instructions-form-field">
          <label>Company File Reference</label>
          <div
            className="controller-instructions-input-wrapper"
            ref={fieldRefs?.ksmFileRef}
          >
            <input
              type="text"
              className={`controller-instructions-form-input ${
                fieldErrors.ksmFileRef ? "controller-instructions-error-field" : ""
              }`}
              placeholder="Enter company file reference"
              name="ksmFileRef"
              value={formData.ksmFileRef}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <ErrorTooltip message={fieldErrors.ksmFileRef} />
          </div>
        </div>
      </div>

      {/* Row 2: Creation Date + ETA/Stack Date + Last Free Date */}
      <div className="controller-instructions-form-row">
        {showCreationDate && (
          <div className="controller-instructions-form-field">
            <label>Creation Date</label>
            <input
              type="date"
              className="controller-instructions-form-input"
              name="createdAt"
              value={formData.createdAt || ""}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
              ref={fieldRefs?.createdAt}
            />
          </div>
        )}
        {showStackDate && (
          <div className="controller-instructions-form-field">
            <label>
              {stackDateLabel}{" "}
              {stackDateRequired && <span className="wb-required">*</span>}
            </label>
            <div
              className="controller-instructions-date-wrapper"
              ref={fieldRefs?.stackDate}
            >
              <input
                type="date"
                className={`controller-instructions-form-input ${
                  fieldErrors.stackDate ? "controller-instructions-error-field" : ""
                }`}
                name="stackDate"
                value={formData.stackDate || ""}
                onChange={onInputChange}
                min={today}
                ref={etaDateRef}
                disabled={isReadOnly}
                style={isReadOnly ? readOnlyStyle : {}}
                required={stackDateRequired}
                onKeyDown={(e) => e.preventDefault()}
              />
              <ErrorTooltip message={fieldErrors.stackDate} />
            </div>
          </div>
        )}
        <div className="controller-instructions-form-field">
          <label>Last Free Date</label>
          <div
            className="controller-instructions-date-wrapper"
            ref={fieldRefs?.lastFreeDate}
          >
            <input
              type="date"
              className={`controller-instructions-form-input ${
                fieldErrors.lastFreeDate ? "controller-instructions-error-field" : ""
              }`}
              name="lastFreeDate"
              value={formData.lastFreeDate}
              onChange={onInputChange}
              min={today}
              ref={lastFreeDateRef}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
              onKeyDown={(e) => e.preventDefault()}
            />
            <ErrorTooltip message={fieldErrors.lastFreeDate} />
          </div>
        </div>
      </div>

      {/* Row 3: Vessel Name + extra controls (e.g. Unit Per / set rate) */}
      <div className="controller-instructions-form-row">
        {showVesselName && (
          <div className="controller-instructions-form-field">
            <label>
              Vessel Name{" "}
              {(formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") && (
                <span className="wb-required">*</span>
              )}
            </label>
            <div
              className="controller-instructions-input-wrapper"
              ref={fieldRefs?.vesselName}
            >
              <input
                type="text"
                className={`controller-instructions-form-input ${
                  fieldErrors.vesselName ? "controller-instructions-error-field" : ""
                }`}
                placeholder="Enter vessel name"
                name="vesselName"
                value={formData.vesselName || ""}
                onChange={onInputChange}
                disabled={isReadOnly}
                style={isReadOnly ? readOnlyStyle : {}}
                required={
                  formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2"
                }
              />
              <ErrorTooltip message={fieldErrors.vesselName} />
            </div>
          </div>
        )}
        {children}
      </div>

      {/* Row 4: VAT toggle */}
      <div className="controller-instructions-form-row">
        <div
          className="controller-instructions-form-field"
          style={{ maxWidth: "140px" }}
        >
          <label>VAT</label>
          <div className="controller-instructions-input-wrapper">
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: isReadOnly ? "not-allowed" : "pointer",
              }}
            >
              <span style={{ fontSize: "12px" }}>0%</span>
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={formData.vat !== 0}
                onChange={(e) => onVatChange(e.target.checked ? 15 : 0)}
                style={{ display: "none" }}
              />
              <span
                className="vat-toggle-slider"
                style={{
                  position: "relative",
                  width: "40px",
                  height: "20px",
                  borderRadius: "10px",
                  backgroundColor: formData.vat !== 0 ? "#4a90e2" : "#ccc",
                  transition: "background-color 0.2s ease",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: formData.vat !== 0 ? "22px" : "2px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    transition: "left 0.2s ease",
                  }}
                />
              </span>
              <span style={{ fontSize: "12px" }}>15%</span>
            </label>
          </div>
        </div>
      </div>

      {/* Row 4: Description */}
      <div className="controller-instructions-form-row">
        <div
          className="controller-instructions-form-field"
          style={{ width: "100%" }}
        >
          <label>Description</label>
          <div
            className="controller-instructions-input-wrapper"
            ref={fieldRefs?.description}
          >
            <input
              type="text"
              className={`controller-instructions-form-input ${
                fieldErrors.description ? "controller-instructions-error-field" : ""
              }`}
              placeholder="Enter description"
              name="description"
              value={formData.description}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <ErrorTooltip message={fieldErrors.description} />
          </div>
        </div>
      </div>
    </div>
  );
}
