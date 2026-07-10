"use client";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../../../api";
import "../css/finance-clerk-wageslip.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FinanceClerkWageSlip = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get the ID from URL parameters
  const location = useLocation();
  const { driverId, driverName, selectedMonth, selectedYear } =
    location.state || {};

  // Add a ref to track if we've already saved a wage slip in this component instance
  const hasAttemptedSave = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [legs, setLegs] = useState([]);
  const [downloading, setDownloading] = useState(false);

  const wageSlipRef = useRef(null);
  const [wageData, setWageData] = useState({
    payPeriod: "",
    payDate: "",
    earnings: [],
    deductions: [
      { description: "Tax", amount: "R 0.00" },
      { description: "Insurance", amount: "R 0.00" },
    ],
    totalEarnings: "R 0.00",
    totalDeductions: "R 0.00",
    netPay: "R 0.00",
  });

  // Month names array for conversion
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

  // Helper function to safely parse numeric values from various formats
  const parseAmount = (value) => {
    if (value === null || value === undefined) return 0;

    // If it's already a number, return it
    if (typeof value === "number") return value;

    // If it's a string that might contain currency symbols or commas
    if (typeof value === "string") {
      // Remove currency symbols, spaces, and commas
      const cleanValue = value.replace(/[R\s,]/g, "");
      return Number.parseFloat(cleanValue) || 0;
    }

    return 0;
  };

  // Helper function to get the last day of a month
  const getLastDayOfMonth = (year, month) => {
    const lastDay = new Date(year, month + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(lastDay.getDate()).padStart(2, "0")}`;
  };

  // Update the checkExistingWageSlip function to include better error handling
  const checkExistingWageSlip = async (employeeId, month, year) => {
    try {
      // Add logging to track function execution
      console.log(
        `Checking for existing wage slip: employeeId=${employeeId}, month=${month}, year=${year}`
      );

      const response = await api.get(
        `/api/check-wage-slip?employeeId=${employeeId}&month=${month}&year=${year}`
      );

      if (!response.data) {
        console.error("Failed to check existing wage slip:", response.status);
        return { exists: false, error: true };
      }

      console.log("Existing wage slip check result:", response.data);

      // Return the wage slip data and useHistoricalValues flag
      return response.data.exists
        ? {
            exists: true,
            wageSlip: response.data.wageSlip,
            useHistoricalValues: response.data.useHistoricalValues,
          }
        : { exists: false };
    } catch (error) {
      console.error("Error checking existing wage slip:", error);
      return { exists: false, error: true };
    }
  };
  const checkStoredWageData = async (employeeId, month, year) => {
  try {
    console.log(`Checking for stored wage data: employeeId=${employeeId}, month=${month}, year=${year}`);
    const response = await api.get(
      `/api/stored-wage-data/${employeeId}?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`
    );
    
    if (response.data?.exists) {
      // Check if we're still in the same month as the wage data
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-based
      const currentYear = currentDate.getFullYear();
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const wageMonth = monthNames.indexOf(month) + 1;
      const wageYear = parseInt(year);
      
      // If we're viewing a past month (not current month), use stored data
      const isPastMonth = (wageYear < currentYear) || 
                         (wageYear === currentYear && wageMonth < currentMonth);
      
      if (isPastMonth) {
        console.log(`✅ Using stored wage data for past month ${month} ${year}`);
        return {
          exists: true,
          totalEarnings: response.data.totalEarnings,
          totalPayable: response.data.totalPayable,
          useStored: true
        };
      } else {
        console.log(`🔄 Current month detected, will recalculate and update stored data`);
        return {
          exists: true,
          useStored: false // Allow recalculation for current month
        };
      }
    }
    
    return { exists: false, useStored: false };
  } catch (error) {
    console.error('Error checking stored wage data:', error);
    return { exists: false, useStored: false };
  }
};

  // Create a separate function for saving wage data to avoid duplicate code
  const saveWageData = async (wagePayload) => {
    // If we've already attempted to save in this component instance, don't try again
    if (hasAttemptedSave.current) {
      console.log(
        "Already attempted to save wage data in this session, skipping"
      );
      return { success: false, exists: true };
    }

    try {
      console.log("Creating new wage slip");

      const saveResponse = await api.post("/api/save-wage-data", wagePayload);

      // Mark that we've attempted a save
      hasAttemptedSave.current = true;

      if (!saveResponse.data) {
        // If status is 409 (Conflict), it means the wage slip already exists
        if (saveResponse.status === 409) {
          console.log("Server detected existing wage slip (409 Conflict)");
          return { success: false, exists: true };
        }

        console.error("Failed to save wage data:", saveResponse.status);
        return { success: false, exists: false };
      }

      console.log("Wage data save result:", saveResponse.data);

      // Check if the save operation detected an existing record
      if (saveResponse.data.exists) {
        console.log("Server detected existing wage slip during save operation");
        return { success: false, exists: true };
      }

      console.log("Wage data saved successfully");
      return { success: true, exists: false };
    } catch (error) {
      console.error("Error saving wage data:", error);
      return { success: false, error: true };
    }
  };

  // Update the useEffect hook to handle wage slip saving more carefully
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Employee ID is missing from URL parameters");
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching employee data for ID: ${id}`);
        // Extract just the numeric part of the ID if it contains a colon
        const cleanId = id.toString().split(":")[0];

        // Fetch employee details with the clean ID
        const response = await api.get(`/api/employee/${cleanId}`);

        if (!response.data) {
          throw new Error(`Failed to fetch employee data: ${response.status}`);
        }

        console.log("Employee data:", response.data);
        setEmployeeData(response.data);

        // Calculate pay period dates
        const monthIndexForPayPeriod = monthNames.indexOf(selectedMonth);
        const firstDay = new Date(
          Number.parseInt(selectedYear),
          monthIndexForPayPeriod,
          1
        );
        const lastDay = new Date(
          Number.parseInt(selectedYear),
          monthIndexForPayPeriod + 1,
          0
        );
        const formattedFirstDay = firstDay.toLocaleDateString();
        const formattedLastDay = lastDay.toLocaleDateString();

        // IMPORTANT: Check for existing wage slip FIRST, before doing any other processing
        // This ensures we don't waste time calculating data if we're not going to save it
        const existingWageSlipResult = await checkExistingWageSlip(
          cleanId,
          monthIndexForPayPeriod + 1, // 1-based month index
          Number.parseInt(selectedYear)
        );

        // If there's already a wage slip, we can still fetch the data to display it,
        // but we'll skip saving a new one
        const wageSlipExists = existingWageSlipResult.exists;

        // Fetch all legs for the driver
        try {
          console.log(
            `Fetching all legs for driver ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`
          );

          // Use the new endpoint that includes all legs regardless of instruction status
          const legsResponse = await api.get(
            `/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(
              selectedMonth
            )}&year=${encodeURIComponent(selectedYear)}`
          );

          if (!legsResponse.data) {
            throw new Error(
              `Failed to fetch legs data: ${legsResponse.status}`
            );
          }

          console.log("All legs data:", legsResponse.data);

          // Ensure legsData is an array
          const allLegsArray = Array.isArray(legsResponse.data)
            ? legsResponse.data
            : legsResponse.data && typeof legsResponse.data === "object"
            ? [legsResponse.data]
            : [];

          setLegs(allLegsArray);
          const storedWageResult = await checkStoredWageData(
  cleanId,
  selectedMonth,
  selectedYear
);

let useStoredData = storedWageResult.useStored;
let storedTotalEarnings = 0;
let storedTotalPayable = 0;

if (useStoredData) {
  // Use stored historical data (past months only)
  storedTotalEarnings = storedWageResult.totalEarnings;
  storedTotalPayable = storedWageResult.totalPayable;
  console.log(`✅ Using stored wage data - Earnings: R${storedTotalEarnings.toFixed(2)}, Payable: R${storedTotalPayable.toFixed(2)}`);
} else {
  console.log(`🔄 Calculating fresh wage slip (current month or no stored data)`);
}

          // Group legs by instruction ID
          const legsByInstruction = {};
          allLegsArray.forEach((leg) => {
            const instructionId = leg.m1key;
            if (!instructionId) return;

            if (!legsByInstruction[instructionId]) {
              legsByInstruction[instructionId] = [];
            }
            legsByInstruction[instructionId].push(leg);
          });

          // Calculate total earnings from legs
          const totalLegsAmount = allLegsArray.reduce(
            (total, leg) => total + parseAmount(leg.driverrate),
            0
          );

const earnings = [];
let totalEarningsAmount = 0;

// Fetch historical base salary for the specific month
let baseSalary = 0;

try {
  console.log(`Fetching base salary for employee ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`);
  const baseSalaryResponse = await api.get(
    `/api/base-salary-history/${cleanId}?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`
  );
  
  if (baseSalaryResponse.data?.exists) {
    baseSalary = parseAmount(baseSalaryResponse.data.baseSalary);
    console.log(`✅ Using base salary: R${baseSalary.toFixed(2)}`);
  }
} catch (error) {
  console.error('Error fetching base salary:', error);
  // Fallback to current base salary from employee data
  if (response.data.base_salary) {
    baseSalary = parseAmount(response.data.base_salary);
    console.log(`⚠️ Using fallback base salary: R${baseSalary.toFixed(2)}`);
  }
}

// Compute total earnings once: base salary + all legs
if (baseSalary > 0) {
  totalEarningsAmount += baseSalary;
}

Object.keys(legsByInstruction).forEach((instructionId) => {
  legsByInstruction[instructionId].forEach((leg) => {
    const legAmount = parseAmount(leg.driverrate);
    totalEarningsAmount += legAmount;
  });
});

// Always show the breakdown for display purposes (regardless of stored vs fresh)
if (baseSalary > 0) {
  earnings.push({
    description: "Base Salary",
    amount: `R ${baseSalary.toFixed(2)}`,
  });
}

// Add each leg as a separate earning, grouped by instruction
          Object.keys(legsByInstruction).forEach((instructionId) => {
            legsByInstruction[instructionId].forEach((leg, index) => {
              const legAmount = parseAmount(leg.driverrate);
              const containerInfo = leg.containernumber
                ? ` [${leg.containernumber}]`
                : "";
              earnings.push({
                description: `INS${instructionId}-Leg${
                  leg.legnumber || index + 1
                }${containerInfo} `,
                amount: `R ${legAmount.toFixed(2)}`,
              });
            });
          });

          // If no earnings data is available, add dummy data for testing
          if (allLegsArray.length === 0 && !response.data.base_salary) {
            earnings.push({
              description: "No earnings found for this month",
              amount: "R 0.00",
            });
          }

          // After calculating earnings, fetch and process deductions
          try {
            // Fetch deductions from employee table for this employee
            console.log(
              `Fetching deductions for employee ID: ${cleanId}, month: ${selectedMonth}, year: ${selectedYear}`
            );

            // Fetch the deductions - this endpoint now handles historical values
            const deductionsResponse = await api.get(
              `/api/employee-deductions/${cleanId}?month=${encodeURIComponent(
                selectedMonth
              )}&year=${encodeURIComponent(selectedYear)}`
            );

            // Log the raw response for debugging
            console.log(
              "Deductions API response status:",
              deductionsResponse.status
            );

let deductions = [];
let totalDeductionsAmount = 0;
let deductionsData = {}; // Store deductions data for later use
let additions = [];
let totalAdditionsAmount = 0;

if (deductionsResponse.data) {
  deductionsData = deductionsResponse.data;

              // Define all possible deduction fields
              const deductionFields = [
                { key: "income_tax_rate", label: "Income Tax", isRate: true },
                {
                  key: "deduction_income_tax",
                  label: "Income Tax (Fixed)",
                  isRate: false,
                },
                {
                  key: "deduction_other_deductions",
                  label: "Other Deductions",
                  isRate: false,
                },
                { key: "deduction_uif", label: "UIF", isRate: true },
                {
                  key: "deduction_bonus",
                  label: "Bonus Deduction",
                  isRate: false,
                },
                { key: "deduction_savings", label: "Savings", isRate: false },
                {
                  key: "deduction_loan",
                  label: "Loan Repayment",
                  isRate: false,
                },
                {
                  key: "deduction_damage",
                  label: "Damage Recovery",
                  isRate: false,
                },
              ];

            }
            
            
            else {
              console.log(
                "Failed to fetch deductions data:",
                deductionsResponse.status
              );

              // Use mock data for testing if API fails
              deductions = [
                {
                  description: "Income Tax (API Error)",
                  amount: "R 1500.00",
                },
                { description: "UIF (API Error)", amount: "R 200.00" },
                {
                  description: "Other Deductions (API Error)",
                  amount: "R 300.00",
                },
              ];
              totalDeductionsAmount = 2000; // Mock total
            }
// Add loan deduction as negative earning (Less Loans) after we have deductionsData
let loanAmount = 0;
if (deductionsData && deductionsData.deduction_loan) {
  loanAmount = parseAmount(deductionsData.deduction_loan);
  if (loanAmount > 0) {
    earnings.push({
      description: "Less Loans",
      amount: `R ${loanAmount.toFixed(2)}`,
      isDeduction: true
    });
    
    // Only subtract from total if we're not using stored data
    if (!useStoredData) {
      totalEarningsAmount -= loanAmount;
    }
  }
}
const additionFields = [
  { key: "uif_rate", label: "UIF", rate: 1.0 },
  { key: "sdl_rate", label: "SDL", rate: 1.0 },
  { key: "coid_rate", label: "COID", rate: 2.48 }
];

// let additions = [];
// let totalAdditionsAmount = 0;
// let totalPayableAmount = 0;
let totalPayableAmount = 0;

if (useStoredData) {
  // Use stored total payable
  totalPayableAmount = storedTotalPayable;
  
  // Calculate additions for display based on stored earnings
  const earningsForAdditions = totalEarningsAmount; // This is the stored earnings after loan
  additionFields.forEach((field) => {
    const amount = (field.rate / 100) * earningsForAdditions;
    totalAdditionsAmount += amount;
    additions.push({
      description: `${field.label} (${field.rate}% of earnings)`,
      amount: `R ${amount.toFixed(2)}`,
    });
  });
} else {
  // Calculate fresh additions
  additionFields.forEach((field) => {
    const amount = (field.rate / 100) * totalEarningsAmount;
    totalAdditionsAmount += amount;
    additions.push({
      description: `${field.label} (${field.rate}% of earnings)`,
      amount: `R ${amount.toFixed(2)}`,
    });
  });
  
  // Calculate total payable
  totalPayableAmount = totalEarningsAmount + totalAdditionsAmount;
}

console.log("Final additions:", additions);
console.log("Total additions amount:", totalAdditionsAmount);
console.log("Total payable amount:", totalPayableAmount);
            // If no deductions were found, use default placeholder deductions
            if (deductions.length === 0) {
              console.log("No deductions found, using default placeholders");
              deductions = [
                { description: "Tax", amount: "R 0.00" },
                { description: "Insurance", amount: "R 0.00" },
              ];
            }

            console.log("Final deductions:", deductions);
            console.log("Total deductions amount:", totalDeductionsAmount);

            // Calculate net pay as total earnings minus total deductions
            const netPayAmount = totalEarningsAmount - totalDeductionsAmount;
            console.log(
              "Net pay calculation:",
              totalEarningsAmount,
              "-",
              totalDeductionsAmount,
              "=",
              netPayAmount
            );

            // Get the last day of the month for the wage slip date
            const lastDayOfMonth = getLastDayOfMonth(
              Number.parseInt(selectedYear),
              monthIndexForPayPeriod
            );

            // Update UI with calculated data
// Calculate total payable to labour consultant (total earnings + additions)
// Update UI with calculated data
setWageData({
  payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
  payDate: formattedLastDay,
  earnings: earnings,
  additions: additions,
  totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
  totalAdditions: `R ${totalAdditionsAmount.toFixed(2)}`,
  totalPayable: `R ${totalPayableAmount.toFixed(2)}`,
});

            // Only attempt to save if we haven't found an existing wage slip
// Only attempt to save if we're not using stored data (allows updates for current month)
if (!useStoredData) {
  // Create wage payload
  const wagePayload = {
    employeeId: cleanId,
    month: monthIndexForPayPeriod + 1,
    year: Number.parseInt(selectedYear),
    totalEarnings: totalEarningsAmount, // This is earnings after loan deduction
    totalDeductions: 0, // We're not using traditional deductions anymore
    netPay: totalPayableAmount, // This is "Total Payable to Labour Consultant"
    date: getLastDayOfMonth(
      Number.parseInt(selectedYear),
      monthIndexForPayPeriod
    ),
  };

  console.log("Saving/updating wage payload:", wagePayload);
  await saveWageData(wagePayload); // The UPSERT will handle insert/update automatically
} else {
  console.log("Using stored historical data, skipping save operation");
}
          } catch (deductionsError) {
            console.error("Error fetching deductions data:", deductionsError);

            // Use default deductions if there was an error
            const deductions = [
              { description: "Tax (Error)", amount: "R 0.00" },
              { description: "Insurance (Error)", amount: "R 0.00" },
            ];

            setWageData({
              payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
              payDate: formattedLastDay,
              earnings: earnings,
              deductions: deductions,
              totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
              totalDeductions: "R 0.00",
              netPay: `R ${totalEarningsAmount.toFixed(2)}`,
            });
          }
} catch (legsError) {
  console.error("Error fetching legs data:", legsError);
  // Add dummy data for testing
  const earnings = [
    { description: "Error fetching legs data", amount: "R 0.00" },
  ];
  let totalEarningsAmount = 0;
  
  // Fetch base salary for error case too
  let baseSalary = 0;
  try {
    const baseSalaryResponse = await api.get(
      `/api/base-salary-history/${cleanId}?month=${encodeURIComponent(selectedMonth)}&year=${encodeURIComponent(selectedYear)}`
    );
    
    if (baseSalaryResponse.data?.exists) {
      baseSalary = parseAmount(baseSalaryResponse.data.baseSalary);
    }
  } catch (error) {
    // Fallback to current base salary from employee data
    if (response.data.base_salary) {
      baseSalary = parseAmount(response.data.base_salary);
    }
  }
  
  if (baseSalary > 0) {
    totalEarningsAmount = baseSalary;
    earnings.unshift({
      description: "Base Salary",
      amount: `R ${baseSalary.toFixed(2)}`,
    });
  }
  
  setWageData({
    payPeriod: `${formattedFirstDay} - ${formattedLastDay}`,
    payDate: formattedLastDay,
    earnings: earnings,
    deductions: [
      { description: "Tax", amount: "R 0.00" },
      { description: "Insurance", amount: "R 0.00" },
    ],
    totalEarnings: `R ${totalEarningsAmount.toFixed(2)}`,
    totalDeductions: "R 0.00",
    netPay: `R ${totalEarningsAmount.toFixed(2)}`,
  });
}

        setLoading(false);
      } catch (error) {
        console.error("Error fetching employee data:", error);
        setError(`Failed to load employee data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [id, selectedMonth, selectedYear]);

  const handleBack = () => {
    const actualDriverName = employeeData
      ? `${employeeData.name} ${employeeData.surname}`
      : driverName || `Driver ${id}`;

    navigate(`/finance-clerk-wage-details/${id}`, {
      state: {
        name: actualDriverName,
      },
    });
  };

  const handleDownloadWageSlip = async () => {
    try {
      setDownloading(true);

      if (!wageSlipRef.current) {
        console.error("Wage slip container not found");
        setDownloading(false);
        return;
      }
      const employeeName = employeeData
        ? `${employeeData.name}_${employeeData.surname}`
        : driverName?.replace(/\s+/g, "_") || `Driver_${id}`;
      const filename = `${employeeName}_WageSlip_${selectedMonth}_${selectedYear}.pdf`;

      // Capture the wage slip as an image
      const canvas = await html2canvas(wageSlipRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Calculate PDF dimensions based on the canvas
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(filename);

      setDownloading(false);
    } catch (error) {
      console.error("Error downloading wage slip:", error);
      setDownloading(false);
    }
  };

  return (
    <div className="wageslip-page-wrapper">
      <div className="wageslip-container">
        {loading ? (
          <div className="wageslip-loading-container">
            Loading employee data...
          </div>
        ) : error ? (
          <div className="wageslip-error-container">{error}</div>
        ) : (
          <div className="wageslip-slip-container" ref={wageSlipRef}>
            {/* Header */}
            <div className="wageslip-header">
              <div></div>
              <div className="wageslip-company-info">
                <p className="wageslip-company-name">KSM Carriers</p>
                <p className="wageslip-company-contact">
                  accounts@ksmcarriers.co.za
                </p>
                <p className="wageslip-company-contact">+27 71 675 2775</p>
              </div>
            </div>

            {/* Content */}
            <div className="wageslip-content">
              {/* Title */}
              <h1 className="wageslip-title">Monthly Employee CTC</h1>

              {/* Month and Year */}
              <div className="wageslip-month-year-info">
                <p className="wageslip-month-year-text">
                  <strong>Month:</strong> {selectedMonth} {selectedYear}
                </p>
              </div>

              {/* Pay Period */}
              <div className="wageslip-pay-period-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                  }}
                >
                  <p className="wageslip-pay-period-text">
                    <strong>Pay Period:</strong> {wageData.payPeriod}
                  </p>
                  <p className="wageslip-pay-period-text">
                    <strong>Pay Date:</strong> {wageData.payDate}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="wageslip-employee-section">
                {/* First row: Name and Contact side by side */}
                <div className="wageslip-employee-info-row">
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Name:</span>{" "}
                    {employeeData
                      ? `${employeeData.name} ${employeeData.surname}`
                      : driverName || "N/A"}
                  </div>
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Contact:</span>{" "}
                    {employeeData ? employeeData.cellnum : "N/A"}
                  </div>
                </div>

                {/* Second row: Role below Name */}
                <div className="wageslip-employee-info-row">
                  <div className="wageslip-employee-info-column">
                    <span className="wageslip-employee-label">Role:</span>{" "}
                    {employeeData ? employeeData.rolename : "Driver"}
                  </div>
                  <div className="wageslip-employee-info-column"></div>
                </div>
              </div>

              {/* Combined Tables Container */}
              <div className="wageslip-combined-tables-container">
                {/* Earnings Table */}
                <div className="wageslip-table-container">
                  <table className="wageslip-table">
                    <thead>
                      <tr>
                        <th className="wageslip-table-header wageslip-table-cell-left">
                          Earnings
                        </th>
                        <th className="wageslip-table-header wageslip-table-cell-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wageData.earnings.map((item, index) => (
                        <tr
                          key={index}
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#fff" : "#f9fafb",
                          }}
                        >
                          <td className="wageslip-table-cell wageslip-table-cell-left">
                            {item.description}
                          </td>
                          <td className="wageslip-table-cell wageslip-table-cell-right">
                            {item.amount}
                          </td>
                        </tr>
                      ))}
                      {/* Added Total Earnings row */}
                      <tr style={{ backgroundColor: "#f0f0f0" }}>
                        <td
                          className="wageslip-table-cell wageslip-table-cell-left"
                          style={{ fontWeight: 700 }}
                        >
                          Total Earnings
                        </td>
                        <td
                          className="wageslip-table-cell wageslip-table-cell-right"
                          style={{ fontWeight: 700 }}
                        >
                          {wageData.totalEarnings}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

{/* Additions Table */}
<div className="wageslip-table-container">
  <table className="wageslip-table">
    <thead>
      <tr>
        <th className="wageslip-table-header wageslip-table-cell-left">
          Additions
        </th>
        <th className="wageslip-table-header wageslip-table-cell-right">
          Amount
        </th>
      </tr>
    </thead>
                    <tbody>
{wageData.additions.map((item, index) => (
  <tr
    key={index}
    style={{
      backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb",
    }}
  >
    <td className="wageslip-table-cell wageslip-table-cell-left">
      {item.description}
    </td>
    <td className="wageslip-table-cell wageslip-table-cell-right">
      {item.amount}
    </td>
  </tr>
))}
{/* Total Additions row */}
<tr style={{ backgroundColor: "#f0f0f0" }}>
  <td
    className="wageslip-table-cell wageslip-table-cell-left"
    style={{ fontWeight: 700 }}
  >
    Total Additions
  </td>
  <td
    className="wageslip-table-cell wageslip-table-cell-right"
    style={{ fontWeight: 700 }}
  >
    {wageData.totalAdditions}
  </td>
</tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay Table */}
                <div className="wageslip-table-container">
                  <table className="wageslip-table">
                    <thead>
                      <tr>
<th className="wageslip-table-header wageslip-table-cell-left">
  Total Payable to Labour Consultant
</th>
                        <th className="wageslip-table-header wageslip-table-cell-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
<td
  className="wageslip-table-cell wageslip-table-cell-left"
  style={{ fontWeight: 600 }}
>
  Total Payable to Labour Consultant
</td>
<td
  className="wageslip-table-cell wageslip-table-cell-right"
  style={{ fontWeight: 600 }}
>
  {wageData.totalPayable}
</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="wageslip-footer"></div>
            </div>
          </div>
        )}

        {/* Button Container */}
        <div className="wageslip-button-container">
          <button className="back-button" onClick={handleBack}>
            Back
          </button>
          <button
            className="downloadwage1 wageslip-download-button"
            onClick={handleDownloadWageSlip}
            disabled={downloading}
            style={{ marginLeft: "202px" }}
          >
            {downloading ? "Downloading..." : "Download Wage Slip"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceClerkWageSlip;
