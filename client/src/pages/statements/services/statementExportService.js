// Client statement export snapshots.
//
// The server derives the statement, freezes it, and hands back the payload; the
// browser renders the document from THAT payload and uploads the file it
// produced. The client never tells the server what the amounts are — otherwise a
// forged request would write forged money into the audit record.
//
// Everything goes through the shared api instance so the JWT interceptor and
// 401/expiry handling apply. The extension on the import is required:
// client/package.json sets "type": "module", so webpack resolves .js imports as
// fully specified.
import api from "../../../api.js";

/**
 * Freeze the statement and get back the payload to render from.
 *
 * `detailOverrides` carries the free-text "Details" edits made on the page. They
 * are sent so the archived payload matches the document that was produced, and
 * they are text only — every figure still comes from the server.
 *
 * `expectedContentHash` is the content_hash the page received with the
 * statement. The server refuses with 409 STATEMENT_CHANGED if the statement no
 * longer derives to it, before anything is recorded.
 */
export const requestStatementExport = async ({
  statementId,
  format,
  expectedContentHash,
  detailOverrides = null,
}) => {
  const { data } = await api.post(`/api/statements/${statementId}/export`, {
    format,
    expected_content_hash: expectedContentHash,
    detail_overrides: detailOverrides,
  });
  return data;
};

/**
 * Attach the rendered file to its export. Write-once — a repeat gets a 409.
 *
 * The Content-Type override is required, not cosmetic: the shared api instance
 * defaults to application/json, and axios 1.x converts FormData to JSON when the
 * request already carries a JSON content type — the file would silently never be
 * sent. Setting multipart/form-data makes the browser adapter drop the header
 * and supply its own with the boundary.
 */
export const uploadStatementDocument = async (exportId, blob, filename) => {
  const form = new FormData();
  form.append("document", blob, filename);
  const { data } = await api.post(
    `/api/statement-exports/${exportId}/document`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

/** Export history for the panel on the statement page. */
export const fetchStatementExports = async ({ statementId }) => {
  const { data } = await api.get("/api/statement-exports", {
    params: { statementId },
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

/** Rand, always with cents — matches the formatting used across the app. */
export const formatRand = (value) =>
  `R${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
