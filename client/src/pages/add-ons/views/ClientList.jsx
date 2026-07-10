"use client";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/ClientList.css";
import Pagination from "../../../components/Pagination.jsx"; // Import the Pagination component

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data);
  }
};

const ClientList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5); // You can make this configurable

  // Auth helper function to get token from localStorage
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let isMounted = true;

    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch clients from the database with auth header
        const response = await api.get("/api/clients", {
          headers: getAuthHeader(),
        });

        if (!response.data) {
          throw new Error("No data received from server");
        }

        if (isMounted) {
          setClients(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (
          err.response &&
          (err.response.status === 401 || err.response.status === 403)
        ) {
          navigate("/");
          return;
        }
        console.error("Error fetching clients:", err);
        if (isMounted) {
          setError(`Failed to load clients: ${err.message}`);
          setLoading(false);
        }
      }
    };

    fetchClients();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleViewInvoices = useCallback(
    (client) => {
      // Navigate to invoices page with client information
      navigate("/view-add-on-list", {
        state: {
          clientId: client.m5clientkey,
          clientName: client.companyname,
          clientEmail: client.email,
          clientRepresentative: client.representative,
        },
      });
    },
    [navigate]
  );

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  // Calculate pagination data
  const totalRecords = clients.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentClients = clients.slice(startIndex, endIndex);

  return (
    <div className="client-list-wrapper">
      <div className="view-client-invoice-container">
        {/* Back Button */}
        <div className="client-payments-header">
          {roleId == 3 && (
            <button
              className="back-button"
              onClick={() => navigate("/DebtorsDashboard")}
            >
              Back
            </button>
          )}

          {roleId == 1 && (
            <button
              className="back-button"
              onClick={() => navigate("/debtors")}
            >
              Back
            </button>
          )}

          {roleId == 4 && (
            <button
              className="back-button"
              onClick={() => navigate("/DirectorDebtors")}
            >
              Back
            </button>
          )}

          
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <p className="loading-message">Loading clients...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : clients.length === 0 ? (
            <p className="no-data-message">No clients found.</p>
          ) : (
            <>
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Representative</th>
                    <th>Email</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClients.map((client) => (
                    <tr key={client.m5clientkey}>
                      <td>{client.companyname}</td>
                      <td>{client.representative}</td>
                      <td>{client.email}</td>
                      <td>
                        <button
                          className="view-button"
                          onClick={() => handleViewInvoices(client)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Component */}
              <Pagination
                totalRecords={totalRecords}
                recordsPerPage={recordsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientList;
