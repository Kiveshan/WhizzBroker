import api from "../../../../api.js"
import { showConfirmDialog } from "../../utils/alertUtils.js"

// Shared by the Rate Cards and Client Rates screens. Before a save that
// removes or renames rates (or takes a card off clients), asks the server which
// open instructions are priced from them and, if any are, explains what will
// happen and asks to confirm. Completed / invoiced instructions only use their
// stored amounts, so they are never affected and never listed.

const escapeHtml = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch])

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

// Same normalisation as the server's cleanTitle, so "  A  B " is not a rename of "A B".
export const cleanTitle = (title) => String(title ?? "").trim().replace(/\s+/g, " ")

const rowKey = (source, id) => `${source}:${id}`

// Existing rates (id set) whose title is changing. `idField` is client_rate_id
// or rate_card_rate_id; `source` is "client" or "card".
export const findTitleChanges = (originalRates, currentRates, idField, source) => {
  const original = new Map((originalRates || []).map((r) => [r[idField], cleanTitle(r.title)]))
  return (currentRates || [])
    .filter((r) => r[idField] && original.has(r[idField]) && cleanTitle(r.title) !== original.get(r[idField]))
    .map((r) => ({ source, id: r[idField], oldTitle: original.get(r[idField]), newTitle: cleanTitle(r.title) }))
}

const instructionRefs = (row) => {
  const shown = (row.sample_instructions || []).map((k) => `#${k}`).join(", ")
  return row.open_count > (row.sample_instructions || []).length ? `${shown}, …` : shown
}

/**
 * @param {object}   args
 * @param {number[]} [args.clientRateIds]  client rates removed or renamed
 * @param {number[]} [args.cardRateIds]    card rates removed or renamed
 * @param {{rateCardId:number, clientId:number}[]} [args.cardClients]  card no longer applying to a client
 * @param {{source:string,id:number,oldTitle:string,newTitle:string}[]} [args.renames]
 * @param {(row) => string|null} [args.fallbackFor]  name of the price that takes over for a removed rate, if known
 * @param {(row) => boolean} [args.isRemoval]  true when a row is going away even if its rate is also renamed
 *                                              (e.g. its client is being taken off the card)
 * @returns {Promise<boolean>} false when the user backs out
 */
export async function confirmOpenInstructionImpact({
  clientRateIds = [],
  cardRateIds = [],
  cardClients = [],
  renames = [],
  fallbackFor = () => null,
  isRemoval = () => false,
}) {
  if (!clientRateIds.length && !cardRateIds.length && !cardClients.length) return true

  let usage
  try {
    const res = await api.post("/api/rate-cards/rate-usage", { clientRateIds, cardRateIds, cardClients })
    usage = res.data || []
  } catch (err) {
    // The check is advisory; don't block a save because it failed.
    console.error("Could not check open instructions for these rates:", err)
    return true
  }
  if (usage.length === 0) return true

  const renameByKey = new Map(renames.map((r) => [rowKey(r.source, r.id), r]))
  const renamed = new Map()
  const removed = []
  for (const row of usage) {
    const rename = isRemoval(row) ? null : renameByKey.get(rowKey(row.rate_source, row.source_rate_id))
    if (rename) {
      const key = rowKey(rename.source, rename.id)
      renamed.set(key, { ...rename, count: (renamed.get(key)?.count || 0) + row.open_count })
    } else {
      removed.push(row)
    }
  }

  let html = "<div style='text-align:left;font-size:14px;line-height:1.5'>"

  if (renamed.size > 0) {
    html +=
      "<p style='margin:0 0 4px'><strong>Renamed</strong> — open instructions move to the new title automatically:</p><ul style='margin:0 0 10px;padding-left:18px'>" +
      [...renamed.values()]
        .map(
          (r) =>
            `<li>"${escapeHtml(r.oldTitle)}" → "${escapeHtml(r.newTitle)}": ${plural(r.count, "open instruction")}</li>`,
        )
        .join("") +
      "</ul>"
  }

  if (removed.length > 0) {
    const anyWithoutFallback = removed.some((row) => !fallbackFor(row))
    html +=
      "<p style='margin:0 0 4px'><strong>No longer available</strong> to these open instructions:</p>" +
      "<div style='max-height:220px;overflow:auto;border:1px solid #e5e7eb;border-radius:6px;padding:4px 12px;margin-bottom:8px'><ul style='margin:6px 0;padding-left:18px'>" +
      removed
        .map((row) => {
          const fallback = fallbackFor(row)
          return (
            `<li><strong>${escapeHtml(row.client_name)}</strong> — "${escapeHtml(row.title)}": ` +
            `${plural(row.open_count, "open instruction")} <span style='color:#6b7280'>(${escapeHtml(instructionRefs(row))})</span>` +
            (fallback
              ? `<br><span style='color:#027a48'>Will use the ${escapeHtml(fallback)} price instead.</span>`
              : "") +
            "</li>"
          )
        })
        .join("") +
      "</ul></div>" +
      "<p style='margin:0 0 8px'>Prices already saved on these instructions stay as they are." +
      (anyWithoutFallback
        ? " Where no other price takes over, the instruction shows the rate as <em>no longer on this client's rates</em>, and anything newly added to it (a container, surcharge or extra charge) is priced at <strong>R0</strong> until someone picks a current rate."
        : "") +
      "</p>"
  }

  html += "<p style='margin:0;color:#6b7280'>Completed and invoiced instructions are not affected.</p></div>"

  return showConfirmDialog("Open instructions use these rates", html, "Save changes", { html: true })
}
