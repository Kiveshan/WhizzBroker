"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/StatementList.css";
import api from "../../../api"; // Import the axios instance
import Pagination from "..//../../components/Pagination"; // Import the Pagination component

const MONTH_NAMES = [
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

// Statements are identified by the month they cover, not by a number — the
// derived key ("<clientId>-YYYY-MM") is an internal handle, never shown.
const formatPeriodLabel = (period) => {
  if (!period) return "";
  const [year, month] = String(period).split("-").map(Number);
  return `${MONTH_NAMES[month - 1] || ""} ${year}`.trim();
};

const StatementList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId } = location.state || {};

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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


  const monthNames = MONTH_NAMES;

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
        </div>
      </div>

      <table className="instruction-table1">
        <thead>
          <tr>
            <th>Month/Year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentStatements.length === 0 ? (
            <tr>
              <td colSpan="2">No statements found for this client.</td>
            </tr>
          ) : (
            currentStatements.map((statement) => (
              <tr key={statement.statement_key}>
                <td>{formatPeriodLabel(statement.period)}</td>
                <td>
                  <button
                    className="view-btn"
                    onClick={() =>
                      navigate("/client-statement", {
                        state: { statementKey: statement.statement_key },
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
