"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/ClientListPay.css";
import Pagination from "../../../components/Pagination.jsx";

const ClientListPay = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10); // You can make this configurable

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/clients");

        // Handle both response formats - either an object with success/data or direct array
        const clientsData = response.data.data || response.data;

        // Ensure we have an array before setting state
        if (Array.isArray(clientsData)) {
          setClients(clientsData);
        } else {
          console.error("Unexpected response format:", response.data);
          setError("Received invalid data format from server");
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError("An error occurred while fetching clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

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
    <div className="payment-client-wrapper">
      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/debtors")}>
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <div className="loading-message">Loading clients...</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Table */}
      {!loading && !error && (
        <div className="clientinstructiontable">
          <table className="t1" style={{ width: "70%" }}>
            <thead className="bg-blue-300">
              <tr>
                <th className="p-3">Company</th>
                <th className="p-3">Representative</th>
                <th className="p-3">Email</th>
                <th className="p-3">Payments</th>
              </tr>
            </thead>
            <tbody>
              {currentClients.length > 0 ? (
                currentClients.map((client, index) => (
                  <tr key={client.m5clientkey || index} className="border-t">
                    <td className="p-3">{client.companyname}</td>
                    <td className="p-3">{client.representative}</td>
                    <td className="p-3">{client.email}</td>
                    <td className="p-3">
                      <button
                        className="view-butn"
                        onClick={() =>
                          navigate("/client-payments", {
                            state: {
                              clientId: client.m5clientkey,
                              clientName: client.companyname,
                            },
                          })
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-3 text-center">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Component - Now properly centered */}

          <Pagination
            totalRecords={totalRecords}
            recordsPerPage={recordsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ClientListPay;
