"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FaPlus, FaSearch, FaTimes, FaLayerGroup, FaTrash, FaPen } from "react-icons/fa"
import api from "../../../../api.js"
import { showAlert, showConfirmDialog } from "../../utils/alertUtils.js"
import RouteRatesEditor, {
  emptyRate,
  rateFromApi,
  isRateComplete,
  isRateBlank,
  duplicateTitleKeys,
} from "../clientRates/RouteRatesEditor"
import { useFooterOffset } from "./useFooterOffset"
import { confirmOpenInstructionImpact, findTitleChanges } from "./openInstructionImpact"
import "../../css/RateCards.css"

// Shared rate cards: named price lists (rates identified by title) that can be assigned to any
// number of clients. Self-contained (own state + API calls).

const errorText = (err) => err.response?.data?.error || err.message

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch])

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"

// ---------- Client picker ----------

const CardClientsPicker = ({ clients, selectedIds, onChange }) => {
  const [filter, setFilter] = useState("")
  const term = filter.trim().toLowerCase()
  const visible = term ? clients.filter((c) => c.name.toLowerCase().includes(term)) : clients
  const selected = clients.filter((c) => selectedIds.includes(c.id))
  const toggle = (id) => onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  return (
    <div>
      {selected.length > 0 ? (
        <div className="rc-chips" aria-label="Selected clients">
          {selected.map((c) => (
            <span className="rc-chip" key={c.id}>
              {c.name}
              <button type="button" onClick={() => toggle(c.id)} aria-label={`Remove ${c.name}`} title="Remove">
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="rc-hint" style={{ margin: "0 0 12px", fontSize: 14 }}>
          No clients selected yet. Tick the clients below who should be charged from this card.
        </p>
      )}

      <div className="rc-toolbar">
        <div className="rc-search">
          <FaSearch size={13} />
          <input
            type="text"
            className="rc-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            className="rc-btn rc-btn-ghost rc-btn-sm"
            onClick={() => onChange([...new Set([...selectedIds, ...visible.map((c) => c.id)])])}
            disabled={visible.length === 0}
          >
            Select {term ? "shown" : "all"}
          </button>
          <button
            type="button"
            className="rc-btn rc-btn-ghost rc-btn-sm"
            onClick={() => onChange(selectedIds.filter((id) => !visible.some((c) => c.id === id)))}
            disabled={!visible.some((c) => selectedIds.includes(c.id))}
          >
            Clear {term ? "shown" : "all"}
          </button>
        </div>
      </div>

      <div className="rc-checklist">
        {visible.length === 0 ? (
          <p className="rc-hint" style={{ padding: "8px 10px", margin: 0 }}>
            {clients.length === 0 ? "Loading clients…" : `No clients match "${filter}".`}
          </p>
        ) : (
          visible.map((c) => (
            <label className="rc-check" key={c.id}>
              <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

// ---------- Card editor ----------

const snapshot = (fields, rates, clientIds) =>
  JSON.stringify({
    ...fields,
    rates: rates.filter((r) => !isRateBlank(r)).map(({ _key, _openOnAdd, ...r }) => r),
    clientIds: [...clientIds].sort((a, b) => a - b),
  })

const RateCardForm = ({ card, onSaved, onCancel }) => {
  const isNew = !card?.rate_card_id
  const [name, setName] = useState(card?.name || "")
  const [description, setDescription] = useState(card?.description || "")
  const [status, setStatus] = useState(card ? card.status !== false : true)
  const [rates, setRates] = useState(() =>
    card?.rates?.length ? card.rates.map((r) => rateFromApi(r, "rate_card_rate_id")) : [emptyRate()],
  )
  const originalClientIds = useRef((card?.clients || []).map((c) => c.m5clientkey)).current
  const [clientIds, setClientIds] = useState(originalClientIds)
  const [activeClients, setActiveClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const footerOffset = useFooterOffset()
  const savedState = useRef(snapshot({ name, description, status }, rates, clientIds)).current

  useEffect(() => {
    api
      .get("/api/instructions/active-clients")
      .then((res) => setActiveClients(res.data || []))
      .catch((err) => console.error("Error loading clients:", err))
  }, [])

  // Active clients plus any already on the card that have since been made
  // inactive, so they can still be removed.
  const pickerClients = [
    ...activeClients.map((c) => ({ id: c.m5clientkey, name: c.companyname || `Client ${c.m5clientkey}` })),
    ...(card?.clients || [])
      .filter((c) => !activeClients.some((a) => a.m5clientkey === c.m5clientkey))
      .map((c) => ({ id: c.m5clientkey, name: `${c.client} (inactive)` })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  const filledRates = rates.filter((r) => !isRateBlank(r))
  const isDirty = snapshot({ name, description, status }, rates, clientIds) !== savedState

  // Warn about newly added clients whose existing prices beat this card on
  // of this card's rates; returns false when the user backs out.
  const confirmConflicts = async () => {
    const addedIds = clientIds.filter((id) => !originalClientIds.includes(id))
    if (addedIds.length === 0) return true
    const res = await api.post("/api/rate-cards/assignment-conflicts", {
      rateCardId: card?.rate_card_id || null,
      titles: filledRates.map((r) => r.title.trim()),
      clientIds: addedIds,
    })
    const conflicts = res.data || []
    if (conflicts.length === 0) return true

    const byClient = new Map()
    for (const c of conflicts) {
      if (!byClient.has(c.client)) byClient.set(c.client, [])
      const winner = c.winning_source === "client" ? "their own price" : `the "${c.winning_card}" card`
      byClient
        .get(c.client)
        .push(
          `${escapeHtml(c.title)} <span style='color:#6b7280'>(uses ${escapeHtml(winner)})</span>`,
        )
    }
    const html =
      "<div style='text-align:left;font-size:14px;line-height:1.5'>" +
      "<p style='margin:0 0 8px'>These clients already have a price that takes priority on some of this card's rates, so <strong>those rates won't change for them</strong>:</p>" +
      "<div style='max-height:240px;overflow:auto;border:1px solid #e5e7eb;border-radius:6px;padding:4px 12px'>" +
      [...byClient.entries()]
        .map(
          ([client, clientRates]) =>
            `<p style='margin:8px 0 2px'><strong>${escapeHtml(client)}</strong></p><ul style='margin:0 0 6px;padding-left:18px'>${clientRates
              .map((r) => `<li>${r}</li>`)
              .join("")}</ul>`,
        )
        .join("") +
      "</div><p style='margin:10px 0 0'>Every other rate on the card will apply to them. To change the order, open the client on the Client Rates tab.</p></div>"
    return showConfirmDialog("Some rates won't apply to these clients", html, "Save anyway", { html: true })
  }

  // Warn when removed / renamed rates, removed clients or making the card
  // inactive touch open instructions; returns false when the user backs out.
  const confirmOpenInstructions = () => {
    if (isNew) return true
    const originalRates = card.rates || []
    const keptIds = new Set(filledRates.map((r) => r.rate_card_rate_id).filter(Boolean))
    const removedIds = originalRates.map((r) => r.rate_card_rate_id).filter((id) => !keptIds.has(id))
    const renames = findTitleChanges(originalRates, filledRates, "rate_card_rate_id", "card")
    const goingInactive = card.status !== false && status === false
    const droppedClientIds = goingInactive
      ? originalClientIds
      : originalClientIds.filter((id) => !clientIds.includes(id))
    return confirmOpenInstructionImpact({
      cardRateIds: [...removedIds, ...renames.map((r) => r.id)],
      cardClients: droppedClientIds.map((clientId) => ({ rateCardId: card.rate_card_id, clientId })),
      renames,
      isRemoval: (row) => droppedClientIds.includes(row.clientid),
    })
  }

  const handleCancel = async () => {
    if (isDirty) {
      const leave = await showConfirmDialog("Discard changes?", "You have unsaved changes to this rate card.", "Discard changes")
      if (!leave) return
    }
    onCancel()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (
      !name.trim() ||
      filledRates.length === 0 ||
      !filledRates.every(isRateComplete) ||
      duplicateTitleKeys(filledRates).size > 0
    ) {
      setShowErrors(true)
      showAlert(
        "A few things are missing",
        !name.trim()
          ? "Give the rate card a name."
          : filledRates.length === 0
            ? "Add at least one rate with its prices."
            : "Each rate needs a unique title, a 6m or 12m price, and either both a starting point and destination or neither. The ones that need attention are marked in red with the reason.",
        "warning",
      )
      return
    }
    setSaving(true)
    try {
      if (!(await confirmConflicts())) return
      if (!(await confirmOpenInstructions())) return
      const payload = { name: name.trim(), description, status, rates: filledRates, clientIds }
      const res = isNew
        ? await api.post("/api/rate-cards", payload)
        : await api.put(`/api/rate-cards/${card.rate_card_id}`, payload)
      const moved = res.data?.renamedInstructions || 0
      showAlert(
        "Rate card saved",
        `"${name.trim()}" has been saved.${
          moved ? ` ${plural(moved, "open instruction")} moved to the renamed rate titles.` : ""
        }`,
      )
      onSaved()
    } catch (err) {
      console.error("Error saving rate card:", err)
      showAlert("Could not save rate card", errorText(err), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="rc-page" style={footerOffset} onSubmit={handleSubmit} noValidate>
      <div className="rc-page-header">
        <div>
          <h2 className="rc-page-title">{isNew ? "New rate card" : card.name}</h2>
          <p className="rc-page-subtitle">
            {isNew
              ? "Set up a price list once, then choose which clients are charged from it."
              : "Price changes apply to new instructions for every client on this card. Amounts already captured on instructions don't change."}
          </p>
        </div>
      </div>

      {/* Step 1: details */}
      <section className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-heading">
            <span className="rc-step">1</span>
            <div>
              <h3 className="rc-section-title">Card details</h3>
              <p className="rc-section-desc">A clear name helps your team pick the right card, e.g. "Standard 2026".</p>
            </div>
          </div>
        </div>
        <div className="rc-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div className="rc-field">
            <label className="rc-label" htmlFor="rc-card-name">
              Name<span className="rc-required">*</span>
            </label>
            <input
              id="rc-card-name"
              type="text"
              className={`rc-input${showErrors && !name.trim() ? " rc-invalid" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 2026"
            />
            {showErrors && !name.trim() && <span className="rc-error-text">Enter a name for this card</span>}
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="rc-card-desc">
              Description
            </label>
            <input
              id="rc-card-desc"
              type="text"
              className="rc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional, e.g. Default prices for port work"
            />
          </div>
          <div className="rc-field">
            <span className="rc-label">Status</span>
            <label className="rc-switch">
              <input type="checkbox" checked={status} onChange={(e) => setStatus(e.target.checked)} />
              <span className="rc-switch-track" />
              <span>{status ? "Active: used for pricing" : "Inactive: not used for pricing"}</span>
            </label>
          </div>
        </div>
      </section>

      {/* Step 2: rates */}
      <section className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-heading">
            <span className="rc-step">2</span>
            <div>
              <h3 className="rc-section-title">Rates and prices</h3>
              <p className="rc-section-desc">
                Each rate has a title that controllers pick on the instruction. Click a rate to edit it, or use the copy button to start a similar one.
              </p>
            </div>
          </div>
        </div>
        <RouteRatesEditor rates={rates} onChange={setRates} showErrors={showErrors} />
      </section>

      {/* Step 3: clients */}
      <section className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-heading">
            <span className="rc-step">3</span>
            <div>
              <h3 className="rc-section-title">Clients using this card</h3>
              <p className="rc-section-desc">
                Selected clients are charged from this card. A client's own prices, and cards already higher in their
                list, still take priority. You'll be told before saving if that affects anyone.
              </p>
            </div>
          </div>
        </div>
        <CardClientsPicker clients={pickerClients} selectedIds={clientIds} onChange={setClientIds} />
      </section>

      <div className="rc-actionbar">
        <div className="rc-actionbar-summary">
          <strong>{plural(filledRates.length, "rate")}</strong> · <strong>{plural(clientIds.length, "client")}</strong>
          {isDirty && <span className="rc-pill rc-pill-amber" style={{ marginLeft: 10 }}>Unsaved changes</span>}
        </div>
        <div className="rc-actionbar-buttons">
          <button type="button" className="rc-btn rc-btn-secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="rc-btn rc-btn-primary" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create rate card" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  )
}

// ---------- List ----------

const RateCardsTab = () => {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  // null = list view; {} = new card; card object = editing
  const [editingCard, setEditingCard] = useState(null)
  const footerOffset = useFooterOffset()

  const loadCards = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/api/rate-cards")
      setCards(res.data || [])
    } catch (err) {
      console.error("Error loading rate cards:", err)
      showAlert("Could not load rate cards", errorText(err), "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const openCard = async (rateCardId) => {
    try {
      const res = await api.get(`/api/rate-cards/${rateCardId}`)
      setEditingCard(res.data)
    } catch (err) {
      showAlert("Could not open rate card", errorText(err), "error")
    }
  }

  const deleteCard = async (card) => {
    const confirmed = await showConfirmDialog(
      "Delete rate card?",
      `"${card.name}" and its ${plural(card.route_count, "rate")} will be permanently deleted.`,
      "Delete",
    )
    if (!confirmed) return
    try {
      await api.delete(`/api/rate-cards/${card.rate_card_id}`)
      loadCards()
    } catch (err) {
      showAlert("Could not delete rate card", errorText(err), "error")
    }
  }

  if (editingCard) {
    return (
      <RateCardForm
        key={editingCard.rate_card_id || "new"}
        card={editingCard.rate_card_id ? editingCard : null}
        onCancel={() => setEditingCard(null)}
        onSaved={() => {
          setEditingCard(null)
          loadCards()
        }}
      />
    )
  }

  const term = filter.trim().toLowerCase()
  const visible = term
    ? cards.filter((c) => `${c.name} ${c.description || ""}`.toLowerCase().includes(term))
    : cards

  return (
    <div className="rc-page" style={footerOffset}>
      <div className="rc-page-header">
        <div>
          <h2 className="rc-page-title">Rate cards</h2>
          <p className="rc-page-subtitle">
            Shared price lists you can apply to many clients. Set the prices once, and every client on the card is
            charged from it.
          </p>
        </div>
        <button type="button" className="rc-btn rc-btn-primary" onClick={() => setEditingCard({})}>
          <FaPlus size={12} /> New rate card
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading rate cards...</div>
      ) : cards.length === 0 ? (
        <div className="rc-empty">
          <FaLayerGroup size={28} className="rc-empty-icon" />
          <div className="rc-empty-title">No rate cards yet</div>
          <p>
            Create a rate card with your standard rates and prices, then assign it to clients instead of entering
            the same prices for each one.
          </p>
          <button type="button" className="rc-btn rc-btn-primary" onClick={() => setEditingCard({})}>
            <FaPlus size={12} /> Create your first rate card
          </button>
        </div>
      ) : (
        <section className="rc-section">
          <div className="rc-toolbar">
            <div className="rc-search">
              <FaSearch size={13} />
              <input
                type="text"
                className="rc-input"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search rate cards…"
                aria-label="Search rate cards"
              />
            </div>
            <span className="rc-hint">{plural(cards.length, "rate card")}</span>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Rate card</th>
                  <th className="rc-num">Rates</th>
                  <th className="rc-num">Clients</th>
                  <th>Status</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#6b7280", padding: 24 }}>
                      No rate cards match "{filter}".
                    </td>
                  </tr>
                ) : (
                  visible.map((card) => (
                    <tr key={card.rate_card_id}>
                      <td>
                        <button
                          type="button"
                          className="rc-back-link"
                          style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}
                          onClick={() => openCard(card.rate_card_id)}
                        >
                          {card.name}
                        </button>
                        {card.description && <div className="rc-cell-sub">{card.description}</div>}
                      </td>
                      <td className="rc-num">{card.route_count}</td>
                      <td className="rc-num">{card.client_count}</td>
                      <td>
                        <span className={`rc-pill ${card.status ? "rc-pill-green" : ""}`}>
                          {card.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="rc-hint" style={{ fontSize: 13.5 }}>
                        {formatDate(card.updated_at)}
                      </td>
                      <td>
                        <div className="rc-actions">
                          <button
                            type="button"
                            className="rc-icon-btn"
                            onClick={() => openCard(card.rate_card_id)}
                            title="Edit rate card"
                            aria-label={`Edit ${card.name}`}
                          >
                            <FaPen size={12} />
                          </button>
                          <button
                            type="button"
                            className="rc-icon-btn rc-danger"
                            onClick={() => deleteCard(card)}
                            disabled={card.client_count > 0}
                            title={
                              card.client_count > 0
                                ? `Used by ${plural(card.client_count, "client")}. Remove it from them before deleting.`
                                : "Delete rate card"
                            }
                            aria-label={`Delete ${card.name}`}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default RateCardsTab
