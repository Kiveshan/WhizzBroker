/**
 * ContainerDetailsTable — editable table of container details (container number,
 * optional file reference for Export, optional weight for Import/Export/Cross-haul,
 * cargo description, hazardous, add surcharges, VGM).
 *
 * File Reference column is shown only when `shipmentTypeId === "2"` (Export).
 * Weight column is shown for Import, Export, and Cross-haul (types 1, 2, 3).
 *
 * @param {object}   props
 * @param {Array}    props.containers
 * @param {object}   props.containerFieldErrors   keyed as `container-{id}` / `weight-{id}`
 * @param {string}   props.shipmentTypeId
 * @param {boolean}  props.isImport
 * @param {boolean}  props.isReadOnly
 * @param {object}   [props.readOnlyStyle]
 * @param {boolean}  [props.isLoading]            Shows "Updating containers…" spinner row
 * @param {string}   [props.successMessage]       Shown above the table when set
 * @param {object}   [props.sectionStyle]         Extra style for the outer form-section div
 * @param {function} props.onContainerChange      (id, field, value) => void
 * @param {function} props.onDeleteContainer      (container) => void — opens confirmation
 * @param {function} [props.onChangeContainersType] (ids[], type) => void — bulk type switch
 */
import { useState } from "react";

export function ContainerDetailsTable({
  containers,
  containerFieldErrors,
  shipmentTypeId,
  isImport,
  isReadOnly,
  readOnlyStyle = {},
  isLoading = false,
  successMessage,
  sectionStyle,
  onContainerChange,
  onDeleteContainer,
  onChangeContainersType,
}) {
  const showFileRef = String(shipmentTypeId) === "2";
  const showWeight =
    isImport ||
    String(shipmentTypeId) === "2" ||
    String(shipmentTypeId) === "3";

  // Selectable container types. BreakBulk is managed separately (its own
  // section) and cross-haul hides this table entirely, so only offer the three
  // standard sizes here.
  const typeOptions = ["6m", "12m", "Abnormal"];

  // ── Multi-select state (mass edit) ──
  const [selectedIds, setSelectedIds] = useState([]);
  const enableSelect = !isReadOnly && Boolean(onChangeContainersType);
  // Keep only ids that still exist, so deleting a selected row can't leave a
  // stale selection.
  const selected = selectedIds.filter((id) =>
    containers.some((c) => c.id === id)
  );
  const allSelected = containers.length > 0 && selected.length === containers.length;

  const toggleOne = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : containers.map((c) => c.id));
  const applyType = (type) => {
    if (selected.length === 0) return;
    onChangeContainersType(selected, type);
    setSelectedIds([]);
  };

  return (
    <div
      className="controller-instructions-form-section"
      style={sectionStyle}
    >
      <div className="controller-instructions-container-details-section">
        <h3>Container Details</h3>
        {successMessage && (
          <div className="controller-instructions-success-message">
            {successMessage}
          </div>
        )}
        {enableSelect && selected.length > 0 && (
          <div
            className="controller-instructions-mass-edit-toolbar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              marginBottom: "10px",
              backgroundColor: "#eef4ff",
              border: "1px solid #b6d0ff",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 500 }}>
              {selected.length} selected — set type to:
            </span>
            {typeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => applyType(type)}
                style={{
                  padding: "3px 12px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "1px solid #0d6efd",
                  backgroundColor: "#fff",
                  color: "#0d6efd",
                  cursor: "pointer",
                }}
              >
                {type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                marginLeft: "auto",
                padding: "3px 10px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid #adb5bd",
                backgroundColor: "#fff",
                color: "#6c757d",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        )}
        <div
          className="controller-instructions-container-table-wrapper"
          style={{ overflowX: "auto", marginBottom: "20px" }}
        >
          <table
            className="controller-instructions-container-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "10px",
            }}
          >
            <thead>
              <tr>
                {enableSelect && (
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      borderBottom: "2px solid #ddd",
                      width: "36px",
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select all containers"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ transform: "scale(1.2)", cursor: "pointer" }}
                    />
                  </th>
                )}
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Container Type
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Container Number
                </th>
                {showFileRef && (
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    File Reference
                  </th>
                )}
                {showWeight && (
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Weight
                  </th>
                )}
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Actions
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Cargo Description
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Hazardous
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Add Surcharges
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  VGM
                </th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id}>
                  {enableSelect && (
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        aria-label={`Select container ${container.id}`}
                        checked={selected.includes(container.id)}
                        onChange={() => toggleOne(container.id)}
                        style={{ transform: "scale(1.2)", cursor: "pointer" }}
                      />
                    </td>
                  )}
                  <td>
                    <select
                      className="controller-instructions-form-input"
                      value={container.containerType}
                      onChange={(e) =>
                        onContainerChange(container.id, "containerType", e.target.value)
                      }
                      disabled={isReadOnly}
                      style={isReadOnly ? readOnlyStyle : {}}
                    >
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Container Number */}
                  <td>
                    <div className="controller-instructions-input-wrapper">
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${
                          containerFieldErrors[`container-${container.id}`]
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        value={container.containerNum}
                        onChange={(e) =>
                          onContainerChange(container.id, "containerNum", e.target.value)
                        }
                        placeholder="Up to 20 alphanumeric characters"
                        maxLength={20}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      {containerFieldErrors[`container-${container.id}`] && (
                        <div
                          className="controller-instructions-container-error-text"
                          style={{
                            color: "#e74c3c",
                            fontSize: "12px",
                            marginTop: "4px",
                            fontWeight: "500",
                            display: "block",
                          }}
                        >
                          {containerFieldErrors[`container-${container.id}`]}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* File Reference (Export only) */}
                  {showFileRef && (
                    <td>
                      <div className="controller-instructions-input-wrapper">
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          value={container.fileRef}
                          onChange={(e) =>
                            onContainerChange(container.id, "fileRef", e.target.value)
                          }
                          placeholder="Enter file reference"
                          maxLength={20}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                      </div>
                    </td>
                  )}

                  {/* Weight (Import / Export / Cross-haul) */}
                  {showWeight && (
                    <td>
                      <div className="controller-instructions-input-wrapper">
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            containerFieldErrors[`weight-${container.id}`]
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          value={
                            container.weight === null || container.weight === undefined
                              ? ""
                              : typeof container.weight === "number"
                              ? container.weight.toString()
                              : container.weight
                          }
                          onChange={(e) =>
                            onContainerChange(container.id, "weight", e.target.value)
                          }
                          placeholder="0.00"
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        {containerFieldErrors[`weight-${container.id}`] && (
                          <div
                            className="controller-instructions-container-error-text"
                            style={{
                              color: "#e74c3c",
                              fontSize: "12px",
                              marginTop: "4px",
                              fontWeight: "500",
                              display: "block",
                            }}
                          >
                            {containerFieldErrors[`weight-${container.id}`]}
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => onDeleteContainer(container)}
                        style={{
                          padding: "2px 8px",
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

                  {/* Cargo Description */}
                  <td>
                    <div className="controller-instructions-input-wrapper">
                      <input
                        type="text"
                        className="controller-instructions-form-input"
                        value={container.cargoDescription}
                        onChange={(e) =>
                          onContainerChange(container.id, "cargoDescription", e.target.value)
                        }
                        placeholder="Enter cargo description"
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                    </div>
                  </td>

                  {/* Hazardous */}
                  <td style={{ textAlign: "center" }}>
                    <div className="controller-instructions-checkbox-wrapper">
                      <input
                        type="checkbox"
                        className="controller-instructions-form-checkbox"
                        checked={container.hazardous === true}
                        onChange={(e) =>
                          onContainerChange(container.id, "hazardous", e.target.checked)
                        }
                        disabled={isReadOnly}
                        style={{
                          transform: "scale(1.2)",
                          cursor: isReadOnly ? "default" : "pointer",
                        }}
                      />
                    </div>
                  </td>

                  {/* Add Surcharges */}
                  <td style={{ textAlign: "center" }}>
                    <div className="controller-instructions-checkbox-wrapper">
                      <input
                        type="checkbox"
                        className="controller-instructions-form-checkbox"
                        checked={container.addSurcharges === true}
                        onChange={(e) =>
                          onContainerChange(container.id, "addSurcharges", e.target.checked)
                        }
                        disabled={isReadOnly}
                        style={{
                          transform: "scale(1.2)",
                          cursor: isReadOnly ? "default" : "pointer",
                        }}
                      />
                    </div>
                  </td>

                  {/* VGM */}
                  <td style={{ textAlign: "center" }}>
                    <div className="controller-instructions-checkbox-wrapper">
                      <input
                        type="checkbox"
                        className="controller-instructions-form-checkbox"
                        checked={container.vgm === true}
                        onChange={(e) =>
                          onContainerChange(container.id, "vgm", e.target.checked)
                        }
                        disabled={isReadOnly}
                        style={{
                          transform: "scale(1.2)",
                          cursor: isReadOnly ? "default" : "pointer",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && (
          <div className="controller-instructions-loading-message">
            Updating containers...
          </div>
        )}
      </div>
    </div>
  );
}
