"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ViewClientStatements.css";
import api from "../../../api"; // Import the axios instance
import Pagination from "../../../components/Pagination"; // Import the Pagination component

const ViewClientStatement = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10); // You can make this configurable

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        // Use axios instead of fetch
        const response = await api.get("/api/clients");

        // The server returns the array directly, not wrapped in a success/data object
        // Map the API response to match the component's expected structure
        const mappedClients = response.data.map((client) => ({
          company: client.companyname,
          representative: client.representative,
          email: client.email,
          id: client.m5clientkey, // Store the ID for later use
        }));

        setClients(mappedClients);
      } catch (err) {
        console.error("Error fetching clients:", err);

        let errorMessage = "Failed to fetch clients";

        if (err.response) {
          const { status, data } = err.response;

          if (status === 401 || status === 403) {
            // Handle unauthorized or forbidden
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
    };

    fetchClients();
  }, [navigate]);

  // Calculate pagination data
  const totalRecords = clients.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentClients = clients.slice(startIndex, endIndex);

  return (
    <div className="view-client-statements-wrapper">
      {/* Back Button */}
      <div className="client-payments-header">
        <button
          className="back-button"
          onClick={() => navigate("/DebtorsDashboard")}
        >
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <p>Loading clients...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="clientstatementtable">
          <table className="t1" style={{ width: "70%" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {currentClients.map((client, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3">{client.company}</td>
                  <td className="p-3">{client.representative}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">
                    <button
                      className="view-butn"
                      onClick={() =>
                        navigate("/statements-list", {
                          state: { clientId: client.id, clientName: client.company },
                        })
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

export default ViewClientStatement;
