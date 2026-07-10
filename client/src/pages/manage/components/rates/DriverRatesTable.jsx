"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const DriverRatesTable = ({
  driverRates,
  loading,
  error,
  onEdit,
  onDelete,
  onAdd,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  filters,
  onSearchChange,
  onApplyFilters,
}) => {
  const handleDeleteClick = async (route) => {
    await onDelete(route.startingpoint, route.destination)
  }

  const formatDate = (val) => {
    if (!val) return "—"
    const d = val.toString().split("T")[0]
    const [y, m, day] = d.split("-")
    return `${day}/${m}/${y}`
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
        <button className="manage-add-driver-rate-button" onClick={onAdd}>
          New Route
        </button>
      </div>

      <SearchFilter
        searchValue={filters.search}
        onSearchChange={onSearchChange}
        onApplyFilters={onApplyFilters}
        showStatusFilter={false}
        placeholder="Search routes by starting point or destination..."
        loading={loading}
      />

      {loading ? (
        <div className="loading">Loading driver rates...</div>
      ) : (
        <>
          <div className="manage-DriverRates-table1">
            <table>
              <thead>
                <tr>
                  <th>Starting Point</th>
                  <th>Destination</th>
                  <th>Periods</th>
                  <th>Latest From</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {driverRates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No driver rates found
                    </td>
                  </tr>
                ) : (
                  driverRates.map((route) => (
                    <tr key={`${route.startingpoint}||${route.destination}`}>
                      <td>
                        <strong style={{ color: "#2c3e50" }}>{route.startingpoint}</strong>
                      </td>
                      <td>
                        <span style={{ color: "#6b7280", marginRight: "6px", fontSize: "0.85em" }}>→</span>
                        <strong style={{ color: "#2c3e50" }}>{route.destination}</strong>
                      </td>
                      <td>
                        <span className="drf-period-badge">
                          {route.period_count} {Number(route.period_count) === 1 ? "period" : "periods"}
                        </span>
                      </td>
                      <td style={{ color: "#6b7280", fontSize: "0.9em" }}>{formatDate(route.latest_from)}</td>
                      <td>
                        <button
                          className="manage-edit-button"
                          onClick={() => onEdit(route.startingpoint, route.destination)}
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          className="manage-delete-button"
                          onClick={() => handleDeleteClick(route)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </>
      )}
    </div>
  )
}

export default DriverRatesTable
