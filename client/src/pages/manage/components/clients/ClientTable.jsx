"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const ClientTable = ({
  clients,
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

  return (
    <div>
      <div>
        
        <button className="manage-add-client-button" onClick={onAdd}>
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
          placeholder="Search clients by name, email, or company..."
          loading={loading}
        />
      </div>

      {/* Table Content */}
      <div>
        {loading ? (
          <div className="loading">Loading clients...</div>
        ) : (
          <div className="manage-clients-table1">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Representative</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Enable / Disable</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.m5clientkey}>
                      <td>{client.client}</td>
                      <td>{client.representative}</td>
                      <td>{client.email}</td>
                      <td>{client.city}</td>
                      <td>
                        <span className={`status-badge ${client.status ? "active" : "inactive"}`}>
                          {client.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button className="manage-view-button" onClick={() => onEdit(client.m5clientkey)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className={client.status ? "manage-delete-button" : "manage-enable-button"}
                          onClick={() => onToggleStatus(client.m5clientkey, client.status)}
                        >
                          {client.status ? "Disable" : "Enable"}
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

export default ClientTable
