/**
 * ContainersCard — the grouped-instruction "Containers" card.
 *
 * Adapted from the Visily mock: one header row per container type with the
 * Quantity spinner (and the type's rate), expanded with one sub-row per
 * container so every container gets its own number, weight, cargo description
 * and surcharge selection. Surcharges are picked per container from a
 * checkbox dropdown (Hazardous / Surcharge / VGM) like the mock's
 * "Select Surcharge" control.
 */
import { useEffect, useRef, useState } from "react";
import { ErrorTooltip } from "./ErrorTooltip";

const TYPES = [
  { type: "6m", countField: "num_six_meters", rateField: "sixMeterRate", enabledKey: "sixMeter", lockKey: "sixMeter" },
  { type: "12m", countField: "num_twelve_meters", rateField: "twelveMeterRate", enabledKey: "twelveMeter", lockKey: "twelveMeter" },
  { type: "Abnormal", countField: "num_abnormal", rateField: "abnormalRate", enabledKey: "abnormal", lockKey: null },
];

function SurchargeSelect({ container, allowVgmUI, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = [
    container.hazardous && "Hazardous",
    container.addSurcharges && "Surcharge",
    allowVgmUI && container.vgm && "VGM",
  ].filter(Boolean);

  return (
    <div className="wb-surcharge-select" ref={boxRef}>
      <button
        type="button"
        className="wb-surcharge-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={selected.length ? "" : "wb-surcharge-placeholder"}>
          {selected.length ? selected.join(", ") : "Select Surcharge"}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="wb-surcharge-menu">
          <label>
            <input
              type="checkbox"
              checked={Boolean(container.hazardous)}
              onChange={(e) => onChange(container.id, "hazardous", e.target.checked)}
            />
            Hazardous
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(container.addSurcharges)}
              onChange={(e) => onChange(container.id, "addSurcharges", e.target.checked)}
            />
            Surcharge
          </label>
          {allowVgmUI && (
            <label>
              <input
                type="checkbox"
                checked={Boolean(container.vgm)}
                onChange={(e) => onChange(container.id, "vgm", e.target.checked)}
              />
              VGM
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function ContainersCard({
  formData,
  setFormData,
  rateFieldsEnabled,
  rateLockStatus,
  handleContainerCountChange,
  containers,
  containerFieldErrors,
  handleContainerChange,
  isImport,
  isExport,
  isCrossHaul,
  allowVgmUI,
  countsDisabled = false,
  countError = "",
}) {
  const showWeight = isImport || isExport || isCrossHaul;
  const showFileRef = isExport || String(formData.shipmentTypeId) === "2";

  const handleRateChange = (rateField, value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [rateField]: value === "" ? "" : Number.parseFloat(value) || 0,
      }));
    }
  };

  const columns = 5 + (showWeight ? 1 : 0) + (showFileRef ? 1 : 0);

  return (
    <div className="controller-instructions-form-section container-details-section">
      <div className="wb-card-header">
        <h4>Containers</h4>
        <p>Set trailer quantities per type and capture each container in detail.</p>
      </div>
      {countError && (
        <div
          className="controller-instructions-container-error-message"
          style={{ color: "#d32f2f", fontSize: "0.8rem", marginBottom: "8px" }}
        >
          {countError}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table className="wb-containers-table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>Container Type</th>
              <th style={{ width: "12%" }}>Quantity</th>
              <th style={{ width: "12%" }}>Rate</th>
              <th style={{ width: "18%" }}>Container Number</th>
              {showFileRef && <th style={{ width: "14%" }}>File Reference</th>}
              {showWeight && <th style={{ width: "10%" }}>Weight</th>}
              <th>Cargo Description</th>
              <th style={{ width: "16%" }}>Surcharges</th>
            </tr>
          </thead>
          <tbody>
            {TYPES.map(({ type, countField, rateField, enabledKey, lockKey }) => {
              const typeContainers = containers.filter((c) => c.containerType === type);
              const count = formData[countField] || 0;
              const rateValue =
                formData[rateField] !== undefined && formData[rateField] !== ""
                  ? formData[rateField]
                  : "";
              const rateEnabled =
                Boolean(rateFieldsEnabled?.[enabledKey]) &&
                !(lockKey && rateLockStatus?.[lockKey]);

              return [
                <tr key={type} className="wb-type-row">
                  <td className="wb-type-label">{type}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="wb-qty-input"
                      value={count}
                      disabled={countsDisabled}
                      onChange={(e) => handleContainerCountChange(countField, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="wb-rate-input"
                      value={rateValue}
                      placeholder={rateEnabled ? "0.00" : ""}
                      disabled={!rateEnabled || countsDisabled}
                      onChange={(e) => handleRateChange(rateField, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td colSpan={columns - 3} className="wb-type-hint">
                    {count > 0
                      ? `${count} container${count > 1 ? "s" : ""} — capture each below`
                      : "—"}
                  </td>
                </tr>,
                ...typeContainers.map((container, idx) => (
                  <tr key={`${type}-${container.id}`} className="wb-container-row">
                    <td className="wb-sub-label">
                      {type} #{idx + 1}
                    </td>
                    <td></td>
                    <td></td>
                    <td>
                      <div className="controller-instructions-input-wrapper">
                        <input
                          type="text"
                          className={
                            containerFieldErrors?.[`container-${container.id}`]
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          placeholder="Container number"
                          value={container.containerNum || ""}
                          onChange={(e) =>
                            handleContainerChange(container.id, "containerNum", e.target.value)
                          }
                        />
                        <ErrorTooltip
                          message={containerFieldErrors?.[`container-${container.id}`]}
                        />
                      </div>
                    </td>
                    {showFileRef && (
                      <td>
                        <input
                          type="text"
                          placeholder="File reference"
                          value={container.fileRef || ""}
                          onChange={(e) =>
                            handleContainerChange(container.id, "fileRef", e.target.value)
                          }
                        />
                      </td>
                    )}
                    {showWeight && (
                      <td>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className={
                              containerFieldErrors?.[`weight-${container.id}`]
                                ? "controller-instructions-error-field"
                                : ""
                            }
                            placeholder="Weight"
                            value={container.weight ?? ""}
                            onChange={(e) =>
                              handleContainerChange(container.id, "weight", e.target.value)
                            }
                          />
                          <ErrorTooltip
                            message={containerFieldErrors?.[`weight-${container.id}`]}
                          />
                        </div>
                      </td>
                    )}
                    <td>
                      <input
                        type="text"
                        placeholder="Cargo description"
                        value={container.cargoDescription || ""}
                        onChange={(e) =>
                          handleContainerChange(container.id, "cargoDescription", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <SurchargeSelect
                        container={container}
                        allowVgmUI={allowVgmUI}
                        disabled={false}
                        onChange={handleContainerChange}
                      />
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
