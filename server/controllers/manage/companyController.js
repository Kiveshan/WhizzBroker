import { getCompanyByCompanyRegNum, getCompanyByUserId, updateCompany } from "../../models/manage/companyModel.js"

const getCompanyHandler = async (req, res) => {
  try {
    const userId = req.user.userid // Assuming user ID is available from auth middleware
    const companyRegNum = req.user.company_reg_num
    console.log(`Fetching company details for user ID ${userId}`)
    const result = companyRegNum
      ? await getCompanyByCompanyRegNum(companyRegNum)
      : await getCompanyByUserId(userId)
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error fetching company for user ${req.user?.userid}:`, err)
    res.status(500).json({ error: "Failed to fetch company details" })
  }
}

const updateCompanyHandler = async (req, res) => {
  try {
    const userId = req.user.userid // Assuming user ID is available from auth middleware
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
    } = req.body

    // Validate required fields
    if (!companyname || !company_reg_num) {
      return res.status(400).json({ error: "Company name and registration number are required" })
    }
    console.log(`Updating company for user ID ${userId}`)
    const result = await updateCompany(userId, {
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
    })
    if (!result.success) {
      return res.status(404).json({ message: result.message })
    }
    res.json(result.data)
  } catch (err) {
    console.error(`Error updating company for user ${req.user?.userid}:`, err)
    res.status(500).json({ error: err.message || "Failed to update company details" })
  }
}

export { getCompanyHandler, updateCompanyHandler }