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

/**
 * Per-container surcharge picker. The configured extra-charge list can run long,
 * so the popover is a filter box over a scrolling list rather than a plain stack
 * of checkboxes. Selection is still multi-select checkboxes writing the same
 * container fields (hazardous / addSurcharges / vgm) and the same
 * selectedExtraCharges array — only the picking is different.
 */
function SurchargeSelect({ container, allowVgmUI, disabled, onChange, availableExtraCharges = [], onExtraChargeToggle }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef(null);
  const filterRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Opening starts from a clean filter, with the caret in the box so typing
  // narrows the list immediately and the arrow keys have somewhere to land.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    filterRef.current?.focus();
  }, [open]);

  const selectedExtraCharges = container.selectedExtraCharges || [];
  const isExtraChargeSelected = (chargeName) =>
    selectedExtraCharges.some((c) => c.charge_name === chargeName);

  // One flat option list so the filter and keyboard nav treat the built-in
  // flags and the configured extra charges identically.
  const options = [
    {
      key: "hazardous",
      label: "Hazardous",
      checked: Boolean(container.hazardous),
      toggle: (checked) => onChange(container.id, "hazardous", checked),
    },
    {
      key: "addSurcharges",
      label: "Surcharge",
      checked: Boolean(container.addSurcharges),
      toggle: (checked) => onChange(container.id, "addSurcharges", checked),
    },
    ...(allowVgmUI
      ? [
          {
            key: "vgm",
            label: "VGM",
            checked: Boolean(container.vgm),
            toggle: (checked) => onChange(container.id, "vgm", checked),
          },
        ]
      : []),
    ...availableExtraCharges.map((charge) => ({
      key: `extra-${charge.charge_id ?? charge.charge_name}`,
      label: charge.charge_name,
      checked: isExtraChargeSelected(charge.charge_name),
      toggle: (checked) => onExtraChargeToggle(container.id, charge, checked),
    })),
    // Charges the container still carries that the client rate no longer
    // offers. Amounts are snapshotted per container, so fetchFreshAmounts keeps
    // these on the container after the rate is edited — they are still billed
    // and must stay visible (and removable) rather than silently disappearing.
    ...selectedExtraCharges
      .filter((sel) => !availableExtraCharges.some((c) => c.charge_name === sel.charge_name))
      .map((sel) => ({
        key: `extra-orphan-${sel.charge_name}`,
        label: sel.charge_name,
        checked: true,
        toggle: (checked) => onExtraChargeToggle(container.id, sel, checked),
      })),
  ];

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter((o) => String(o.label ?? "").toLowerCase().includes(needle))
    : options;

  const selected = options.filter((o) => o.checked).map((o) => o.label);

  const moveActive = (delta) => {
    if (visible.length === 0) return;
    const next = Math.min(Math.max(activeIndex + delta, 0), visible.length - 1);
    setActiveIndex(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  // Enter toggles rather than Space: the filter box owns Space for typing.
  const handleMenuKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = visible[activeIndex];
      if (option) option.toggle(!option.checked);
    }
  };

  return (
    <div className="wb-surcharge-select" ref={boxRef}>
      <button
        type="button"
        className="wb-surcharge-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!disabled && !open && e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={selected.length ? "" : "wb-surcharge-placeholder"}>
          {selected.length ? selected.join(", ") : "Select Surcharge"}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="wb-surcharge-menu" onKeyDown={handleMenuKeyDown}>
          <input
            ref={filterRef}
            type="text"
            className="wb-surcharge-filter"
            placeholder="Filter surcharges…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          {/* Deliberately not role="listbox"/"option": each row is a real
              checkbox, and a checkbox inside an option is invalid ARIA that
              screen readers mis-announce. Native semantics already carry the
              checked state; the highlight below is only a keyboard affordance. */}
          <div className="wb-surcharge-options" ref={listRef}>
            {visible.length === 0 ? (
              <div className="wb-surcharge-empty">No matching surcharges</div>
            ) : (
              visible.map((option, idx) => (
                <label
                  key={option.key}
                  className={idx === activeIndex ? "wb-surcharge-active" : ""}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.toggle(e.target.checked)}
                  />
                  {option.label}
                </label>
              ))
            )}
          </div>
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
