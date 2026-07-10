import { useEffect, useState } from "react"
import api from "../../api.js"

/**
 * Picker for linking an add-on instruction to an existing add-on invoice.
 * Fetches the add-on invoices for the given client that are not yet linked to
 * any instruction. When `instructionId` is supplied (edit mode), the invoice
 * currently linked to that instruction is included so it stays selectable.
 *
 * Renders nothing structural beyond a labelled <select>; the parent decides
 * placement. The selected value is the add_ons.addon_id (as a string), stored
 * on formData.addon_id.
 */
export function AddonInvoicePicker({
  clientId,
  instructionId,
  value,
  onChange,
  disabled = false,
  error,
}) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false

    if (!clientId) {
      setOptions([])
      return
    }

    const fetchUnlinked = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const params = instructionId ? { instructionId } : {}
        const res = await api.get(`/api/addons/unlinked/client/${clientId}`, {
          params,
        })
        if (!cancelled) {
          setOptions(res.data?.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.message || "Failed to load add-on invoices"
          )
          setOptions([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUnlinked()
    return () => {
      cancelled = true
    }
  }, [clientId, instructionId])

  const formatLabel = (addon) => {
    const amount =
      addon.amount != null ? `R${Number(addon.amount).toFixed(2)}` : ""
    const date = addon.date
      ? new Date(addon.date).toLocaleDateString("en-ZA")
      : ""
    return [addon.invoice_number, amount, date].filter(Boolean).join(" — ")
  }

  const hintStyle = {
    fontSize: "0.68rem",
    lineHeight: 1.2,
    marginTop: "2px",
  }

  return (
    <div
      className="controller-instructions-form-field"
      style={{ flex: "1 1 160px", maxWidth: "220px" }}
    >
      <label style={{ fontSize: "0.78rem" }}>
        Add-On Invoice <span style={{ color: "#d32f2f" }}>*</span>
      </label>
      <div className="controller-instructions-input-wrapper">
        <select
          className={`controller-instructions-form-input ${
            error ? "controller-instructions-error-field" : ""
          }`}
          name="addon_id"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading || !clientId}
          style={{
            width: "100%",
            fontSize: "0.8rem",
            padding: "4px 6px",
            height: "32px",
          }}
          title={error || loadError || undefined}
        >
          <option value="">
            {loading
              ? "Loading…"
              : !clientId
                ? "Select a client first"
                : "Select invoice"}
          </option>
          {options.map((addon) => (
            <option key={addon.addon_id} value={String(addon.addon_id)}>
              {formatLabel(addon)}
            </option>
          ))}
        </select>
      </div>
      {loadError && (
        <div style={{ ...hintStyle, color: "#d32f2f" }}>{loadError}</div>
      )}
      {!loading && clientId && options.length === 0 && !loadError && (
        <div style={{ ...hintStyle, color: "#b26a00" }}>
          No unlinked invoices — create one first.
        </div>
      )}
      {error && <div style={{ ...hintStyle, color: "#d32f2f" }}>{error}</div>}
    </div>
  )
}
