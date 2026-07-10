/**
 * ActionButtons — save / delete / invoice buttons for the update form, or a
 * read-only message when the instruction is Completed.
 *
 * @param {object}   props
 * @param {boolean}  props.isReadOnly
 * @param {string}   props.status
 * @param {boolean}  props.isInvoiced
 * @param {function} props.onSave
 * @param {function} props.onDelete
 * @param {function} props.onInvoice
 */
export function ActionButtons({
  isReadOnly,
  status,
  isInvoiced,
  onSave,
  onDelete,
  onInvoice,
}) {
  if (isReadOnly) {
    return (
      <div
        className="controller-instructions-form-actions"
        style={{ display: "flex", justifyContent: "center", gap: "15px" }}
      >
        <div
          style={{
            backgroundColor: "#6c757d",
            color: "white",
            padding: "12px 24px",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          This instruction is {status} and cannot be edited
        </div>
      </div>
    );
  }

  const canDeleteOrInvoice =
    status === "New" || status === "In Progress";

  return (
    <div
      className="controller-instructions-form-actions"
      style={{ display: "flex", justifyContent: "center", gap: "15px" }}
    >
      <button
        className="controller-instructions-save-button"
        onClick={onSave}
        style={{
          backgroundColor: "#4a90e2",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        Save Changes
      </button>
      {canDeleteOrInvoice && (
        <>
          <button
            className="controller-instructions-delete-button"
            onClick={onDelete}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              marginRight: "10px",
            }}
          >
            Delete Instruction
          </button>
          {!isInvoiced && (
            <button
              className="controller-instructions-invoice-button"
              onClick={onInvoice}
              style={{
                backgroundColor: "#27ae60",
                color: "white",
                padding: "12px 24px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Invoice
            </button>
          )}
        </>
      )}
    </div>
  );
}
