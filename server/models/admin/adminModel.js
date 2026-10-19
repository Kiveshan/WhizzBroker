import { pool } from "../../config/database.js";
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from "../../config/auditActions.js";
import { ROLES } from "../../config/roles.js";

const getPendingUsers = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.userid, 
        e.name, 
        e.surname, 
        e.email, 
        u.companyname, 
        u.company_reg_num,
        u.roleid, 
        u.status, 
        u.dateofreg,
        e.status AS employee_status
      FROM usertable u
      INNER JOIN m5_employee e ON u.company_reg_num = e.company_reg_num
      WHERE u.status = 'pending' 
    `);
    return result.rows;
  } catch (err) {
    console.error("Error fetching pending users:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const approveUser = async (userid, roleid) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Get company_reg_num from usertable
    const userResult = await client.query(
      `SELECT company_reg_num FROM usertable WHERE userid = $1`,
      [userid]
    );

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const company_reg_num = userResult.rows[0].company_reg_num;

    // Update usertable
    await client.query(
      `UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2`,
      [roleid, userid]
    );

    // Update m5_employee status to TRUE
    await client.query(
      `UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1`,
      [company_reg_num]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error approving user:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const rejectUser = async (userid) => {
  let client;
  try {
    client = await pool.connect();
    await client.query(
      "UPDATE usertable SET status = 'rejected' WHERE userid = $1",
      [userid]
    );
  } catch (err) {
    console.error("Error rejecting user:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateUserStatus = async (userid, action, roleid) => {
  let client;
  try {
    client = await pool.connect();
    if (action === "approve") {
      await client.query(
        "UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2",
        [roleid, userid]
      );
    } else if (action === "reject") {
      await client.query(
        "UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1",
        [userid]
      );
    } else {
      throw new Error("Invalid action");
    }
  } catch (err) {
    console.error("Error updating user status:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getCompanyList = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.userid, 
        e.name, 
        e.surname, 
        e.email, 
        u.companyname, 
        u.company_reg_num, 
        u.status, 
        u.dateofreg,
        e.status AS employee_status,
        (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
      FROM usertable u
      INNER JOIN m5_employee e ON u.company_reg_num = e.company_reg_num
      WHERE e.roleid = 1 
      ORDER BY u.companyname ASC
    `);
    return result.rows;
  } catch (err) {
    console.error("Error fetching companies:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const deactivateCompany = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1 AND roleid = 1 RETURNING companyname",
      [company_reg_num]
    );

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Company not found" };
    }

    await client.query(
      "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query(
      "UPDATE m5_employee SET status = FALSE WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query("COMMIT");
    return {
      success: true,
      companyname: companyAdminResult.rows[0].companyname,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deactivating company:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const reactivateCompany = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING companyname",
      [company_reg_num]
    );

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Company not found or no admin associated with the company",
      };
    }

    await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query(
      "UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query("COMMIT");
    return {
      success: true,
      companyname: companyAdminResult.rows[0].companyname,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reactivating company:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

// The pager stops counting here. See the count query in getAuditLog.
const COUNT_CAP = 20000;

// Filter dropdowns are served from the action/entity registry, which is exact
// for anything written by the current code and costs nothing. Older rows can
// still hold action types the registry no longer lists (renamed or retired
// actions), so the table is scanned for those too — but at most once every
// FILTER_CACHE_MS, because DISTINCT over an audit table is a full scan.
const FILTER_CACHE_MS = 15 * 60 * 1000;

// Internet-scanner noise: anonymous requests to routes the app doesn't have
// (/wp-login.php, /.env, …) that were rejected. New ones are no longer written
// (see auditTrail.js); this hides the ones recorded before that — from the
// rows and, because an unmapped route's entity is derived from its path
// ("wp-login.php", "xmlrpc.php"), from the filter dropdowns too.
const botTrafficSql = (alias = "") => {
  const col = (name) => (alias ? `${alias}.${name}` : name);
  return `(${col("action_type")} LIKE 'UNMAPPED\\_%' AND ${col("admin_id")} IS NULL
           AND ${col("outcome")} IS DISTINCT FROM 'SUCCESS')`;
};

// One cache per view: the Manager/Director dropdowns are built without the
// bot rows, Admin's with everything.
const filterCaches = {
  all: { expiresAt: 0, actionTypes: [], entityTypes: [] },
  withoutBots: { expiresAt: 0, actionTypes: [], entityTypes: [] },
};

const getAuditFilterValues = async ({ excludeBots = false } = {}) => {
  const cacheKey = excludeBots ? "withoutBots" : "all";
  if (Date.now() < filterCaches[cacheKey].expiresAt) return filterCaches[cacheKey];

  const botClause = excludeBots ? `AND NOT ${botTrafficSql()}` : "";
  let historicActions = [];
  let historicEntities = [];
  try {
    const [actions, entities] = await Promise.all([
      pool.query(
        `SELECT DISTINCT action_type FROM audit_log
          WHERE TRUE ${botClause} ORDER BY action_type`
      ),
      pool.query(
        `SELECT DISTINCT entity_type FROM audit_log
          WHERE entity_type IS NOT NULL ${botClause} ORDER BY entity_type`
      ),
    ]);
    historicActions = actions.rows.map((r) => r.action_type);
    historicEntities = entities.rows.map((r) => r.entity_type);
  } catch (err) {
    // A slow or failed scan must not take the viewer down — the registry
    // values alone are enough to filter everything written by current code.
    console.error("Audit filter scan failed, falling back to registry:", err.message);
  }

  // AUDIT_LOG_VIEWED rows are excluded from every query (see getAuditLog), so
  // offering them — or their otherwise-unused "audit" entity — as filters
  // would just be dead options that always return nothing.
  filterCaches[cacheKey] = {
    expiresAt: Date.now() + FILTER_CACHE_MS,
    actionTypes: [...new Set([...AUDIT_ACTION_TYPES, ...historicActions])]
      .filter((type) => type !== "AUDIT_LOG_VIEWED")
      .sort(),
    entityTypes: [...new Set([...AUDIT_ENTITY_TYPES, ...historicEntities])]
      .filter((type) => type !== "audit")
      .sort(),
  };
  return filterCaches[cacheKey];
};

// Paginated, filterable read of the audit trail. Filters are all optional:
// actionType/entityType/outcome/actorId exact-match, search does a
// case-insensitive scan over target name, actor, details and request path,
// from/to bound the timestamp.
const getAuditLog = async ({
  page = 1,
  limit = 25,
  actionType,
  entityType,
  outcome,
  actorId,
  search,
  from,
  to,
  hideAdminActors = false,
  hideBotTraffic = false,
  includeRequestData = false,
}) => {
  const conditions = [];
  const params = [];

  // Viewing the audit log is itself a tracked (sensitive) GET, but showing
  // those rows in the viewer is just self-referential noise — every page
  // load/filter change would add another "viewed the audit log" entry to the
  // page being looked at. Still recorded in the table, just never displayed.
  conditions.push(`a.action_type != 'AUDIT_LOG_VIEWED'`);

  // Conditions are written against the "a" alias so the same WHERE clause can
  // be reused by the count query and the joined page query.
  if (actionType) {
    params.push(actionType);
    conditions.push(`a.action_type = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    conditions.push(`a.entity_type = $${params.length}`);
  }
  if (outcome) {
    params.push(outcome);
    conditions.push(`a.outcome = $${params.length}`);
  }
  if (actorId) {
    params.push(Number(actorId));
    conditions.push(`a.admin_id = $${params.length}`);
  }
  if (search) {
    // Second param is the bare term, so "2242" also finds the record with that
    // exact id without the pattern matching 12242.
    params.push(`%${search}%`, search);
    const like = params.length - 1;
    const exact = params.length;
    conditions.push(
      `(a.target_employee_name ILIKE $${like}
        OR a.details ILIKE $${like}
        OR a.actor_name ILIKE $${like}
        OR a.request_path ILIKE $${like}
        OR a.action_type ILIKE $${like}
        OR a.target_employee_id::text = $${exact})`
    );
  }
  if (from) {
    params.push(from);
    conditions.push(`a.timestamp >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`a.timestamp < ($${params.length}::date + INTERVAL '1 day')`);
  }
  // Reports-page callers (Manager/Director) hide System Admin's own actions —
  // rows with no captured actor_role (older rows) are kept, since we can't
  // tell they were an admin.
  if (hideAdminActors) {
    params.push(ROLES.ADMIN);
    conditions.push(`a.actor_role IS DISTINCT FROM $${params.length}`);
  }

  // Scanner noise — see botTrafficSql.
  if (hideBotTraffic) {
    conditions.push(`NOT ${botTrafficSql("a")}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // The pager needs a total, but an exact COUNT(*) over an audit table is a
  // full scan that gets slower every day and is the same cost on page 1 as on
  // page 400. Stop counting at COUNT_CAP rows: below the cap the number is
  // exact, above it the UI shows "20 000+". Callers narrow the window with the
  // date filters when they need to know precisely how many.
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
       FROM (SELECT 1 FROM audit_log a ${whereClause} LIMIT ${COUNT_CAP + 1}) capped`,
    params
  );
  const rawCount = Number(countResult.rows[0].total);
  const countIsCapped = rawCount > COUNT_CAP;
  const totalItems = countIsCapped ? COUNT_CAP : rawCount;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
  params.push(limitNum, (pageNum - 1) * limitNum);

  const result = await pool.query(
    `SELECT
       a.id AS audit_id,
       a.action_type,
       a.entity_type,
       a.admin_id,
       a.target_employee_id AS target_id,
       a.target_employee_name AS target_name,
       a.timestamp,
       a.details,
       -- The before/after list is for every viewer; the raw request payload
       -- (bodies, params) is Admin-only.
       a.metadata->'changes' AS changes,
       ${includeRequestData ? "a.metadata" : "NULL"} AS metadata,
       a.http_method,
       a.request_path,
       a.status_code,
       a.outcome,
       a.duration_ms,
       a.actor_role,
       a.ip_address,
       a.user_agent,
       -- Prefer the name captured at the time of the action; fall back to the
       -- current user record for rows written before actor_name existed.
       COALESCE(
         a.actor_name,
         u.name || ' ' || u.surname,
         e.name || ' ' || e.surname
       ) AS actor_name
     FROM audit_log a
     LEFT JOIN usertable u ON u.userid = a.admin_id
     LEFT JOIN m5_employee e ON e.userid = a.admin_id
     ${whereClause}
     ORDER BY a.timestamp DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Filter values come from the (cached) legacy scan plus the static registry —
  // see getAuditFilterValues.
  const { actionTypes, entityTypes } = await getAuditFilterValues({
    excludeBots: hideBotTraffic,
  });

  return {
    items: result.rows,
    totalItems,
    countIsCapped,
    countCap: COUNT_CAP,
    totalPages: Math.max(1, Math.ceil(totalItems / limitNum)),
    currentPage: pageNum,
    actionTypes,
    entityTypes,
  };
};

export {
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  getCompanyList,
  deactivateCompany,
  reactivateCompany,
  getAuditLog,
};
