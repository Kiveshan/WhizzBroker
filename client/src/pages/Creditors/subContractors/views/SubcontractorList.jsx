"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api";
import "../css/SubcontractorList.css";
import Pagination from "../../../../components/Pagination";

const SubcontractorList = () => {
  const navigate = useNavigate();
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);

  // Handle pagination
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  useEffect(() => {
    const fetchSubcontractors = async () => {
      try {
        setLoading(true);
        const response = await api.get("/subcontractor");
        if (!response.data) throw new Error("Failed to fetch subcontractors");
        const data = response.data;

        // Transform API data to match the expected structure
        const transformedSubcontractors = data.map((item, index) => ({
          id: `SC${String(item.min_userid).padStart(3, "0")}`,
          companyName: item.companyname,
          contactPerson: item.contact_person,
          email: item.email,
          phone: item.cellnum,
          subei_reg_num: item.subei_reg_num,
        }));
        setSubcontractors(transformedSubcontractors);
      } catch (err) {
        console.error("Error fetching subcontractors:", err);
        setError("Failed to fetch subcontractors");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcontractors();
  }, []);

  // Calculate pagination data
  const totalRecords = subcontractors.length;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentSubcontractors = subcontractors.slice(startIndex, endIndex);

  return (
    <div className="subcontractor-list-wrapper">
      {/* Back Button */}
      <div className="subcontractor-header">
        <button
          className="back-button"
          onClick={() => {
            if (roleId == 8) {
              navigate("/CreditorsDashboard", {});
            } else if (roleId == 1) {
              navigate("/DirectorCreditorsDash", {});
            } else if (roleId == 4) {
              navigate("/DirectorCreditorsDash", {});
            }
          }}
        >
          Back
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <p>Loading subcontractors...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="subcontractor-table-container">
          <table className="subcontractor-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSubcontractors.map((subcontractor) => (
                <tr key={subcontractor.id}>
                  <td>{subcontractor.companyName}</td>
                  <td>{subcontractor.contactPerson}</td>
                  <td>{subcontractor.email}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() =>
                        navigate("/Creditors/SubcontractorStatements", {
                          state: {
                            subcontractorId: subcontractor.id,
                            subcontractorName: subcontractor.companyName,
                            subei_reg_num: subcontractor.subei_reg_num,
                          },
                        })
                      }
                    >
                      View Statements
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

export default SubcontractorList;
