/**
 * ConfirmationModal — generic confirmation/warning dialog.
 *
 * Handles all six action types from the update form's confirmationModal
 * (save, delete, invoice, delete-container, delete-weight, unlock-route)
 * and also the shipment-type-change warning (variant="warning").
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen
 * @param {string}   [props.title]         Defaults to "Confirm"
 * @param {string}   props.message
 * @param {function} props.onConfirm
 * @param {function} props.onCancel
 * @param {string}   [props.confirmText]   Defaults to "Yes, Continue"
 * @param {string}   [props.cancelText]    Defaults to "No, Let Me Edit"
 * @param {string}   [props.variant]       "default" | "warning" — controls confirm button colour
 */
export function ConfirmationModal({
  isOpen,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes, Continue",
  cancelText = "No, Let Me Edit",
  variant = "default",
}) {
  if (!isOpen) return null;

  const confirmBg = variant === "warning" ? "#e67e22" : "#4a90e2";

  return (
    <div
      className="controller-instructions-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="controller-instructions-modal-content"
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h3 style={{ marginBottom: "16px", color: "#333" }}>{title}</h3>
        <p
          style={{
            marginBottom: "24px",
            lineHeight: "1.5",
            color: "#666",
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              color: "#666",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: confirmBg,
              color: "white",
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
