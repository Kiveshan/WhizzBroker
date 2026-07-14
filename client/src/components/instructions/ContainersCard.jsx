/**
 * ContainersCard — the grouped-instruction "Containers" card.
 *
 * Adapted from the Visily mock: one header row per container type with the
 * Quantity spinner (and the type's rate), expanded with one sub-row per
 * container so every container gets its own number, weight, cargo description
 * and surcharge selection. Surcharges are picked per container from a
 * checkbox dropdown (Hazardous / Surcharge / VGM) like the mock's
 * "Select Surcharge" control.
 *
 * Used by the create form (grouped instruction panels) and the FC update
 * form. FC extras are opt-in via props: isReadOnly, onDeleteContainer
 * (per-row Delete, upstream handles the legs check + confirm flow),
 * showTypeSelect (move a container to another type), rateFieldNames /
 * onRateChange (FC stores rates as rateper_6/12/abnormal), isLoading and
 * successMessage.
 */
import { useEffect, useRef, useState } from "react";
import { ErrorTooltip } from "./ErrorTooltip";

const CREATE_RATE_FIELDS = {
  "6m": "sixMeterRate",
  "12m": "twelveMeterRate",
  Abnormal: "abnormalRate",
};

const TYPES = [
  { type: "6m", countField: "num_six_meters", enabledKey: "sixMeter", lockKey: "sixMeter" },
  { type: "12m", countField: "num_twelve_meters", enabledKey: "twelveMeter", lockKey: "twelveMeter" },
  { type: "Abnormal", countField: "num_abnormal", enabledKey: "abnormal", lockKey: null },
];

const TYPE_OPTIONS = ["6m", "12m", "Abnormal"];

function SurchargeSelect({ container, allowVgmUI, disabled, onChange, availableExtraCharges = [], onExtraChargeToggle }) {
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

  const selectedExtraCharges = container.selectedExtraCharges || [];
  const isExtraChargeSelected = (chargeName) =>
    selectedExtraCharges.some((c) => c.charge_name === chargeName);

  const selected = [
    container.hazardous && "Hazardous",
    container.addSurcharges && "Surcharge",
    allowVgmUI && container.vgm && "VGM",
    ...selectedExtraCharges.map((c) => c.charge_name),
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
          {availableExtraCharges.map((charge) => (
            <label key={charge.charge_id ?? charge.charge_name}>
              <input
                type="checkbox"
                checked={isExtraChargeSelected(charge.charge_name)}
                onChange={(e) => onExtraChargeToggle(container.id, charge, e.target.checked)}
              />
              {charge.charge_name}
            </label>
          ))}
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
  availableExtraCharges = [],
  // FC update-form extras
  isReadOnly = false,
  rateFieldNames = CREATE_RATE_FIELDS,
  onRateChange = null,
  onDeleteContainer = null,
  showTypeSelect = false,
  isLoading = false,
  successMessage = "",
}) {
  const showWeight = isImport || isExport || isCrossHaul;
  const showFileRef = isExport || String(formData.shipmentTypeId) === "2";
  const showActions = Boolean(onDeleteContainer) && !isReadOnly;
  const inputsDisabled = isReadOnly;

  const handleRateInput = (rateField, value) => {
    if (onRateChange) {
      onRateChange(rateField, value);
      return;
    }
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [rateField]: value === "" ? "" : Number.parseFloat(value) || 0,
      }));
    }
  };

  const columns =
    5 +
    (showWeight ? 1 : 0) +
    (showFileRef ? 1 : 0) +
    (showTypeSelect ? 1 : 0) +
    (showActions ? 1 : 0);

  const handleExtraChargeToggle = (containerId, charge, checked) => {
    const container = containers.find((c) => c.id === containerId);
    if (!container) return;
    const existing = container.selectedExtraCharges || [];
    const nextCharges = checked
      ? [...existing, { charge_name: charge.charge_name, amount: Number(charge.amount) || 0 }]
      : existing.filter((c) => c.charge_name !== charge.charge_name);
    handleContainerChange(containerId, "selectedExtraCharges", nextCharges);
  };

  return (
    <div className="controller-instructions-form-section container-details-section">
      <div className="wb-card-header">
        <h4>Containers</h4>
        <p>Manage trailer quantities in bulk or capture each container in detail.</p>
      </div>
      {successMessage && (
        <div className="controller-instructions-success-message">{successMessage}</div>
      )}
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
              <th style={{ width: "14%" }}>Container Type</th>
              <th style={{ width: "10%" }}>Quantity</th>
              <th style={{ width: "10%" }}>Rate</th>
              {showTypeSelect && <th style={{ width: "10%" }}>Type</th>}
              <th style={{ width: "16%" }}>Container Number</th>
              {showFileRef && <th style={{ width: "12%" }}>File Reference</th>}
              {showWeight && <th style={{ width: "9%" }}>Weight</th>}
              <th>Cargo Description</th>
              <th style={{ width: "14%" }}>Surcharges</th>
              {showActions && <th style={{ width: "70px" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {TYPES.map(({ type, countField, enabledKey, lockKey }) => {
              const typeContainers = containers.filter((c) => c.containerType === type);
              const count = formData[countField] || 0;
              const rateField = rateFieldNames[type];
              const rateValue =
                formData[rateField] !== undefined && formData[rateField] !== ""
                  ? formData[rateField]
                  : "";
              const rateEnabled =
                !inputsDisabled &&
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
                      disabled={countsDisabled || inputsDisabled}
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
                      onChange={(e) => handleRateInput(rateField, e.target.value)}
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
                    {showTypeSelect && (
                      <td>
                        <select
                          value={container.containerType}
                          disabled={inputsDisabled}
                          onChange={(e) =>
                            handleContainerChange(container.id, "containerType", e.target.value)
                          }
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
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
                          maxLength={20}
                          value={container.containerNum || ""}
                          disabled={inputsDisabled}
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
                          maxLength={20}
                          value={container.fileRef || ""}
                          disabled={inputsDisabled}
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
                            disabled={inputsDisabled}
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
                        disabled={inputsDisabled}
                        onChange={(e) =>
                          handleContainerChange(container.id, "cargoDescription", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <SurchargeSelect
                        container={container}
                        allowVgmUI={allowVgmUI}
                        disabled={inputsDisabled}
                        onChange={handleContainerChange}
                        availableExtraCharges={availableExtraCharges}
                        onExtraChargeToggle={handleExtraChargeToggle}
                      />
                    </td>
                    {showActions && (
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="wb-delete-btn"
                          onClick={() => onDeleteContainer(container)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      {isLoading && (
        <div className="controller-instructions-loading-message">Updating containers...</div>
      )}
    </div>
  );
}
