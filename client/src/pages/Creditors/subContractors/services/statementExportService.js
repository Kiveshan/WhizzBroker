// Subcontractor statement export snapshots.
//
// The server derives the statement, freezes it, and hands back the payload; the
// browser renders the document from THAT payload and uploads the file it
// produced. The client never tells the server what the amounts are — otherwise
// a forged request would write forged money into the audit record.
//
// Everything goes through the shared api instance so the JWT interceptor and
// 401/expiry handling apply.
// Extension is required: client/package.json sets "type": "module", so webpack
// resolves .js imports as fully specified. Every other .js module here does the
// same; .jsx files are exempt.
import api from "../../../../api.js";

/**
 * Freeze the statement and get back the payload to render from.
 * Resolves to { reused, document_pending, export, payload }.
 */
export const requestStatementExport = async ({
  subeiRegNum,
  period,
  vatStatus,
  format,
}) => {
  const { data } = await api.post("/subcontractor/statements/export", {
    subei_reg_num: subeiRegNum,
    period,
    vat_status: vatStatus,
    format,
  });
  return data;
};

/**
 * Attach the rendered file to its snapshot. Write-once — a repeat gets a 409.
 *
 * The Content-Type override is required, not cosmetic: the shared api instance
 * defaults to application/json, and axios 1.x converts FormData to JSON when the
 * request already carries a JSON content type — the file would silently never
 * be sent. Setting multipart/form-data makes the browser adapter drop the header
 * and supply its own with the boundary. Same pattern as the other uploads in
 * this app (see pages/manage/hooks/useApi.js).
 */
export const uploadStatementDocument = async (exportId, blob, filename) => {
  const form = new FormData();
  form.append("document", blob, filename);
  const { data } = await api.post(
    `/subcontractor/statements/exports/${exportId}/document`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

/** Snapshot history for the panel on the statement details page. */
export const fetchStatementExports = async ({
  subeiRegNum,
  period = null,
  vatStatus = null,
}) => {
  const { data } = await api.get("/subcontractor/statements/exports", {
    params: {
      subei_reg_num: subeiRegNum,
      period: period || undefined,
      vat_status: vatStatus || undefined,
    },
  });
  return data;
};

/** Hand a generated file to the user. */
export const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Open a stored document from its presigned S3 URL. Documents are never proxied
 * through the API, and the link is short-lived, so it is opened immediately
 * rather than held on the page.
 */
export const openStoredDocument = (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

/**
 * Reshape a snapshot payload into the structure the PDF/Excel builders expect,
 * so documents render from server-derived figures rather than component state.
 *
 * `driverrate` is VAT-inclusive and already rounded to cents by the server; the
 * total is the sum of those rounded line items, so what is printed adds up.
 */
export const statementFromPayload = (payload, { subcontractorName, subcontractorId, generationDate }) => ({
  subcontractorName,
  subcontractorId,
  generationDate,
  contentHash: payload.content_hash,
  workItems: payload.legs.map((leg) => ({
    id: leg.legkey,
    date: leg.date,
    containerNumber: leg.containernumber || "N/A",
    destination: leg.destination,
    instructionNumber: leg.instruction_number || "N/A",
    clientName: leg.client_name || "N/A",
    rate: leg.driverrate || 0,
    instruction: leg.m1_description || "N/A",
  })),
  summary: {
    totalAmount: payload.amount,
    finalAmount: payload.amount,
  },
});
