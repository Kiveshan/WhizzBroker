"use client";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../../api";
import "../css/finance-clerk-wage.css";
import jsPDF from "jspdf";

const FinanceClerkWageDetails = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // Get the userid from URL params
  const id = params.userid;

  // Get the driver name from location state or use a fallback
  const driverName = location.state?.name || `Driver ${id}`;

  // Get current month and year for default filter values
  const currentDate = new Date();
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

  // State for dropdown selections - initialize with current month and year
  const [selectedMonth, setSelectedMonth] = useState(
    monthNames[currentDate.getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear().toString()
  );
  const [driverInstructions, setDriverInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [downloadingMonth, setDownloadingMonth] = useState(false);
  const [hasLegsForMonth, setHasLegsForMonth] = useState(false);

  useEffect(() => {
    // Fetch employee data
    const fetchEmployeeData = async () => {
      if (!id) return;

      try {
        console.log(`Fetching employee data for ID: ${id}`);
        // Extract just the numeric part of the ID if it contains a colon
        const cleanId = id.toString().split(":")[0];

        // Fetch employee details with the clean ID
        const response = await api.get(`/api/employee/${cleanId}`);

        if (response.data) {
          console.log("Employee data:", response.data);
          setEmployeeData(response.data);
        } else {
          console.error(`Failed to fetch employee data: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    };
    const fetchDriverInstructions = async () => {
      try {
        setLoading(true);
        console.log(`Fetching driver instructions for driver ID: ${id}`);

        let response;
        let successfulEndpoint = "";

        try {
          console.log("Trying endpoint: /api/driver-instructions/" + id);
          response = await api.get(`/api/driver-instructions/${id}`);

          if (response.data) {
            console.log(
              "SUCCESS: /api/driver-instructions/" + id + " endpoint worked!"
            );
            successfulEndpoint = "/api/driver-instructions/" + id;
          } else {
            console.log("Trying endpoint: /instructions/driver/" + id);
            response = await api.get(`/instructions/driver/${id}`);

            if (response.data) {
              console.log(
                "SUCCESS: /instructions/driver/" + id + " endpoint worked!"
              );
              successfulEndpoint = "/instructions/driver/" + id;
            } else {
              console.log(
                "Trying endpoint: /legs/instruction/all/driver/" + id
              );
              response = await api.get(`/legs/instruction/all/driver/${id}`);

              if (response.data) {
                console.log(
                  "SUCCESS: /legs/instruction/all/driver/" +
                    id +
                    " endpoint worked!"
                );
                successfulEndpoint = "/legs/instruction/all/driver/" + id;
              }
            }
          }

          if (!response.data) {
            throw new Error(
              `All endpoints failed. Last status: ${response.status}`
            );
          }
        } catch (error) {
          console.error("All fetch attempts failed:", error);
          throw error;
        }

        console.log(
          `Data successfully retrieved from endpoint: ${successfulEndpoint}`
        );
        console.log("Driver instructions data:", response.data);

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        // Set the driver instructions data
        setDriverInstructions(
          Array.isArray(response.data) ? response.data : []
        );
        setLoading(false);
      } catch (error) {
        console.error("Error fetching driver instructions:", error);
        setError(`Failed to load driver instructions: ${error.message}`);
        setLoading(false);
      }
    };

    // Check if there are legs for the selected month and year
    const checkLegsForMonth = async () => {
      if (!id) return;

      try {
        const cleanId = id.toString().split(":")[0];

        // Use the new endpoint to check if there are legs for the selected month and year
        const response = await api.get(
          `/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(
            selectedMonth
          )}&year=${encodeURIComponent(selectedYear)}`
        );

        setHasLegsForMonth(response.data.length > 0);
      } catch (error) {
        console.error("Error checking legs for month:", error);
        setHasLegsForMonth(false);
      }
    };

    if (id) {
      fetchEmployeeData();
      fetchDriverInstructions();
      checkLegsForMonth();
    } else {
      console.error("No driver ID provided in URL params");
      setError("No driver ID provided in URL params");
      setLoading(false);
    }
  }, [id, selectedMonth, selectedYear]);

const filteredInstructions = driverInstructions.filter((instruction) => {
  // Use lastFreeDate if available, otherwise created_at
  const dateToUse = instruction.lastFreeDate || instruction.created_at;
  if (!dateToUse) return false;

  const instructionDate = new Date(dateToUse);

  const matchesMonth =
    monthNames[instructionDate.getMonth()] === selectedMonth;
  const matchesYear =
    instructionDate.getFullYear().toString() === selectedYear;

  return matchesMonth && matchesYear;
});

  // Handle viewing all legs for the selected month and year
  const handleViewLegs = () => {
    navigate(`/FClerkLegDetails`, {
      state: {
        driverId: id,
        driverName,
        selectedMonth,
        selectedYear,
      },
    });
  };
  const handleViewWageSlip = () => {
    navigate(`/finance-clerk-wage-slip/${id}`, {
      state: {
        driverId: id,
        driverName,
        selectedMonth,
        selectedYear,
      },
    });
  };

  // Function to handle downloading wage slip for the month
  const handleDownloadMonthlyWageSlip = async () => {
    if (!id) {
      console.error("Missing driver ID for download");
      return;
    }

    setDownloadingMonth(true);

    try {
      console.log(
        `Generating monthly wage slip for Driver ID: ${id}, Month: ${selectedMonth}, Year: ${selectedYear}`
      );

      // Extract just the numeric part of the ID if it contains a colon
      const cleanId = id.toString().split(":")[0];

      // Fetch employee details if not already available
      let employeeInfo = employeeData;
      if (!employeeInfo) {
        const empResponse = await api.get(`/api/employee/${cleanId}`);
        if (empResponse.data) {
          employeeInfo = empResponse.data;
        }
      }

      // Fetch all legs for the driver for the selected month and year
      let allLegs = [];
      try {
        const legsResponse = await api.get(
          `/api/all-driver-legs/${cleanId}/by-month?month=${encodeURIComponent(
            selectedMonth
          )}&year=${encodeURIComponent(selectedYear)}`
        );

        if (legsResponse.data) {
          allLegs = Array.isArray(legsResponse.data)
            ? legsResponse.data
            : legsResponse.data
            ? [legsResponse.data]
            : [];
        }
      } catch (error) {
        console.error("Error fetching legs data:", error);
      }

      // Group legs by instruction ID
      const legsByInstruction = {};
      allLegs.forEach((leg) => {
        const instructionId = leg.m1key;
        if (!instructionId) return;

        if (!legsByInstruction[instructionId]) {
          legsByInstruction[instructionId] = [];
        }
        legsByInstruction[instructionId].push(leg);
      });

      // Calculate total earnings
      const totalLegsAmount = allLegs.reduce(
        (total, leg) => total + (Number.parseFloat(leg.driverrate) || 0),
        0
      );

      // Format earnings data
      const earnings = [];

      // Add base salary if available
      if (employeeInfo?.base_salary) {
        earnings.push({
          description: "Base Salary",
          amount: `R ${
            Number.parseFloat(employeeInfo.base_salary).toFixed(2) || "0.00"
          }`,
        });
      }

      // Add each leg as a separate earning, grouped by instruction
      Object.keys(legsByInstruction).forEach((instructionId) => {
        legsByInstruction[instructionId].forEach((leg, index) => {
          earnings.push({
            description: `INS${instructionId}-Leg${
              leg.legnumber || index + 1
            } (${leg.instruction_status || "Unknown"})`,
            amount: `R ${
              Number.parseFloat(leg.driverrate).toFixed(2) || "0.00"
            }`,
          });
        });
      });

      // Calculate total amount
      const totalAmount =
        (Number.parseFloat(employeeInfo?.base_salary) || 0) + totalLegsAmount;

      // Fetch deductions data
      const deductionsResponse = await api.get(
        `/api/employee-deductions/${cleanId}?month=${encodeURIComponent(
          selectedMonth
        )}&year=${encodeURIComponent(selectedYear)}`
      );

      let deductions = [];
      let totalDeductionsAmount = 0;

      if (deductionsResponse.data) {
        console.log("Deductions data for PDF:", deductionsResponse.data);

        // Process deductions data
        const deductionFields = [
          { key: "deduction_income_tax", label: "Income Tax" },
          { key: "deduction_other_deductions", label: "Other Deductions" },
          { key: "deduction_uif", label: "UIF" },
          { key: "deduction_bonus", label: "Bonus" },
          { key: "deduction_savings", label: "Savings" },
          { key: "deduction_loan", label: "Loan Repayment" },
          { key: "deduction_damage", label: "Damage Recovery" },
        ];

        deductionFields.forEach((field) => {
          if (deductionsResponse.data && deductionsResponse.data[field.key]) {
            const amount =
              Number.parseFloat(deductionsResponse.data[field.key]) || 0;
            if (amount > 0) {
              totalDeductionsAmount += amount;
              deductions.push({
                description: field.label,
                amount: `R ${amount.toFixed(2)}`,
              });
            }
          }
        });
      }

      // If no deductions found, use default values
      if (deductions.length === 0) {
        deductions = [
          { description: "Income Tax", amount: "R 1500.00" },
          { description: "UIF", amount: "R 200.00" },
          { description: "Other Deductions", amount: "R 300.00" },
        ];
        totalDeductionsAmount = 2000;
      }

      // Create a new PDF document
      const doc = new jsPDF();

      // Set document properties
      doc.setProperties({
        title: `Monthly Wage Slip - ${
          employeeInfo?.name || driverName
        } - ${selectedMonth} ${selectedYear}`,
        subject: "Monthly Wage Slip",
        author: "Whizz Away Logistics",
        creator: "Whizz Away Logistics",
      });

      // Add company header
      doc.setFillColor(184, 209, 243); // #b8d1f3
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("KSM Carriers", 150, 10, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("accounts@ksmcarriers.co.za", 150, 15, { align: "right" });
      doc.text("+27 31 123 4567", 150, 20, { align: "right" });

      // Add title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Wage Slip", 105, 35, { align: "center" });

      // Add month and year
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.roundedRect(20, 40, 170, 10, 2, 2, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Month: ${selectedMonth} ${selectedYear}`, 105, 46, {
        align: "center",
      });

      // Add pay period
      const monthIndex = monthNames.indexOf(selectedMonth);
      const firstDay = new Date(Number.parseInt(selectedYear), monthIndex, 1);
      const lastDay = new Date(
        Number.parseInt(selectedYear),
        monthIndex + 1,
        0
      );
      const formattedFirstDay = firstDay.toLocaleDateString();
      const formattedLastDay = lastDay.toLocaleDateString();

      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.roundedRect(20, 55, 170, 10, 2, 2, "F");
      doc.text(
        `Pay Period: ${formattedFirstDay} - ${formattedLastDay}`,
        70,
        61
      );
      doc.text(`Pay Date: ${formattedLastDay}`, 140, 61);

      // Add employee info
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.roundedRect(20, 70, 170, 20, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Name:", 30, 78);
      doc.setFont("helvetica", "normal");
      doc.text(
        employeeInfo
          ? `${employeeInfo.name} ${employeeInfo.surname}`
          : driverName || "N/A",
        60,
        78
      );

      doc.setFont("helvetica", "bold");
      doc.text("Contact:", 110, 78);
      doc.setFont("helvetica", "normal");
      doc.text(employeeInfo ? employeeInfo.cellnum : "N/A", 140, 78);

      doc.setFont("helvetica", "bold");
      doc.text("Role:", 30, 86);
      doc.setFont("helvetica", "normal");
      doc.text(employeeInfo ? employeeInfo.rolename : "Driver", 60, 86);

      // Add note about including all instructions
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Note: This wage slip includes all legs regardless of instruction status.",
        105,
        95,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Add earnings table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      // Earnings table header
      doc.setFillColor(184, 209, 243); // #b8d1f3
      doc.rect(20, 105, 85, 10, "F");
      doc.rect(105, 105, 85, 10, "F");
      doc.text("Earnings", 25, 112);
      doc.text("Amount", 180, 112, { align: "right" });

      // Earnings table rows
      let yPos = 115;
      earnings.forEach((item, index) => {
        const rowColor = index % 2 === 0 ? 255 : 249; // Alternate white and light gray
        doc.setFillColor(rowColor, rowColor, rowColor);
        doc.rect(20, yPos, 85, 10, "F");
        doc.rect(105, yPos, 85, 10, "F");

        doc.setFont("helvetica", "normal");
        doc.text(item.description, 25, yPos + 7);
        doc.text(item.amount, 180, yPos + 7, { align: "right" });

        yPos += 10;
      });

      // Add deductions table to PDF
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      // Deductions table header
      doc.setFillColor(184, 209, 243); // #b8d1f3
      doc.rect(20, yPos, 85, 10, "F");
      doc.rect(105, yPos, 85, 10, "F");
      doc.text("Deductions", 25, yPos + 7);
      doc.text("Amount", 180, yPos + 7, { align: "right" });

      // Deductions table rows
      yPos += 10;
      deductions.forEach((item, index) => {
        const rowColor = index % 2 === 0 ? 255 : 249; // Alternate white and light gray
        doc.setFillColor(rowColor, rowColor, rowColor);
        doc.rect(20, yPos, 85, 10, "F");
        doc.rect(105, yPos, 85, 10, "F");

        doc.setFont("helvetica", "normal");
        doc.text(item.description, 25, yPos + 7);
        doc.text(item.amount, 180, yPos + 7, { align: "right" });

        yPos += 10;
      });

      // Total deductions row
      doc.setFillColor(240, 240, 240); // #f0f0f0
      doc.rect(20, yPos, 85, 10, "F");
      doc.rect(105, yPos, 85, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Total Deductions", 25, yPos + 7);
      doc.text(`R ${totalDeductionsAmount.toFixed(2)}`, 180, yPos + 7, {
        align: "right",
      });

      // Net Pay table
      yPos += 20;

      // Update the net pay calculation to include deductions
      const netPayAmount = totalAmount - totalDeductionsAmount;

      // Net Pay header
      doc.setFillColor(184, 209, 243); // #b8d1f3
      doc.rect(20, yPos, 85, 10, "F");
      doc.rect(105, yPos, 85, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Net Pay", 25, yPos + 7);
      doc.text("Amount", 180, yPos + 7, { align: "right" });

      // Net Pay row
      yPos += 10;
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.rect(20, yPos, 85, 10, "F");
      doc.rect(105, yPos, 85, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Net Pay", 25, yPos + 7);
      doc.text(`R ${netPayAmount.toFixed(2)}`, 180, yPos + 7, {
        align: "right",
      });

      // Footer
      yPos += 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128); // #6b7280
      doc.text(
        "For Inquiries, please feel free to contact HR Department at hr@whizzaway.com.",
        105,
        yPos,
        {
          align: "center",
        }
      );

      // Save the PDF
      const driverNameForFile = employeeInfo
        ? `${employeeInfo.name}-${employeeInfo.surname}`.replace(/\s+/g, "-")
        : driverName?.replace(/\s+/g, "-") || `driver-${id}`;

      doc.save(
        `monthly-wage-slip-${driverNameForFile}-${selectedMonth}-${selectedYear}.pdf`
      );

      console.log(
        `Successfully generated and downloaded monthly wage slip for Driver ID: ${id}`
      );
    } catch (error) {
      console.error("Error generating monthly wage slip:", error);
      alert("Failed to generate monthly wage slip. Please try again later.");
    }

    setDownloadingMonth(false);
  };

  const formatDate = (month, year) => {
    return `${month} ${year}`;
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "5px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => navigate("/finance-clerk-wage")}
          className="back-button"
        >
          Back
        </button>
      </div>

      <div className="dropdown-container24">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="dropdown"
        >
          <option value="">Select Month</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="dropdown"
        >
          <option value="">Select Year</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>
      <h2
        style={{
          textAlign: "center",
          margin: "0 0 15px 0",
          fontWeight: "normal",
          fontSize: "24px",
          marginTop: "-35px",
        }}
      >
        {driverName}
      </h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading driver instructions...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          {error}
        </div>
      ) : (
        <table
          style={{
            width: "450px",
            margin: "0 auto",
            borderCollapse: "collapse",
            fontSize: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#87CEEB",
                padding: "12px 10px",
                textAlign: "center",
              }}
            >
              <th style={{ textAlign: "center" }}>View Legs</th>
              <th style={{ textAlign: "center" }}>Date</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
{filteredInstructions.length === 0 && !hasLegsForMonth && !employeeData?.base_salary ? (
  <tr>
    <td
      colSpan="3"
      style={{ textAlign: "center", padding: "25px" }}
    >
      No instructions, legs, or base salary found for this driver in{" "}
      {selectedMonth} {selectedYear}
    </td>
  </tr>
) : (
              <tr
                style={{
                  backgroundColor: "white",
                  padding: "12px 10px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <td>
                  <button
                    className="downloadwage1"
                    onClick={handleViewLegs}
                    style={{ margin: "0 auto", display: "block" }}
                  >
                    View
                  </button>
                </td>
                <td style={{ textAlign: "center" }}>
                  {formatDate(selectedMonth, selectedYear)}
                </td>
                <td style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleViewWageSlip}
                    style={{
                      backgroundColor: "green",
                      color: "white",
                      border: "none",
                      padding: "9px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "normal",
                      margin: "0 auto",
                      display: "block",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default FinanceClerkWageDetails;
