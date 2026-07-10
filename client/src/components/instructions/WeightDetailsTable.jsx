/**
 * WeightDetailsTable — KSM DN Number / Ticket Number / Receipt Book Number /
 * Weight table for cross-haul (break bulk, shipment type 4).
 *
 * The weight field only accepts numeric input; the caller controls whether
 * the table is visible (e.g. `shipmentTypeId === "4" && rows.length > 0`).
 *
 * @param {object}   props
 * @param {Array}    props.rows            Array of weight row objects
 * @param {string}   props.rateWeight      Unit label shown in the Weight column header
 * @param {boolean}  props.isReadOnly
 * @param {function} props.onUpdateRow     (id, field, value) => void
 * @param {function} props.onDeleteRow     (row) => void  — opens confirmation
 * @param {function} props.onAddRow        () => void
 */
export function WeightDetailsTable({
  rows,
  rateWeight,
  isReadOnly,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
}) {
  return (
    <div
      className="controller-instructions-form-section"
      style={{ marginTop: "0", paddingTop: "0" }}
    >
      <div
        className="controller-instructions-form-row"
        style={{ marginTop: "0" }}
      >
        <div
          className="controller-instructions-form-field"
          style={{ width: "100%" }}
        >
          <label>Weight Details</label>
          <div style={{ width: "100%" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                    KSM DN Number
                  </th>
                  <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                    Ticket Number
                  </th>
                  <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                    Receipt Book Number
                  </th>
                  <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                    Weight ({rateWeight})
                  </th>
                  <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                      <input
                        type="text"
                        className="controller-instructions-form-input"
                        value={row.ksmDmNo || ""}
                        onChange={(e) =>
                          onUpdateRow(row.id, "ksmDmNo", e.target.value)
                        }
                        disabled={isReadOnly}
                        style={{ width: "100%", fontSize: "12px", height: "26px" }}
                      />
                    </td>
                    <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                      <input
                        type="text"
                        className="controller-instructions-form-input"
                        value={row.ticketNo || ""}
                        onChange={(e) =>
                          onUpdateRow(row.id, "ticketNo", e.target.value)
                        }
                        disabled={isReadOnly}
                        style={{ width: "100%", fontSize: "12px", height: "26px" }}
                      />
                    </td>
                    <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                      <input
                        type="text"
                        className="controller-instructions-form-input"
                        value={row.receiptBookNo || ""}
                        onChange={(e) =>
                          onUpdateRow(row.id, "receiptBookNo", e.target.value)
                        }
                        disabled={isReadOnly}
                        style={{ width: "100%", fontSize: "12px", height: "26px" }}
                      />
                    </td>
                    <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                      <input
                        type="text"
                        className="controller-instructions-form-input"
                        value={row.weight || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                            onUpdateRow(row.id, "weight", value);
                          }
                        }}
                        disabled={isReadOnly}
                        style={{ width: "100%", fontSize: "12px", height: "26px" }}
                      />
                    </td>
                    <td
                      style={{
                        border: "1px solid #dee2e6",
                        padding: "2px 4px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteRow(row)}
                          style={{
                            padding: "2px 6px",
                            fontSize: "11px",
                            borderRadius: "4px",
                            border: "1px solid #dc3545",
                            backgroundColor: "#fff",
                            color: "#dc3545",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!isReadOnly && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "4px", textAlign: "left" }}
                    >
                      <button
                        type="button"
                        onClick={onAddRow}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          borderRadius: "4px",
                          border: "1px solid #4a90e2",
                          backgroundColor: "#4a90e2",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Add Row
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
