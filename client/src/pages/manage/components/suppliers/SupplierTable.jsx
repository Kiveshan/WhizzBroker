
"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const SupplierTable = ({
  suppliers,
  loading,
  error,
  onEdit,
  onToggleStatus,
  onAdd,
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

  // Handle toggle status with error logging
  const handleToggleStatus = async (supplierId) => {
    try {
      await onToggleStatus(supplierId);
    } catch (err) {
      console.error("Failed to toggle supplier status:", err);
      alert("Failed to toggle supplier status. Please try again.");
    }
  };

  return (
    <div>
      <div>
        <button className="manage-add-employee-button" onClick={onAdd}>
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
          placeholder="Search suppliers by name, email, or representative..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div>
        {loading ? (
          <div className="loading">Loading suppliers...</div>
        ) : (
          <div className="manage-employees-table1">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Representative</th>
                  <th>Contact</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.supplier_id}>
                      <td>
                        <div>
                          <div>{supplier.supplier}</div>
                          {supplier.vatregno && (
                            <div style={{ fontSize: "0.8em", color: "#666" }}>
                              VAT: {supplier.vatregno}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            supplier.status ? "active" : "inactive"
                          }`}
                        >
                          {supplier.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{supplier.representative || "N/A"}</td>
                      <td>
                        <div>
                          {supplier.email && <div>{supplier.email}</div>}
                          {supplier.cellnum && (
                            <div style={{ fontSize: "0.8em", color: "#666" }}>
                              {supplier.cellnum}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td>
                        <button
                          className="manage-view-button"
                          onClick={() => onEdit(supplier.supplier_id)}
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className={
                            supplier.status
                              ? "manage-delete-button"
                              : "manage-enable-button"
                          }
                          onClick={() => handleToggleStatus(supplier.supplier_id)}
                        >
                          {supplier.status ? "Disable" : "Enable"}
                        </button>
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
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      )}
    </div>
  );
};

export default SupplierTable;