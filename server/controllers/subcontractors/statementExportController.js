// Export snapshots for subcontractor statements.
//
// Flow, deliberately two steps:
//   1. POST .../export            -> server re-derives the statement from legs,
//                                    stores the frozen payload, returns it
//   2. POST .../:id/document      -> client uploads the file it rendered from
//                                    that payload; server puts it in S3
//
// The split exists so the server is the only thing that ever computes money.
// If the client posted its own totals, a forged request would write forged
// figures straight into the audit record.
import {
  deriveStatement,
  getLatestExport,
  insertExport,
  attachDocument,
  listExports,
  getExportById,
} from "../../models/subcontractors/statementExportModel.js";
import { auditFromReq, auditFailureFromReq } from "../../utils/auditLogger.js";
import { s3, bucketName, getSignedUrl } from "../../utils/s3-config.js";

const DOCUMENT_URL_TTL_SECONDS = 300;

const EXTENSION_BY_FORMAT = { PDF: "pdf", XLSX: "xlsx" };

const sanitiseSegment = (value) =>
  String(value || "unknown").replace(/[^a-zA-Z0-9-_]/g, "-");

// A snapshot row is meaningless to the client without its document link, and the
// link is short-lived by design (documents are never proxied through Express —
// the server only mints presigned URLs).
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
 * POST /subcontractor/statements/export
 * Body: { subei_reg_num, period: "YYYY-MM", vat_status: "VAT" | "NON_VAT" }
 *
 * Re-derives the statement and returns the payload to render from. Re-exporting
 * unchanged content reuses the existing snapshot rather than inserting a
 * duplicate, so this table holds versions rather than one row per button press.
 */
const createStatementExportHandler = async (req, res) => {
  const {
    subei_reg_num: subeiRegNum,
    period,
    vat_status: vatStatus,
    format,
  } = req.body;

  try {
    if (!subeiRegNum || !period || !vatStatus || !format) {
      return res.status(400).json({
        success: false,
        message:
          "subei_reg_num, period, vat_status and format are all required",
      });
    }

    const derived = await deriveStatement(subeiRegNum, period, vatStatus);

    if (derived.legCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${vatStatus} legs found for ${subeiRegNum} in ${derived.period.slice(0, 7)}`,
      });
    }

    const latest = await getLatestExport(subeiRegNum, period, vatStatus, format);
    const unchanged = latest && latest.content_hash === derived.contentHash;

    // Unchanged content already backed by a stored document: hand back that
    // document rather than producing a second identical one, so a re-print is
    // byte-for-byte what was sent the first time.
    const row = unchanged
      ? latest
      : await insertExport(derived, format, actorFrom(req));

    await auditFromReq(req, {
      actionType: "SUBCONTRACTOR_STATEMENT_EXPORTED",
      entityType: "subcontractor_statement",
      targetId: row.export_id,
      targetName: `${subeiRegNum} ${derived.period.slice(0, 7)} ${vatStatus}`,
      details: unchanged
        ? `Re-exported unchanged statement (snapshot ${row.export_id})`
        : `Exported new statement snapshot ${row.export_id}`,
      metadata: {
        subei_reg_num: subeiRegNum,
        period: derived.period,
        vat_status: vatStatus,
        format,
        amount: derived.amountText,
        leg_count: derived.legCount,
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
      payload: {
        subei_reg_num: derived.subeiRegNum,
        period: derived.period,
        vat_status: derived.vatStatus,
        amount: derived.amount,
        leg_count: derived.legCount,
        content_hash: derived.contentHash,
        legs: derived.legs,
      },
    });
  } catch (error) {
    console.error("Error creating statement export snapshot:", error);
    await auditFailureFromReq(req, {
      actionType: "SUBCONTRACTOR_STATEMENT_EXPORTED",
      entityType: "subcontractor_statement",
      details: `Export failed: ${error.message}`,
      metadata: { subei_reg_num: subeiRegNum, period, vat_status: vatStatus },
    });
    return res.status(500).json({
      success: false,
      message: "Failed to record statement export",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * POST /subcontractor/statements/exports/:exportId/document
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
        message: "This snapshot already has a document and cannot be replaced",
      });
    }

    const format = req.file.mimetype === "application/pdf" ? "PDF" : "XLSX";

    // The snapshot was created for a specific format; filling it with the other
    // one would make document_format lie about the stored bytes.
    if (snapshot.document_format && snapshot.document_format !== format) {
      return res.status(400).json({
        success: false,
        message: `Snapshot ${exportId} expects a ${snapshot.document_format} document, received ${format}`,
      });
    }

    const key = [
      "subcontractor-statements",
      sanitiseSegment(snapshot.subbie_reg_num),
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
        message: "This snapshot already has a document and cannot be replaced",
      });
    }

    await auditFromReq(req, {
      actionType: "SUBCONTRACTOR_STATEMENT_DOCUMENT_STORED",
      entityType: "subcontractor_statement",
      targetId: updated.export_id,
      targetName: `${updated.subbie_reg_num} ${String(updated.period).slice(0, 7)} ${updated.vat_status}`,
      details: `Stored ${format} document for snapshot ${updated.export_id}`,
      metadata: {
        document_key: key,
        document_format: format,
        document_size: req.file.size,
        content_hash: updated.content_hash,
      },
    });

    return res.json({ success: true, export: withDocumentUrl(updated) });
  } catch (error) {
    console.error("Error attaching statement export document:", error);
    await auditFailureFromReq(req, {
      actionType: "SUBCONTRACTOR_STATEMENT_DOCUMENT_STORED",
      entityType: "subcontractor_statement",
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
 * GET /subcontractor/statements/exports?subei_reg_num&period&vat_status
 * Snapshot history. Headers only — the leg payload comes from the detail route.
 */
const listStatementExportsHandler = async (req, res) => {
  try {
    const { subei_reg_num: subeiRegNum, period, vat_status: vatStatus } = req.query;

    if (!subeiRegNum) {
      return res
        .status(400)
        .json({ success: false, message: "subei_reg_num is required" });
    }

    const rows = await listExports({
      subeiRegNum,
      period: period || null,
      vatStatus: vatStatus || null,
    });

    return res.json(rows.map(withDocumentUrl));
  } catch (error) {
    console.error("Error listing statement exports:", error);
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
 * GET /subcontractor/statements/exports/:exportId
 * The frozen payload plus a short-lived link to the stored document. Audited as
 * a sensitive read — this is how a historical financial document gets retrieved.
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
    console.error("Error fetching statement export:", error);
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
