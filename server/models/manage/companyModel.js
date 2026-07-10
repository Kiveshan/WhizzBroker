import { pool } from "../../config/database.js"

const getCompanyByCompanyRegNum = async (companyRegNum) => {
  let client;
  try {
    client = await pool.connect();
    const companyResult = await client.query(
      `
      SELECT 
        userid,
        companyname,
        company_reg_num,
        email,
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
        cluster_box
      FROM usertable
      WHERE company_reg_num = $1
      `,
      [companyRegNum]
    );

    if (!companyResult.rows.length) {
      return { success: false, message: "Company not found for this registration number" };
    }

    return { success: true, data: companyResult.rows[0] };
  } catch (err) {
    console.error(`Error fetching company for company_reg_num ${companyRegNum}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getCompanyByUserId = async (userId) => {
  let client;
  try {
    client = await pool.connect();
    // Get company_reg_num from m5_employee for the active business manager
    const employeeResult = await client.query(
      `
      SELECT company_reg_num
      FROM m5_employee
      WHERE userid = $1 AND roleid = 1 AND status = true
      `,
      [userId]
    );

    if (!employeeResult.rows.length) {
      return { success: false, message: "No active business manager found for this user" };
    }

    const companyRegNum = employeeResult.rows[0].company_reg_num;

    // Fetch company details from usertable using company_reg_num
    const companyResult = await client.query(
      `
      SELECT 
        userid,
        companyname,
        company_reg_num,
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
        cluster_box
      FROM usertable
      WHERE company_reg_num = $1
      `,
      [companyRegNum]
    );

    if (!companyResult.rows.length) {
      return { success: false, message: "Company not found for this registration number" };
    }

    return { success: true, data: companyResult.rows[0] };
  } catch (err) {
    console.error(`Error fetching company for user ${userId}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateCompany = async (userId, companyData) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN"); // Start a transaction

    // Get company_reg_num from m5_employee
    const employeeResult = await client.query(
      `
      SELECT company_reg_num
      FROM m5_employee
      WHERE userid = $1 AND roleid = 1 AND status = true
      `,
      [userId]
    );

    if (!employeeResult.rows.length) {
      return { success: false, message: "No active business manager found for this user" };
    }

    const companyRegNum = employeeResult.rows[0].company_reg_num;

    // Check if company exists in usertable
    const checkResult = await client.query(
      "SELECT * FROM usertable WHERE company_reg_num = $1",
      [companyRegNum]
    );

    if (!checkResult.rows.length) {
      return { success: false, message: "Company not found for this registration number" };
    }

    const {
      companyname,
      company_reg_num,
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
    } = companyData;

    // Validate required fields
    if (!companyname || !company_reg_num) {
      throw new Error("Company name and registration number are required");
    }

    const updateFields = [];
    const queryParams = [];
    let paramCounter = 1;

    if (companyname !== undefined) {
      updateFields.push(`companyname = $${paramCounter}`);
      queryParams.push(companyname);
      paramCounter++;
    }
    if (company_reg_num !== undefined) {
      updateFields.push(`company_reg_num = $${paramCounter}`);
      queryParams.push(company_reg_num);
      paramCounter++;
    }
    if (cell_num2 !== undefined) {
      updateFields.push(`cell_num2 = $${paramCounter}`);
      queryParams.push(cell_num2 || null);
      paramCounter++;
    }
    if (vat_reg_num !== undefined) {
      updateFields.push(`vat_reg_num = $${paramCounter}`);
      queryParams.push(vat_reg_num || null);
      paramCounter++;
    }
    if (account_num !== undefined) {
      updateFields.push(`account_num = $${paramCounter}`);
      queryParams.push(account_num || null);
      paramCounter++;
    }
    if (name_of_acc !== undefined) {
      updateFields.push(`name_of_acc = $${paramCounter}`);
      queryParams.push(name_of_acc || null);
      paramCounter++;
    }
    if (bank !== undefined) {
      updateFields.push(`bank = $${paramCounter}`);
      queryParams.push(bank || null);
      paramCounter++;
    }
    if (branch !== undefined) {
      updateFields.push(`branch = $${paramCounter}`);
      queryParams.push(branch || null);
      paramCounter++;
    }
    if (branch_code !== undefined) {
      updateFields.push(`branch_code = $${paramCounter}`);
      queryParams.push(branch_code || null);
      paramCounter++;
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCounter}`);
      queryParams.push(address || null);
      paramCounter++;
    }
    if (suburb !== undefined) {
      updateFields.push(`suburb = $${paramCounter}`);
      queryParams.push(suburb || null);
      paramCounter++;
    }
    if (swift_code !== undefined) {
      updateFields.push(`swift_code = $${paramCounter}`);
      queryParams.push(swift_code || null);
      paramCounter++;
    }
    if (cluster_box !== undefined) {
      updateFields.push(`cluster_box = $${paramCounter}`);
      queryParams.push(cluster_box || null);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      return { success: false, message: "No fields to update" };
    }

    queryParams.push(companyRegNum);

    const updateQuery = `
      UPDATE usertable 
      SET ${updateFields.join(", ")} 
      WHERE company_reg_num = $${paramCounter} 
      RETURNING *
    `;

    const result = await client.query(updateQuery, queryParams);

    // Update company_reg_num in m5_employee for all active employees if company_reg_num is updated
    if (company_reg_num !== undefined && company_reg_num !== companyRegNum) {
      await client.query(
        `
        UPDATE m5_employee
        SET company_reg_num = $1
        WHERE company_reg_num = $2 AND status = true
        `,
        [company_reg_num, companyRegNum]
      );
    }

    await client.query("COMMIT");
    return { success: true, data: result.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Error updating company for user ${userId}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};



export { getCompanyByCompanyRegNum, getCompanyByUserId, updateCompany };