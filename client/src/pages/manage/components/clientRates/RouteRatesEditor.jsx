"use client"

import { useState, useEffect, useRef } from "react"
import { FaChevronRight, FaCopy, FaTrash, FaPlus } from "react-icons/fa"
import { showConfirmDialog } from "../../utils/alertUtils.js"
import "../../css/RateCards.css"

// Shared editor for priced routes. Used for a client's own prices
// (ClientRatesForm) and for shared rate cards (RateCardsTab); both store the
// same columns server-side. Each route is a collapsible row with a one-line
// price summary so long lists stay scannable.

// Stable keys for rows that have no database id yet (React keys + open state).
let nextKey = 1
const newKey = () => `route-${nextKey++}`

export const emptyRate = () => ({
  _key: newKey(),
  starting_point: "",
  destination: "",
  "6m_rate": "",
  "12m_rate": "",
  surcharge6M: "",
  surcharge12m: "",
  hazardous: "",
  vgm: "",
  set_rate: "",
  fuel_surcharge: "",
  extra_charges: [],
})

const orBlank = (v) => (v !== null && v !== undefined ? v : "")

// Normalises a rate row from the API into editor state. idField names the
// row's primary key (client_rate_id or rate_card_rate_id).
export const rateFromApi = (rate, idField) => ({
  _key: newKey(),
  ...(idField && rate[idField] ? { [idField]: rate[idField] } : {}),
  starting_point: rate.starting_point || "",
  destination: rate.destination || "",
  "6m_rate": orBlank(rate["6m_rate"]),
  "12m_rate": orBlank(rate["12m_rate"]),
  surcharge6M: orBlank(rate.surcharge6M ?? rate.surcharges),
  surcharge12m: orBlank(rate.surcharge12m),
  hazardous: orBlank(rate.hazardous),
  vgm: orBlank(rate.vgm),
  set_rate: orBlank(rate.set_rate),
  fuel_surcharge: orBlank(rate.fuel_surcharge),
  extra_charges: Array.isArray(rate.extra_charges)
    ? rate.extra_charges.map((c) => ({ charge_name: c.charge_name || "", amount: c.amount ?? "" }))
    : [],
})

const hasValue = (v) => v !== "" && v !== undefined && v !== null

const hasBaseRate = (rate) => hasValue(rate["6m_rate"]) || hasValue(rate["12m_rate"])

export const isRateComplete = (rate) =>
  Boolean(rate.starting_point.trim() && rate.destination.trim() && hasBaseRate(rate))

// A row the user added but never filled in; dropped on save rather than
// blocking it.
export const isRateBlank = (rate) =>
  !rate.starting_point.trim() &&
  !rate.destination.trim() &&
  ["6m_rate", "12m_rate", "surcharge6M", "surcharge12m", "hazardous", "vgm", "set_rate", "fuel_surcharge"].every(
    (f) => !hasValue(rate[f]),
  ) &&
  rate.extra_charges.length === 0

export const formatRand = (v) =>
  hasValue(v)
    ? `R ${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—"

// The fields that make up a route, in display groups.
const PRICE_GROUPS = [
  {
    title: "Base rates",
    hint: "Enter at least a 6m or a 12m rate.",
    fields: [
      ["6m_rate", "6m container"],
      ["12m_rate", "12m container"],
      ["set_rate", "Break bulk"],
    ],
  },
  {
    title: "Surcharges and add-ons",
    hint: "Only charged when ticked on the instruction.",
    fields: [
      ["surcharge6M", "Surcharge (6m)"],
      ["surcharge12m", "Surcharge (12m)"],
      ["hazardous", "Hazardous"],
      ["vgm", "VGM"],
    ],
  },
]

const MoneyInput = ({ value, onChange, label }) => (
  <div className="rc-affix">
    <span className="rc-affix-label rc-prefix">R</span>
    <input
      type="number"
      min="0"
      step="0.01"
      className="rc-input rc-has-prefix"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0.00"
      aria-label={label}
    />
  </div>
)

const PercentInput = ({ value, onChange, label, placeholder = "0" }) => (
  <div className="rc-affix">
    <input
      type="number"
      min="0"
      step="0.01"
      className="rc-input rc-has-suffix"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
    />
    <span className="rc-affix-label rc-suffix">%</span>
  </div>
)

const RouteSummary = ({ rate, showErrors }) => {
  const blank = isRateBlank(rate)
  if (!isRateComplete(rate) && (!blank || showErrors)) {
    return (
      <div className="rc-route-summary">
        <span className="rc-pill rc-pill-red">Incomplete</span>
      </div>
    )
  }
  if (blank) return null
  const chargeCount = rate.extra_charges.filter((c) => c.charge_name.trim()).length
  return (
    <div className="rc-route-summary">
      {hasValue(rate["6m_rate"]) && <span className="rc-pill">6m {formatRand(rate["6m_rate"])}</span>}
      {hasValue(rate["12m_rate"]) && <span className="rc-pill">12m {formatRand(rate["12m_rate"])}</span>}
      {hasValue(rate.set_rate) && <span className="rc-pill">Break bulk {formatRand(rate.set_rate)}</span>}
      {hasValue(rate.fuel_surcharge) && Number(rate.fuel_surcharge) > 0 && (
        <span className="rc-pill rc-pill-blue">Fuel {rate.fuel_surcharge}%</span>
      )}
      {chargeCount > 0 && (
        <span className="rc-pill rc-pill-blue">
          {chargeCount} extra charge{chargeCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  )
}

const RouteRatesEditor = ({ rates, onChange, showErrors = false, emptyState = null, addLabel = "Add route" }) => {
  // New (blank) rows start open; rows loaded from the server start closed.
  // Rows can arrive after mount (data loads, "Set client price"), so watch
  // for keys not seen before.
  const [openKeys, setOpenKeys] = useState(() => new Set())
  const seenKeys = useRef(new Set())
  const [bulkFuel, setBulkFuel] = useState("")

  useEffect(() => {
    const fresh = rates.filter((r) => !seenKeys.current.has(r._key))
    if (fresh.length === 0) return
    fresh.forEach((r) => seenKeys.current.add(r._key))
    const toOpen = fresh.filter((r) => isRateBlank(r) || r._openOnAdd)
    if (toOpen.length) setOpenKeys((prev) => new Set([...prev, ...toOpen.map((r) => r._key)]))
  }, [rates])

  const setOpen = (key, open) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      open ? next.add(key) : next.delete(key)
      return next
    })

  const updateRate = (index, patch) => onChange(rates.map((rate, i) => (i === index ? { ...rate, ...patch } : rate)))

  const addRoute = () => onChange([...rates, emptyRate()])

  const duplicateRoute = (index) => {
    const { client_rate_id, rate_card_rate_id, ...source } = rates[index]
    const copy = {
      ...source,
      _key: newKey(),
      _openOnAdd: true,
      extra_charges: source.extra_charges.map((c) => ({ ...c })),
    }
    onChange([...rates.slice(0, index + 1), copy, ...rates.slice(index + 1)])
  }

  const removeRoute = async (index) => {
    const rate = rates[index]
    if (!isRateBlank(rate)) {
      const label = rate.starting_point || rate.destination ? `${rate.starting_point} → ${rate.destination}` : "this route"
      const confirmed = await showConfirmDialog("Remove route?", `${label} will be removed when you save.`, "Remove")
      if (!confirmed) return
    }
    onChange(rates.filter((_, i) => i !== index))
  }

  const updateCharge = (rateIndex, chargeIndex, patch) => {
    const charges = rates[rateIndex].extra_charges.map((c, i) => (i === chargeIndex ? { ...c, ...patch } : c))
    updateRate(rateIndex, { extra_charges: charges })
  }

  const allOpen = rates.length > 0 && rates.every((r) => openKeys.has(r._key))

  return (
    <div>
      {rates.length === 0 ? (
        emptyState
      ) : (
        <div className="rc-routes">
          {rates.map((rate, index) => {
            const open = openKeys.has(rate._key)
            const invalid = showErrors && !isRateComplete(rate)
            const routeLabel =
              rate.starting_point.trim() || rate.destination.trim()
                ? `${rate.starting_point.trim() || "…"} → ${rate.destination.trim() || "…"}`
                : null
            return (
              <div
                key={rate._key}
                className={`rc-route${open ? " rc-route-open" : ""}${invalid ? " rc-route-error" : ""}`}
              >
                <div className="rc-route-head">
                  <button
                    type="button"
                    className="rc-route-toggle"
                    onClick={() => setOpen(rate._key, !open)}
                    aria-expanded={open}
                  >
                    <FaChevronRight className="rc-route-chevron" size={12} />
                    <span className={`rc-route-name${routeLabel ? "" : " rc-placeholder"}`}>
                      {routeLabel || "New route"}
                    </span>
                    <RouteSummary rate={rate} showErrors={showErrors} />
                  </button>
                  <button
                    type="button"
                    className="rc-icon-btn"
                    onClick={() => duplicateRoute(index)}
                    title="Duplicate route"
                    aria-label="Duplicate route"
                  >
                    <FaCopy size={13} />
                  </button>
                  <button
                    type="button"
                    className="rc-icon-btn rc-danger"
                    onClick={() => removeRoute(index)}
                    title="Remove route"
                    aria-label="Remove route"
                  >
                    <FaTrash size={13} />
                  </button>
                </div>

                {open && (
                  <div className="rc-route-body">
                    <div className="rc-group">
                      <p className="rc-group-title">Route</p>
                      <div className="rc-grid">
                        <div className="rc-field">
                          <label className="rc-label">
                            Starting point<span className="rc-required">*</span>
                          </label>
                          <input
                            type="text"
                            className={`rc-input${showErrors && !rate.starting_point.trim() ? " rc-invalid" : ""}`}
                            value={rate.starting_point}
                            onChange={(e) => updateRate(index, { starting_point: e.target.value })}
                            placeholder="e.g. Durban Port"
                          />
                          {showErrors && !rate.starting_point.trim() && (
                            <span className="rc-error-text">Enter a starting point</span>
                          )}
                        </div>
                        <div className="rc-field">
                          <label className="rc-label">
                            Destination<span className="rc-required">*</span>
                          </label>
                          <input
                            type="text"
                            className={`rc-input${showErrors && !rate.destination.trim() ? " rc-invalid" : ""}`}
                            value={rate.destination}
                            onChange={(e) => updateRate(index, { destination: e.target.value })}
                            placeholder="e.g. City Deep"
                          />
                          {showErrors && !rate.destination.trim() && (
                            <span className="rc-error-text">Enter a destination</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {PRICE_GROUPS.map((group) => (
                      <div className="rc-group" key={group.title}>
                        <p className="rc-group-title">{group.title}</p>
                        <div className="rc-grid">
                          {group.fields.map(([field, label]) => (
                            <div className="rc-field" key={field}>
                              <label className="rc-label">{label}</label>
                              <MoneyInput
                                value={rate[field]}
                                label={label}
                                onChange={(v) => updateRate(index, { [field]: v })}
                              />
                            </div>
                          ))}
                        </div>
                        {group.title === "Base rates" && showErrors && !hasBaseRate(rate) ? (
                          <p className="rc-error-text" style={{ margin: "6px 0 0" }}>
                            Enter a 6m or 12m rate
                          </p>
                        ) : (
                          <p className="rc-hint" style={{ margin: "6px 0 0" }}>
                            {group.hint}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="rc-group">
                      <p className="rc-group-title">Fuel surcharge</p>
                      <div className="rc-grid">
                        <div className="rc-field">
                          <label className="rc-label">Fuel surcharge</label>
                          <PercentInput
                            value={rate.fuel_surcharge}
                            label="Fuel surcharge"
                            onChange={(v) => updateRate(index, { fuel_surcharge: v })}
                          />
                        </div>
                      </div>
                      <p className="rc-hint" style={{ margin: "6px 0 0" }}>
                        Added on top of the 6m, 12m and break bulk rates.
                      </p>
                    </div>

                    <div className="rc-group">
                      <p className="rc-group-title">Extra charges</p>
                      {rate.extra_charges.length === 0 && (
                        <p className="rc-hint" style={{ margin: "0 0 8px" }}>
                          Optional named charges for this route, e.g. a toll fee. They can be ticked per container on
                          the instruction.
                        </p>
                      )}
                      {rate.extra_charges.map((charge, chargeIndex) => (
                        <div className="rc-charge-row" key={chargeIndex}>
                          <input
                            type="text"
                            className="rc-input"
                            value={charge.charge_name}
                            onChange={(e) => updateCharge(index, chargeIndex, { charge_name: e.target.value })}
                            placeholder="Charge name, e.g. Toll fee"
                            aria-label="Charge name"
                          />
                          <MoneyInput
                            value={charge.amount}
                            label="Charge amount"
                            onChange={(v) => updateCharge(index, chargeIndex, { amount: v })}
                          />
                          <button
                            type="button"
                            className="rc-icon-btn rc-danger"
                            onClick={() =>
                              updateRate(index, {
                                extra_charges: rate.extra_charges.filter((_, i) => i !== chargeIndex),
                              })
                            }
                            title="Remove charge"
                            aria-label="Remove charge"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="rc-btn rc-btn-ghost rc-btn-sm"
                        onClick={() =>
                          updateRate(index, { extra_charges: [...rate.extra_charges, { charge_name: "", amount: "" }] })
                        }
                      >
                        <FaPlus size={11} /> Add extra charge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="rc-routes-footer">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="rc-btn rc-btn-secondary" onClick={addRoute}>
            <FaPlus size={12} /> {addLabel}
          </button>
          {rates.length > 1 && (
            <button
              type="button"
              className="rc-btn rc-btn-ghost"
              onClick={() => setOpenKeys(allOpen ? new Set() : new Set(rates.map((r) => r._key)))}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        {rates.length > 1 && (
          <div className="rc-bulk-fuel">
            <span>Set fuel surcharge on every route</span>
            <PercentInput value={bulkFuel} onChange={setBulkFuel} label="Fuel surcharge for every route" />
            <button
              type="button"
              className="rc-btn rc-btn-secondary rc-btn-sm"
              disabled={bulkFuel === ""}
              onClick={() => onChange(rates.map((rate) => ({ ...rate, fuel_surcharge: bulkFuel })))}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RouteRatesEditor
