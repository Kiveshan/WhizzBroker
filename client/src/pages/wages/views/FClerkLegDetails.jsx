// export default FClerkLegDetails
"use client";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import api from "../../../api";
import "../css/finance-clerk-wage.css";

const FClerkLegDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from location state
  const { driverId, driverName, selectedMonth, selectedYear } =
    location.state || {};

  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLegDetails = async () => {
    if (!driverId) {
      setError("Missing driver ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get selectedMonth and selectedYear from location state
      const month = location.state?.selectedMonth;
      const year = location.state?.selectedYear;

      console.log(
        `Fetching all leg details for driver ID: ${driverId}, month: ${month}, year: ${year}`
      );

      if (!month || !year) {
        setError("Missing month or year from previous screen");
        setLoading(false);
        return;
      }

      // Use the new endpoint that filters by month and year but includes ALL instructions
      const url = `/api/all-driver-legs/${driverId}/by-month?month=${encodeURIComponent(
        month
      )}&year=${encodeURIComponent(year)}`;
      console.log("Attempting to fetch from URL:", url);

      const response = await api.get(url);

      if (!response.data) {
        throw new Error("No data received from server");
      }

      console.log(
        `Successfully fetched ${response.data.length} legs for ${month} ${year}`
      );

      // Process the legs data
      const processedLegs = Array.isArray(response.data)
        ? response.data.map((leg) => ({
            ...leg,
            displayInstructionId: leg.m1key || "N/A",
          }))
        : [];

      setLegs(processedLegs);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leg details:", error);
      setError(`Failed to load leg details: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegDetails();
  }, [driverId, location.state?.selectedMonth, location.state?.selectedYear]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Whizz-Away";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Leg Details", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    });

    // Title row
    worksheet.mergeCells("A1:J1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${driverName || `Driver ${driverId}`} — Leg Details: ${selectedMonth} ${selectedYear}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1F3864" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
    worksheet.getRow(1).height = 30;

    // Blank spacer row
    worksheet.addRow([]);

    // Column definitions (row 3)
    const columns = [
      { header: "Instruction ID", key: "instructionId", width: 18 },
      { header: "Leg Number", key: "legNumber", width: 14 },
      { header: "Truck Reg", key: "truckReg", width: 14 },
      { header: "Container Number", key: "containerNumber", width: 22 },
      { header: "DN", key: "dn", width: 16 },
      { header: "Starting Point", key: "startingPoint", width: 22 },
      { header: "Ending Point", key: "endingPoint", width: 22 },
      { header: "Date", key: "date", width: 14 },
      { header: "Amount (R)", key: "amount", width: 14 },
      { header: "Status", key: "status", width: 16 },
    ];
    worksheet.columns = columns;

    // Header row styling (row 3)
    const headerRow = worksheet.getRow(3);
    headerRow.values = columns.map((c) => c.header);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1F3864" } },
        bottom: { style: "thin", color: { argb: "FF1F3864" } },
        left: { style: "thin", color: { argb: "FF1F3864" } },
        right: { style: "thin", color: { argb: "FF1F3864" } },
      };
    });

    // Data rows
    let totalAmount = 0;
    legs.forEach((leg, index) => {
      const amount = leg.driverrate || 0;
      totalAmount += amount;
      const row = worksheet.addRow({
        instructionId: leg.displayInstructionId,
        legNumber: leg.legnumber || "N/A",
        truckReg: leg.truckregnumber || "N/A",
        containerNumber: leg.containernumber || "N/A",
        dn: leg.dn || "N/A",
        startingPoint: leg.startingpoint || "N/A",
        endingPoint: leg.destination || "N/A",
        date: formatDate(leg.date),
        amount: amount,
        status: leg.instruction_status || "N/A",
      });

      const rowFill = index % 2 === 0
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
        : { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F6FF" } };

      row.eachCell((cell, colNumber) => {
        cell.fill = rowFill;
        cell.font = { size: 11 };
        cell.alignment = { vertical: "middle", horizontal: colNumber === 9 ? "right" : "left" };
        cell.border = {
          top: { style: "hair", color: { argb: "FFCCCCCC" } },
          bottom: { style: "hair", color: { argb: "FFCCCCCC" } },
          left: { style: "hair", color: { argb: "FFCCCCCC" } },
          right: { style: "hair", color: { argb: "FFCCCCCC" } },
        };
      });

      // Format amount cell as currency
      row.getCell(9).numFmt = '"R"#,##0.00';
      row.height = 18;
    });

    // Total row
    const totalRow = worksheet.addRow({
      instructionId: "",
      legNumber: "",
      truckReg: "",
      containerNumber: "",
      dn: "",
      startingPoint: "",
      endingPoint: "",
      date: "TOTAL",
      amount: totalAmount,
      status: "",
    });
    totalRow.height = 22;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11, color: { argb: "FF1F3864" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.alignment = { vertical: "middle", horizontal: colNumber === 9 ? "right" : colNumber === 8 ? "right" : "left" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF1F3864" } },
        bottom: { style: "medium", color: { argb: "FF1F3864" } },
      };
    });
    totalRow.getCell(9).numFmt = '"R"#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${driverName || `Driver_${driverId}`}_${selectedMonth}_${selectedYear}_Legs.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="legdetails-header">
        <button
          onClick={() =>
            navigate(`/finance-clerk-wage-details/${driverId}`, {
              state: { name: driverName },
            })
          }
          className="legdetails-back-btn"
        >
          Back
        </button>
      </div>

      <h2 className="legdetails-title">
        {driverName || `Driver ${driverId}`} - {selectedMonth} {selectedYear}
      </h2>

      {!loading && !error && legs.length > 0 && (
        <div className="legdetails-export-container">
          <button onClick={exportToExcel} className="legdetails-export-btn">
            Export to Excel
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading leg details...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          {error}
        </div>
      ) : (
        <table
          style={{
            width: "1000px",
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
                textAlign: "left",
              }}
            >
              <th>Instruction ID</th>
              <th>Leg Number</th>
              <th>Truck Reg</th>
              <th>Container Number</th>
              <th>DN</th>
              <th>Starting Point</th>
              <th>Ending Point</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {legs.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  style={{ textAlign: "center", padding: "15px" }}
                >
                  No leg details found for {selectedMonth} {selectedYear}
                </td>
              </tr>
            ) : (
              legs.map((leg) => (
                <tr
                  key={leg.legkey}
                  style={{
                    backgroundColor: "white",
                    padding: "12px 10px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td>{leg.displayInstructionId}</td>
                  <td>{leg.legnumber || "N/A"}</td>
                  <td>{leg.truckregnumber || "N/A"}</td>
                  <td>{leg.containernumber || "N/A"}</td>
                  <td>{leg.dn || "N/A"}</td>
                  <td>{leg.startingpoint || "N/A"}</td>
                  <td>{leg.destination || "N/A"}</td>
                  <td>{formatDate(leg.date)}</td>
                  <td>
                    R{leg.driverrate ? leg.driverrate.toFixed(2) : "0.00"}
                  </td>
                  <td>{leg.instruction_status || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
};

export default FClerkLegDetails;
