"use client"

import Pagination from "../common/Pagination"
import SearchFilter from "../common/SearchFilter"

const ExpenseTypeTable = ({
  expenseTypes = [],
  loading = false,
  error = null,
  onEdit = () => {},
  onDelete = () => {},
  onAdd = () => {},
  pagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
  onPageChange = () => {},
  onItemsPerPageChange = () => {},
  filters = { search: "" },
  onSearchChange = () => {},
  onApplyFilters = () => {},
}) => {
  const handleAdd = () => {
    console.log("Add expense type button clicked")
    onAdd()
  }

  const handleEdit = (expenseType) => {
    console.log("Edit expense type:", expenseType)
    if (expenseType && expenseType.id) {
      onEdit(expenseType.id)
    } else {
      console.error("Invalid expense type data for edit:", expenseType)
    }
  }

  const handleDelete = (expenseType) => {
    console.log("Delete expense type:", expenseType)
    if (expenseType && expenseType.id) {
      if (window.confirm(`Are you sure you want to delete "${expenseType.expense}"?`)) {
        onDelete(expenseType.id)
      }
    } else {
      console.error("Invalid expense type data for delete:", expenseType)
    }
  }

  // Ensure expenseTypes is always an array and sort by ID in ascending order
  const safeExpenseTypes = Array.isArray(expenseTypes) 
    ? [...expenseTypes].sort((a, b) => a.id - b.id) 
    : []

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div>
        <button className="manage-add-employee-button" onClick={handleAdd}>
          Add
        </button>
      </div>

      {/* Table Content */}
      <div>
        {loading ? (
          <div className="loading">Loading expense types...</div>
        ) : (
          <div className="manage-employees-table1">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Expense Type</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {safeExpenseTypes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">
                      No expense types found
                    </td>
                  </tr>
                ) : (
                  safeExpenseTypes.map((expenseType) => (
                    <tr key={expenseType.id}>
                      <td>
                        <div>{expenseType.id}</div>
                      </td>
                      <td>
                        <div>{expenseType.expense || "N/A"}</div>
                      </td>
                      <td>
                        <button className="manage-view-button" onClick={() => handleEdit(expenseType)}>
                          Edit
                        </button>
                      </td>
                      <td>
                        {expenseType.expense && expenseType.expense.toLowerCase() !== "fuel" && (
                          <button className="manage-delete-button" onClick={() => handleDelete(expenseType)}>
                            Delete
                          </button>
                        )}
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
  )
}

export default ExpenseTypeTable