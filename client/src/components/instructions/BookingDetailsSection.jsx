/**
 * BookingDetailsSection — Booking Reference, Client File Ref, KSM File Ref,
 * Last Free Date, VAT toggle, Stack/ETA Date, Vessel Name, and Description.
 *
 * Stack/ETA Date is only shown for Import (type 1), Export (type 2), and
 * Add-on (type 5). Vessel Name is hidden for Cross-haul/Break-bulk (type 4).
 *
 * @param {object}   props
 * @param {object}   props.formData         bookingRef, clientFileRef, ksmFileRef,
 *                                          lastFreeDate, vat, stackDate, vesselName,
 *                                          description, shipmentTypeId
 * @param {object}   props.fieldErrors
 * @param {object}   props.fieldRefs        bookingRef, clientFileRef, ksmFileRef,
 *                                          lastFreeDate, stackDate, vesselName, description
 * @param {boolean}  props.isReadOnly
 * @param {boolean}  props.isAddOn
 * @param {string}   props.today            ISO date string used as min for date inputs
 * @param {object}   [props.readOnlyStyle]
 * @param {object}   props.lastFreeDateRef  Ref forwarded to the last free date input
 * @param {object}   props.etaDateRef       Ref forwarded to the ETA/stack date input
 * @param {function} props.onInputChange    Generic input change handler
 * @param {function} props.onVatChange      Called with new VAT numeric value (0 or 15)
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
    <div className="controller-instructions-date-time-group">
      {/* Row 1: Booking Reference + Client File Ref */}
      <div
        className="controller-instructions-shipment-task-row"
        style={{ order: -1, marginBottom: "8px" }}
      >
        <div className="controller-instructions-form-field controller-instructions-small-field">
          <label>Booking Reference</label>
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
        <div className="controller-instructions-form-field controller-instructions-small-field">
          <label>Client File Ref</label>
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
      </div>

      {/* Row 2: KSM File Ref + Last Free Date */}
      <div
        className="controller-instructions-shipment-task-row"
        style={{ marginBottom: "8px" }}
      >
        <div className="controller-instructions-form-field controller-instructions-small-field">
          <label>Ksm File Reference</label>
          <div
            className="controller-instructions-input-wrapper"
            ref={fieldRefs?.ksmFileRef}
          >
            <input
              type="text"
              className={`controller-instructions-form-input ${
                fieldErrors.ksmFileRef ? "controller-instructions-error-field" : ""
              }`}
              placeholder="Input KSM File Reference"
              name="ksmFileRef"
              value={formData.ksmFileRef}
              onChange={onInputChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
            />
            <ErrorTooltip message={fieldErrors.ksmFileRef} />
          </div>
        </div>
        <div className="controller-instructions-form-field controller-instructions-small-field">
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

      {/* Row 3: VAT toggle + Stack/ETA Date */}
      <div
        className="controller-instructions-shipment-task-row"
        style={{ marginBottom: "8px" }}
      >
        <div
          className="controller-instructions-form-field controller-instructions-small-field"
          style={{ maxWidth: "120px" }}
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

        {showStackDate && (
          <div className="controller-instructions-form-field controller-instructions-small-field">
            <label>
              {stackDateLabel}{" "}
              {stackDateRequired && <span style={{ color: "red" }}>*</span>}
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
      </div>

      {/* Vessel Name (hidden for type 4) */}
      {showVesselName && (
        <div className="controller-instructions-form-field">
          <label>
            Vessel Name{" "}
            {(formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") && (
              <span style={{ color: "red" }}>*</span>
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

      {/* Description */}
      <div className="controller-instructions-form-field">
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
  );
}
