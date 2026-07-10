export function BackConfirmModal({ show, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you wish to proceed? Unsaved changes will be lost.
          </p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            No
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemoveDriverConfirmModal({
  show,
  driverName,
  onClose,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you want to remove this driver?
          </p>
        </div>
        <div className="modal-body">
          <div className="p-2 text-center">
            <span className="text-gray-700">
              Removing: <strong>{driverName}</strong>
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            No
          </button>
          <button className="modal-btn modal-btn-primary" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemoveLegConfirmModal({
  show,
  legNumber,
  onClose,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <p className="modal-description" style={{ fontSize: "20px" }}>
            Are you sure you want to remove this leg?
          </p>
        </div>
        <div className="modal-body">
          <div className="p-2 text-center">
            <span className="text-gray-700">
              Removing: <strong>Leg {legNumber}</strong>
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            No
          </button>
          <button className="modal-btn modal-btn-primary" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

export function DuplicateDriverModal({ show, duplicateDriverInfo, getDriverName, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-backdrop animate-fadeIn"></div>
      <div className="modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Identical Driver Information</h3>
          <p className="modal-description">A driver with identical information already exists.</p>
        </div>
        <div className="modal-body">
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Driver: <strong>{duplicateDriverInfo && getDriverName(duplicateDriverInfo.driverid)}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Truck: <strong>{duplicateDriverInfo?.truckregnumber}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Container: <strong>{duplicateDriverInfo?.containernumber}</strong>
            </span>
          </div>
          <div className="modal-item">
            <div className="modal-bullet"></div>
            <span className="modal-item-text">
              Date: <strong>{duplicateDriverInfo?.date}</strong>
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
