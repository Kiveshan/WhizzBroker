"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import Pagination from "../../../components/Pagination"; // Import the Pagination component
import "../css/AddOnList.css";

const AddOnList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId, clientName } = location.state || {};

  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString(),
  });
  const [bookingRefSearch, setBookingRefSearch] = useState("");
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helper function to handle token expiration
  const handleTokenExpiration = (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
      return true;
    }
    return false;
  };

  const monthNames = [
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
  ];

  const minYear = 2025;
  const maxYear = currentDate.getFullYear() + 2;
  const yearOptions = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  useEffect(() => {
    if (!clientId) {
      setError("No client selected");
      setLoading(false);
      return;
    }

    const fetchAddOns = async () => {
      try {
        setLoading(true);
        const url = new URL(
          `/api/addons/client/${clientId}`,
          window.location.origin
        );
        if (filters.year) url.searchParams.append("year", filters.year);
        if (filters.month) url.searchParams.append("month", filters.month);

        const response = await api.get(url.toString(), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.data.success) {
          setAddOns(
            [...response.data.data].sort((a, b) =>
              String(a.invoice_number).localeCompare(String(b.invoice_number), undefined, { numeric: true, sensitivity: "base" })
            )
          );
          setCurrentPage(1);
        } else {
          throw new Error(response.data.message || "Failed to fetch add-ons");
        }
      } catch (err) {
        console.error("Error fetching add-ons:", err);
        if (handleTokenExpiration(err)) {
          return;
        }
        setError(err.message || "An error occurred while fetching add-ons");
      } finally {
        setLoading(false);
      }
    };

    fetchAddOns();
  }, [clientId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "Year" || value === "Month" ? "" : value,
    }));
    setBookingRefSearch("");
  };

  const handleCreateAddOn = () => {
    navigate(`/add-on-form`, {
      state: { clientId, clientName },
    });
  };

  const handleBack = () => {
    navigate("/view-client-list");
  };

  const handleViewAddOn = (addonId) => {
    navigate(`/add-on-form`, {
      state: { clientId, clientName, addonId },
    });
  };

  const handleDeleteAddon = async () => {
    if (!addonToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await api.delete(`/api/addons/${addonToDelete}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        setAddOns(addOns.filter((addon) => addon.addon_id !== addonToDelete));
        setShowDeleteConfirm(false);
        setAddonToDelete(null);
      } else {
        throw new Error(response.data.message || "Failed to delete add-on");
      }
    } catch (err) {
      console.error("Error deleting add-on:", err);
      if (handleTokenExpiration(err)) {
        return;
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred while deleting the add-on"
      );
      setShowDeleteConfirm(false);
      setAddonToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="add-on-list-wrapper">
        <div>Loading add-ons...</div>
      </div>
    );
  if (error)
    return (
      <div className="add-on-list-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!clientId)
    return (
      <div className="add-on-list-wrapper">
        <div>Please select a client from the previous page.</div>
      </div>
    );

  const filteredAddOns = bookingRefSearch.trim()
    ? addOns.filter((a) =>
        String(a.booking_ref ?? "").toLowerCase().includes(bookingRefSearch.trim().toLowerCase())
      )
    : addOns;

  return (
    <div className="add-on-list-wrapper">
      <div className="client-payment-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>
        <div className="action-bar">
          <div className="filter-section46">
            <div className="dropdown-container">
              <select
                name="year"
                className="dropdown"
                value={filters.year}
                onChange={handleFilterChange}
              >
                <option>Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                name="month"
                className="dropdown"
                value={filters.month}
                onChange={handleFilterChange}
              >
                <option>Month</option>
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="dropdown"
                placeholder="Search booking ref..."
                value={bookingRefSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setBookingRefSearch(value);
                  setCurrentPage(1);
                  // When searching, clear the month/year filters so the
                  // search runs across all add-ons for this client.
                  if (value.trim()) {
                    setFilters((prev) =>
                      prev.year || prev.month
                        ? { ...prev, year: "", month: "" }
                        : prev
                    );
                  }
                }}
                style={{
                  backgroundImage: "none",
                  paddingRight: "12px",
                  width: "220px",
                  cursor: "text",
                }}
              />
            </div>
          </div>
        </div>
        <table className="payment-table1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Invoice Number</th>
              <th>Booking Ref</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAddOns
              .slice(
                (currentPage - 1) * recordsPerPage,
                currentPage * recordsPerPage
              )
              .map((addon, index) => (
                <tr key={addon.addon_id || index}>
                  <td>{new Date(addon.date).toLocaleDateString()}</td>
                  <td>R{addon.amount.toLocaleString()}</td>
                  <td>{addon.invoice_number}</td>
                  <td>{addon.booking_ref}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleViewAddOn(addon.addon_id)}
                    >
                      View
                    </button>
                    <button
                      className="view-button"
                      onClick={() => {
                        setAddonToDelete(addon.addon_id);
                        setShowDeleteConfirm(true);
                      }}
                      style={{ backgroundColor: "#dc3545", marginLeft: "5px" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            {filteredAddOns.length === 0 && (
              <tr>
                <td colSpan="5" className="p-3 text-center">
                  No add-ons found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {roleId == 3 && (
          <div
            className="upload-section"
            style={{ marginTop: "20px", textAlign: "center" }}
          >
            <button className="upload-button" onClick={handleCreateAddOn}>
              Create Add-On
            </button>
          </div>
        )}
        <Pagination
          totalRecords={filteredAddOns.length}
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        {showDeleteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              textAlign: "center",
            }}>
              <h2 style={{ marginTop: 0, color: "#333" }}>Delete Add-On?</h2>
              <p style={{ color: "#666", marginBottom: "30px" }}>
                Are you sure you want to delete this add-on? This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setAddonToDelete(null);
                  }}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAddon}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddOnList;
