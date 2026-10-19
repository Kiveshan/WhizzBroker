"use client"

import { useState, useEffect, useRef } from "react"
import {
  FaArrowUp,
  FaArrowDown,
  FaTrash,
  FaInfoCircle,
  FaPlus,
  FaSearch,
  FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa"
import api from "../../../../api.js"
import { showAlert, showConfirmDialog } from "../../utils/alertUtils.js"
import RouteRatesEditor, {
  emptyRate,
  rateFromApi,
  isRateComplete,
  isRateBlank,
  formatRand,
  titleKey,
  duplicateTitleKeys,
} from "./RouteRatesEditor"
import { useFooterOffset } from "../rateCards/useFooterOffset"
import { confirmOpenInstructionImpact, findTitleChanges } from "../rateCards/openInstructionImpact"
import "../../css/RateCards.css"

const STATUS = {
  active: {
    text: "Charged",
    className: "rc-pill-green",
    title: "This is the price the client is charged for this rate.",
  },
  overridden: {
    text: "Client price used",
    className: "rc-pill-amber",
    title: "This client has its own price with the same title, which is used instead.",
  },
  superseded: {
    text: "Higher card used",
    className: "",
    title: "A rate card higher in this client's list has a rate with this title, so its price is used instead.",
  },
}

// Strips UI-only fields so a snapshot can be compared for unsaved changes.
const snapshot = (rates, cards) =>
  JSON.stringify({
    rates: rates.filter((r) => !isRateBlank(r)).map(({ _key, _openOnAdd, ...r }) => r),
    cards: cards.map((c) => [c.rate_card_id, String(c.fuel_surcharge ?? "")]),
  })

const ClientRatesForm = ({ clientData, loading, onSave, onCancel }) => {
  const [rates, setRates] = useState([])
  const [assignedCards, setAssignedCards] = useState([])
  const [availableCards, setAvailableCards] = useState([])
  const [cardToAdd, setCardToAdd] = useState("")
  const [routeFilter, setRouteFilter] = useState("")
  const [showErrors, setShowErrors] = useState(false)
  const savedState = useRef(null)
  const footerOffset = useFooterOffset()

  useEffect(() => {
    if (!clientData) return
    const ownRates = (clientData.rates || []).map((rate) => rateFromApi(rate, "client_rate_id"))
    const cards = (clientData.rate_cards || []).map((card) => ({
      rate_card_id: card.rate_card_id,
      name: card.name,
      status: card.status,
      route_count: card.route_count,
      fuel_surcharge: card.fuel_surcharge ?? "",
    }))
    setAssignedCards(cards)
    // A client with nothing yet starts with one blank rate to fill in; a
    // client on rate cards may have no prices of its own.
    const initialRates = ownRates.length > 0 || cards.length > 0 ? ownRates : [emptyRate()]
    setRates(initialRates)
    savedState.current = snapshot(initialRates, cards)
  }, [clientData])

  useEffect(() => {
    api
      .get("/api/rate-cards", { params: { active: "true" } })
      .then((res) => setAvailableCards(res.data || []))
      .catch((err) => console.error("Error loading rate cards:", err))
  }, [])

  if (loading && !clientData) {
    return <div className="loading">Loading client rates...</div>
  }

  if (!clientData) {
    return <div className="error">Error: No client data available</div>
  }

  const clientName = clientData.client || "this client"
  const filledRates = rates.filter((rate) => !isRateBlank(rate))
  const isDirty = savedState.current !== null && snapshot(rates, assignedCards) !== savedState.current
  const savedCardIds = (clientData.rate_cards || []).map((c) => c.rate_card_id).join(",")
  const cardsChanged = assignedCards.map((c) => c.rate_card_id).join(",") !== savedCardIds

  const addCard = () => {
    const card = availableCards.find((c) => String(c.rate_card_id) === String(cardToAdd))
    if (!card || assignedCards.some((c) => c.rate_card_id === card.rate_card_id)) return
    setAssignedCards([
      ...assignedCards,
      {
        rate_card_id: card.rate_card_id,
        name: card.name,
        status: card.status,
        route_count: card.route_count,
        fuel_surcharge: "",
      },
    ])
    setCardToAdd("")
  }

  const moveCard = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= assignedCards.length) return
    const next = [...assignedCards]
    ;[next[index], next[target]] = [next[target], next[index]]
    setAssignedCards(next)
  }

  const updateCardFuel = (index, value) =>
    setAssignedCards(assignedCards.map((c, i) => (i === index ? { ...c, fuel_surcharge: value } : c)))

  // Copy a card rate into the client's own prices (same title, so it takes
  // priority) so a different price can be set for this client only.
  const setClientPrice = (route) => {
    const exists = rates.some((r) => titleKey(r.title) === titleKey(route.title))
    if (exists) {
      showAlert(
        "Already has a client price",
        `${clientName} already has its own "${route.title}" price. Edit it under "Client-specific prices".`,
        "info",
      )
      return
    }
    const { client_rate_id, ...copy } = rateFromApi(route)
    setRates([...rates.filter((r) => !isRateBlank(r)), { ...copy, _openOnAdd: true }])
  }

  const handleCancel = async () => {
    if (isDirty) {
      const leave = await showConfirmDialog(
        "Discard changes?",
        "You have unsaved changes to this client's rates.",
        "Discard changes",
      )
      if (!leave) return
    }
    onCancel?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (filledRates.length === 0 && assignedCards.length === 0) {
      showAlert(
        "Nothing to charge from",
        "Assign at least one rate card, or add a client-specific price, before saving.",
        "warning",
      )
      return
    }
    if (!filledRates.every(isRateComplete) || duplicateTitleKeys(filledRates).size > 0) {
      setShowErrors(true)
      showAlert(
        "Some prices are incomplete",
        "Each client-specific price needs a unique title, a 6m or 12m price, and either both a starting point and destination or neither. The ones that need attention are marked in red with the reason.",
        "warning",
      )
      return
    }
    if (!(await confirmOpenInstructions())) return
    await onSave(
      filledRates,
      assignedCards.map((c) => ({ rate_card_id: c.rate_card_id, fuel_surcharge: c.fuel_surcharge })),
    )
  }

  // Warn when removed / renamed prices or removed rate cards touch this
  // client's open instructions; returns false when the user backs out.
  const confirmOpenInstructions = () => {
    const originalRates = clientData.rates || []
    const keptIds = new Set(filledRates.map((r) => r.client_rate_id).filter(Boolean))
    const removedIds = originalRates.map((r) => r.client_rate_id).filter((id) => !keptIds.has(id))
    const renames = findTitleChanges(originalRates, filledRates, "client_rate_id", "client")
    const removedCards = (clientData.rate_cards || []).filter(
      (c) => !assignedCards.some((a) => a.rate_card_id === c.rate_card_id),
    )

    // The price that takes over once a removed rate is gone: a client price
    // with the same title (e.g. one just added), else the highest card left.
    const fallbackFor = (row) => {
      const key = titleKey(row.title)
      const ownPrice = filledRates.some(
        (r) => titleKey(r.title) === key && !(row.rate_source === "client" && r.client_rate_id === row.source_rate_id),
      )
      if (ownPrice) return "client's own"
      for (const card of assignedCards) {
        if (row.rate_source === "card" && card.rate_card_id === row.rate_card_id) continue
        if ((clientData.card_routes || []).some((r) => r.rate_card_id === card.rate_card_id && titleKey(r.title) === key)) {
          return `"${card.name}" card`
        }
      }
      return null
    }

    return confirmOpenInstructionImpact({
      clientRateIds: [...removedIds, ...renames.map((r) => r.id)],
      cardClients: removedCards.map((c) => ({ rateCardId: c.rate_card_id, clientId: clientData.m5clientkey })),
      renames,
      fallbackFor,
    })
  }

  const unassignedCards = availableCards.filter((c) => !assignedCards.some((a) => a.rate_card_id === c.rate_card_id))
  const cardRoutes = clientData.card_routes || []
  const filterText = routeFilter.trim().toLowerCase()
  const visibleRoutes = filterText
    ? cardRoutes.filter((r) =>
        `${r.title} ${r.starting_point || ""} ${r.destination || ""} ${r.rate_card_name}`.toLowerCase().includes(filterText),
      )
    : cardRoutes
  const chargedCount = cardRoutes.filter((r) => r.resolution === "active").length

  return (
    <form className="rc-page" style={footerOffset} onSubmit={handleSubmit} noValidate>
      <div className="rc-page-header">
        <div>
          <h2 className="rc-page-title">Rates for {clientName}</h2>
          <p className="rc-page-subtitle">
            Choose the rate cards this client is charged from, and add client-specific prices only where they differ.
          </p>
        </div>
      </div>

      <div className="rc-callout">
        <FaInfoCircle size={16} />
        <div>
          <strong>How this client's price is chosen</strong>
          <ol>
            <li>If the client has its own price with that title, that price is used.</li>
            <li>Otherwise, the first rate card in the list below that has a rate with that title is used.</li>
          </ol>
        </div>
      </div>

      {/* Step 1: rate cards */}
      <section className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-heading">
            <span className="rc-step">1</span>
            <div>
              <h3 className="rc-section-title">Rate cards</h3>
              <p className="rc-section-desc">
                Shared price lists set up on the Rate Cards tab. Use the arrows to set which card comes first when two
                cards have a rate with the same title.
              </p>
            </div>
          </div>
        </div>

        {assignedCards.length === 0 ? (
          <p className="rc-hint" style={{ margin: "0 0 12px", fontSize: 14 }}>
            No rate cards assigned yet.
          </p>
        ) : (
          <div className="rc-assigned">
            {assignedCards.map((card, index) => (
              <div key={card.rate_card_id} className="rc-assigned-row">
                <span className="rc-order" title={index === 0 ? "First choice" : `Choice ${index + 1}`}>
                  {index + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="rc-cell-title">{card.name}</div>
                  <div className="rc-cell-sub">
                    {card.route_count ?? 0} rate{card.route_count === 1 ? "" : "s"}
                    {card.status === false && (
                      <span className="rc-pill rc-pill-red" style={{ marginLeft: 8 }}>
                        Inactive: not used for pricing
                      </span>
                    )}
                  </div>
                </div>
                <div className="rc-field">
                  <div className="rc-affix">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rc-input rc-has-suffix"
                      value={card.fuel_surcharge}
                      onChange={(e) => updateCardFuel(index, e.target.value)}
                      placeholder="Card's fuel %"
                      aria-label={`Fuel surcharge for ${clientName} on ${card.name}`}
                    />
                    <span className="rc-affix-label rc-suffix">%</span>
                  </div>
                  <span className="rc-hint">Fuel % for this client (optional)</span>
                </div>
                <div className="rc-actions">
                  <button
                    type="button"
                    className="rc-icon-btn"
                    onClick={() => moveCard(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                    aria-label="Move up"
                  >
                    <FaArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="rc-icon-btn"
                    onClick={() => moveCard(index, 1)}
                    disabled={index === assignedCards.length - 1}
                    title="Move down"
                    aria-label="Move down"
                  >
                    <FaArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    className="rc-icon-btn rc-danger"
                    onClick={() => setAssignedCards(assignedCards.filter((_, i) => i !== index))}
                    title="Remove card from this client"
                    aria-label="Remove card from this client"
                  >
                    <FaTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rc-add-card">
          <select
            className="rc-select"
            value={cardToAdd}
            onChange={(e) => setCardToAdd(e.target.value)}
            aria-label="Rate card to assign"
            disabled={unassignedCards.length === 0}
          >
            <option value="">
              {unassignedCards.length === 0
                ? availableCards.length === 0
                  ? "No rate cards set up yet"
                  : "All rate cards are assigned"
                : "Choose a rate card…"}
            </option>
            {unassignedCards.map((card) => (
              <option key={card.rate_card_id} value={card.rate_card_id}>
                {card.name} ({card.route_count} rate{card.route_count === 1 ? "" : "s"})
              </option>
            ))}
          </select>
          <button type="button" className="rc-btn rc-btn-secondary" onClick={addCard} disabled={!cardToAdd}>
            <FaPlus size={12} /> Assign card
          </button>
        </div>

        {(cardRoutes.length > 0 || cardsChanged) && (
          <div style={{ marginTop: 20 }}>
            <div className="rc-toolbar">
              <div>
                <p className="rc-group-title" style={{ margin: 0 }}>
                  Rates from these cards
                </p>
                {cardRoutes.length > 0 && (
                  <span className="rc-hint">
                    {chargedCount} of {cardRoutes.length} card rate{cardRoutes.length === 1 ? "" : "s"} charged to
                    this client
                  </span>
                )}
              </div>
              {cardRoutes.length > 8 && (
                <div className="rc-search">
                  <FaSearch size={13} />
                  <input
                    type="text"
                    className="rc-input"
                    value={routeFilter}
                    onChange={(e) => setRouteFilter(e.target.value)}
                    placeholder="Filter rates…"
                    aria-label="Filter rates"
                  />
                </div>
              )}
            </div>

            {cardsChanged && (
              <div className="rc-callout rc-callout-warn" style={{ marginBottom: 12 }}>
                <FaExclamationTriangle size={14} />
                <div>You've changed this client's cards. Save to update this list.</div>
              </div>
            )}

            {visibleRoutes.length > 0 && (
              <div className="rc-table-wrap">
                <table className="rc-table">
                  <thead>
                    <tr>
                      <th>Rate</th>
                      <th>Card</th>
                      <th className="rc-num">6m</th>
                      <th className="rc-num">12m</th>
                      <th className="rc-num">Break bulk</th>
                      <th className="rc-num">Fuel</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRoutes.map((route) => {
                      const status = STATUS[route.resolution] || STATUS.active
                      return (
                        <tr
                          key={`${route.rate_card_id}-${route.source_rate_id}`}
                          className={route.resolution === "active" ? "" : "rc-row-muted"}
                        >
                          <td>
                            <div className="rc-cell-title">{route.title}</div>
                            {route.starting_point && route.destination && (
                              <div className="rc-cell-sub">
                                {route.starting_point} → {route.destination}
                              </div>
                            )}
                          </td>
                          <td>{route.rate_card_name}</td>
                          <td className="rc-num">{formatRand(route["6m_rate"])}</td>
                          <td className="rc-num">{formatRand(route["12m_rate"])}</td>
                          <td className="rc-num">{formatRand(route.set_rate)}</td>
                          <td className="rc-num">
                            {route.fuel_surcharge !== null && route.fuel_surcharge !== undefined
                              ? `${route.fuel_surcharge}%`
                              : "—"}
                          </td>
                          <td>
                            <span className={`rc-pill ${status.className}`} title={status.title}>
                              {status.text}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {route.resolution !== "overridden" && (
                              <button
                                type="button"
                                className="rc-btn rc-btn-ghost rc-btn-sm"
                                onClick={() => setClientPrice(route)}
                                title="Copy this rate into the client-specific prices so you can give this client a different price"
                              >
                                Set client price
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {cardRoutes.length > 0 && visibleRoutes.length === 0 && (
              <p className="rc-hint">No rates match "{routeFilter}".</p>
            )}
          </div>
        )}
      </section>

      {/* Step 2: client-specific prices */}
      <section className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-heading">
            <span className="rc-step">2</span>
            <div>
              <h3 className="rc-section-title">Client-specific prices</h3>
              <p className="rc-section-desc">
                Only needed when {clientName} pays a different price from its rate cards, or for a rate that isn't on
                any card. These always take priority over rate cards.
              </p>
            </div>
          </div>
        </div>

        <RouteRatesEditor
          rates={rates}
          onChange={setRates}
          showErrors={showErrors}
          addLabel="Add client price"
          emptyState={
            <div className="rc-empty" style={{ marginBottom: 4 }}>
              <FaLayerGroup size={22} className="rc-empty-icon" />
              <div className="rc-empty-title">No client-specific prices</div>
              <p>
                {assignedCards.length > 0
                  ? `${clientName} is charged entirely from its rate cards. Use "Set client price" on a card rate, or add a price below, if this client pays something different.`
                  : "Assign a rate card above, or add this client's prices below."}
              </p>
            </div>
          }
        />
      </section>

      <div className="rc-actionbar">
        <div className="rc-actionbar-summary">
          <strong>{assignedCards.length}</strong> rate card{assignedCards.length === 1 ? "" : "s"} ·{" "}
          <strong>{filledRates.length}</strong> client-specific price{filledRates.length === 1 ? "" : "s"}
          {isDirty && <span className="rc-pill rc-pill-amber" style={{ marginLeft: 10 }}>Unsaved changes</span>}
        </div>
        <div className="rc-actionbar-buttons">
          <button type="button" className="rc-btn rc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="rc-btn rc-btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default ClientRatesForm
