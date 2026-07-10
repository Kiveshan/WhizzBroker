import { pool, query } from "../../config/database.js";
import {
  saveDeductionHistory,
  getTaxAmountForDate,
  getDeductionsForDate,
  getLastDayOfMonth,
  roundToTwoDecimals,
} from "../../utils/wagesUtils.js";

const saveWageData = async ({
  employeeId,
  month,
  year,
  totalEarnings,
  totalDeductions,
  netPay,
}) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Calculate the target date (last day of month)
    const lastDay = getLastDayOfMonth(
      Number.parseInt(year),
      Number.parseInt(month) - 1
    );
    const normalizedDate = lastDay.toISOString();
    const formattedDate = normalizedDate.split("T")[0];

    // Get the tax information that should be used for this date
    const taxInfo = await getTaxAmountForDate(
      pool,
      totalEarnings,
      formattedDate
    );

    // Check if employee exists
    const employeeQuery = `SELECT * FROM m5_employee WHERE userid = $1`;
    const employeeResult = await client.query(employeeQuery, [employeeId]);

    if (employeeResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Employee not found" };
    }

    // Insert wage record with tax history
    const insertQuery = `
INSERT INTO wages (
    employeeid, total_earnings, total_deductions, net_pay,
    employee_date
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT ON CONSTRAINT unique_wage_per_employee_month_year
  DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    total_deductions = EXCLUDED.total_deductions,
    net_pay = EXCLUDED.net_pay
  RETURNING wageskey
`;

const params = [
  employeeId,
  Number(totalEarnings.toFixed(2)), // Total earnings after loan deduction
  Number(totalDeductions.toFixed(2)), // This can be 0 or actual deductions
  Number(netPay.toFixed(2)), // This is now "Total Payable to Labour Consultant"
  normalizedDate,
];

const result = await client.query(insertQuery, params);

await client.query("COMMIT");

console.log(
  `✅ Wage saved - Total Earnings: R${totalEarnings.toFixed(2)}, Total Payable: R${netPay.toFixed(2)}`
);

return {
  success: true,
  wagesKey: result.rows[0].wageskey,
};
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
};
const getBaseSalaryHistory = async (employeeId, month, year) => {
  let client;
  try {
    client = await pool.connect();
    
    // Convert month name to number if it's a string
    let monthNumber = month;
    if (typeof month === 'string') {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      monthNumber = monthNames.indexOf(month) + 1;
      
      if (monthNumber === 0) {
        return { exists: false, error: 'Invalid month name' };
      }
    }
    
    // Get the last day of the requested month
    const lastDayOfMonth = new Date(parseInt(year), monthNumber, 0);
    const monthEndDate = lastDayOfMonth.toISOString().split('T')[0];
    
    console.log(`Getting base salary for employee ${employeeId} as of ${monthEndDate}`);
    
    // Query to get the most recent base salary on or before the month end
    const historyQuery = `
      SELECT base, date 
      FROM base_salary_history 
      WHERE userid = $1 AND date <= $2 
      ORDER BY date DESC 
      LIMIT 1
    `;
    
    const historyResult = await client.query(historyQuery, [employeeId, monthEndDate]);
    
    if (historyResult.rows.length > 0) {
      console.log(`✅ Found historical base salary: ${historyResult.rows[0].base} as of ${historyResult.rows[0].date}`);
      return {
        exists: true,
        baseSalary: parseFloat(historyResult.rows[0].base),
        effectiveDate: historyResult.rows[0].date,
        source: 'historical'
      };
    } else {
      // Fallback to current base salary from m5_employee table
      console.log('No historical base salary found, checking current base salary');
      const currentQuery = `
        SELECT base_salary 
        FROM m5_employee 
        WHERE userid = $1
      `;
      
      const currentResult = await client.query(currentQuery, [employeeId]);
      
      if (currentResult.rows.length > 0 && currentResult.rows[0].base_salary) {
        console.log(`⚠️ Using current base salary: ${currentResult.rows[0].base_salary}`);
        return {
          exists: true,
          baseSalary: parseFloat(currentResult.rows[0].base_salary),
          effectiveDate: null,
          source: 'current'
        };
      } else {
        console.log('❌ No base salary found');
        return {
          exists: false,
          baseSalary: 0,
          source: 'none'
        };
      }
    }
    
  } finally {
    if (client) client.release();
  }
};
const checkWageSlip = async (employeeId, month, year) => {
  // Normalize the date to the last day of the month
  const targetDate = new Date(Number.parseInt(year), Number.parseInt(month), 0);

  // Query the database to check if a wage slip already exists
  const queryText = `
    SELECT w.*, e.deduction_date 
    FROM public.wages w
    JOIN public.m5_employee e ON w.employeeid = e.userid
    WHERE w.employeeid = $1 
      AND w.employee_date = $2
    ORDER BY w.wageskey
    LIMIT 1
  `;

  console.log(
    `Executing query with params: employeeId=${employeeId}, month=${month}, year=${year}`
  );
  const result = await query(queryText, [employeeId, targetDate]);

  if (result.rows.length > 0) {
    const wageSlip = result.rows[0];
    console.log(`Found existing wage slip with ID ${wageSlip.wageskey}`);

    let useHistoricalValues = false;
    if (wageSlip.deduction_date) {
      const deductionDate = new Date(wageSlip.deduction_date);
      useHistoricalValues = targetDate < deductionDate;
      console.log(
        `Target date: ${targetDate.toISOString()}, Deduction date: ${deductionDate.toISOString()}, Use historical values: ${useHistoricalValues}`
      );
    }

    return {
      exists: true,
      wageSlip,
      useHistoricalValues,
    };
  } else {
    console.log(
      `No existing wage slip found for employeeId=${employeeId}, month=${month}, year=${year}`
    );
    return { exists: false };
  }
};
const getAllEmployees = async () => {
  const sql = `
    SELECT userid, name, surname, roleid
    FROM m5_employee
    ORDER BY name, surname
  `;
  const result = await query(sql);
  return result.rows;
};
const getStoredWageData = async (employeeId, month, year) => {
  let client;
  try {
    client = await pool.connect();
    
    // Convert month name to number if it's a string
    let monthNumber = month;
    if (typeof month === 'string') {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      monthNumber = monthNames.indexOf(month) + 1;
    }
    
    const query = `
      SELECT 
        total_earnings,
        net_pay as total_payable,
        employee_date
      FROM wages 
      WHERE employeeid = $1 
      AND EXTRACT(MONTH FROM employee_date) = $2 
      AND EXTRACT(YEAR FROM employee_date) = $3
    `;
    
    const result = await client.query(query, [employeeId, monthNumber, year]);
    
    if (result.rows.length > 0) {
      console.log(`Found stored wage data for employee ${employeeId} - ${month} ${year}`);
      return {
        exists: true,
        totalEarnings: parseFloat(result.rows[0].total_earnings),
        totalPayable: parseFloat(result.rows[0].total_payable),
        date: result.rows[0].employee_date
      };
    }
    
    return { exists: false };
    
  } finally {
    if (client) client.release();
  }
};
const getEmployeeDeductions = async (employeeId, month, year) => {
  let client;
  try {
    client = await pool.connect();

    // Convert month name to month number (0-based)
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      return { success: false, message: "Invalid month name" };
    }

    // Create target date (last day of the month for wage slip generation)
    const targetDate = new Date(Number.parseInt(year), monthIndex + 1, 0);
    const formattedTargetDate = targetDate.toISOString().split("T")[0];
    console.log(`Target date for tax lookup: ${formattedTargetDate}`);

    // Get total earnings
    const totalEarningsQuery = `
      SELECT total_earnings 
      FROM wages 
      WHERE employeeid = $1 
      AND EXTRACT(MONTH FROM employee_date) = $2 
      AND EXTRACT(YEAR FROM employee_date) = $3
    `;

    const earningsResult = await client.query(totalEarningsQuery, [
      employeeId,
      monthIndex + 1,
      year,
    ]);
    let totalEarnings = 0;

    if (earningsResult.rows.length > 0) {
      totalEarnings =
        Number.parseFloat(earningsResult.rows[0].total_earnings) || 0;
    } else {
      // Calculate total earnings if no wage record exists
      const baseSalaryQuery = `SELECT base_salary FROM m5_employee WHERE userid = $1`;
      const baseSalaryResult = await client.query(baseSalaryQuery, [
        employeeId,
      ]);

      if (baseSalaryResult.rows.length > 0) {
        totalEarnings =
          Number.parseFloat(baseSalaryResult.rows[0].base_salary) || 0;
      }

      // Add legs earnings for this month/year
      const legsQuery = `
        SELECT SUM(driverrate) as legs_total
        FROM legs_m2 l
        JOIN m1_controller i ON l.m1key = i.m1key
        WHERE l.driverid = $1
        AND EXTRACT(MONTH FROM i.pickupdate) = $2
        AND EXTRACT(YEAR FROM i.pickupdate) = $3
      `;

      const legsResult = await client.query(legsQuery, [
        employeeId,
        monthIndex + 1,
        year,
      ]);
      if (legsResult.rows.length > 0 && legsResult.rows[0].legs_total) {
        totalEarnings += Number.parseFloat(legsResult.rows[0].legs_total);
      }
    }

    console.log(
      `Total earnings for tax calculation: ${totalEarnings} (type: ${typeof totalEarnings})`
    );

    // Use the target date for tax lookup
    const taxInfo = await getTaxAmountForDate(
      pool,
      totalEarnings,
      formattedTargetDate
    );
    console.log(`Tax lookup result:`, taxInfo);

    // Get other deductions
    const deductions = await getDeductionsForDate(pool, employeeId, targetDate);

    if (!deductions) {
      return { success: false, message: "Employee not found" };
    }

    // Set the calculated tax amount
    deductions.deduction_income_tax = taxInfo.tax;
    deductions.tax_effective_date = taxInfo.effectiveDate;
    deductions.tax_bracket_used = taxInfo.bracket;

    // Remove income_tax_rate since it's no longer used
    delete deductions.income_tax_rate;

    console.log(
      `Retrieved deductions for employee ${employeeId} for ${month} ${year}:`,
      deductions
    );
    return { success: true, data: deductions };
  } finally {
    if (client) client.release();
  }
};

const updateEmployeeDeductions = async (employeeId, deductionData) => {
  let client;
  try {
    client = await pool.connect();

    // Start transaction
    await client.query("BEGIN");

    // First check if employee exists
    const employeeCheck = await client.query(
      `SELECT userid FROM m5_employee WHERE userid = $1`,
      [employeeId]
    );

    if (employeeCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Employee not found" };
    }

    const roundedDeductionData = {
      deduction_other_deductions: roundToTwoDecimals(
        deductionData.deduction_other_deductions
      ),
      deduction_uif: roundToTwoDecimals(deductionData.deduction_uif),
      deduction_bonus: roundToTwoDecimals(deductionData.deduction_bonus),
      deduction_savings: roundToTwoDecimals(deductionData.deduction_savings),
      deduction_loan: roundToTwoDecimals(deductionData.deduction_loan),
      deduction_damage: roundToTwoDecimals(deductionData.deduction_damage),
    };

    if (deductionData.deduction_income_tax !== undefined) {
      roundedDeductionData.deduction_income_tax = roundToTwoDecimals(
        deductionData.deduction_income_tax
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Insert new deduction values into history table
    const insertResult = await client.query(
      `INSERT INTO employee_deduction_history (
        employeeid,
        effective_date,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        employeeId,
        today,
        roundedDeductionData.deduction_income_tax || 0,
        roundedDeductionData.deduction_other_deductions || 0,
        roundedDeductionData.deduction_uif || 0,
        roundedDeductionData.deduction_bonus || 0,
        roundedDeductionData.deduction_savings || 0,
        roundedDeductionData.deduction_loan || 0,
        roundedDeductionData.deduction_damage || 0,
      ]
    );

    // Update the m5_employee table
    await client.query(
      `UPDATE m5_employee
      SET 
        deduction_income_tax = $1,
        deduction_other_deductions = $2,
        deduction_uif = $3,
        deduction_bonus = $4,
        deduction_savings = $5,
        deduction_loan = $6,
        deduction_damage = $7,
        deduction_date = $8
      WHERE userid = $9`,
      [
        roundedDeductionData.deduction_income_tax || 0,
        roundedDeductionData.deduction_other_deductions || 0,
        roundedDeductionData.deduction_uif || 0,
        roundedDeductionData.deduction_bonus || 0,
        roundedDeductionData.deduction_savings || 0,
        roundedDeductionData.deduction_loan || 0,
        roundedDeductionData.deduction_damage || 0,
        today,
        employeeId,
      ]
    );

    // Commit transaction
    await client.query("COMMIT");

    console.log(`Updated deductions for employee ${employeeId}`);
    return { success: true, data: insertResult.rows[0] };
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getDriverWageDetailsByInstruction = async (driverId, instructionId) => {
  const employeeQuery = `
    SELECT base_salary
    FROM public.m5_employee
    WHERE userid = $1
  `;

  const employeeResult = await query(employeeQuery, [driverId]);
  const baseSalary = employeeResult.rows[0]?.base_salary || 0;

  const legsQuery = `
    SELECT 
      SUM(driverrate) as leg_payments,
      MAX(date) as date
    FROM 
      public.legs_m2
    WHERE 
      driverid = $1 AND m1key = $2
  `;

  const legsResult = await query(legsQuery, [driverId, instructionId]);
  const legPayments = legsResult.rows[0]?.leg_payments || 0;
  const date = legsResult.rows[0]?.date;

  const bonuses = 0;
  const deductions = 0;
  const total = baseSalary + legPayments + bonuses - deductions;

  return {
    base_salary: baseSalary,
    leg_payments: legPayments,
    bonuses: bonuses,
    deductions: deductions,
    total: total,
    date: date,
  };
};

const getDriverWageDetails = async (driverId) => {
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM public.m5_employee
    WHERE userid = $1
  `;

  const checkResult = await query(checkQuery, [driverId]);
  const driverExists = checkResult.rows[0].count > 0;

  if (!driverExists) {
    console.log(`No driver found with ID ${driverId}`);
    return {
      success: false,
      error: "Driver not found",
      message: `No driver found with ID ${driverId}`,
    };
  }

  const employeeQuery = `
    SELECT base_salary
    FROM public.m5_employee
    WHERE userid = $1
  `;

  const employeeResult = await query(employeeQuery, [driverId]);
  const baseSalary = employeeResult.rows[0]?.base_salary || 0;

  const legsQuery = `
    SELECT 
      SUM(driverrate) as leg_payments,
      MAX(date) as date
    FROM 
      public.legs_m2
    WHERE 
      driverid = $1
  `;

  const legsResult = await query(legsQuery, [driverId]);
  const legPayments = legsResult.rows[0]?.leg_payments || 0;
  const date = legsResult.rows[0]?.date;

  const bonuses = 0;
  const deductions = 0;
  const total = baseSalary + legPayments + bonuses - deductions;

  return {
    success: true,
    data: {
      base_salary: baseSalary,
      leg_payments: legPayments,
      bonuses: bonuses,
      deductions: deductions,
      total: total,
      date: date,
    },
  };
};

const getDriverInstructions = async (driverId) => {
  let client;
  try {
    client = await pool.connect();

    const queryText = `
        SELECT 
        m1.m1key, 
        m1."lastFreeDate",
        m1.created_at,
        COUNT(l.legkey) as leg_count
      FROM 
        public.m1_controller m1
      JOIN 
        public.legs_m2 l ON m1.m1key = l.m1key
      WHERE 
        l.driverid = $1
      GROUP BY 
        m1.m1key, m1."lastFreeDate", m1.created_at
      ORDER BY 
        COALESCE(m1."lastFreeDate", m1.created_at) DESC
    `;

    const result = await client.query(queryText, [driverId]);
    console.log(
      `Found ${result.rows.length} instructions for driver ID ${driverId}`
    );

    return result.rows;
  } finally {
    if (client) client.release();
  }
};

const getDriverLegsByMonth = async (driverId, month, year) => {
  let client;
  try {
    client = await pool.connect();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      throw new Error("Invalid month name");
    }

    const startDate = new Date(Number.parseInt(year), monthIndex, 1);
    const endDate = new Date(Number.parseInt(year), monthIndex + 1, 0);

    // Adjust for timezone: add timezone offset to get local date
    const timezoneOffset = startDate.getTimezoneOffset() * 60000; // offset in milliseconds
    const localStartDate = new Date(startDate.getTime() - timezoneOffset);
    const localEndDate = new Date(endDate.getTime() - timezoneOffset);
    
    const formattedStartDate = localStartDate.toISOString().split("T")[0];
    const formattedEndDate = localEndDate.toISOString().split("T")[0];

    console.log(
      `Filtering legs between ${formattedStartDate} and ${formattedEndDate}`
    );

    const queryText = `
      SELECT
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.dn,
        l.legstatus,
        l.m1key,
        m.status as instruction_status
      FROM
        public.legs_m2 l
      JOIN
        public.m1_controller m ON l.m1key = m.m1key
      WHERE
        l.driverid = $1
        AND l.date >= $2
        AND l.date <= $3
      ORDER BY
        l.date ASC, l.legnumber
    `;

    const params = [driverId, formattedStartDate, formattedEndDate];
    console.log("Executing query:", queryText);
    console.log("Query parameters:", params);

    const result = await client.query(queryText, params);
    console.log(
      `Found ${result.rows.length} legs for driver ID ${driverId} in ${month} ${year}`
    );

    return result.rows;
  } finally {
    if (client) {
      console.log("Releasing database client");
      client.release();
    }
  }
};
const getAllRoles = async () => {
  const sql = `
    SELECT roleid, rolename
    FROM public.roles
    ORDER BY rolename
  `;
  const result = await query(sql);
  console.log(`Found ${result.rows.length} roles`);
  return result.rows;
};
const getAllRolesExcludingSix = async () => {
  const sql = `
    SELECT roleid, rolename
    FROM public.roles
    WHERE roleid != 6
    ORDER BY rolename
  `;
  const result = await query(sql);
  console.log(`Found ${result.rows.length} roles (excluding roleid 6)`);
  return result.rows;
};
export {
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
   getAllRoles,
   getAllRolesExcludingSix
};
