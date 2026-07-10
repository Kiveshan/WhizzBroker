"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const SubcontractorTable = ({
  subcontractors,
  loading,
  error,
  onEdit,
  onToggleStatus,
  onAdd,
  onDeleteDriver,
  onDeleteTruck,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  filters,
  onSearchChange,
  onStatusChange,
  onApplyFilters,
}) => {
  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
        <button className="manage-add-subcontractor-button" onClick={onAdd}>
          Add
        </button>
      </div>

      {/* Search Filter at the top */}
      <div className="table-filters">
        <SearchFilter
          searchValue={filters.search}
          onSearchChange={onSearchChange}
          statusValue={filters.status}
          onStatusChange={onStatusChange}
          onApplyFilters={onApplyFilters}
          placeholder="Search subcontractors by company, contact person, or driver name..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div className="table-content">
        {loading ? (
          <div className="loading">Loading subcontractors...</div>
        ) : (
          <div className="manage-subcontractor-table1">
            <table>
              <thead>
                <tr>
                  <th>Company Info</th>
                  <th>Contact Details</th>
                  <th>Drivers</th>
                  <th>Trucks</th>
                  <th>Counts</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No subcontractors found
                    </td>
                  </tr>
                ) : (
                  subcontractors.map((sub) => (
                    <tr key={sub.subei_reg_num || sub.min_userid}>
                      <td>
                        <div>
                          <strong>{sub.companyname}</strong>
                          <br />
                          <small style={{ color: "#666" }}>Reg: {sub.subei_reg_num}</small>
                          <br />
                          <small style={{ color: "#666" }}>{sub.location}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{sub.contact_person}</strong>
                          <br />
                          <small>{sub.cellnum}</small>
                          <br />
                          <small>{sub.email}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: "200px", fontSize: "13px" }}>{sub.driver_names || "No drivers"}</div>
                      </td>
                      <td>
                        <div style={{ maxWidth: "150px", fontSize: "13px" }}>
                          {sub.truck_registrations || "No trucks"}
                        </div>
                      </td>
                      <td>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              background: "#e3f2fd",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              marginBottom: "4px",
                            }}
                          >
                            👥 {sub.driver_count || 0}
                          </div>
                          <div
                            style={{
                              background: "#f3e5f5",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            🚛 {sub.truck_count || 0}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${sub.status ? "active" : "inactive"}`}>
                          {sub.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          <button
                            className="manage-edit-button"
                            onClick={() => onEdit(sub.min_userid)}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            Edit Company
                          </button>

                          <button
                            className={sub.status ? "manage-delete-button" : "manage-enable-button"}
                            onClick={() => onToggleStatus(sub.min_userid, sub.status)}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            {sub.status ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination at the bottom */}
      {!loading && (
        <div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </div>
      )}
    </div>
  )
}

export default SubcontractorTable
