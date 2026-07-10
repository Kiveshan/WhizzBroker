// Utility function to get the last day of a given month
function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

// Utility function to round a number to two decimal places
function roundToTwoDecimals(value) {
  return Number.parseFloat(value).toFixed(2);
}

async function saveDeductionHistory(pool, employeeId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentValues = await client.query(
      `SELECT 
        income_tax_rate,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage
      FROM m5_employee
      WHERE userid = $1`,
      [employeeId]
    );

    if (currentValues.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const deductions = currentValues.rows[0];
    const today = new Date().toISOString().split("T")[0];

    await client.query(
      `INSERT INTO employee_deduction_history (
        employeeid,
        effective_date,
        income_tax_rate,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        employeeId,
        today,
        deductions.income_tax_rate,
        deductions.deduction_income_tax,
        deductions.deduction_other_deductions,
        deductions.deduction_uif,
        deductions.deduction_bonus,
        deductions.deduction_savings,
        deductions.deduction_loan,
        deductions.deduction_damage,
      ]
    );

    await client.query(
      `UPDATE m5_employee
      SET deduction_date = $1
      WHERE userid = $2`,
      [today, employeeId]
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `Error saving deduction history for employee ${employeeId}:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
}

async function getTaxAmountForEarnings(pool, totalEarnings) {
  try {
    const roundedEarnings = Math.floor(totalEarnings);
    const taxLookupQuery = `
      SELECT tax 
      FROM tax_deductions 
      WHERE $1 >= remuneration_lower 
      AND $1 <= remuneration_upper
      LIMIT 1
    `;

    const result = await pool.query(taxLookupQuery, [roundedEarnings]);
    return result.rows.length > 0 ? result.rows[0].tax : 0;
  } catch (error) {
    console.error("Error looking up tax amount:", error);
    return 0;
  }
}

async function getTaxAmountForDate(pool, totalEarnings, targetDate) {
  try {
    console.log(
      `Looking up tax for earnings: ${totalEarnings} on date: ${targetDate}`
    );

    const taxLookupQuery = `
      SELECT tax, remuneration_lower, remuneration_upper, effective_date
      FROM tax_deductions 
      WHERE $1::NUMERIC >= remuneration_lower::NUMERIC 
        AND $1::NUMERIC <= remuneration_upper::NUMERIC
        AND effective_date <= $2::DATE
      ORDER BY effective_date DESC
      LIMIT 1
    `;

    const result = await pool.query(taxLookupQuery, [
      totalEarnings,
      targetDate,
    ]);

    if (result.rows.length > 0) {
      const taxData = result.rows[0];
      console.log(
        `✅ Tax found in bracket: R${taxData.tax} (effective from ${taxData.effective_date})`
      );
      return {
        tax: Number.parseFloat(taxData.tax),
        effectiveDate: taxData.effective_date,
        bracket: `${taxData.remuneration_lower} - ${taxData.remuneration_upper}`,
      };
    }

    console.log(`❌ No exact bracket found for earnings: ${totalEarnings}`);
    console.log(`🔍 Checking if earnings exceed highest tax bracket...`);

    const highestBracketQuery = `
      SELECT tax, remuneration_lower, remuneration_upper, effective_date
      FROM tax_deductions 
      WHERE effective_date <= $1::DATE
      ORDER BY remuneration_upper DESC, effective_date DESC
      LIMIT 1
    `;

    const highestResult = await pool.query(highestBracketQuery, [targetDate]);

    if (highestResult.rows.length > 0) {
      const highestBracket = highestResult.rows[0];

      if (totalEarnings >= highestBracket.remuneration_upper) {
        console.log(
          `✅ Earnings (${totalEarnings}) exceed highest bracket (${highestBracket.remuneration_upper})`
        );
        console.log(`📊 Using highest bracket tax: R${highestBracket.tax}`);

        return {
          tax: Number.parseFloat(highestBracket.tax),
          effectiveDate: highestBracket.effective_date,
          bracket: `${highestBracket.remuneration_lower} - ${highestBracket.remuneration_upper} (exceeded)`,
        };
      }
    }

    console.log(
      `❌ No tax bracket found for earnings: ${totalEarnings} on ${targetDate}`
    );
    return { tax: 0, effectiveDate: null, bracket: "No bracket found" };
  } catch (error) {
    console.error("Error looking up tax amount:", error);
    return { tax: 0, effectiveDate: null, bracket: "Error" };
  }
}

async function getDeductionsForDate(pool, employeeId, targetDate) {
  const client = await pool.connect();
  try {
    const targetDateObj =
      typeof targetDate === "string" ? new Date(targetDate) : targetDate;

    const year = targetDateObj.getFullYear();
    const month = targetDateObj.getMonth();

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const formattedTargetDate = lastDayOfMonth.toISOString().split("T")[0];

    console.log(
      `Finding deductions for employee ${employeeId} for month ${
        month + 1
      }/${year}`
    );
    console.log(
      `Using last day of month: ${formattedTargetDate} for deduction lookup`
    );

    const employeeCheck = await client.query(
      `SELECT userid FROM m5_employee WHERE userid = $1`,
      [employeeId]
    );

    if (employeeCheck.rows.length === 0) {
      return null;
    }

    const historicalValues = await client.query(
      `SELECT 
        income_tax_rate,
        deduction_income_tax,
        deduction_other_deductions,
        deduction_uif,
        deduction_bonus,
        deduction_savings,
        deduction_loan,
        deduction_damage,
        effective_date
      FROM employee_deduction_history
      WHERE employeeid = $1
        AND effective_date::date <= $2::date
      ORDER BY effective_date DESC
      LIMIT 1`,
      [employeeId, formattedTargetDate]
    );

    if (historicalValues.rows.length > 0) {
      const effectiveDate = new Date(historicalValues.rows[0].effective_date);
      console.log(
        `Found deduction record with effective date ${
          effectiveDate.toISOString().split("T")[0]
        } for employee ${employeeId}`
      );
      return historicalValues.rows[0];
    }

    console.log(
      `No historical deduction values found for employee ${employeeId} for date ${formattedTargetDate}, returning defaults`
    );
    return {
      income_tax_rate: 0,
      deduction_income_tax: 0,
      deduction_other_deductions: 0,
      deduction_uif: 0,
      deduction_bonus: 0,
      deduction_savings: 0,
      deduction_loan: 0,
      deduction_damage: 0,
    };
  } catch (error) {
    console.error(
      `Error getting deductions for employee ${employeeId} for date ${targetDate}:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
}

export {
  getLastDayOfMonth,
  roundToTwoDecimals,
  saveDeductionHistory,
  getTaxAmountForEarnings,
  getTaxAmountForDate,
  getDeductionsForDate,
};
