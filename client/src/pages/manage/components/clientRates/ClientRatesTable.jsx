"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const ClientRatesTable = ({
  clients,
  loading,
  error,
  onEditRates,
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
    <div >
      {/* Search Filter at the top */}
      <div className="table-filters">
        <SearchFilter
          searchValue={filters.search}
          onSearchChange={onSearchChange}
          statusValue={filters.status}
          onStatusChange={onStatusChange}
          onApplyFilters={onApplyFilters}
          placeholder="Search clients by name, email, or representative..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div className="table-content">
        {loading ? (
          <div className="loading">Loading clients...</div>
        ) : (
          <div className="manage-clients-table1">
            <table>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Representative</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.m5clientkey}>
                      <td>
                        <strong>{client.client}</strong>
                      </td>
                      <td>{client.representative}</td>
                      <td>{client.email}</td>
                      <td>{client.companyaddress || "N/A"}</td>
                      <td>
                        <span className="rate-count-badge">
                          {client.rate_count || 0} rate{(client.rate_count || 0) !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${client.status ? "active" : "inactive"}`}>
                          {client.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="manage-view-button"
                          onClick={() => onEditRates(client.m5clientkey)}
                          disabled={!client.status}
                        >
                          Edit Rates
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

export default ClientRatesTable
