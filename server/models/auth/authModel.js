import { pool } from "../../config/database.js";
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

// const registerUser = async (userData) => {
//   const {
//     name,
//     surname,
//     email,
//     password,
//     companyname,
//     company_reg_num,
//     cell_num,
//     cell_num2,
//     vat_reg_num,
//     account_num,
//     name_of_acc,
//     bank,
//     branch,
//     branch_code,
//     address,
//     suburb,
//     swift_code,
//     cluster_box,
//   } = userData;

//   let client;
//   try {
//     client = await pool.connect();
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const result = await client.query(
//       `INSERT INTO usertable (
//         name, surname, email, password, companyname, company_reg_num, dateofreg, status,
//         cell_num, cell_num2, vat_reg_num, account_num, name_of_acc, bank, branch,
//         branch_code, address, suburb, swift_code, cluster_box
//       ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
//       [
//         name,
//         surname,
//         email,
//         hashedPassword,
//         companyname,
//         company_reg_num,
//         cell_num,
//         cell_num2 || null,
//         vat_reg_num || null,
//         account_num,
//         name_of_acc,
//         bank,
//         branch,
//         branch_code,
//         address,
//         suburb,
//         swift_code || null,
//         cluster_box || null,
//       ]
//     );
//     const user = result.rows[0];
//     delete user.password;
//     return user;
//   } catch (error) {
//     console.error("Registration error:", error);
//     throw error;
//   } finally {
//     if (client) client.release();
//   }
// };
// const registerUser = async (userData) => {
//   const {
//     name,
//     surname,
//     email,
//     password,
//     companyname,
//     company_reg_num,
//     cellnum,
//     cell_num2,
//     vat_reg_num,
//     account_num,
//     name_of_acc,
//     bank,
//     branch,
//     branch_code,
//     address,
//     suburb,
//     swift_code,
//     cluster_box,
//   } = userData;

//   let client;
//   try {
//     client = await pool.connect();
    
//     // Begin transaction
//     await client.query('BEGIN');
    
//     const hashedPassword = await bcrypt.hash(password, 10);
    
//     // Insert into usertable
//     const userResult = await client.query(
//       `INSERT INTO usertable (
//         companyname, company_reg_num, dateofreg, status,
//         cell_num2, vat_reg_num, account_num, name_of_acc, bank, branch,
//         branch_code, address, suburb, swift_code, cluster_box
//       ) VALUES ($1, $2, CURRENT_DATE, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
//       [
//         companyname,
//         company_reg_num,
//         cell_num2 || null,
//         vat_reg_num || null,
//         account_num,
//         name_of_acc,
//         bank,
//         branch,
//         branch_code,
//         address,
//         suburb,
//         swift_code || null,
//         cluster_box || null,
//       ]
//     );

//     // Insert into m5_employee (added company_reg_num)
//     await client.query(
//       `INSERT INTO m5_employee (
//         name, surname, email, password, cellnum, company_reg_num
//       ) VALUES ($1, $2, $3, $4, $5, $6)`,
//       [
//         name,
//         surname,
//         email,
//         hashedPassword,
//         cellnum,
//         company_reg_num
//       ]
//     );

//     // Commit transaction
//     await client.query('COMMIT');
    
//     const user = userResult.rows[0];
//     return user;
//   } catch (error) {
//     // Rollback transaction on error
//     if (client) await client.query('ROLLBACK');
//     console.error("Registration error:", error);
//     throw error;
//   } finally {
//     if (client) client.release();
//   }
// };

//added is_business_manager check
const registerUser = async (userData) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cellnum,
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
    
    // Begin transaction
    await client.query('BEGIN');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert into usertable (removed roleid)
    const userResult = await client.query(
      `INSERT INTO usertable (
        companyname, company_reg_num, dateofreg, status,
        cell_num2, vat_reg_num, account_num, name_of_acc, bank, branch,
        branch_code, address, suburb, swift_code, cluster_box
      ) VALUES ($1, $2, CURRENT_DATE, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        companyname,
        company_reg_num,
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

    // Insert into m5_employee with status defaulting to FALSE, is_business_manager to TRUE, and roleid to 1
    await client.query(
      `INSERT INTO m5_employee (
        name, surname, email, password, cellnum, company_reg_num, status, roleid
      ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, 1)`,
      [
        name,
        surname,
        email,
        hashedPassword,
        cellnum,
        company_reg_num
      ]
    );

    // Commit transaction
    await client.query('COMMIT');
    
    const user = userResult.rows[0];
    return user;
  } catch (error) {
    // Rollback transaction on error
    if (client) await client.query('ROLLBACK');
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

export {
  findUserByEmail,
  comparePassword,
  findUserById,
  checkEmailExists,
  checkCompanyRegNumExists,
  registerUser,
  checkCompanyStatus,
};