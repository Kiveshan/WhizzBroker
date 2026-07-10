"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../css/wageReports.css"
import ExcelJS from 'exceljs'
import api from "../../../api.js"

const WageReportsPage = () => {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')

  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleBack = () => {
    navigate("/reports")
  }

const getYearOptions = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 2; i <= currentYear; i++) {
    years.push(i.toString())
  }
  
  return years
}

// Add this new function after getYearOptions()
const checkStoredWageDataForReport = async (employeeId, month, year) => {
  try {
    console.log(`Checking stored wage data for report: employeeId=${employeeId}, month=${month}, year=${year}`);
    const response = await api.get(
      `/api/stored-wage-data/${employeeId}?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`
    );
    
    if (response.data?.exists) {
      // Check if we're generating report for a past month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-based
      const currentYear = currentDate.getFullYear();
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const reportMonth = monthNames.indexOf(month) + 1;
      const reportYear = parseInt(year);
      
      // If we're generating report for a past month, use stored data
      const isPastMonth = (reportYear < currentYear) || 
                         (reportYear === currentYear && reportMonth < currentMonth);
      
      if (isPastMonth) {
        console.log(`✅ Using stored wage data for past month report ${month} ${year}`);
        return {
          exists: true,
          totalPayable: response.data.totalPayable,
          useStored: true
        };
      } else {
        console.log(`🔄 Current month report, will recalculate and update stored data`);
        return {
          exists: true,
          totalPayable: response.data.totalPayable,
          useStored: false // Allow recalculation for current month
        };
      }
    }
    
    return { exists: false, useStored: false };
  } catch (error) {
    console.error('Error checking stored wage data for report:', error);
    return { exists: false, useStored: false };
  }
};

const generateReport = async (monthName) => {
  if (!selectedYear) {
    alert('Please select a year for the report')
    return
  }

  setGeneratingReport(true)
  setSelectedMonth(monthName)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  try {
    console.log(`Starting report generation for ${monthName} ${selectedYear}`)
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Labour Consultant Report')

    // Set up the headers with styling
    worksheet.columns = [
      { header: 'Employee Name', key: 'employeeName', width: 25 },
      { header: 'Role', key: 'roleName', width: 20 },
      { header: 'Total Payable to Labour Consultant', key: 'totalPayable', width: 35 }
    ]

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    }
    worksheet.getRow(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Add title row
    worksheet.insertRow(1, [`Labour Consultant Report - ${monthName} ${selectedYear}`])
    worksheet.mergeCells('A1:C1')
    worksheet.getRow(1).font = { bold: true, size: 14 }
    worksheet.getRow(1).alignment = { horizontal: 'center' }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4E6F1' }
    }
    
    console.log('Fetching employees/drivers...')
    const employeesResponse = await api.get('/all-employees')
  const employees = employeesResponse.data.filter(employee => employee.roleid !== 6)
    console.log(`Found ${employees.length} employees`)
    console.log('Fetching roles (excluding roleid 6)...')
    const rolesResponse = await api.get('/api/roles/exclude-six')
    const rolesMap = new Map(rolesResponse.data.map(role => [role.roleid, role.rolename]));

    if (!employees || employees.length === 0) {
      alert('No employees found in the system')
      setGeneratingReport(false)
      return
    }

    let rowIndex = 3 // Start from row 3 (after title and headers)
    let processedCount = 0
    let totalSum = 0;
    
    for (const employee of employees) {
      try {
        console.log(`Processing employee: ${employee.name} ${employee.surname}`)
        const cleanId = employee.userid.toString()
        
        // FIRST: Check if we have stored wage data for this month/year
        const storedWageResponse = await checkStoredWageDataForReport(
          cleanId,
          monthName,
          selectedYear
        );
    
    let totalPayable = 0;
    let useStoredData = storedWageResponse.useStored;
    
    if (useStoredData) {
      // Use stored historical data (past months only)
      totalPayable = storedWageResponse.totalPayable;
      console.log(`✅ Using stored wage data for ${employee.name}: R${totalPayable.toFixed(2)}`);
    } else {
      // Calculate fresh (current month or no stored data exists)
      console.log(`🔄 Calculating fresh wage data for ${employee.name}`);
      
      // Fetch employee data using the same endpoint as finance-clerk-wage-slip.jsx
      const employeeResponse = await api.get(`/api/employee/${cleanId}`)
      const employeeData = employeeResponse.data
      
      // Fetch legs data for the selected month/year
      console.log(`Fetching legs data for ${monthName} ${selectedYear}`)
      const legsResponse = await api.get(
        `/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(
          monthName
        )}&year=${encodeURIComponent(selectedYear)}`
      )

      const allLegsArray = Array.isArray(legsResponse.data)
        ? legsResponse.data
        : legsResponse.data && typeof legsResponse.data === "object"
        ? [legsResponse.data]
        : []

      console.log(`Found ${allLegsArray.length} legs for this employee`)

      // Calculate total earnings
      let totalEarningsAmount = 0

      // Add base salary if available
let baseSalary = 0;
try {
  console.log(`Fetching base salary for employee ${cleanId}, month: ${monthName}, year: ${selectedYear}`);
  const baseSalaryResponse = await api.get(
    `/api/base-salary-history/${cleanId}?month=${encodeURIComponent(monthName)}&year=${encodeURIComponent(selectedYear)}`
  );
  
  if (baseSalaryResponse.data?.exists) {
    baseSalary = parseFloat(baseSalaryResponse.data.baseSalary) || 0;
    console.log(`✅ Using historical base salary: R${baseSalary.toFixed(2)}`);
  }
} catch (error) {
  console.error('Error fetching historical base salary:', error);
  // Fallback to current base salary from employee data
  if (employeeData?.base_salary) {
    baseSalary = parseFloat(employeeData.base_salary) || 0;
    console.log(`⚠️ Using fallback base salary: R${baseSalary.toFixed(2)}`);
  }
}

// Add base salary to total earnings
if (baseSalary > 0) {
  totalEarningsAmount += baseSalary;
  console.log(`Base salary: R${baseSalary.toFixed(2)}`);
}

      // Add legs earnings
      const totalLegsAmount = allLegsArray.reduce(
        (total, leg) => total + (parseFloat(leg.driverrate) || 0),
        0
      )
      totalEarningsAmount += totalLegsAmount
      console.log(`Total legs amount: ${totalLegsAmount}`)
      console.log(`Total earnings: ${totalEarningsAmount}`)

      // Skip employees with no earnings
      if (totalEarningsAmount === 0) {
        console.log(`Skipping ${employee.name} - no earnings`)
        continue
      }

      // Fetch deductions data to get loan amount
      console.log(`Fetching deductions data...`)
      const deductionsResponse = await api.get(
        `/api/employee-deductions/${cleanId}?month=${encodeURIComponent(
          monthName
        )}&year=${encodeURIComponent(selectedYear)}`
      )

      let loanDeduction = 0
      if (deductionsResponse.data?.deduction_loan) {
        loanDeduction = parseFloat(deductionsResponse.data.deduction_loan) || 0
      }
      console.log(`Loan deduction: ${loanDeduction}`)

      // IMPORTANT: Subtract loan from total earnings FIRST (same as wage slip)
      const totalEarningsAfterLoan = totalEarningsAmount - loanDeduction
      console.log(`Total earnings after loan: ${totalEarningsAfterLoan}`)

      // Calculate additions based on earnings AFTER loan deduction (same as wage slip)
      const uifAmount = totalEarningsAfterLoan * 0.01
      const sdlAmount = totalEarningsAfterLoan * 0.01
      const coidAmount = totalEarningsAfterLoan * 0.0248
      const totalAdditions = uifAmount + sdlAmount + coidAmount

      console.log(`UIF (1% of ${totalEarningsAfterLoan}): ${uifAmount}`)
      console.log(`SDL (1% of ${totalEarningsAfterLoan}): ${sdlAmount}`)
      console.log(`COID (2.48% of ${totalEarningsAfterLoan}): ${coidAmount}`)
      console.log(`Total additions: ${totalAdditions}`)

      // Calculate Total Payable to Labour Consultant
      totalPayable = totalEarningsAfterLoan + totalAdditions
      console.log(`Total payable: ${totalEarningsAfterLoan} + ${totalAdditions} = ${totalPayable}`)

      // Save the calculated data to database (UPSERT will handle insert/update)
      try {
        const monthIndex = monthNames.indexOf(monthName);
        console.log(`💾 Saving/updating wage data for ${employee.name}: R${totalPayable.toFixed(2)}`);
        
        const saveResult = await api.post('/api/save-wage-data', {
          employeeId: cleanId,
          month: monthIndex + 1, // 1-based month
          year: parseInt(selectedYear),
          totalEarnings: totalEarningsAfterLoan, // Earnings after loan deduction
          totalDeductions: 0, // We're not using traditional deductions anymore
          netPay: totalPayable, // This is "Total Payable to Labour Consultant"
        });
        
        if (saveResult.data?.success) {
          console.log(`✅ Wage data saved/updated successfully for ${employee.name}`);
        } else {
          console.log(`⚠️ Wage data save returned: ${saveResult.data?.message}`);
        }
      } catch (saveError) {
        console.error(`❌ Failed to save wage data for ${employee.name}:`, saveError);
        // Continue processing other employees even if one fails
      }
    }
    
    // Skip employees with no earnings
    if (totalPayable === 0) {
      console.log(`Skipping ${employee.name} - no earnings`)
      continue
    }
    totalSum += totalPayable;
    // Add row to worksheet
const row = worksheet.addRow({
  employeeName: `${employee.name} ${employee.surname}`,
  roleName: rolesMap.get(employee.roleid) || 'Unknown',
  totalPayable: `R ${totalPayable.toFixed(2)}`
})
    

    // Style the data rows
    row.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Alternate row colors
    if (rowIndex % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' }
      }
    }

    rowIndex++
    processedCount++

  } catch (error) {
    console.error(`Error processing employee ${employee.name}:`, error)
    // Add error entry
const errorRow = worksheet.addRow({
  employeeName: `${employee.name} ${employee.surname}`,
  roleName: rolesMap.get(employee.roleid) || 'Unknown',
  totalPayable: 'Error calculating'
})
errorRow.getCell(3).font = { color: { argb: 'FFFF0000' } }
    rowIndex++
  }
}

    console.log(`Processed ${processedCount} employees successfully`)

    worksheet.addRow({}); // Add a blank row for separation
rowIndex++;
const totalRow = worksheet.addRow({
  employeeName: 'Total',
  roleName: '',
  totalPayable: `R ${totalSum.toFixed(2)}`
});
totalRow.font = { bold: true, size: 12 };
totalRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE6F3FF' }
};
totalRow.border = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' }
};
totalRow.getCell(2).alignment = { horizontal: 'right' };

    if (processedCount === 0) {
      alert(`No employees found with earnings for ${monthName} ${selectedYear}`)
      setGeneratingReport(false)
      return
    }

    // Generate filename
    const filename = `Labour_Consultant_Report_${monthName}_${selectedYear}.xlsx`

    // Write to buffer and download
    console.log('Generating Excel file...')
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    
    // Clean up
    window.URL.revokeObjectURL(url)

    console.log(`Report generated successfully: ${filename}`)
    
  } catch (error) {
    console.error('Error generating report:', error)
    alert(`Failed to generate report: ${error.message}`)
  }

  setGeneratingReport(false)
}

  // Define 12 buttons labeled as months
  const buttons = [
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
  ]

  return (
    <div className="wage-reports-wrapper">
      <div className="dashboard">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>
        
        {/* Year Filter Dropdown */}
        <div className="dropdown-container74">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="dropdown"
            disabled={generatingReport}
          >
            {getYearOptions().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        {/* 12 Buttons (6 on each side) labeled as months */}
        <div className="dashboard-row">
          <div className="button-column">
            {buttons.slice(0, 6).map((button, index) => (
              <button
                key={index}
                className="filter-button"
                onClick={() => generateReport(button)}
                disabled={generatingReport}
              >
                {generatingReport && selectedMonth === button ? 'Generating...' : button}
              </button>
            ))}
          </div>
          <div className="button-column">
            {buttons.slice(6, 12).map((button, index) => (
              <button
                key={index + 6}
                className="filter-button"
                onClick={() => generateReport(button)}
                disabled={generatingReport}
              >
                {generatingReport && selectedMonth === button ? 'Generating...' : button}
              </button>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {generatingReport && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p>Generating Excel report for {selectedMonth} {selectedYear}...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WageReportsPage