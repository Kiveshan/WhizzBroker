"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/Expenses1.css";
import Pagination from "../../../components/Pagination"

const ViewExpense = () => {
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8; // Adjust as needed

useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const response = await api.get("/trucks/company-owned");

        if (!response.data) {
          throw new Error("No data received from server");
        }

        const data = response.data;
        console.log("Truck data:", data);

        // Filter out trucks where is_subcontractor is true
        const filteredTrucks = data.filter((truck) => {
          // Handle different possible formats of is_subcontractor
          const isSubcontractor =
            truck.is_subcontractor === true ||
            truck.is_subcontractor === "true" ||
            truck.is_subcontractor === "t" ||
            truck.is_subcontractor === 1;

          console.log(
            `Truck ${truck.truckregnum}, is_subcontractor: ${
              truck.is_subcontractor
            } (${typeof truck.is_subcontractor}), filtered: ${!isSubcontractor}`
          );

          return !isSubcontractor;
        });

        console.log("Filtered trucks (company owned only):", filteredTrucks);
        setTrucks(filteredTrucks);
      } catch (err) {
        console.error("Error fetching truck data:", err);
        setError("Failed to load truck data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrucks();
  }, []);

  // Fix the handleViewClick function to properly pass the truck registration number
  const handleViewClick = (truck) => {
    navigate(`/ExpenseDetails/${truck.truckid}`, {
      state: {
        truckId: truck.truckid,
        truckRegNum: truck.truckregnum || "Unknown Truck",
      },
    });
  };

  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = trucks.slice(startIndex, endIndex);

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button
          className="back-button"
          onClick={() => navigate("/CreditorsDashboard")}
        >
          Back
        </button>
      </div>

      {loading ? (
        <p>Loading trucks...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
        <div className="table-wrapper">
          <table
            className="expenses-table1"
            style={{ width: "30%", marginLeft: "540px" }}
          >
            <thead>
              <tr>
                <th>Truck Registration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
                currentRecords.map((truck, index) => (
                  <tr key={index}>
                    <td>{truck.truckregnum || "Unknown"}</td>
                    <td>
                      <button
                        className="view-button"
                        onClick={() => handleViewClick(truck)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">No trucks found</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            totalRecords={trucks.length}
            recordsPerPage={recordsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
          </div>
        </>
      )}
    </div>
  );
};

export default ViewExpense;