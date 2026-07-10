"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/ClientDocuments.css";
import Pagination from "../../../components/Pagination"; // Import the Pagination component

const ClientDocuments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  // State for instructions data
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(3); // You can make this configurable

  // Filter states
  const [filter, setFilter] = useState("All");
  // Set default filters to current year and month
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
  const [yearFilter, setYearFilter] = useState(
    currentDate.getFullYear().toString()
  );
  const [monthFilter, setMonthFilter] = useState(
    monthNames[currentDate.getMonth()]
  );

  const minYear = 2025;
  const maxYear = currentDate.getFullYear() + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // Auth helper function to get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch instructions when filters change
  useEffect(() => {
    const fetchInstructions = async () => {
      if (!clientId) {
        setError("No client selected");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Convert month name to number if needed
        let monthNumber = monthFilter;
        if (monthFilter && isNaN(monthFilter)) {
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
          monthNumber = monthNames.indexOf(monthFilter) + 1;
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (yearFilter) params.append("year", yearFilter);
        if (monthNumber) params.append("month", monthNumber);
        if (filter !== "All") params.append("type", filter);

        // Call the API with filters using axios
        const response = await api.get(`/api/client-instructions/${clientId}`, {
          params: params,
          headers: getAuthHeader(),
        });

        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized or forbidden
          navigate("/");
          return;
        }

        if (response.data.success) {
          setInstructions(response.data.data);
          setCurrentPage(1); // Reset to first page when data changes
          setError(null);
        } else {
          setError(response.data.message || "Failed to fetch instructions");
          setInstructions([]);
        }
      } catch (err) {
        console.error("Error fetching instructions:", err);
        setError("An error occurred while fetching instructions");
        setInstructions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [clientId, filter, yearFilter, monthFilter, navigate]);

  // Navigation handler
  const handleBack = () => {
    navigate("/FinancialDocumentsView");
  };

  // Filter handlers
  const handleFilterChange = (type) => {
    setFilter(type);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleYearChange = (event) => {
    const selectedYear = event.target.value;
    setYearFilter(selectedYear === "Year" ? "" : selectedYear);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleMonthChange = (event) => {
    const selectedMonth = event.target.value;
    setMonthFilter(selectedMonth === "Month" ? "" : selectedMonth);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  // View handlers
  const handleViewInvoice = (ikey) => {
    if (!ikey) {
      alert("No invoice available for this instruction");
      return;
    }

    // Navigate to the invoice view in the same tab
    navigate(`/invoice/${ikey}`);
  };

  const handleViewStatement = (statementId) => {
    if (!statementId) {
      alert("No statement available for this instruction");
      return;
    }

    // Navigate to the ClientStatement component with the statement ID
    navigate("/client-statement", {
      state: {
        statementId: statementId,
      },
    });
  };

  // Calculate pagination data
  const totalRecords = instructions.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentInstructions = instructions.slice(startIndex, endIndex);

  return (
    <div className="client-docs-wrapper">
      <div className="monitor-instructions-container">
        {/* Header with back button and client name */}
        <div className="user-profile">
          <button className="back-button" onClick={handleBack}>
            Back
          </button>
        </div>

        {/* Year and Month filters */}
        <div className="action-bar">
          <div className="filter-section9">
            <div className="filter-group">
              <select
                className="dropdown"
                onChange={handleYearChange}
                value={yearFilter || "Year"}
              >
                <option>Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                className="dropdown"
                onChange={handleMonthChange}
                value={monthFilter || "Month"}
              >
                <option>Month</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
                <option>July</option>
                <option>August</option>
                <option>September</option>
                <option>October</option>
                <option>November</option>
                <option>December</option>
              </select>
            </div>
          </div>
        </div>

        {/* Type filters */}
        <div className="filter-section9">
          <div className="filter-group">
            <button
              className={`filter-button ${filter === "import" ? "active" : ""}`}
              onClick={() => handleFilterChange("import")}
            >
              Import
            </button>
            <button
              className={`filter-button ${filter === "export" ? "active" : ""}`}
              onClick={() => handleFilterChange("export")}
            >
              Export
            </button>
            <button
              className={`filter-button ${filter === "cross-haul" ? "active" : ""}`}
              onClick={() => handleFilterChange("cross-haul")}
            >
              Cross-Haul
            </button>
            <button
              className={`filter-button ${
                filter === "cross-haul(break bulk)" ? "active" : ""
              }`}
              onClick={() => handleFilterChange("cross-haul(break bulk)")}
            >
              Breakbulk
            </button>
            <button
              className={`filter-button ${filter === "All" ? "active" : ""}`}
              onClick={() => handleFilterChange("All")}
            >
              All
            </button>
          </div>
        </div>

        {/* Loading and error states */}
        {loading && (
          <div className="loading-message">Loading instructions...</div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* Instructions table */}
        {!loading && !error && (
          <>
            <div className="instructions-table">
              <table>
                <thead>
                  <tr>
                    <th>Instruction</th>
                    <th>File No.</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Invoice</th>
                    <th>Statement</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInstructions.length > 0 ? (
                    currentInstructions.map((instruction) => (
                      <tr key={instruction.m1key}>
                        <td>{instruction.instruction_no}</td>
                        <td>{instruction.file_no}</td>
                        <td>{instruction.shipment_type}</td>
                        <td>{instruction.pickupdate}</td>
                        <td>R {instruction.total_cost}</td>
                        <td>
                          {/* Always show View button for invoices since completed instructions should have invoices */}
                          <button
                            className="view-button"
                            onClick={() => handleViewInvoice(instruction.ikey)}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          {instruction.has_statement ? (
                            <button
                              className="view-button"
                              onClick={() =>
                                handleViewStatement(instruction.statement_id)
                              }
                            >
                              View
                            </button>
                          ) : (
                            <span className="pending-status">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        No instructions found for this client with the selected
                        filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            {totalRecords > 0 && (
              <Pagination
                totalRecords={totalRecords}
                recordsPerPage={recordsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDocuments;
