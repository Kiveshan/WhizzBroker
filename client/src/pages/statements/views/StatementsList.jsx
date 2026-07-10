"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/StatementList.css";
import api from "../../../api"; // Import the axios instance
import Pagination from "..//../../components/Pagination"; // Import the Pagination component

const StatementList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [hasDefaultMonthStatement, setHasDefaultMonthStatement] = useState(false);

  // Set default filters so the month is one month before the current one.
  // If today is in January, default to December of the previous year.
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
  const [recordsPerPage] = useState(10); // You can make this configurable

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  const fetchStatements = useCallback(async () => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.year) params.append("year", filters.year);
      if (filters.month) params.append("month", filters.month);

      // Use axios instead of fetch
      const requestUrl = `/api/statements/${clientId}?${params.toString()}`;
      const response = await api.get(requestUrl);

      if (response.data.success) {
        const fetchedStatements = response.data.data;
        setStatements(fetchedStatements);

        // Determine if there is a statement for the default month/year for this client
        const hasForDefaultMonth = fetchedStatements.some((statement) => {
          if (!statement.generation_date) return false;
          const d = new Date(statement.generation_date);
          d.setDate(d.getDate() - 1);
          const year = d.getFullYear();
          const month = d.getMonth() + 1; // 1-12
          return year === defaultYear && month === defaultMonth;
        });

        setHasDefaultMonthStatement(hasForDefaultMonth);
      } else {
        throw new Error(response.data.message || "Failed to fetch statements");
      }
    } catch (err) {
      console.error("Error fetching statements:", err);

      let errorMessage = "Failed to fetch statements";

      if (err.response) {
        const { status, data } = err.response;

        if (status === 401 || status === 403) {
          navigate("/");
          return;
        }

        errorMessage = data?.message || `HTTP error! Status: ${status}`;
      } else if (err.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [clientId, filters, navigate]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const isDefaultFilter =
    filters.year === defaultYear.toString() &&
    filters.month === defaultMonth.toString();

  const handleManualGeneration = async () => {
    if (!clientId) {
      setGenerationMessage("No client selected");
      return;
    }

    setGenerating(true);
    setGenerationMessage("");

    try {
      const response = await api.post("/api/statements/generate", {
        clientId: clientId,
        specificClient: true,
      });

      if (response.data.success) {
        const created = Number(response.data?.stats?.created || 0);
        const updated = Number(response.data?.stats?.updated || 0);
        let msg = "";
        const nameForDisplay = clientName || "this client";

        if (created > 0) {
          msg = `Statement processed for ${nameForDisplay}. Created new statement.`;
        } else if (updated > 0) {
          msg = `Statement processed for ${nameForDisplay}. Updated existing statement.`;
        } else {
          msg = `Statement processed for ${nameForDisplay}. No statement created or updated.`;
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
  const maxYear = currentYear + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // Calculate pagination data
  const totalRecords = statements.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentStatements = statements.slice(startIndex, endIndex);

  const getDisplayDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString();
  };

  if (loading)
    return (
      <div className="statement-list-wrapper">
        <div>Loading statements...</div>
      </div>
    );
  if (error)
    return (
      <div className="statement-list-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!clientId)
    return (
      <div className="statement-list-wrapper">
        <div>Please select a client from the previous page.</div>
      </div>
    );

  return (
    <div className="statement-list-wrapper">
      <button
        onClick={() => navigate("/view-client-statements")}
        className="back-button"
      >
        Back
      </button>

      <div className="action-bar">
        <div className="filter-section46">
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
          {isDefaultFilter && (
            <button
              onClick={handleManualGeneration}
              disabled={generating}
              className="generate-statement-btn"
            >
              {generating
                ? "Generating..."
                : hasDefaultMonthStatement
                ? "Update Statement"
                : "Generate Statement"}
            </button>
          )}
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

      <table className="instruction-table1">
        <thead>
          <tr>
            <th>Statement No</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentStatements.length === 0 ? (
            <tr>
              <td colSpan="3">No statements found for this client.</td>
            </tr>
          ) : (
            currentStatements.map((statement) => (
              <tr key={statement.statement_key}>
                <td>{statement.statement_key}</td>
                <td>
                  {getDisplayDate(statement.generation_date)}
                </td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate("/client-statement", {
                        state: { statementId: statement.statement_key },
                      })
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pagination Component */}
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

export default StatementList;
