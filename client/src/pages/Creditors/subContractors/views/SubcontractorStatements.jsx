"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../../api";
import "../css/SubcontractorStatements.css";
import Pagination from "../../../../components/Pagination";

const SubcontractorStatements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subcontractorId, subcontractorName, subei_reg_num } =
    location.state || {};

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

  // Set default filters to previous month (with year wrap, same as client statements)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const defaultMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const defaultYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [filters, setFilters] = useState({
    year: defaultYear.toString(),
    month: defaultMonth.toString(),
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  const fetchStatements = useCallback(async () => {
    if (!subcontractorId || !subei_reg_num) {
      setError("No subcontractor selected or missing registration number");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/subcontractor/statements", {
        params: {
          subei_reg_num,
          year: filters.year,
          month: filters.month,
        },
      });

      if (!response.data) throw new Error("Failed to fetch statements");

      const transformedStatements = response.data.map((item) => {
        const originalDate = new Date(item.date);
        const adjustedDate = new Date(originalDate);
        adjustedDate.setDate(adjustedDate.getDate() - 1);

        return {
          statementId: item.sub_state_id,
          month: adjustedDate.toLocaleString("default", {
            month: "long",
          }),
          year: adjustedDate.getFullYear(),
          generationDate: adjustedDate.toISOString(),
          totalAmount: item.amount,
          vatStatus: item.vat_status || "VAT",
          status: "Pending", // Assuming status needs to be derived; adjust as needed
          legids:
            typeof item.legids === "object"
              ? JSON.stringify(item.legids)
              : item.legids,
        };
      });

      setStatements(transformedStatements);
    } catch (err) {
      console.error("Error fetching statements:", err);
      setError("Failed to fetch statements");
    } finally {
      setLoading(false);
    }
  }, [subcontractorId, subei_reg_num, filters]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
    setCurrentPage(1);
  };

  const handleManualGeneration = async () => {
    if (!subei_reg_num) {
      setGenerationMessage("No subcontractor registration number available");
      return;
    }

    setGenerating(true);
    setGenerationMessage("");

    try {
      const response = await api.post("/subcontractor/generate-statement", {
        subei_reg_num: subei_reg_num,
        specificSubcontractor: true,
      });

      if (response.data.success) {
        const created = Number(response.data?.stats?.created || 0);
        const updated = Number(response.data?.stats?.updated || 0);
        let msg = response.data.message;
        if (!msg) {
          if (created > 0) msg = "Statement created for this subcontractor.";
          else if (updated > 0) msg = "Statement updated for this subcontractor.";
          else msg = "No statement was created or updated for this subcontractor.";
        }
        setGenerationMessage(msg);
        // Refresh the statements list
        await fetchStatements();
      } else {
        throw new Error(
          response.data.message || "Failed to generate statement"
        );
      }
    } catch (err) {
      console.error("Error generating statement:", err);

      let errorMessage = "Failed to generate statement";

      if (err.response) {
        const { status, data } = err.response;
        errorMessage = data?.message || `HTTP error! Status: ${status}`;
      } else if (err.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      } else {
        errorMessage = err.message;
      }

      setGenerationMessage(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

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

  const minYear = 2025;
  const maxYear = currentDate.getFullYear() + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  const totalRecords = statements.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentStatements = statements.slice(startIndex, endIndex);

  if (loading)
    return (
      <div className="subcontractor-statements-wrapper">
        <div>Loading statements...</div>
      </div>
    );
  if (error)
    return (
      <div className="subcontractor-statements-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!subcontractorId || !subei_reg_num)
    return (
      <div className="subcontractor-statements-wrapper">
        <div>Please select a subcontractor from the previous page.</div>
      </div>
    );

  return (
    <div className="subcontractor-statements-wrapper">
      <button
        onClick={() => navigate("/Creditors/SubcontractorList")}
        className="back-button"
      >
        Back
      </button>
      <div className="page-title">
        <h2>Monthly Statements - {subcontractorName}</h2>
      </div>
      <div className="action-bar">
        <div className="filter-section">
          <div className="dropdown-container">
            <select
              name="year"
              className="dropdown"
              value={filters.year}
              onChange={handleFilterChange}
            >
              <option>Year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>
            <select
              name="month"
              className="dropdown"
              value={filters.month}
              onChange={handleFilterChange}
            >
              <option>Month</option>
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleManualGeneration}
            disabled={generating}
            className="back-button"
            style={{
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "inherit",
              marginTop: "333px",
              marginLeft: "920px",
            }}
          >
            {generating ? "Generating..." : "Generate Statement"}
          </button>
        </div>
      </div>

      {generationMessage && (
        <div
          className={`generation-message ${
            generationMessage.includes("Error") ||
            generationMessage.includes("Failed")
              ? "error"
              : "success"
          }`}
          style={{
            padding: "10px",
            margin: "10px 0",
            borderRadius: "4px",
            backgroundColor:
              generationMessage.includes("Error") ||
              generationMessage.includes("Failed")
                ? "#f8d7da"
                : "#d4edda",
            color:
              generationMessage.includes("Error") ||
              generationMessage.includes("Failed")
                ? "#721c24"
                : "#155724",
            border: `1px solid ${
              generationMessage.includes("Error") ||
              generationMessage.includes("Failed")
                ? "#f5c6cb"
                : "#c3e6cb"
            }`,
          }}
        >
          {generationMessage}
        </div>
      )}

      <table className="statements-table">
        <thead>
          <tr>
            <th>Statement ID</th>
            <th>Month/Year</th>
            <th>Type</th>
            <th>Total Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentStatements.length === 0 ? (
            <tr>
              <td colSpan="4">No statements found for the selected period.</td>
            </tr>
          ) : (
            currentStatements.map((statement) => (
              <tr key={statement.statementId}>
                <td>{statement.statementId}</td>
                <td>
                  {statement.month} {statement.year}
                </td>
                <td>
                  {statement.vatStatus === "NON_VAT" ? "No VAT" : "VAT"}
                </td>
                <td>R{statement.totalAmount.toLocaleString()}</td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate("/Creditors/SubcontractorStatementDetails", {
                        state: {
                          statementId: statement.statementId,
                          subcontractorName,
                          subcontractorId,
                          subei_reg_num,
                          legids: statement.legids,
                          date: statement.generationDate, // Pass as-is, now ensured to be a string
                          vatStatus: statement.vatStatus,
                        },
                      })
                    }
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {totalRecords > 0 && (
        <Pagination
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default SubcontractorStatements;
