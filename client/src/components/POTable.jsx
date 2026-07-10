"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../pages/Creditors/purchaseOrder/css/filterButtonBlue.css"
import api from "../api.js"
import Pagination from "../components/Pagination"

const POTable = ({ showFilterButtons = true }) => {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = currentDate.toLocaleString("default", { month: "long" })

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [activeFilter, setActiveFilter] = useState("All")
  const [activeStatusFilter, setActiveStatusFilter] = useState("All")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expenseTypes, setExpenseTypes] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const recordsPerPage = 2

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const endpoint = showFilterButtons ? "/api/purchase-orders" : "/api/supplier-summary"

      const response = await api.get(endpoint, {
        params: !showFilterButtons ? { year: selectedYear, month: selectedMonth } : {},
      })
      console.log("Response received:", response.data)
      const formattedData = showFilterButtons
        ? response.data.map((po) => ({
            type: po.expense_type,
            suppliedBy: po.supplier_name,
            date: formatDate(po.date),
            amount: formatAmount(po.total),
            details: po.ponum,
            id: po.ponum,
            status: po.status,
            lineItems: po.line_items,
          }))
        : response.data.map((row) => ({
            supplier: row.supplier,
            supplierId: row.supplier_id,
            monthYear: `${row.month_name.trim()} ${row.year}`,
            total: formatAmount(row.total_amount),
            rawMonth: row.month_name.trim(),
            rawYear: row.year.toString(),
            poNumber: row.ponum,
          }))

      setExpenses(formattedData)
      const uniqueTypes = [...new Set(response.data.map((po) => po.expense_type))]
      setExpenseTypes(uniqueTypes)
      setError(null)
    } catch (err) {
      console.error("Error fetching purchase orders:", err)
      console.error("Error details:", {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
      })
      setError(`Failed to load purchase orders. Status: ${err.response?.status || "Unknown"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [selectedYear, selectedMonth, showFilterButtons])

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`
  }

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === 0) return "N/A"
    return `R ${Number.parseFloat(amount).toFixed(2)}`
  }

  const openDeleteConfirm = (expense) => {
    setDeleteTarget(expense)
    setDeleteConfirmOpen(true)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeleteConfirmOpen(false)
    setDeleteTarget(null)
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget?.id) {
      closeDeleteConfirm()
      return
    }

    try {
      setDeleting(true)
      setError(null)
      await api.delete(`/api/purchase-orders/${encodeURIComponent(deleteTarget.id)}`)
      closeDeleteConfirm()
      await fetchPurchaseOrders()
    } catch (err) {
      console.error("Error deleting purchase order:", err)
      setError(err.message || "Failed to delete purchase order.")
    } finally {
      setDeleting(false)
    }
  }

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    setCurrentPage(1)
    setIsDropdownOpen(false)
  }

  const handleStatusFilterClick = (status) => {
    setActiveStatusFilter(status)
    setCurrentPage(1)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const getFilteredExpenses = () => {
    let filtered = expenses

    if (selectedYear !== "All") {
      filtered = filtered.filter((expense) =>
        showFilterButtons
          ? new Date(expense.date).getFullYear().toString() === selectedYear
          : expense.rawYear === selectedYear
      )
    }

    if (selectedMonth !== "All") {
      const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(selectedMonth)

      filtered = filtered.filter((expense) =>
        showFilterButtons
          ? new Date(expense.date).getMonth() === monthIndex
          : expense.rawMonth === selectedMonth
      )
    }

    if (activeFilter !== "All") {
      filtered = filtered.filter((expense) => expense.type === activeFilter)
    }

    if (activeStatusFilter !== "All") {
      filtered = filtered.filter((expense) => expense.status === activeStatusFilter)
    }

    return [...filtered].sort((a, b) => {
      const statusOrder = { Pending: 0, Submitted: 1 }
      const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
      if (statusDiff !== 0) return statusDiff
      return new Date(b.date) - new Date(a.date)
    })
  }

  const handleViewClick = async (expense) => {
    if (!showFilterButtons) {
      navigate("/Creditors/ViewStatement", {
        state: {
          supplierId: expense.supplierId,
          selectedYear: selectedYear !== "All" ? selectedYear : new Date().getFullYear().toString(),
          selectedMonth: selectedMonth !== "All" ? selectedMonth : new Date().toLocaleString("default", { month: "long" }),
        },
      })
      return
    }

    try {
      const response = await api.get(`/api/po-form/list`, {
        params: { ponum: expense.id },
      })

      if (response.data && response.data.length > 0) {
        const poData = response.data[0]
        navigate("/Creditors/PurchaseOrder/View", {
          state: { poData, supplierId: poData.supplier_id },
        })
      } else {
        console.error("No purchase order data found for PO number:", expense.id)
        setError("No purchase order data found.")
      }
    } catch (err) {
      console.error("Error fetching purchase order details:", err)
      setError("Failed to load purchase order details.")
    }
  }

  const navigate = useNavigate()

  const handleBackClick = () => {
    const userData = localStorage.getItem("user")
    let userRoleId = null
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData)
        userRoleId = parsedUserData.roleid
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error)
      }
    }
    if (!userRoleId) {
      userRoleId = localStorage.getItem("roleId") || localStorage.getItem("userRoleId")
      console.log("Direct role ID from localStorage:", userRoleId)
    }
    userRoleId = Number.parseInt(userRoleId, 10)
    console.log("Final user role ID for navigation:", userRoleId)

    if (userRoleId === 1 || userRoleId === 4) {
      navigate("/DirectorCreditorsOther")
    } else {
      navigate("/Creditors/CreditorsOther")
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-dropdown-container")) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 4; i <= currentYear + 1; i++) {
      years.push(i.toString())
    }
    return years
  }

  const handleRetry = () => {
    window.location.reload()
  }

  const filteredExpenses = getFilteredExpenses()
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / recordsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  return (
    <div className="client-payment-dashboard-wrapper">
      <div className="header-actions">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>
      <div className="dropdown-container74">
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value)
            setCurrentPage(1)
          }}
          className="dropdown"
        >
          <option value="All">All Years</option>
          {getYearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value)
            setCurrentPage(1)
          }}
          className="dropdown"
        >
          <option value="All">All Months</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
        </select>
      </div>

      {showFilterButtons && (
        <div className="button-group">
          <div className="filter-row">
            <span className="filter-label">Status:</span>
            <div className="filter-buttons filter-btn-group">
              {["All", "Pending", "Submitted"].map((s) => (
                <button
                  key={s}
                  className={activeStatusFilter === s ? "active" : ""}
                  onClick={() => handleStatusFilterClick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">Type:</span>
            <div className="filter-buttons filter-btn-group">
            <button
              className={activeFilter === "All" ? "active" : ""}
              onClick={() => handleFilterClick("All")}
            >
              All
            </button>

            <div className="filter-dropdown-container">
              <button className="dropdown-toggle-btn" onClick={toggleDropdown}>
                {activeFilter !== "All" ? activeFilter : "Filters"} {isDropdownOpen ? "▾" : "▸"}
              </button>

              {isDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {expenseTypes.map((type) => (
                    <button
                      key={type}
                      className={activeFilter === type ? "dropdown-item active" : "dropdown-item"}
                      onClick={() => handleFilterClick(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      <div className="content1" style={{ marginTop: "20px" }}>
        <div className="client-payment-container">
          {loading ? (
            <div className="loading">Loading purchase orders...</div>
          ) : error ? (
            <div className="error-message">
              {error}
              <br />
              <button onClick={handleRetry} style={{ marginTop: "10px" }}>
                Retry
              </button>
            </div>
          ) : (
            <>
              <table className="payment-table1">
                <thead>
                  <tr>
                    {showFilterButtons ? (
                      <>
                        <th>Type</th>
                        <th>Supplied By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Details</th>
                      </>
                    ) : (
                      <>
                        <th>Supplier</th>
                        <th>Month-Year</th>
                        <th>Total</th>
                        <th>Details</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={showFilterButtons ? "5" : "4"}>No expenses found</td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((expense, index) => (
                      <tr key={index}>
                        {showFilterButtons ? (
                          <>
                            <td>{expense.type}</td>
                            <td>{expense.suppliedBy}</td>
                            <td>{expense.date}</td>
                            <td>
                              <span className={`status-badge status-${expense.status?.toLowerCase()}`}>
                                {expense.status}
                              </span>
                            </td>
                            <td>{expense.amount}</td>
                            <td>
                              <button
                                className="view-button"
                                onClick={() => handleViewClick(expense)}
                                style={{ padding: "6px 12px" }}
                              >
                                View
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => openDeleteConfirm(expense)}
                                style={{ marginLeft: "10px", padding: "6px 12px" }}
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{expense.supplier}</td>
                            <td>{expense.monthYear}</td>
                            <td>{expense.total}</td>
                            <td>
                              <button
                                className="view-button"
                                onClick={() => handleViewClick(expense)}
                                style={{ padding: "6px 12px" }}
                              >
                                View
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination
                totalRecords={filteredExpenses.length}
                recordsPerPage={recordsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="popup-backdrop po-delete-popup" onClick={closeDeleteConfirm}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <p>
              Are you sure you want to delete this purchase order{deleteTarget?.id ? ` (${deleteTarget.id})` : ""}?
            </p>
            <div className="popup-buttons">
              <button className="cancel-button" onClick={closeDeleteConfirm} disabled={deleting}>
                No
              </button>
              <button className="confirm-button" onClick={handleDeleteConfirmed} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POTable