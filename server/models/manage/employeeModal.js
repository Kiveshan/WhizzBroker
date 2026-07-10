import { pool } from "../../config/database.js"
import bcrypt from "bcrypt"
import { validatePassword } from "../../utils/passwordValidator.js"
import { logPasswordChange, logEmployeeCreation } from "../../utils/auditLogger.js"

const getEmployeeBasic = async (id) => {
  let client
  try {
    client = await pool.connect()
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM public.m5_employee
      WHERE userid = $1
    `
    const checkResult = await client.query(checkQuery, [id])
    if (checkResult.rows[0].count == 0) {
      return { success: false, message: `No employee found with ID ${id}` }
    }

    const query = `
      SELECT 
        e.userid, 
        e.name, 
        e.surname, 
        e.cellnum, 
        e.base_salary,
        r.rolename
      FROM 
        public.m5_employee e
      LEFT JOIN 
        public.roles r ON e.roleid = r.roleid
      WHERE 
        e.userid = $1
    `
    const result = await client.query(query, [id])
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error(`Error fetching employee data for ID ${id}:`, error)
    throw error
  } finally {
    if (client) client.release()
  }
}

const getAllEmployees = async (options = {}) => {
  let client
  try {
    client = await pool.connect()

    if (Object.keys(options).length === 0) {
      const query = `
        SELECT
          e.*,
          r.rolename,
          edh.income_tax_rate,
          edh.deduction_other_deductions,
          edh.deduction_uif,
          edh.deduction_bonus,
          edh.deduction_savings,
          edh.deduction_loan,
          edh.deduction_damage,
          edh.effective_date
        FROM m5_employee e
        JOIN roles r ON e.roleid = r.roleid
        LEFT JOIN employee_deduction_history edh ON e.userid = edh.employeeid
        WHERE e.roleid != 6
        ORDER BY e.userid
      `
      const result = await client.query(query)
      return result.rows
    }

    const { offset = 0, limit = 10, search = "", status = "all" } = options

    let whereClause = "WHERE e.roleid != 6"
    const queryParams = []
    let paramIndex = 1

    if (search && search.trim() !== "") {
      whereClause += ` AND (
        LOWER(e.name) LIKE LOWER($${paramIndex}) OR 
        LOWER(e.surname) LIKE LOWER($${paramIndex})
      )`
      queryParams.push(`%${search.trim()}%`)
      paramIndex++
    }

    if (status !== "all") {
      whereClause += ` AND e.status = $${paramIndex}`
      queryParams.push(status === "active")
      paramIndex++
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM m5_employee e
      JOIN roles r ON e.roleid = r.roleid
      ${whereClause}
    `
    const countResult = await client.query(countQuery, queryParams)
    const totalCount = Number.parseInt(countResult.rows[0].count)

    const dataQuery = `
      SELECT
        e.*,
        r.rolename,
        edh.income_tax_rate,
        edh.deduction_other_deductions,
        edh.deduction_uif,
        edh.deduction_bonus,
        edh.deduction_savings,
        edh.deduction_loan,
        edh.deduction_damage,
        edh.effective_date
      FROM m5_employee e
      JOIN roles r ON e.roleid = r.roleid
      LEFT JOIN employee_deduction_history edh ON e.userid = edh.employeeid
      ${whereClause}
      ORDER BY e.userid DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    queryParams.push(limit, offset)
    const dataResult = await client.query(dataQuery, queryParams)

    return {
      employees: dataResult.rows,
      totalCount,
    }
  } catch (err) {
    console.error("Error fetching employees:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const checkEmployeeEmailExists = async (email) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query("SELECT 1 FROM m5_employee WHERE email = $1", [email])
    return result.rows.length > 0
  } catch (err) {
    console.error("Error checking email existence:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const createEmployee = async (employeeData, documentUrls, adminId = null, userAgent = null) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    const {
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      password,
      base_salary,
      company_reg_num,
      income_tax_rate,
      deduction_other_deductions,
      deduction_uif,
      deduction_bonus,
      deduction_savings,
      deduction_loan,
      deduction_damage,
    } = employeeData

    if (!name || !surname) {
      throw new Error("Name and surname are required")
    }

    // Validate password if provided
    if (password && password.trim() !== "") {
      const passwordValidation = validatePassword(password)
      if (passwordValidation !== true) {
        throw new Error(passwordValidation)
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null
    const deductionDate = new Date()

    const insertEmployeeQuery = `
      INSERT INTO m5_employee (
        name, surname, telephonenum, cellnum, employeenum,
        roleid, email, password, base_salary, company_reg_num, status,
        document_url1, document_url2, document_url3
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true,
        $11, $12, $13
      ) RETURNING *
    `
    const insertValues = [
      name,
      surname,
      telephonenum || null,
      cellnum || null,
      employeenum || null,
      roleid || null,
      email || null,
      hashedPassword,
      base_salary != null ? Number.parseFloat(base_salary) : null,
      company_reg_num || null,
      documentUrls[0] || null,
      documentUrls[1] || null,
      documentUrls[2] || null,
    ]
    const result = await client.query(insertEmployeeQuery, insertValues)
    const newEmployee = result.rows[0]

    if (base_salary != null) {
      const insertSalaryHistoryQuery = `
        INSERT INTO base_salary_history (userid, base, date)
        VALUES ($1, $2, $3)
      `
      const salaryHistoryValues = [
        newEmployee.userid,
        Number.parseFloat(base_salary),
        deductionDate,
      ]
      await client.query(insertSalaryHistoryQuery, salaryHistoryValues)
    }

    const insertHistoryQuery = `
      INSERT INTO employee_deduction_history (
        employeeid, effective_date, income_tax_rate,
        deduction_other_deductions, deduction_uif, deduction_bonus,
        deduction_savings, deduction_loan, deduction_damage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `
    const historyValues = [
      newEmployee.userid,
      deductionDate,
      Number.parseFloat(income_tax_rate || 0),
      Number.parseFloat(deduction_other_deductions || 0),
      Number.parseFloat(deduction_uif || 0),
      Number.parseFloat(deduction_bonus || 0),
      Number.parseFloat(deduction_savings || 0),
      Number.parseFloat(deduction_loan || 0),
      Number.parseFloat(deduction_damage || 0),
    ]
    await client.query(insertHistoryQuery, historyValues)

    await client.query("COMMIT")
    
    // Log employee creation with admin ID and user agent
    try {
      await logEmployeeCreation(client, adminId, newEmployee.userid, `${name} ${surname}`, userAgent);
    } catch (logError) {
      // Don't fail the operation if logging fails
      console.warn('Audit logging failed for employee creation:', logError.message);
    }
    
    return newEmployee
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error creating employee:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateEmployee = async (id, employeeData, documentUrls, adminId = null, userAgent = null) => {
  let client
  try {
    client = await pool.connect()
    await client.query("BEGIN")

    const {
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      password,
      base_salary,
      income_tax_rate,
      deduction_other_deductions,
      deduction_uif,
      deduction_bonus,
      deduction_savings,
      deduction_loan,
      deduction_damage,
    } = employeeData

    if (!name || !surname) {
      throw new Error("Name and surname are required")
    }

    const existingResult = await client.query(
      "SELECT document_url1, document_url2, document_url3, base_salary, password FROM m5_employee WHERE userid = $1",
      [id],
    )
    if (!existingResult.rows.length) {
      throw new Error("Employee not found")
    }

    let { document_url1, document_url2, document_url3, base_salary: currentBaseSalary, password: currentPassword } = existingResult.rows[0]
    const currentDocs = [document_url1, document_url2, document_url3]

    let newIndex = 0
    for (let i = 0; i < currentDocs.length && newIndex < documentUrls.length; i++) {
      if (!currentDocs[i]) {
        currentDocs[i] = documentUrls[newIndex]
        newIndex++
      }
    }
    if (newIndex < documentUrls.length) {
      for (let i = 0; i < currentDocs.length && newIndex < documentUrls.length; i++) {
        currentDocs[i] = documentUrls[newIndex]
        newIndex++
      }
    }
    ;[document_url1, document_url2, document_url3] = currentDocs

    let hashedPassword = currentPassword
    let passwordChanged = false
    if (password && password.trim() !== "") {
      // Validate password before hashing
      const passwordValidation = validatePassword(password)
      if (passwordValidation !== true) {
        throw new Error(passwordValidation)
      }
      hashedPassword = await bcrypt.hash(password, 10)
      passwordChanged = true
    }

    const updateEmpQuery = `
      UPDATE m5_employee SET
        name = $1, surname = $2, telephonenum = $3, cellnum = $4, employeenum = $5,
        roleid = $6, email = $7, password = $8, base_salary = $9,
        document_url1 = $10, document_url2 = $11, document_url3 = $12
      WHERE userid = $13
      RETURNING *
    `
    const updateValues = [
      name,
      surname,
      telephonenum || null,
      cellnum || null,
      employeenum || null,
      roleid || null,
      email || null,
      hashedPassword,
      base_salary != null ? Number.parseFloat(base_salary) : null,
      document_url1 || null,
      document_url2 || null,
      document_url3 || null,
      id,
    ]
    const result = await client.query(updateEmpQuery, updateValues)
    const updatedEmployee = result.rows[0]

    if (base_salary != null && Number.parseFloat(base_salary) !== Number.parseFloat(currentBaseSalary)) {
      const currentDate = new Date()
      const dateTruncated = currentDate.toISOString().split('T')[0]

      const checkSalaryHistoryQuery = `
        SELECT id FROM base_salary_history
        WHERE userid = $1 AND date_trunc('day', date) = $2
        LIMIT 1
      `
      const checkSalaryHistoryValues = [updatedEmployee.userid, dateTruncated]
      const checkResult = await client.query(checkSalaryHistoryQuery, checkSalaryHistoryValues)

      if (checkResult.rows.length > 0) {
        const updateSalaryHistoryQuery = `
          UPDATE base_salary_history
          SET base = $1
          WHERE id = $2
        `
        const updateSalaryHistoryValues = [
          Number.parseFloat(base_salary),
          checkResult.rows[0].id
        ]
        await client.query(updateSalaryHistoryQuery, updateSalaryHistoryValues)
      } else {
        const insertSalaryHistoryQuery = `
          INSERT INTO base_salary_history (userid, base, date)
          VALUES ($1, $2, $3)
        `
        const salaryHistoryValues = [
          updatedEmployee.userid,
          Number.parseFloat(base_salary),
          currentDate,
        ]
        await client.query(insertSalaryHistoryQuery, salaryHistoryValues)
      }
    }

    const newValues = {
      income_tax: Number.parseFloat(income_tax_rate || 0),
      other: Number.parseFloat(deduction_other_deductions || 0),
      uif: Number.parseFloat(deduction_uif || 0),
      bonus: Number.parseFloat(deduction_bonus || 0),
      savings: Number.parseFloat(deduction_savings || 0),
      loan: Number.parseFloat(deduction_loan || 0),
      damage: Number.parseFloat(deduction_damage || 0),
    }

    const { rows: lastRows } = await client.query(
      `SELECT * FROM employee_deduction_history
       WHERE employeeid = $1
       ORDER BY effective_date DESC
       LIMIT 1`,
      [id],
    )
    const last = lastRows[0]
    const isDuplicate =
      last &&
      newValues.income_tax === Number.parseFloat(last.income_tax_rate) &&
      newValues.other === Number.parseFloat(last.deduction_other_deductions) &&
      newValues.uif === Number.parseFloat(last.deduction_uif) &&
      newValues.bonus === Number.parseFloat(last.deduction_bonus) &&
      newValues.savings === Number.parseFloat(last.deduction_savings) &&
      newValues.loan === Number.parseFloat(last.deduction_loan) &&
      newValues.damage === Number.parseFloat(last.deduction_damage)

    if (!isDuplicate) {
      const insertHistoryQuery = `
        INSERT INTO employee_deduction_history (
          employeeid, effective_date, income_tax_rate, deduction_other_deductions,
          deduction_uif, deduction_bonus, deduction_savings,
          deduction_loan, deduction_damage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `
      const deductionDate = new Date()
      const historyValues = [
        updatedEmployee.userid,
        deductionDate,
        newValues.income_tax,
        newValues.other,
        newValues.uif,
        newValues.bonus,
        newValues.savings,
        newValues.loan,
        newValues.damage,
      ]
      await client.query(insertHistoryQuery, historyValues)
    }

    await client.query("COMMIT")
    
    // Log password change if password was changed
    if (passwordChanged) {
      try {
        await logPasswordChange(client, adminId, id, `${name} ${surname}`, userAgent);
      } catch (logError) {
        // Don't fail the operation if logging fails
        console.warn('Audit logging failed for password change:', logError.message);
      }
    }
    
    return updatedEmployee
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error updating employee:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const toggleEmployeeStatus = async (id, status) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM m5_employee WHERE userid = $1", [id])
    if (!checkResult.rows.length) {
      return { success: false, message: "Employee not found" }
    }
    const updateResult = await client.query("UPDATE m5_employee SET status = $1 WHERE userid = $2 RETURNING *", [
      status,
      id,
    ])
    return { success: true, data: updateResult.rows[0] }
  } catch (err) {
    console.error(`Error toggling employee ${id} status:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const getEmployeeDetails = async (id) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(`
      SELECT 
        userid, name, surname, telephonenum, cellnum, employeenum,
        roleid, email, base_salary, company_reg_num, status,
        document_url1, document_url2, document_url3
      FROM m5_employee 
      WHERE userid = $1
    `, [id])
    if (!result.rows.length) {
      return { success: false, message: "Employee not found" }
    }
    const employee = result.rows[0]
    const historyResult = await client.query(
      "SELECT * FROM employee_deduction_history WHERE employeeid = $1 ORDER BY effective_date DESC, history_id DESC",
      [id],
    )
    employee.deductionHistory = historyResult.rows
    return { success: true, data: employee }
  } catch (err) {
    console.error("Error fetching employee details:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const deleteEmployeeDocument = async (employeeId, url) => {
  let client
  try {
    client = await pool.connect()
    const { rows } = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_employee WHERE userid = $1",
      [employeeId],
    )
    if (!rows.length) {
      return { success: false, message: "Employee not found" }
    }

    let updateField = null
    const storedUrls = [rows[0].document_url1, rows[0].document_url2, rows[0].document_url3]
    for (let i = 0; i < storedUrls.length; i++) {
      if (storedUrls[i] === url || decodeURIComponent(new URL(storedUrls[i]).pathname.substring(1)) === url) {
        updateField = `document_url${i + 1}`
        break
      }
    }

    if (updateField) {
      await client.query(`UPDATE m5_employee SET ${updateField} = NULL WHERE userid = $1`, [employeeId])
      return { success: true, message: "Document deleted successfully" }
    }
    return { success: false, message: "No matching document URL found" }
  } catch (err) {
    console.error("Error deleting employee document:", err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export {
  getEmployeeBasic,
  getAllEmployees,
  checkEmployeeEmailExists,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeDetails,
  deleteEmployeeDocument,
}