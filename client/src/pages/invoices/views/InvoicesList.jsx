"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/InvoicesList.css";
import api from "../../../api"; // Import the axios instance
import Pagination from "../../../components/Pagination"; // Import the Pagination component

// Utility function for formatting dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data);
  }
};

const InvoicesList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get client information from location state (if available)
  const clientInfo = location.state || {};
  const { clientId, clientName, clientEmail, clientRepresentative } =
    clientInfo;

  // Add state for instructions, loading, and error
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(4); // You can make this configurable

  // Set default filters to current year and month
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
    type: "All",
    clientId: clientId || null,
  });

  // Skip initial render to prevent auto-filtering on page load
  const [isInitialRender, setIsInitialRender] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch instructions when component mounts or filters change
  useEffect(() => {
    let isMounted = true;

    // Skip the initial render to prevent auto-filtering on page load
    if (isInitialRender) {
      setIsInitialRender(false);
      return;
    }

    const fetchInstructions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (filters.year) params.append("year", filters.year);
        if (filters.month) params.append("month", filters.month);
        if (filters.type !== "All") params.append("type", filters.type);
        if (filters.clientId) params.append("clientId", filters.clientId);

        // Use axios instead of fetch
        const requestUrl = `/api/invoices/completed?${params.toString()}`;
        debug("Fetching from:", requestUrl);

        const response = await api.get(requestUrl);

        debug("Response status:", response.status);
        debug("Received data:", response.data);

        if (isMounted) {
          setInstructions(response.data.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching instructions:", err);

        if (isMounted) {
          let errorMessage = "Failed to load instructions";

          if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const { status, data } = err.response;

            if (status === 401 || status === 403) {
              // Handle unauthorized or forbidden
              navigate("/");
              return;
            }

            // Check if response is HTML (proxy configuration issue)
            if (
              typeof data === "string" &&
              (data.trim().startsWith("<!DOCTYPE") ||
                data.trim().startsWith("<html"))
            ) {
              errorMessage =
                "Received HTML instead of JSON. This may indicate a proxy configuration issue.";
            } else {
              errorMessage = `HTTP error! Status: ${status}. ${
                data?.message || data || ""
              }`;
            }
          } else if (err.request) {
            // The request was made but no response was received
            errorMessage =
              "No response received from server. Please check your connection.";
          } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage = err.message;
          }

          setError(`${errorMessage}

Troubleshooting tips:
• Make sure your API server is running on port 5000
• Check that your package.json has "proxy": "http://localhost:5000"
• Verify that the API endpoint /api/invoices/completed exists on your server`);
          setLoading(false);
        }
      }
    };

    // Only fetch if at least one filter is set (year, month, clientId) or a
    // search is active (so search spans all invoices without month/year).
    if (filters.year || filters.month || filters.clientId || searchQuery.trim()) {
      fetchInstructions();
    } else {
      // If no filters are set, clear the instructions and show a message
      setInstructions([]);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [filters, isInitialRender, navigate]); // dependencies include isInitialRender

  // Handle year and month filter changes - use useCallback to memoize
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  // Handle type filter changes - use useCallback to memoize
  const handleTypeFilter = useCallback((type) => {
    setFilters((prev) => ({
      ...prev,
      type,
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);
    // When searching, clear the month/year filters so the search runs
    // across all invoices rather than only the selected month/year.
    if (value.trim()) {
      setFilters((prev) =>
        prev.year || prev.month ? { ...prev, year: "", month: "" } : prev
      );
    }
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  // Determine the back button destination
  const handleBackClick = useCallback(() => {
    // If we came from client selection, go back to that page
    if (clientId) {
      navigate("/ViewClientInvoice");
    } else {
      // Otherwise go to the default dashboard
      navigate("/FDashboard");
    }
  }, [clientId, navigate]);

  const minYear = 2025;
  const maxYear = currentDate.getFullYear() + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // Apply client-side search filter on top of the API-filtered results
  const sq = searchQuery.trim().toLowerCase();
  const filteredInstructions = sq
    ? instructions.filter(
        (i) =>
          i.file_no?.toLowerCase().includes(sq) ||
          i.m1key?.toString().includes(sq) ||
          i.invoice_num?.toLowerCase().includes(sq)
      )
    : instructions;

  // Calculate pagination data
  const totalRecords = filteredInstructions.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentInstructions = filteredInstructions.slice(startIndex, endIndex);

  return (
    <div className="invoices-list-wrapper">
      <div className="app">
        {/* Main */}
        <main className="main">
          {/* Back Button */}
          <div className="">
            <button className="back-button" onClick={handleBackClick}>
              Back
            </button>
          </div>

          <div
            className="action-bar"
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div className="filter-section6">
              <div className="dropdown-container">
                <input
                  type="text"
                  placeholder="Search by file no., instruction no. or invoice no."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{
                    minWidth: "240px",
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    fontFamily: "inherit",
                    backgroundColor: "white",
                  }}
                />
                <select
                  className="dropdown"
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                >
                  <option value="">Year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  className="dropdown"
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                >
                  <option value="">Month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-group1">
              <button
                className={`filter-button ${
                  filters.type === "import" ? "active" : ""
                }`}
                onClick={() => handleTypeFilter("import")}
              >
                Import
              </button>
              <button
                className={`filter-button ${
                  filters.type === "export" ? "active" : ""
                }`}
                onClick={() => handleTypeFilter("export")}
              >
                Export
              </button>
              <button
                className={`filter-button outline ${
                  filters.type === "All" ? "active" : ""
                }`}
                onClick={() => handleTypeFilter("All")}
              >
                All
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container22">
            {loading ? (
              <div className="loading-message">Loading instructions...</div>
            ) : error ? (
              <div className="error-message" style={{ whiteSpace: "pre-line" }}>
                {error}
              </div>
            ) : instructions.length === 0 ? (
              <div className="no-data-message">
                {clientName
                  ? `Please select a filter to view invoices for ${clientName}.`
                  : "Please select a filter to view invoices."}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Instruction No</th>
                    <th>Inv Number</th>
                    <th>Type</th>
                    <th>File No</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInstructions.map((instruction) => (
                    <tr key={instruction.m1key}>
                      <td>{instruction.m1key}</td>
                      <td>{instruction.invoice_num}</td>
                      <td>{instruction.shipment_type}</td>
                      <td>{instruction.file_no}</td>
                      <td>{formatDate(instruction.date)}</td>
                      <td>
                        <button
                          className="small-btn"
                          onClick={() => {
                            debug(
                              `Navigating to invoice view for ID: ${instruction.ikey}`
                            );
                            navigate(`/invoice/${instruction.ikey}`, {
                              state: {
                                clientId,
                                clientName,
                                returnToClientView: !!clientId,
                              },
                            });
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
        </main>
      </div>
    </div>
  );
};

export default InvoicesList;
