"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

import Pagination from "../../../components/Pagination"

const FinanceClerkWage = () => {
  const [drivers, setDrivers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10; // Show 10 records per page

  useEffect(() => {
    // Fetch drivers data
    api
      .get("/all-employees")
      .then((response) => {
        const filtered = (response.data || []).filter((emp) => emp.roleid !== 6);
        setDrivers(filtered);
        console.log("All employees:", response.data);
        console.log("Filtered (excluding roleid 6):", filtered);

        setCurrentPage(1); // Reset to first page when data changes
        setError(null); // Clear any previous errors
      })
      .catch((error) => {
        console.error("Error fetching drivers:", error);
        setError("Failed to load drivers. Please try again.");
      });

    // Get user role from localStorage if available
    const roleId = localStorage.getItem("userRoleId");
    setUserRole(roleId ? parseInt(roleId) : null);
  }, []);

  const handleViewClick = (driver) => {
    navigate(`/finance-clerk-wage-details/${driver.userid}`, {
      state: {
        name: `${driver.name} ${driver.surname}`,
        returnDashboard: getDashboardRouteByRole(),
      },
    });
  };

  const getDashboardRouteByRole = () => {
    // Check localStorage first
    const storedDashboard = localStorage.getItem("dashboardRoute");
    if (storedDashboard) return storedDashboard;

    // Fall back to role-based routing
    if (userRole === 8) {
      return "/CreditorsDashboard";
    }

    // Further fallbacks
    switch (userRole) {
      case 1:
        return "/Dashboard";
      case 4:
        return "/DirectorDashboard";
      default:
        return "/CreditorsDashboard";
    }
  };

  const handleBackClick = () => {
    navigate(getDashboardRouteByRole());
  };

  // Calculate paginated records
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = drivers.slice(startIndex, endIndex);

  return (
    <div className="wage-container">
      <div className="button-container">
        <button onClick={handleBackClick} className="back-button">
          Back
        </button>
      </div>

      {error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <div className="wage-table-container">
            <table className="wage-table1" aria-label="Driver Wages">
              <thead>
                <tr>
                  <th scope="col">Driver Name</th>
                  <th scope="col">Wage</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((driver) => (
                    <tr key={driver.userid}>
                      <td>
                        {driver.name} {driver.surname}
                      </td>
                      <td>
                        <button
                          onClick={() => handleViewClick(driver)}
                          className="view-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="text-center">
                      No drivers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

<div className="pagination-wrapper-fixed">
  <Pagination
    totalRecords={drivers.length}
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

export default FinanceClerkWage;