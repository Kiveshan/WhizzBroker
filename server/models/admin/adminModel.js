import { pool } from "../../config/database.js";

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

// Paginated, filterable read of the audit trail. Filters are all optional:
// actionType/entityType exact-match, search does a case-insensitive scan over
// target name and details, from/to bound the timestamp.
const getAuditLog = async ({ page = 1, limit = 25, actionType, entityType, search, from, to }) => {
  const conditions = [];
  const params = [];

  if (actionType) {
    params.push(actionType);
    conditions.push(`action_type = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(target_employee_name ILIKE $${params.length} OR details ILIKE $${params.length})`
    );
  }
  if (from) {
    params.push(from);
    conditions.push(`timestamp >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`timestamp < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_log ${whereClause}`,
    params
  );
  const totalItems = Number(countResult.rows[0].total);

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
  params.push(limitNum, (pageNum - 1) * limitNum);

  const result = await pool.query(
    `SELECT
       a.id AS audit_id,
       action_type,
       entity_type,
       admin_id,
       target_employee_id AS target_id,
       target_employee_name AS target_name,
       timestamp,
       details,
       user_agent,
       COALESCE(u.name || ' ' || u.surname, e.name || ' ' || e.surname) AS actor_name
     FROM audit_log a
     LEFT JOIN usertable u ON u.userid = a.admin_id
     LEFT JOIN m5_employee e ON e.userid = a.admin_id
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Distinct values for the filter dropdowns.
  const typesResult = await pool.query(
    `SELECT DISTINCT action_type FROM audit_log ORDER BY action_type`
  );

  return {
    items: result.rows,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limitNum)),
    currentPage: pageNum,
    actionTypes: typesResult.rows.map((r) => r.action_type),
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
