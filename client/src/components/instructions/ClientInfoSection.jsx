/**
 * ClientInfoSection — Client dropdown, Representative, Contact Details, Email,
 * and (update form only) Creation Date.
 *
 * Update form: `clientLocked={true}` keeps the Client dropdown always disabled.
 * Create form: `clientLocked={false}` and `showCreationDate={false}`.
 *
 * @param {object}   props
 * @param {object}   props.formData
 * @param {Array}    props.clients
 * @param {object}   props.fieldErrors
 * @param {object}   props.fieldRefs          Refs for clientId and createdAt fields
 * @param {boolean}  props.isReadOnly
 * @param {boolean}  [props.clientLocked]     Permanently disable the client dropdown
 * @param {object}   [props.readOnlyStyle]
 * @param {object}   [props.nonEditableStyle]
 * @param {function} props.onClientChange
 * @param {function} props.onChange            Generic input change handler
 * @param {boolean}  [props.showCreationDate]  Show the Creation Date field
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
  showCreationDate = true,
}) {
  return (
    <div className="controller-instructions-form-section controller-instructions-client-info-section">
      <div className="controller-instructions-form-row">
        <div className="controller-instructions-form-field">
          <label>Client</label>
          <div
            className="controller-instructions-select-wrapper"
            ref={fieldRefs?.clientId}
          >
            <select
              style={isReadOnly ? readOnlyStyle : nonEditableStyle}
              className={`dropdown ${
                fieldErrors.clientId
                  ? "controller-instructions-error-field"
                  : ""
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
        {showCreationDate && (
          <div className="controller-instructions-form-field">
            <label>Creation Date</label>
            <input
              type="date"
              className="controller-instructions-form-input"
              name="createdAt"
              value={formData.createdAt || ""}
              onChange={onChange}
              disabled={isReadOnly}
              style={isReadOnly ? readOnlyStyle : {}}
              ref={fieldRefs?.createdAt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
