import {
  saveWageData,
  checkWageSlip,
  getEmployeeDeductions,
  updateEmployeeDeductions,
  getDriverWageDetailsByInstruction,
  getDriverWageDetails,
  getDriverInstructions,
  getDriverLegsByMonth,
  getStoredWageData,
  getBaseSalaryHistory,
  getAllEmployees,
  getAllRoles,getAllRolesExcludingSix

} from "../../models/wages/wageModel.js";
import {
  getTaxAmountForDate,
  getDeductionsForDate,
} from "../../utils/wagesUtils.js";
const getStoredWageDataHandler = async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  
  console.log(`Route /api/stored-wage-data/${employeeId} was accessed with month=${month}, year=${year}`);
  
  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required query parameters" });
  }
  
  try {
    const result = await getStoredWageData(employeeId, month, year);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching stored wage data for employee ${employeeId}:`, error);
    res.status(500).json({ error: "Failed to fetch stored wage data" });
  }
};
const getAllEmployeesHandler = async (req, res) => {
  try {
    const employees = await getAllEmployees();
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching all employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};
const getBaseSalaryHistoryHandler = async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;
  
  console.log(`Route /api/base-salary-history/${employeeId} was accessed with month=${month}, year=${year}`);
  
  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required query parameters" });
  }
  
  try {
    const result = await getBaseSalaryHistory(employeeId, month, year);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching base salary history for employee ${employeeId}:`, error);
    res.status(500).json({ error: "Failed to fetch base salary history" });
  }
};
const saveWageDataHandler = async (req, res) => {
  const { employeeId, month, year, totalEarnings, totalDeductions, netPay } =
    req.body;

  console.log(
    `Saving wage data for employee ${employeeId} for ${month}/${year}`
  );

  try {
    const result = await saveWageData({
      employeeId,
      month,
      year,
      totalEarnings,
      totalDeductions,
      netPay,
    });
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.status(200).json({
      success: true,
      message: "Wage data saved successfully",
      wagesKey: result.wagesKey,
      taxAmountUsed: result.taxAmount,
    });
  } catch (error) {
    console.error(`Error saving wage data:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to save wage data",
      message: error.message,
    });
  }
};

const checkWageSlipHandler = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    console.log(
      `Checking for existing wage slip: employeeId=${employeeId}, month=${month}, year=${year}`
    );

    if (!employeeId || !month || !year) {
      console.log("Missing required parameters in check-wage-slip request");
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const result = await checkWageSlip(employeeId, month, year);
    return res.json(result);
  } catch (error) {
    console.error("Error checking existing wage slip:", error);
    res.status(500).json({ error: "Failed to check existing wage slip" });
  }
};

const getEmployeeDeductionsHandler = async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;

  console.log(
    `Route /api/employee-deductions/${employeeId} was accessed with month=${month}, year=${year}`
  );

  if (!month || !year) {
    return res
      .status(400)
      .json({ error: "Month and year are required query parameters" });
  }

  try {
    const result = await getEmployeeDeductions(employeeId, month, year);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result.data);
  } catch (error) {
    console.error(
      `Error fetching deductions data for employee ID ${employeeId}:`,
      error
    );
    return res.json({
      deduction_income_tax: 0,
      deduction_other_deductions: 0,
      deduction_uif: 0,
      deduction_bonus: 0,
      deduction_savings: 0,
      deduction_loan: 0,
      deduction_damage: 0,
    });
  }
};

const updateEmployeeDeductionsHandler = async (req, res) => {
  const { employeeId } = req.params;
  const deductionData = req.body;

  console.log(`Route PUT /api/employee-deductions/${employeeId} was accessed`);
  console.log("Deduction data:", deductionData);

  try {
    const result = await updateEmployeeDeductions(employeeId, deductionData);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json({
      success: true,
      message:
        "Deductions updated successfully (income tax will be calculated from tax brackets)",
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error updating deductions for employee ${employeeId}:`,
      error
    );
    res.status(500).json({ error: "Failed to update deductions" });
  }
};

const getDriverWageDetailsByInstructionHandler = async (req, res) => {
  const { driverId, instructionId } = req.params;

  try {
    const result = await getDriverWageDetailsByInstruction(
      driverId,
      instructionId
    );
    res.json(result);
  } catch (error) {
    console.error("Error fetching wage details:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching wage details" });
  }
};

const getDriverWageDetailsHandler = async (req, res) => {
  const { driverId } = req.params;
  console.log(`Route /wage-details/driver/${driverId} was accessed`);

  try {
    const result = await getDriverWageDetails(driverId);
    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message,
      });
    }
    res.json(result.data);
  } catch (error) {
    console.error("Error fetching wage details:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching wage details" });
  }
};

const getDriverInstructionsHandler = async (req, res) => {
  const { driverId } = req.params;
  console.log(`Route /api/driver-instructions/${driverId} was accessed`);

  try {
    const result = await getDriverInstructions(driverId);
    res.json(result);
  } catch (error) {
    console.error(
      `Error fetching driver instructions for driver ID ${driverId}:`,
      error
    );
    res.status(500).json({
      error: "An error occurred while fetching driver instructions",
      details: error.message,
    });
  }
};

const getDriverLegsByMonthHandler = async (req, res) => {
  const { driverId } = req.params;
  const { month, year } = req.query;

  console.log(
    `Route /api/all-driver-legs/${driverId}/by-month was accessed with month=${month}, year=${year}`
  );

  if (!month || !year) {
    return res
      .status(400)
      .json({ error: "Month and year are required query parameters" });
  }

  try {
    const result = await getDriverLegsByMonth(driverId, month, year);
    res.json(result);
  } catch (error) {
    console.error("Error fetching driver legs by month:", error);
    res.status(500).json({ error: "Failed to fetch driver legs by month" });
  }
};
const getAllRolesHandler = async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};
const getAllRolesExcludingSixHandler = async (req, res) => {
  try {
    const roles = await getAllRolesExcludingSix();
    res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles (excluding roleid 6):", error);
    res.status(500).json({ error: "Failed to fetch roles excluding roleid 6" });
  }
};
export {
  saveWageDataHandler,
  checkWageSlipHandler,
  getEmployeeDeductionsHandler,
  updateEmployeeDeductionsHandler,
  getDriverWageDetailsByInstructionHandler,
  getDriverWageDetailsHandler,
  getDriverInstructionsHandler,
  getDriverLegsByMonthHandler,
  getStoredWageDataHandler,
  getBaseSalaryHistoryHandler,
   getAllEmployeesHandler,
   getAllRolesHandler,getAllRolesExcludingSixHandler
};
