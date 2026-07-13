/**
 * ClientInfoSection — the "Instruction Information" card.
 *
 * Mirrors the controller create form's first card exactly:
 *   Row 1: Client, Representative, Contact Details, Email
 *   Row 2: Pick-Up Location, Drop-Off Location
 *
 * Locations are optional (pass showLocations) so callers that render the route
 * elsewhere can omit them. FC's route-mismatch lock is supported via
 * pickupLocked + onLockedRouteClick (renders read-only inputs that open the
 * unlock confirmation on click).
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
 * @param {boolean}  [props.showLocations]     Render the Pick-Up / Drop-Off row
 * @param {Array}    [props.startingPoints]    [{ id, startingpoint }]
 * @param {Array}    [props.destinations]      [{ id, destination }]
 * @param {function} [props.onPickupChange]
 * @param {function} [props.onDropoffChange]
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
  startingPoints = [],
  destinations = [],
  onPickupChange,
  onDropoffChange,
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
          <div className="controller-instructions-form-field">
            <label>Pick-Up Location</label>
            <div
              className="controller-instructions-select-wrapper"
              ref={fieldRefs?.pickup}
            >
              {pickupLocked ? (
                <input
                  type="text"
                  className="controller-instructions-form-input"
                  value={formData.pickup || ""}
                  readOnly
                  style={readOnlyStyle}
                  onClick={onLockedRouteClick}
                />
              ) : (
                <select
                  className={`dropdown ${
                    fieldErrors.pickup ? "controller-instructions-error-field" : ""
                  }`}
                  name="pickup"
                  value={formData.pickup || ""}
                  onChange={onPickupChange}
                  disabled={isReadOnly}
                  style={isReadOnly ? readOnlyStyle : {}}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {startingPoints.map((point, index) => (
                    <option
                      key={point.id ?? index}
                      value={point.startingpoint ?? point.value}
                    >
                      {point.startingpoint ?? point.label}
                    </option>
                  ))}
                </select>
              )}
              <ErrorTooltip message={fieldErrors.pickup} />
            </div>
          </div>
          <div className="controller-instructions-form-field">
            <label>Drop-Off Location</label>
            <div
              className="controller-instructions-select-wrapper"
              ref={fieldRefs?.dropoff}
            >
              {pickupLocked ? (
                <input
                  type="text"
                  className="controller-instructions-form-input"
                  value={formData.dropoff || ""}
                  readOnly
                  style={readOnlyStyle}
                  onClick={onLockedRouteClick}
                />
              ) : (
                <select
                  className={`dropdown ${
                    fieldErrors.dropoff ? "controller-instructions-error-field" : ""
                  }`}
                  name="dropoff"
                  value={formData.dropoff || ""}
                  onChange={onDropoffChange}
                  disabled={isReadOnly}
                  style={isReadOnly ? readOnlyStyle : {}}
                >
                  <option value="" disabled>
                    Select Drop-Off Location
                  </option>
                  {destinations.map((dest, index) => (
                    <option
                      key={dest.id ?? index}
                      value={dest.destination ?? dest.value}
                    >
                      {dest.destination ?? dest.label}
                    </option>
                  ))}
                </select>
              )}
              <ErrorTooltip message={fieldErrors.dropoff} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
