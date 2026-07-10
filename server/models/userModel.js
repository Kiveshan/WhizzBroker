import { pool, query } from "../config/database.js";
import bcrypt from "bcrypt";

const findUserByEmail = async (email) => {
  let client;
  try {
    client = await pool.connect();
    let result = await client.query(
      "SELECT * FROM usertable WHERE email = $1",
      [email]
    );
    let user = null;

    if (result.rows.length > 0) {
      user = result.rows[0];
      user.table = "usertable";
    } else {
      result = await client.query(
        "SELECT * FROM m5_employee WHERE email = $1",
        [email]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
        user.table = "m5_employee";
      }
    }

    return user;
  } catch (err) {
    console.error("Error finding user by email:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const findUserById = async (userid, table) => {
  let client;
  try {
    client = await pool.connect();
    let result;

    if (table === "usertable") {
      result = await client.query("SELECT * FROM usertable WHERE userid = $1", [
        userid,
      ]);
    } else if (table === "m5_employee") {
      result = await client.query(
        "SELECT * FROM m5_employee WHERE userid = $1",
        [userid]
      );
    }

    return result && result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    console.error("Error finding user by ID:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const checkEmailExists = async (email) => {
  let client;
  try {
    client = await pool.connect();
    let result = await client.query(
      "SELECT email FROM usertable WHERE email = $1",
      [email]
    );
    if (result.rows.length > 0) {
      return true;
    }
    try {
      result = await client.query(
        "SELECT email FROM m5_employee WHERE email = $1",
        [email]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.log("Note: m5_employee table check failed:", err);
      return false;
    }
  } catch (error) {
    console.error("Error checking email:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const checkCompanyRegNumExists = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT company_reg_num FROM usertable WHERE company_reg_num = $1 AND status != 'rejected'",
      [company_reg_num]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking company registration number:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const registerUser = async (userData) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cell_num,
    cell_num2,
    vat_reg_num,
    account_num,
    name_of_acc,
    bank,
    branch,
    branch_code,
    address,
    suburb,
    swift_code,
    cluster_box,
  } = userData;

  let client;
  try {
    client = await pool.connect();
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO usertable (
        name, surname, email, password, companyname, company_reg_num, dateofreg, status,
        cell_num, cell_num2, vat_reg_num, account_num, name_of_acc, bank, branch,
        branch_code, address, suburb, swift_code, cluster_box
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        name,
        surname,
        email,
        hashedPassword,
        companyname,
        company_reg_num,
        cell_num,
        cell_num2 || null,
        vat_reg_num || null,
        account_num,
        name_of_acc,
        bank,
        branch,
        branch_code,
        address,
        suburb,
        swift_code || null,
        cluster_box || null,
      ]
    );
    const user = result.rows[0];
    delete user.password;
    return user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const checkCompanyStatus = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM usertable WHERE company_reg_num = $1 AND roleid = 1 AND status = 'active'",
      [company_reg_num]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking company status:", error);
    return false;
  } finally {
    if (client) client.release();
  }
};

const getPendingUsers = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT userid, name, surname, email, companyname, roleid, status, dateofreg FROM usertable WHERE status = 'pending'"
    );
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
    await client.query(
      "UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2",
      [roleid, userid]
    );
  } catch (err) {
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
        u.name, 
        u.surname, 
        u.email, 
        u.companyname, 
        u.company_reg_num, 
        u.status, 
        u.dateofreg,
        (SELECT COUNT(*) FROM usertable WHERE company_reg_num = u.company_reg_num) + 
        (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
      FROM 
        usertable u
      WHERE 
        u.roleid = 1
      ORDER BY 
        u.companyname ASC
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

export {
  findUserByEmail,
  comparePassword,
  findUserById,
  checkEmailExists,
  checkCompanyRegNumExists,
  registerUser,
  checkCompanyStatus,
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  getCompanyList,
  deactivateCompany,
  reactivateCompany,
};
