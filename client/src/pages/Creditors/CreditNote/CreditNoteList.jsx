"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api.js"
import "../../payments/css/ClientPayments.css";

const CreditNoteList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Received location state:", location.state); // Debug log
  const { clientId, clientName } = location.state || {};

  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });
const [roleId, setRoleId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const handleTokenExpiration = (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
      return true;
    }
    return false;
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
useEffect(() => {
  const fetchRoleId = () => {
    let rId = null;
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        rId = Number(parsedData.roleid) || null;
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    if (!rId) {
      const roleIdStr = localStorage.getItem("roleId") || localStorage.getItem("userRoleId");
      rId = roleIdStr ? Number(roleIdStr) : null;
      if (isNaN(rId)) {
        rId = null;
      }
    }
    console.log("Fetched roleId:", rId); // Debug log
    setRoleId(rId);
  };

  fetchRoleId();
}, []);
  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchCreditNotes = async () => {
      try {
        setLoading(true);
      const response = await api.get(`/api/credit-notes/${clientId}`, {
        params: { year: filters.year, month: filters.month },
      });

        setCreditNotes(response.data.data || []);
        setCurrentPage(1);
      } catch (err) {
        if (!handleTokenExpiration(err)) {
          console.error("Error fetching credit notes:", err);
          setError("An error occurred while fetching credit notes");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCreditNotes();
  }, [clientId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
  };

  const handleUpload = () => {
    navigate("/credit-note-form", {
      state: { clientId, clientName, month: filters.month, year: filters.year },
    });
  };

  const handleBack = () => {
    navigate("/CredClientList");
  };

  const totalRecords = creditNotes.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = creditNotes.slice(startIndex, endIndex);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  if (loading)
    return (
      <div className="client-payment-dashboard-wrapper">
        <div>Loading credit notes...</div>
      </div>
    );
  if (error)
    return (
      <div className="client-payment-dashboard-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!clientId)
    return (
      <div className="client-payment-dashboard-wrapper">
        <div>Please select a client from the previous page.</div>
      </div>
    );

  return (
    <div className="client-payment-dashboard-wrapper">
      <div className="client-payment-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

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
                {[...Array(5)].map((_, i) => {
                  const year = currentDate.getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
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

        <div className="pagination-info">
          Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of{" "}
          {totalRecords} credit notes
        </div>

<table className="payment-table1">
  <thead>
    <tr>
      <th>Instruction No</th>
      <th>Doc No</th>
      <th>Date</th>
      <th>Amount</th>
      <th>Container</th>
      <th>View</th>
    </tr>
  </thead>
  <tbody>
    {currentRecords.length > 0 ? (
      currentRecords.map((creditNote, index) => (
        <tr key={creditNote.creditnote_id || index}>
          <td>{creditNote.m1key}</td>
          <td>{creditNote.doc_no || "None"}</td>
          <td>{new Date(creditNote.creditnote_date).toLocaleDateString()}</td>
          <td>R{Array.isArray(creditNote.amount) ? creditNote.amount.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0).toFixed(2) : Number(creditNote.amount).toFixed(2)}</td>
          <td>{creditNote.containernum}</td>
          <td>
            <button
              className="view-button"
              onClick={() =>
                navigate(
                  `/view-credit-note/${encodeURIComponent(clientName)}/${creditNote.creditnote_id}`,
                  {
                    state: { clientId, clientName },
                  }
                )
              }
            >
              View
            </button>
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan="6" className="p-3 text-center">
          No credit notes found
        </td>
      </tr>
    )}
  </tbody>
</table>

        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-controls">
              <button
                className="pagination-btn prev-btn"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <div className="pagination-numbers">
                {getPageNumbers().map((pageNum, index) => (
                  <span key={index}>
                    {pageNum === "..." ? (
                      <span className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        className={`pagination-number ${
                          currentPage === pageNum ? "active" : ""
                        }`}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <button
                className="pagination-btn next-btn"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>

            <div className="pagination-summary">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}

            {roleId !== null && roleId !== 1 && roleId !== 4 && (
              <div
                className="upload-section"
                style={{ marginTop: "20px", textAlign: "center" }}
              >
                <button className="upload-button" onClick={handleUpload}>
                  Add 
                </button>
              </div>
            )}

      </div>
    </div>
  );
};

export default CreditNoteList;