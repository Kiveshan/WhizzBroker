/**
 * Automatic audit trail.
 *
 * Mounted once, ahead of every route (see routes/index.js), this middleware
 * records one audit_log row for every state-changing request and for the
 * sensitive reads listed in config/auditActions.js — successes, validation
 * failures, permission denials and server errors alike.
 *
 * It is deliberately generic: controllers do not need to be touched for their
 * routes to be audited. Hand-written auditFromReq() calls still exist where a
 * richer, business-level description is worth having; when a handler writes one
 * of those, this middleware stands down for that request (see req.auditLogged)
 * so the trail holds one row per action rather than two.
 */

import { resolveAuditRoute } from "../config/auditActions.js";
import { logAudit, clientIp } from "../utils/auditLogger.js";
import { summariseChanges } from "../utils/auditChanges.js";
import { pool } from "../config/database.js";

// Anything whose key looks like a secret never reaches the database.
const REDACTED_KEY = /pass(word)?|token|secret|jwt|authorization|apikey|api_key|otp|cvv|card_?num|pin\b|account_num|name_of_acc|\bbank\b|\bbranch\b|swift_code|base_salary/i;
const REDACTED = "[REDACTED]";

const MAX_STRING = 200; // long strings are almost always base64/file blobs
const MAX_ARRAY = 20;
const MAX_DEPTH = 4;
const MAX_METADATA_CHARS = 8000;

/**
 * Deep-copy a request payload with secrets removed and large values clipped,
 * so a stored payload can never become an exfiltration vector or a bloat
 * problem.
 */
const sanitise = (value, depth = 0) => {
  if (value === null || value === undefined) return null;
  if (depth > MAX_DEPTH) return "[TRUNCATED]";

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => sanitise(item, depth + 1));
    if (value.length > MAX_ARRAY) items.push(`[+${value.length - MAX_ARRAY} more]`);
    return items;
  }

  if (typeof value === "object") {
    if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACTED_KEY.test(key) ? REDACTED : sanitise(val, depth + 1);
    }
    return out;
  }

  if (typeof value === "string" && value.length > MAX_STRING) {
    return `${value.slice(0, MAX_STRING)}…[+${value.length - MAX_STRING} chars]`;
  }

  return value;
};

const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;

// Multer puts uploads on req.file/req.files; record what was uploaded, never
// the bytes.
const describeFiles = (req) => {
  const files = req.files || (req.file ? [req.file] : []);
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  if (!list.length) return null;
  return list.slice(0, MAX_ARRAY).map((f) => ({
    field: f.fieldname,
    name: f.originalname,
    size: f.size,
    type: f.mimetype,
  }));
};

const buildMetadata = (req, params) => {
  const metadata = {};
  if (!isEmpty(params)) metadata.params = params;
  if (!isEmpty(req.query)) metadata.query = sanitise(req.query);
  if (!isEmpty(req.body)) metadata.body = sanitise(req.body);
  const files = describeFiles(req);
  if (files) metadata.files = files;

  if (isEmpty(metadata)) return null;

  const json = JSON.stringify(metadata);
  if (json.length > MAX_METADATA_CHARS) {
    return { truncated: true, size: json.length, preview: json.slice(0, MAX_METADATA_CHARS) };
  }
  return metadata;
};

const outcomeFor = (status) => {
  if (status < 400) return "SUCCESS";
  if (status === 401 || status === 403) return "DENIED";
  return "FAILURE";
};

const actorLabel = (user) => {
  if (!user) return "Not signed in";
  const name = [user.name, user.surname].filter(Boolean).join(" ");
  return name ? `${name} (user ${user.userid})` : `User ${user.userid}`;
};

// Generic routes only have an id from the URL, so without this the trail
// reads "client 41" / "truck 9" — technically correct, meaningless to a
// human. One lookup per action_type turns that id into the record's own
// name. Deliberately resolved BEFORE the handler runs (not in the
// res.on("finish") write below): for a delete, the row is already gone by
// the time the response finishes, so resolving after the fact would always
// come back empty.
const NAME_LOOKUPS = {
  EMPLOYEE_UPDATED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  EMPLOYEE_STATUS_TOGGLED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  EMPLOYEE_DETAILS_VIEWED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  EMPLOYEE_DEDUCTIONS_UPDATED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  EMPLOYEE_DEDUCTIONS_VIEWED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  WAGE_DATA_VIEWED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  BASE_SALARY_HISTORY_VIEWED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },

  CLIENT_UPDATED: { table: "m5_client", idColumn: "m5clientkey", nameExpr: "client" },
  CLIENT_DELETED: { table: "m5_client", idColumn: "m5clientkey", nameExpr: "client" },
  CLIENT_STATUS_TOGGLED: { table: "m5_client", idColumn: "m5clientkey", nameExpr: "client" },

  TRUCK_UPDATED: { table: "m5_trucks", idColumn: "m5truckskey", nameExpr: "truckregnum" },
  TRUCK_STATUS_TOGGLED: { table: "m5_trucks", idColumn: "m5truckskey", nameExpr: "truckregnum" },
  TRUCK_DELETED: { table: "m5_trucks", idColumn: "m5truckskey", nameExpr: "truckregnum" },
  SUBCONTRACTOR_TRUCK_DELETED: { table: "m5_trucks", idColumn: "m5truckskey", nameExpr: "truckregnum" },

  TRAILER_UPDATED: { table: "m5_trailers", idColumn: "m5trailerskey", nameExpr: "trailerregnum" },
  TRAILER_STATUS_TOGGLED: { table: "m5_trailers", idColumn: "m5trailerskey", nameExpr: "trailerregnum" },

  SUBCONTRACTOR_UPDATED: { table: "m5_employee", idColumn: "userid", nameExpr: "COALESCE(NULLIF(companyname, ''), TRIM(name || ' ' || surname))" },
  SUBCONTRACTOR_STATUS_TOGGLED: { table: "m5_employee", idColumn: "userid", nameExpr: "COALESCE(NULLIF(companyname, ''), TRIM(name || ' ' || surname))" },
  SUBCONTRACTOR_DRIVER_STATUS_TOGGLED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },
  SUBCONTRACTOR_DRIVER_DELETED: { table: "m5_employee", idColumn: "userid", nameExpr: "TRIM(name || ' ' || surname)" },

  SUPPLIER_UPDATED: { table: "suppliers", idColumn: "supplier_id", nameExpr: "supplier" },
  SUPPLIER_STATUS_TOGGLED: { table: "suppliers", idColumn: "supplier_id", nameExpr: "supplier" },
  SUPPLIER_DELETED: { table: "suppliers", idColumn: "supplier_id", nameExpr: "supplier" },

  EXPENSE_TYPE_UPDATED: { table: "expense_types", idColumn: "id", nameExpr: "expense" },
  EXPENSE_TYPE_DELETED: { table: "expense_types", idColumn: "id", nameExpr: "expense" },

  DOCUMENT_DELETED: { table: "documents", idColumn: "document_id", nameExpr: "name" },

  LEG_NUMBER_UPDATED: { table: "legs_m2", idColumn: "legkey", nameExpr: "'Leg ' || legnumber || ' (Instr ' || m1key || ')'" },
  LEG_DELETED: { table: "legs_m2", idColumn: "legkey", nameExpr: "'Leg ' || legnumber || ' (Instr ' || m1key || ')'" },

  ADDON_UPDATED: {
    query: `SELECT COALESCE(c.client || ' — ', '') || COALESCE(a.invoice_number, 'Addon ' || a.addon_id) AS name
              FROM add_ons a LEFT JOIN m5_client c ON c.m5clientkey = a.client_id WHERE a.addon_id = $1`,
  },
  ADDON_DELETED: {
    query: `SELECT COALESCE(c.client || ' — ', '') || COALESCE(a.invoice_number, 'Addon ' || a.addon_id) AS name
              FROM add_ons a LEFT JOIN m5_client c ON c.m5clientkey = a.client_id WHERE a.addon_id = $1`,
  },

  INSTRUCTION_CONTAINERS_UPDATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  FC_CONTAINERS_UPDATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  FC_INSTRUCTION_UPDATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  FC_CONTAINER_DELETED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  INSTRUCTION_STATUS_UPDATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  INSTRUCTION_COMPLETED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  INVOICE_PREVIEW_GENERATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  // Broker: grouped instructions, assignments and rate cards.
  INSTRUCTION_ADDED_TO_GROUP: {
    query: `SELECT 'Group ' || COALESCE(NULLIF(g.group_ref, ''), g.group_key::text) || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM instruction_group g LEFT JOIN m5_client c ON c.m5clientkey = g.client WHERE g.group_key = $1`,
  },
  INSTRUCTION_GROUP_FINALISED: {
    query: `SELECT 'Group ' || COALESCE(NULLIF(g.group_ref, ''), g.group_key::text) || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM instruction_group g LEFT JOIN m5_client c ON c.m5clientkey = g.client WHERE g.group_key = $1`,
  },
  SUBCONTRACTOR_ASSIGNED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
  ASSIGNMENT_REMOVED: {
    query: `SELECT COALESCE(NULLIF(e.companyname, ''), TRIM(e.name || ' ' || e.surname), 'unassigned') || ' — Instr ' || l.m1key AS name
              FROM legs_m2 l LEFT JOIN m5_employee e ON e.userid = l.driverid WHERE l.legkey = $1`,
  },
  CLIENT_RATES_SAVED: { table: "m5_client", idColumn: "m5clientkey", nameExpr: "client" },
  RATE_CARD_UPDATED: { table: "rate_card", idColumn: "rate_card_id", nameExpr: "name" },
  RATE_CARD_DELETED: { table: "rate_card", idColumn: "rate_card_id", nameExpr: "name" },

  INVOICE_GENERATED: {
    query: `SELECT m.m1key || ' — ' || COALESCE(c.client, 'unknown client') AS name
              FROM m1_controller m LEFT JOIN m5_client c ON c.m5clientkey = m.client WHERE m.m1key = $1`,
  },
};

const resolveTargetName = async (descriptor) => {
  if (!descriptor?.target) return null;
  const lookup = NAME_LOOKUPS[descriptor.action];
  if (!lookup) return null;

  const idNum = Number(descriptor.target);
  if (!Number.isInteger(idNum)) return null;

  try {
    const sql = lookup.query || `SELECT ${lookup.nameExpr} AS name FROM ${lookup.table} WHERE ${lookup.idColumn} = $1`;
    const result = await pool.query(sql, [idNum]);
    const name = result.rows[0]?.name;
    return name ? String(name).trim() : null;
  } catch (err) {
    console.error(`Audit target-name lookup failed for ${descriptor.action}:`, err.message);
    return null;
  }
};

export const auditTrail = () => async (req, res, next) => {
  const startedAt = Date.now();
  const descriptor = resolveAuditRoute(req.method, req.path);

  if (!descriptor || descriptor.skip || (descriptor.sensitive === false && req.method === "GET")) {
    return next();
  }

  const resolvedTargetName = await resolveTargetName(descriptor);

  res.on("finish", () => {
    // A controller already wrote a richer, business-level entry for this
    // request — don't duplicate it. auditLogged covers the success path only,
    // because a handler that errored after (or instead of) its audit call never
    // recorded the failure; auditHandled means the controller audits every
    // outcome itself (login, for instance).
    const outcome = outcomeFor(res.statusCode);
    if (req.auditHandled) return;
    if (req.auditLogged && outcome === "SUCCESS") return;

    const user = req.user || req.session?.user || null;
    const scheduledJob = req.isScheduledJob === true;

    // Internet scanners POST to /wp-login.php, /xmlrpc.php, /.env and the like
    // all day. An anonymous request to a route we don't have, which the guard
    // or 404 handler rejected, changed nothing and says nothing about the
    // business — it only buries real UNMAPPED_* rows. An unmapped request that
    // succeeded, or came from a signed-in user, is still recorded.
    if (!descriptor.mapped && !user && !scheduledJob && outcome !== "SUCCESS") return;

    const actor = scheduledJob ? "Scheduled job" : actorLabel(user);

    // A controller can attach a before/after list (req.auditChanges, see
    // utils/auditChanges.js). It is added after buildMetadata's size cap so a
    // truncated request body never costs us the change list, and it replaces
    // the technical details line with a readable summary — method, path and
    // status are still in their own columns.
    const changes = Array.isArray(req.auditChanges) ? req.auditChanges : null;
    let metadata = buildMetadata(req, descriptor.params);
    if (changes) metadata = { ...(metadata || {}), changes };

    logAudit({
      actionType: descriptor.action,
      entityType: descriptor.entity,
      actorId: user?.userid ?? null,
      actorName: actor,
      actorRole: user?.roleid ?? null,
      targetId: descriptor.target,
      targetName: resolvedTargetName || (descriptor.target ? `${descriptor.entity} ${descriptor.target}` : null),
      details: changes
        ? `${actor} — ${summariseChanges(changes)}`
        : `${actor} — ${descriptor.action} ` +
          `(${req.method} ${req.originalUrl.split("?")[0]}) → ${res.statusCode} ${outcome}` +
          (descriptor.mapped ? "" : " [route not in audit registry]"),
      metadata,
      httpMethod: req.method,
      requestPath: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      outcome,
      durationMs: Date.now() - startedAt,
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || null,
    });
  });

  return next();
};

export default auditTrail;
