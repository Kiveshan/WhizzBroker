// Export snapshots for client statements.
//
// Flow, deliberately two steps:
//   1. POST .../export           -> server derives the statement, stores the
//                                   frozen payload, returns it
//   2. POST .../:id/document     -> client uploads the file it rendered from
//                                   that payload; server puts it in S3
//
// The split exists so the server is the only thing that ever computes money. If
// the client posted its own totals, a forged request would write forged figures
// straight into the audit record.
import {
  deriveStatement,
  getLatestExport,
  insertExport,
  attachDocument,
  listExports,
  getExportById,
} from "../../models/statements/statementExportModel.js";
import { auditFromReq, auditFailureFromReq } from "../../utils/auditLogger.js";
import { s3, bucketName, getSignedUrl } from "../../utils/s3-config.js";

const DOCUMENT_URL_TTL_SECONDS = 300;
const EXTENSION_BY_FORMAT = { PDF: "pdf", XLSX: "xlsx" };

const sanitiseSegment = (value) =>
  String(value || "unknown").replace(/[^a-zA-Z0-9-_]/g, "-");

// Documents are never proxied through Express — the server only mints
// short-lived presigned URLs.
const withDocumentUrl = (row) => {
  if (!row) return row;
  return {
    ...row,
    document_url: row.document_key
      ? getSignedUrl(row.document_key, DOCUMENT_URL_TTL_SECONDS)
      : null,
  };
};

// Denormalised onto the snapshot so the record survives the user being renamed
// or deleted — same shape requestContext() uses for audit_log.actor_name.
const actorFrom = (req) => ({
  id: req.user?.userid ?? null,
  name: req.user
    ? [req.user.name, req.user.surname].filter(Boolean).join(" ") ||
      `User ${req.user.userid}`
    : null,
});

/**
 * POST /api/statements/:statementId/export
 * Body: { format: "PDF" | "XLSX", expected_content_hash, detail_overrides? }
 *
 * Freezes the statement and returns the payload to render from. Re-exporting
 * unchanged content reuses the existing snapshot rather than inserting a
 * duplicate, so this table holds versions rather than one row per button press.
 *
 * expected_content_hash is the content_hash the page received when it loaded
 * the statement. If the statement now derives to anything else, the export is
 * refused BEFORE a snapshot or audit row is written: the page is showing stale
 * figures, and the document it would render would disagree with the record.
 */
const createStatementExportHandler = async (req, res) => {
  const { statementId } = req.params;
  const {
    format,
    detail_overrides: detailOverrides,
    expected_content_hash: expectedHash,
  } = req.body;

  try {
    if (!statementId || !format || !expectedHash) {
      return res.status(400).json({
        success: false,
        message: "statementId, format and expected_content_hash are all required",
      });
    }

    const derived = await deriveStatement(statementId, detailOverrides);

    if (derived.contentHash !== expectedHash) {
      return res.status(409).json({
        success: false,
        code: "STATEMENT_CHANGED",
        message:
          "This statement has changed since the page was opened. Reload the page before downloading.",
        totals: derived.totals,
      });
    }

    const latest = await getLatestExport(derived.statementKey, format);
    const unchanged = latest && latest.content_hash === derived.contentHash;

    // Unchanged content already backed by a stored document: hand back that
    // document rather than producing a second identical one, so a re-issue is
    // byte-for-byte what the client received the first time.
    const row = unchanged
      ? latest
      : await insertExport(derived, format, actorFrom(req));

    await auditFromReq(req, {
      actionType: "CLIENT_STATEMENT_EXPORTED",
      entityType: "client_statement",
      targetId: row.export_id,
      targetName: `Statement ${derived.statementKey} · ${derived.period.slice(0, 7)}`,
      details: unchanged
        ? `Re-issued unchanged statement ${derived.statementKey}`
        : `Exported statement ${derived.statementKey}`,
      metadata: {
        statement_key: derived.statementKey,
        clientid: derived.clientId,
        period: derived.period,
        format,
        balance_due: derived.totals.balanceDue,
        aging: derived.aging,
        line_item_count: derived.lineItemCount,
        content_hash: derived.contentHash,
        reused_snapshot: Boolean(unchanged),
      },
    });

    return res.json({
      success: true,
      reused: Boolean(unchanged),
      // true when the client still needs to render and upload the document —
      // either a brand new snapshot, or an older one whose upload never landed
      document_pending: !row.document_key,
      export: withDocumentUrl(row),
      totals: derived.totals,
      payload: derived.payload,
      content_hash: derived.contentHash,
    });
  } catch (error) {
    console.error("Error creating client statement export:", error);
    await auditFailureFromReq(req, {
      actionType: "CLIENT_STATEMENT_EXPORTED",
      entityType: "client_statement",
      targetId: statementId,
      details: `Export failed: ${error.message}`,
      metadata: { statement_key: statementId, format },
    });
    const notFound = /not found/i.test(error.message);
    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound ? error.message : "Failed to record statement export",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * POST /api/statement-exports/:exportId/document
 * Multipart field: `document` (PDF or XLSX)
 *
 * Stores the rendered document against an existing snapshot. A snapshot's
 * document is written once and never replaced — a second upload is refused
 * rather than overwriting history.
 */
const attachStatementExportDocumentHandler = async (req, res) => {
  const { exportId } = req.params;

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No document file was uploaded" });
    }

    const snapshot = await getExportById(exportId);
    if (!snapshot) {
      return res
        .status(404)
        .json({ success: false, message: `Export ${exportId} not found` });
    }

    if (snapshot.document_key) {
      return res.status(409).json({
        success: false,
        message: "This export already has a document and cannot be replaced",
      });
    }

    const format = req.file.mimetype === "application/pdf" ? "PDF" : "XLSX";

    // The snapshot was created for a specific format; filling it with the other
    // one would make document_format lie about the stored bytes.
    if (snapshot.document_format && snapshot.document_format !== format) {
      return res.status(400).json({
        success: false,
        message: `Export ${exportId} expects a ${snapshot.document_format} document, received ${format}`,
      });
    }

    const key = [
      "client-statements",
      sanitiseSegment(snapshot.clientid),
      String(snapshot.period).slice(0, 7),
      `export-${snapshot.export_id}.${EXTENSION_BY_FORMAT[format]}`,
    ].join("/");

    await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
      .promise();

    const updated = await attachDocument(snapshot.export_id, {
      key,
      format,
      size: req.file.size,
    });

    // Lost a race with a concurrent upload; the object is orphaned in S3 but the
    // first document stands, which is the property that matters.
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "This export already has a document and cannot be replaced",
      });
    }

    await auditFromReq(req, {
      actionType: "CLIENT_STATEMENT_DOCUMENT_STORED",
      entityType: "client_statement",
      targetId: updated.export_id,
      targetName: `Statement ${updated.statement_key} · ${String(updated.period).slice(0, 7)}`,
      details: `Stored ${format} document for export ${updated.export_id}`,
      metadata: {
        document_key: key,
        document_format: format,
        document_size: req.file.size,
        content_hash: updated.content_hash,
      },
    });

    return res.json({ success: true, export: withDocumentUrl(updated) });
  } catch (error) {
    console.error("Error attaching client statement document:", error);
    await auditFailureFromReq(req, {
      actionType: "CLIENT_STATEMENT_DOCUMENT_STORED",
      entityType: "client_statement",
      targetId: exportId,
      details: `Document upload failed: ${error.message}`,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to store statement document",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * GET /api/statement-exports?statementId=&clientId=
 * Snapshot history. Headers only — the payload comes from the detail route.
 */
const listStatementExportsHandler = async (req, res) => {
  try {
    const { statementId, clientId } = req.query;

    if (!statementId && !clientId) {
      return res.status(400).json({
        success: false,
        message: "statementId or clientId is required",
      });
    }

    // statementId is the derived "<clientId>-YYYY-MM" key, not a number —
    // parsing it as one turned "7-2026-08" into 7 and matched nothing.
    const rows = await listExports({
      statementKey: statementId ? String(statementId) : null,
      clientId: clientId ? Number.parseInt(clientId, 10) : null,
    });

    return res.json(rows.map(withDocumentUrl));
  } catch (error) {
    console.error("Error listing client statement exports:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list statement exports",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * GET /api/statement-exports/:exportId
 * The frozen payload plus a short-lived link to the stored document. Audited as
 * a sensitive read — this is how a historical financial document is retrieved.
 */
const getStatementExportHandler = async (req, res) => {
  try {
    const snapshot = await getExportById(req.params.exportId);
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: `Export ${req.params.exportId} not found`,
      });
    }
    return res.json(withDocumentUrl(snapshot));
  } catch (error) {
    console.error("Error fetching client statement export:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statement export",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

export {
  createStatementExportHandler,
  attachStatementExportDocumentHandler,
  listStatementExportsHandler,
  getStatementExportHandler,
};
