/**
 * ClientInfoSection — the "Instruction Information" card.
 *
 * Mirrors the controller create form's first card exactly:
 *   Row 1: Client, Representative, Contact Details, Email
 *   Row 2: Rate (picked by title), Route (read-only, from the chosen rate)
 *
 * The rate row is optional (pass showLocations) so callers that render it
 * elsewhere can omit it. Rates are identified by title; the route is
 * informational and may be blank. Instructions captured before rate titles
 * existed have no title and show their stored route instead. FC's
 * route-mismatch lock is supported via pickupLocked + onLockedRouteClick
 * (renders a read-only input that opens the unlock confirmation on click).
 *
 * @param {object}   props.formData
 * @param {Array}    props.clients
 * @param {object}   props.fieldErrors
 * @param {object}   props.fieldRefs           Refs for clientId / pickup / dropoff
 * @param {boolean}  props.isReadOnly
 * @param {boolean}  [props.clientLocked]      Permanently disable the client dropdown
 * @param {object}   [props.readOnlyStyle]
 * @param {object}   [props.nonEditableStyle]
 * @param {function} props.onClientChange
 * @param {function} props.onChange            Generic input change handler
 * @param {boolean}  [props.showLocations]     Render the Rate / Route row
 * @param {Array}    [props.rateOptions]       [{ title, starting_point, destination, rate_card_name }]
 * @param {function} [props.onRateChange]      (event) => void; event.target.value is the title
 * @param {boolean}  [props.pickupLocked]      FC route-mismatch: lock the route inputs
 * @param {function} [props.onLockedRouteClick]
 */
import { ErrorTooltip } from "./ErrorTooltip";

export function ClientInfoSection({
  formData,
  clients,
  fieldErrors,
  fieldRefs,
  isReadOnly,
  clientLocked = true,
  readOnlyStyle = {},
  nonEditableStyle = {},
  onClientChange,
  onChange,
  showLocations = false,
  rateOptions = [],
  onRateChange,
  pickupLocked = false,
  onLockedRouteClick,
}) {
  return (
    <div className="controller-instructions-form-section controller-instructions-client-info-section">
      <div className="wb-card-header">
        <h4>Instruction Information</h4>
        <p>Client, shipment and reference details for this instruction.</p>
      </div>
      <div className="controller-instructions-form-row">
        <div className="controller-instructions-form-field">
          <label>
            Client<span className="wb-required">*</span>
          </label>
          <div
            className="controller-instructions-select-wrapper"
            ref={fieldRefs?.clientId}
          >
            <select
              style={isReadOnly ? readOnlyStyle : nonEditableStyle}
              className={`dropdown ${
                fieldErrors.clientId ? "controller-instructions-error-field" : ""
              }`}
              name="clientId"
              value={formData.clientId || ""}
              onChange={onClientChange}
              disabled={clientLocked || isReadOnly}
            >
              <option value="" disabled>
                Select Client
              </option>
              {clients.map((client) => (
                <option key={client.m5clientkey} value={client.m5clientkey}>
                  {client.companyname}
                </option>
              ))}
            </select>
            <ErrorTooltip message={fieldErrors.clientId} />
          </div>
        </div>
        <div className="controller-instructions-form-field">
          <label>Representative</label>
          <input
            type="text"
            className="controller-instructions-form-input"
            style={isReadOnly ? readOnlyStyle : nonEditableStyle}
            value={formData.representative || ""}
            readOnly
            placeholder="Autoload representative"
            name="representative"
            onChange={onChange}
            disabled={true}
          />
          <ErrorTooltip message={fieldErrors.representative} />
        </div>
        <div className="controller-instructions-form-field">
          <label>Contact Details</label>
          <input
            type="text"
            className="controller-instructions-form-input"
            placeholder="Autoload contact details"
            name="contactDetails"
            value={formData.contactDetails || ""}
            readOnly
            style={isReadOnly ? readOnlyStyle : nonEditableStyle}
            disabled={isReadOnly}
          />
        </div>
        <div className="controller-instructions-form-field">
          <label>Email</label>
          <input
            type="email"
            className="controller-instructions-form-input"
            placeholder="Autoload email"
            name="email"
            value={formData.email || ""}
            readOnly
            style={isReadOnly ? readOnlyStyle : nonEditableStyle}
            disabled={isReadOnly}
          />
        </div>
      </div>
      {showLocations && (
        <div className="controller-instructions-form-row">
          <div className="controller-instructions-form-field" style={{ flex: 2 }}>
            <label>
              Rate<span className="wb-required">*</span>
            </label>
            <div
              className="controller-instructions-select-wrapper"
              ref={fieldRefs?.rate_title}
            >
              {pickupLocked ? (
                <input
                  type="text"
                  className="controller-instructions-form-input"
                  value={
                    formData.rate_title ||
                    (formData.pickup && formData.dropoff
                      ? `${formData.pickup} → ${formData.dropoff}`
                      : "")
                  }
                  readOnly
                  style={readOnlyStyle}
                  onClick={onLockedRouteClick}
                />
              ) : (
                <select
                  className={`dropdown ${
                    fieldErrors.rate_title ? "controller-instructions-error-field" : ""
                  }`}
                  name="rate_title"
                  value={formData.rate_title || ""}
                  onChange={onRateChange}
                  disabled={isReadOnly || !formData.clientId}
                  style={isReadOnly ? readOnlyStyle : {}}
                >
                  <option value="" disabled>
                    {!formData.clientId
                      ? "Select a client first"
                      : !formData.rate_title && formData.pickup && formData.dropoff
                        ? `Route: ${formData.pickup} → ${formData.dropoff} (choose a rate to change)`
                        : "Select Rate"}
                  </option>
                  {formData.rate_title &&
                    !rateOptions.some((r) => r.title === formData.rate_title) && (
                      <option value={formData.rate_title}>
                        {formData.rate_title} (no longer on this client's rates)
                      </option>
                    )}
                  {rateOptions.map((rate) => (
                    <option key={rate.title} value={rate.title}>
                      {rate.title}
                      {rate.starting_point && rate.destination
                        ? `  —  ${rate.starting_point} → ${rate.destination}`
                        : ""}
                    </option>
                  ))}
                </select>
              )}
              <ErrorTooltip message={fieldErrors.rate_title} />
            </div>
          </div>
          <div className="controller-instructions-form-field">
            <label>Route</label>
            <input
              type="text"
              className="controller-instructions-form-input"
              value={
                formData.pickup && formData.dropoff
                  ? `${formData.pickup} → ${formData.dropoff}`
                  : formData.rate_title
                    ? "No route on this rate"
                    : ""
              }
              placeholder="Filled in from the rate"
              readOnly
              disabled
              style={nonEditableStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}
