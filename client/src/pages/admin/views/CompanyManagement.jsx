"use client";

import { useState, useEffect } from "react";
import api from "../../../api.js"; // Import the Axios instance
import "../css/CompanyManagement.css";

function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/company-list");
      setCompanies(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (company_reg_num, currentStatus) => {
    try {
      const endpoint =
        currentStatus === "active"
          ? "/api/company/deactivate"
          : "/api/company/reactivate";
      await api.post(endpoint, { company_reg_num });
      // Refresh the company list
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading companies...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="company-management">
      <h2>Company Management</h2>

      {companies.length === 0 ? (
        <div className="no-companies">No companies found</div>
      ) : (
        <table className="companies-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Registration Number</th>
              <th>Business Manager</th>
              <th>Employees</th>
              <th>Status</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.company_reg_num}
                className={company.status === "inactive" ? "disabled-row" : ""}
              >
                <td>{company.companyname}</td>
                <td>{company.company_reg_num}</td>
                <td>
                  {company.name} {company.surname}
                </td>
                <td>{company.total_count}</td>
                <td>
                  <span className={`status-badge ${company.status}`}>
                    {company.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{new Date(company.dateofreg).toLocaleDateString()}</td>
                <td>
                  <button
                    className={
                      company.status === "active"
                        ? "disable-button"
                        : "enable-button"
                    }
                    onClick={() =>
                      toggleCompanyStatus(
                        company.company_reg_num,
                        company.status
                      )
                    }
                  >
                    {company.status === "active" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CompanyManagement;
