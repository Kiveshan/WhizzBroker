import { pool } from "../../config/database.js";

// Re-use the exact same wage calculation logic as analytics
async function getTotalWagesForMonth(client, month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) throw new Error('Invalid month');
  const monthNumber = monthIndex + 1;

  const employeesQuery = `
    SELECT userid
    FROM m5_employee
    WHERE roleid != 6
  `;
  const empRes = await client.query(employeesQuery);
  const employees = empRes.rows;

  let totalSum = 0;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const reportMonth = monthNumber;
  const reportYear = parseInt(year);
  const isPastMonth = (reportYear < currentYear) ||
    (reportYear === currentYear && reportMonth < currentMonth);

  for (const emp of employees) {
    const employeeId = emp.userid;

    const storedQuery = `
      SELECT net_pay as total_payable
      FROM wages 
      WHERE employeeid = $1 
        AND EXTRACT(MONTH FROM employee_date) = $2 
        AND EXTRACT(YEAR FROM employee_date) = $3
    `;
    const storedRes = await client.query(storedQuery, [employeeId, monthNumber, year]);
    let totalPayable = 0;

    if (storedRes.rows.length > 0 && isPastMonth) {
      totalPayable = parseFloat(storedRes.rows[0].total_payable) || 0;
    } else {
      totalPayable = await calculateTotalPayable(client, employeeId, month, year);
    }

    if (totalPayable > 0) {
      totalSum += totalPayable;
    }
  }

  return totalSum;
}

async function calculateTotalPayable(client, employeeId, month, year) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) return 0;
  const monthNumber = monthIndex + 1;
  const lastDayOfMonth = new Date(parseInt(year), monthNumber, 0).toISOString().split('T')[0];

  // Base Salary (historical or current)
  let baseSalary = 0;
  const baseHist = await client.query(
    `SELECT base FROM base_salary_history WHERE userid = $1 AND date <= $2 ORDER BY date DESC LIMIT 1`,
    [employeeId, lastDayOfMonth]
  );
  if (baseHist.rows.length > 0) {
    baseSalary = parseFloat(baseHist.rows[0].base) || 0;
  } else {
    const curr = await client.query(`SELECT base_salary FROM m5_employee WHERE userid = $1`, [employeeId]);
    baseSalary = parseFloat(curr.rows[0]?.base_salary) || 0;
  }

  // Legs earnings
  const legsRes = await client.query(
    `SELECT COALESCE(SUM(l.driverrate), 0) as total
     FROM legs_m2 l
     JOIN m1_controller i ON l.m1key = i.m1key
     WHERE l.driverid = $1
       AND EXTRACT(MONTH FROM l.date) = $2
       AND EXTRACT(YEAR FROM l.date) = $3`,
    [employeeId, monthNumber, year]
  );
  const legsAmount = parseFloat(legsRes.rows[0].total) || 0;

  const totalEarnings = baseSalary + legsAmount;
  if (totalEarnings === 0) return 0;

  // Loan deduction
  let loan = 0;
  const loanHist = await client.query(
    `SELECT deduction_loan FROM employee_deduction_history WHERE employeeid = $1 AND effective_date <= $2 ORDER BY effective_date DESC LIMIT 1`,
    [employeeId, lastDayOfMonth]
  );
  if (loanHist.rows.length > 0) {
    loan = parseFloat(loanHist.rows[0].deduction_loan) || 0;
  } else {
    const currLoan = await client.query(`SELECT deduction_loan FROM m5_employee WHERE userid = $1`, [employeeId]);
    loan = parseFloat(currLoan.rows[0]?.deduction_loan) || 0;
  }

  const afterLoan = totalEarnings - loan;
  const additions = afterLoan * (0.01 + 0.01 + 0.0248); // UIF + SDL + COID
  return afterLoan + additions;
}

const getProfitLossData = async (month, year) => {
  let client;
  try {
    client = await pool.connect();

    // === INCOME: Separate Categories (VAT-inclusive for Invoices) ===

    // Invoices — now matches calculateMonthlyTurnover (VAT-inclusive)
    const invoicesQuery = `
      SELECT
        COALESCE(
          SUM(m.total_cost + (m.total_cost * (COALESCE(m.vat, 0)::numeric / 100))),
          0
        ) AS invoices_total
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
        AND EXTRACT(YEAR FROM i.date)::text = $2
    `;

    const invoicesResult = await client.query(invoicesQuery, [month, year]);
    const invoicesTotal = Number(invoicesResult.rows[0]?.invoices_total || 0);

    // Add-ons (unchanged)
    const addOnsQuery = `
      SELECT COALESCE(SUM(amount), 0) AS addons_total
      FROM add_ons
      WHERE TRIM(TO_CHAR(date, 'Month')) = $1
        AND EXTRACT(YEAR FROM date)::text = $2
    `;

    const addOnsResult = await client.query(addOnsQuery, [month, year]);
    const addOnsTotal = Number(addOnsResult.rows[0]?.addons_total || 0);

    const totalIncome = invoicesTotal + addOnsTotal;

    // === EXPENSES === (unchanged)
    const fuel = Number((await client.query(
      `SELECT COALESCE(SUM(expensecost), 0) AS total
       FROM expenses_m2
       WHERE type = 'fuel'
         AND TRIM(TO_CHAR(slipuploaddate, 'Month')) = $1
         AND EXTRACT(YEAR FROM slipuploaddate)::text = $2`,
      [month, year]
    )).rows[0].total || 0);

    const purchaseOrders = Number((await client.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM purchase_orders
       WHERE TRIM(TO_CHAR(date, 'Month')) = $1
         AND EXTRACT(YEAR FROM date)::text = $2`,
      [month, year]
    )).rows[0].total || 0);

    const subcontractors = Number((await client.query(
      `SELECT COALESCE(SUM(l.driverrate), 0) AS total
       FROM legs_m2 l
       JOIN m5_employee e ON l.driverid = e.userid
       WHERE e.roleid = 6
         AND TRIM(TO_CHAR(l.date, 'Month')) = $1
         AND EXTRACT(YEAR FROM l.date)::text = $2`,
      [month, year]
    )).rows[0].total || 0);

    const wages = await getTotalWagesForMonth(client, month, year);

    // Credit Notes
    const creditNotesResult = await client.query(
      `SELECT COALESCE(SUM(val), 0) AS total
       FROM credit_notes cn
       CROSS JOIN LATERAL unnest(cn.amount) AS t(val)
       WHERE TRIM(TO_CHAR(cn.creditnote_date, 'Month')) = $1
         AND EXTRACT(YEAR FROM cn.creditnote_date)::text = $2`,
      [month, year]
    );
    const creditNotes = Number(creditNotesResult.rows[0]?.total || 0);

    const totalExpenses = fuel + purchaseOrders + subcontractors + wages + creditNotes;
    const netProfit = totalIncome - totalExpenses;

    const profitDetails = [
      { source: "Invoices", amount: invoicesTotal },
      { source: "Add-ons", amount: addOnsTotal }
    ];

    const lossDetails = [
      { source: "Wages (Labour Consultant Payable)", amount: wages },
      { source: "Fuel", amount: fuel },
      { source: "Purchase Orders", amount: purchaseOrders },
      { source: "Subcontractors", amount: subcontractors },
      { source: "Credit Notes", amount: creditNotes },
    ];

    return {
      profitDetails,
      lossDetails,
      totalIncome,
      totalExpenses,
      netProfit,
      month: month.trim(),
      year: year.toString(),
    };

  } catch (error) {
    console.error("Error in getProfitLossData:", error);
    throw new Error(`Failed to generate Profit & Loss: ${error.message}`);
  } finally {
    if (client) client.release();
  }
};

const getCompanyDetails = async () => {
  const companyQuery = `
    SELECT companyname
    FROM usertable
    WHERE status = 'active'
    LIMIT 1
  `;

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(companyQuery);
    return result.rows[0]?.companyname || "Company";
  } catch (error) {
    console.error("Error fetching company name:", error);
    return "Company";
  } finally {
    if (client) client.release();
  }
};

export { getProfitLossData, getCompanyDetails };