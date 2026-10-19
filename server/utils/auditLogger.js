/**
 * Audit logging utility for tracking important actions.
 *
 * Two ways in:
 *  1. Automatically — middleware/auditTrail.js records every state-changing
 *     request (and the sensitive reads registered in config/auditActions.js).
 *  2. Explicitly — auditFromReq() inside a controller, when a business-level
 *     description ("Payment of R1 200 allocated to invoice 42") is worth more
 *     than the generic request-level one. An explicit call marks the request so
 *     the middleware does not write a second row for it.
 *
 * Requires migration 010_audit_log_full_coverage.sql.
 */

import { pool } from "../config/database.js";

const AUDIT_COLUMNS = `(
  action_type, entity_type, admin_id, actor_name, actor_role,
  target_employee_id, target_employee_name, timestamp, details, metadata,
  http_method, request_path, status_code, outcome, duration_ms,
  ip_address, user_agent
)`;

const AUDIT_PLACEHOLDERS = `(
  $1, $2, $3, $4, $5,
  $6, $7, NOW(), $8, $9,
  $10, $11, $12, $13, $14,
  $15, $16
)`;

// target ids are numeric in the schema; non-numeric targets (a PO number, a
// container number) survive as text on target_employee_name instead.
const toNumericId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const buildValues = ({
  actionType,
  entityType = null,
  actorId = null,
  actorName = null,
  actorRole = null,
  targetId = null,
  targetName = null,
  details = null,
  metadata = null,
  httpMethod = null,
  requestPath = null,
  statusCode = null,
  outcome = "SUCCESS",
  durationMs = null,
  ipAddress = null,
  userAgent = null,
}) => [
  actionType,
  entityType,
  actorId,
  actorName,
  actorRole,
  toNumericId(targetId),
  targetName ?? (targetId != null ? String(targetId) : null),
  details,
  metadata ? JSON.stringify(metadata) : null,
  httpMethod,
  requestPath,
  statusCode,
  outcome,
  durationMs,
  ipAddress,
  userAgent,
];

/**
 * Generic audit-trail writer. Fire-and-forget: audit failures are logged but
 * never break the operation being audited.
 */
export const logAudit = async (entry) => {
  try {
    await pool.query(
      `INSERT INTO audit_log ${AUDIT_COLUMNS} VALUES ${AUDIT_PLACEHOLDERS}`,
      buildValues(entry)
    );
  } catch (error) {
    console.error(`Failed to write audit log (${entry?.actionType}):`, error.message);
  }
};

/**
 * Same as logAudit but writes through an existing transaction client, so the
 * audit row lands (or rolls back) with the change it describes.
 */
export const logAuditWithClient = async (client, entry) => {
  try {
    await client.query(
      `INSERT INTO audit_log ${AUDIT_COLUMNS} VALUES ${AUDIT_PLACEHOLDERS}`,
      buildValues(entry)
    );
  } catch (error) {
    console.error(`Failed to write audit log (${entry?.actionType}):`, error.message);
  }
};

// x-forwarded-for is a comma-separated chain; the client is the first hop.
// audit_log.ip_address is INET, so anything that is not obviously an address is
// dropped rather than blowing up the insert.
const IP_SHAPE = /^[0-9a-f.:]+$/i;
export const clientIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  const raw = (forwarded ? String(forwarded).split(",")[0] : req.socket?.remoteAddress) || "";
  const ip = raw.trim().replace(/^::ffff:/, "");
  return ip && IP_SHAPE.test(ip) ? ip : null;
};

// Pull the actor, client IP and user agent off the request so call sites only
// supply the business detail.
const requestContext = (req) => ({
  actorId: req.user?.userid ?? null,
  actorName: req.user
    ? [req.user.name, req.user.surname].filter(Boolean).join(" ") || `User ${req.user.userid}`
    : null,
  actorRole: req.user?.roleid ?? null,
  httpMethod: req.method,
  requestPath: req.originalUrl ? req.originalUrl.split("?")[0] : req.path,
  ipAddress: clientIp(req),
  userAgent: req.headers?.["user-agent"] || null,
});

// Best-effort display names for hand-written audit calls, so a controller can
// write "Acme Logistics" instead of a bare "client 41" without needing its own
// SQL. Never throw — audit trail quality is never worth failing the request
// over, so callers just get null back and fall back to their own label.
const isNumericId = (value) => Number.isInteger(Number(value)) && value !== "" && value !== null;

export const getClientName = async (clientId) => {
  if (!isNumericId(clientId)) return null;
  try {
    const result = await pool.query(
      "SELECT client FROM m5_client WHERE m5clientkey = $1",
      [Number(clientId)]
    );
    return result.rows[0]?.client?.trim() || null;
  } catch (err) {
    console.error("Audit client-name lookup failed:", err.message);
    return null;
  }
};

export const getInstructionLabel = async (m1key) => {
  if (!isNumericId(m1key)) return null;
  try {
    const result = await pool.query(
      `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
         FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client
        WHERE m.m1key = $1`,
      [Number(m1key)]
    );
    return result.rows[0]?.name || null;
  } catch (err) {
    console.error("Audit instruction-label lookup failed:", err.message);
    return null;
  }
};

/**
 * Convenience wrapper for controllers.
 * Usage: auditFromReq(req, { actionType: "PAYMENT_CREATED", entityType: "payment", ... })
 *
 * Marks req.auditLogged so middleware/auditTrail.js skips the generic row for
 * this request.
 */
export const auditFromReq = (req, entry) => {
  req.auditLogged = true;
  return logAudit({ ...requestContext(req), outcome: "SUCCESS", ...entry });
};

/**
 * Record a failed or denied attempt from inside a controller. Sets
 * req.auditHandled so the middleware does not add a second, thinner row for
 * the same failure.
 */
export const auditFailureFromReq = (req, entry) => {
  req.auditHandled = true;
  return logAudit({ ...requestContext(req), outcome: "FAILURE", ...entry });
};

export const logPasswordChange = async (client, adminId, employeeId, employeeName, userAgent = null) => {
  await logAuditWithClient(client, {
    actionType: "PASSWORD_CHANGE",
    entityType: "employee",
    actorId: adminId,
    targetId: employeeId,
    targetName: employeeName,
    details: `Admin ${adminId} changed password for employee ${employeeName} (ID: ${employeeId})`,
    userAgent,
  });
  console.log(`Audit log: Password change recorded for employee ${employeeId} by admin ${adminId}`);
};

export const logEmployeeCreation = async (client, adminId, employeeId, employeeName, userAgent = null) => {
  await logAuditWithClient(client, {
    actionType: "EMPLOYEE_CREATION",
    entityType: "employee",
    actorId: adminId,
    targetId: employeeId,
    targetName: employeeName,
    details: `Admin ${adminId} created new employee ${employeeName} (ID: ${employeeId})`,
    userAgent,
  });
  console.log(`Audit log: Employee creation recorded for employee ${employeeId} by admin ${adminId}`);
};
