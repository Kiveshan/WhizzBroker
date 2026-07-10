import {
  getEmployeeBasic,
  getAllEmployees,
  checkEmployeeEmailExists,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeDetails,
  deleteEmployeeDocument,
} from "../../models/manage/employeeModal.js"
import { s3Employees, getSignedUrl } from "../../utils/s3Config.js"

const getEmployeeBasicHandler = async (req, res) => {
  try {
    const id = req.params.id

    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      })
    }

    console.log(`Fetching basic employee data for ID ${id}`)
    const result = await getEmployeeBasic(Number.parseInt(id))
    if (!result.success) {
      return res.status(404).json({
        error: "Employee not found",
        message: result.message,
      })
    }
    console.log(`Found employee data for ID ${id}:`, result.data)
    res.json(result.data)
  } catch (error) {
    console.error(`Error fetching employee data for ID ${req.params.id}:`, error)
    res.status(500).json({
      error: "An error occurred while fetching employee data",
      message: error.message,
    })
  }
}

const getAllEmployeesHandler = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    console.log(`Fetching employees - Page: ${pageNum}, Limit: ${limitNum}, Search: ${search}, Status: ${status}`)

    const result = await getAllEmployees({
      offset,
      limit: limitNum,
      search,
      status,
    })

    res.json({
      items: result.employees,
      currentPage: pageNum,
      totalPages: Math.ceil(result.totalCount / limitNum),
      totalItems: result.totalCount,
      itemsPerPage: limitNum,
    })
  } catch (err) {
    console.error("Error fetching employees:", err)
    res.status(500).json({ error: "Failed to fetch employees" })
  }
}

const checkEmployeeEmailExistsHandler = async (req, res) => {
  try {
    const { email } = req.query
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" })
    }
    const exists = await checkEmployeeEmailExists(email)
    res.json({ exists })
  } catch (err) {
    console.error("Error checking email existence:", err)
    res.status(500).json({ error: "Failed to check email existence" })
  }
}

const createEmployeeHandler = async (req, res) => {
  try {
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
      company_reg_num,
    } = req.body

    // Validate required fields
    if (!name || !surname) {
      return res.status(400).json({ error: "Name and surname are required" })
    }

    const urls = (req.files || []).map((f) => f.location)
    while (urls.length < 3) urls.push(null)

    console.log("Creating employee with data:", req.body)
    const adminId = req.user?.userid || null // Extract admin ID from authenticated user
    const userAgent = req.headers['user-agent'] || null
    const newEmployee = await createEmployee(
      {
        name,
        surname,
        telephonenum,
        cellnum,
        employeenum,
        roleid,
        email,
        password,
        base_salary,
        company_reg_num: company_reg_num || req.user.company_reg_num,
        income_tax_rate,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage,
      },
      urls,
      adminId,
      userAgent
    )
    res.status(201).json(newEmployee)
  } catch (err) {
    console.error("Error in /api/employees POST:", err)
    res.status(500).json({ error: err.message || "Failed to create employee" })
  }
}

const updateEmployeeHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      })
    }

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
    } = req.body

    // Validate required fields
    if (!name || !surname) {
      return res.status(400).json({ error: "Name and surname are required" })
    }

    const newFileUrls = (req.files || []).map((f) => f.location)

    console.log(`Updating employee ID ${id}`)
    const adminId = req.user?.userid || null // Extract admin ID from authenticated user
    const userAgent = req.headers['user-agent'] || null
    const updatedEmployee = await updateEmployee(
      Number.parseInt(id),
      {
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
      },
      newFileUrls,
      adminId,
      userAgent
    )
    res.json(updatedEmployee)
  } catch (err) {
    console.error("Error updating employee:", err)
    res.status(500).json({ error: err.message || "Failed to update employee" })
  }
}

const toggleEmployeeStatusHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      })
    }

    const { status } = req.body
    console.log(`Toggling status for employee ID ${id} to ${status}`)
    const result = await toggleEmployeeStatus(Number.parseInt(id), status)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error toggling employee ${req.params.id} status:`, err)
    res.status(500).json({ error: "Failed to toggle employee status" })
  }
}

const getEmployeeDetailsHandler = async (req, res) => {
  try {
    const { id } = req.params

    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      })
    }

    console.log(`Fetching detailed employee data for ID ${id}`)
    const result = await getEmployeeDetails(Number.parseInt(id))
    if (!result.success) {
      return res.status(404).json({ error: result.message })
    }
    const employee = result.data

    const extractKeyFromUrl = (url) => {
      if (!url) {
        console.log("No document URL provided, skipping key extraction")
        return null
      }
      try {
        const key = decodeURIComponent(new URL(url).pathname.substring(1))
        console.log(`Extracted S3 key from URL: ${key}`)
        return key
      } catch (error) {
        console.error(`Error extracting key from URL ${url}:`, error)
        return url // Fallback to URL if parsing fails
      }
    }

    const signedUrls = await Promise.all(
      [employee.document_url1, employee.document_url2, employee.document_url3].map(async (url) => {
        if (!url) {
          console.log("No document URL provided, skipping signed URL generation")
          return null
        }
        const key = extractKeyFromUrl(url)
        if (!key) {
          console.log("No valid key extracted, skipping signed URL generation")
          return null
        }
        try {
          const signedUrl = await getSignedUrl(key, 3600, process.env.Employee_AWS_BUCKET_NAME)
          console.log(`Generated signed URL for key ${key}: ${signedUrl}`)
          return signedUrl
        } catch (error) {
          console.error(`Failed to generate signed URL for key ${key}:`, error)
          return null // Return null to avoid breaking the response
        }
      }),
    )

    employee.document_url1 = signedUrls[0]
    employee.document_url2 = signedUrls[1]
    employee.document_url3 = signedUrls[2]

    res.json(employee)
  } catch (err) {
    console.error("Error fetching employee details:", err)
    res.status(500).json({ error: "Failed to fetch employee details" })
  }
}

const deleteEmployeeDocumentHandler = async (req, res) => {
  try {
    const { employeeId, url } = req.body
    if (!employeeId || !url) {
      return res.status(400).json({ message: "Missing employee ID or document URL" })
    }

    if (isNaN(Number.parseInt(employeeId))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      })
    }

    console.log(`Deleting document for employee ID ${employeeId}`)
    let s3Key
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1))
    } catch (error) {
      s3Key = url
    }

    await s3Employees
      .deleteObject({
        Bucket: process.env.Employee_AWS_BUCKET_NAME,
        Key: s3Key,
      })
      .promise()

    const result = await deleteEmployeeDocument(Number.parseInt(employeeId), s3Key)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json({ message: result.message })
  } catch (error) {
    console.error("Failed to delete employee document:", error)
    res.status(500).json({ message: "Server error during document deletion" })
  }
}

export {
  getEmployeeBasicHandler,
  getAllEmployeesHandler,
  checkEmployeeEmailExistsHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  toggleEmployeeStatusHandler,
  getEmployeeDetailsHandler,
  deleteEmployeeDocumentHandler,
}