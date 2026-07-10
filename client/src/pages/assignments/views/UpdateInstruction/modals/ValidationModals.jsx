export function DestinationMismatchModal({ show, mismatchDetails, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Destination Mismatch</h3>
          <p className="modal-description">
            The final leg destination doesn't match the instruction dropoff location.
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Last Leg Destination: <strong>{mismatchDetails.lastLegDestination}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Instruction Dropoff: <strong>{mismatchDetails.dropoff}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Please update the final leg destination or edit the instruction.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContainerWarningModal({
  show,
  containerValidationDetails,
  onClose,
}) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <div className="flex items-center gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="#FEE2E2"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600 drop-shadow-sm"
            >
              <path d="M12 2L2 19h20L12 2z" />
              <path d="M12 8v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
            <h3 className="modal-title">
              {containerValidationDetails.isWeightBased
                ? (containerValidationDetails.missingWeight > 0
                    ? "Weight Destination Warning"
                    : "Excess Weight Warning")
                : "Container Destination Warning"}
            </h3>
          </div>
          <p className="modal-description">
            {containerValidationDetails.isWeightBased
              ? (containerValidationDetails.missingWeight > 0
                  ? "Not all weight reaches the final destination."
                  : "More weight is assigned than the instruction total.")
              : "All containers must reach the final destination."}
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Final Destination: <strong>{containerValidationDetails.dropoff}</strong>
            </span>
          </div>
          {containerValidationDetails.isWeightBased ? (
            <div className="modal-item">
              <div className="modal-bullet"></div>
              <span className="modal-item-text">
                Weight reaching destination: <strong>
                  {(containerValidationDetails.totalWeight - Math.abs(containerValidationDetails.missingWeight)).toFixed(2)}/
                  {containerValidationDetails.totalWeight.toFixed(2)} {containerValidationDetails.weightUnit}
                </strong>
              </span>
            </div>
          ) : (
            containerValidationDetails.missingContainers?.map((container, index) => (
              <div key={index} className="modal-item">
                <div className="modal-bullet"></div>
                <span className="modal-item-text">
                  Container <strong>{container}</strong> does not reach final destination
                </span>
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

export function MissingFieldsModal({ show, missingFields, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Missing Required Fields</h3>
          <p className="modal-description">
            Please fill in all required fields before saving.
          </p>
        </div>
        <div className="modal-body">
          {missingFields.map((field, index) => (
            <div key={index} className="modal-item">
              <div className="modal-bullet"></div>
              <span className="modal-item-text">{field}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoDriversModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Driver Required</h3>
          <p className="modal-description">
            Please make sure to add a driver before finalisation.
          </p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

export function UnsavedChangesModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Unsaved Changes</h3>
          <p className="modal-description">
            Please save your changes in the current leg before adding a new leg.
          </p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContainerReachedDropoffModal({ show, containerNumber, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Container Already Reached Dropoff</h3>
          <p className="modal-description">
            The specified container has already reached its dropoff in a previous leg.
          </p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Container <strong>{containerNumber}</strong> has already reached its final destination.
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Please select a different container or update the previous legs.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
