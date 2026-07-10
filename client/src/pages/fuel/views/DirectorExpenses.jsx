"use client";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api, { API_BASE_URL } from "../../../api"; // Import the configured Axios instance
import "../css/Expenses1.css";

const DirectorExpenses = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const truckId = params.truckId;

  // Get truck registration from location state or use default
  const truckRegNum = location.state?.truckRegNum || "Unknown Truck";
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!truckId) {
        setError("No truck ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching expenses for truck ID: ${truckId}`);
        const response = await api.get(`/expenses/truck/${truckId}`);

        if (!response.data) {
          throw new Error("No data received from server");
        }

        const data = response.data;
        console.log("Expense data:", data);

        // Filter by year and month if selected
        let filteredData = data;

        if (year !== "all") {
          filteredData = filteredData.filter((expense) => {
            const expenseDate = new Date(expense.slipuploaddate);
            return expenseDate.getFullYear() === Number.parseInt(year);
          });
        }

        if (month !== "all") {
          filteredData = filteredData.filter((expense) => {
            const expenseDate = new Date(expense.slipuploaddate);
            return expenseDate.getMonth() + 1 === Number.parseInt(month);
          });
        }

        setExpenses(filteredData);
      } catch (err) {
        console.error("Error fetching expense data:", err);
        setError("Failed to load expense data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [truckId, year, month]);

  const handleYearChange = (e) => {
    setYear(e.target.value);
  };

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Invalid date";
    }
  };

  // Handle viewing a document - get a fresh pre-signed URL if possible
  const handleViewDocument = async (expense) => {
    try {
      // If we have an expense ID, try to get a fresh pre-signed URL
      if (expense.ekey) {
        const response = await api.get(`/expenses/document/${expense.ekey}`);

        if (response.data.success && response.data.url) {
          // Open in new tab
          window.open(response.data.url, "_blank");
          return;
        }
      }

      // Fallback to using the stored URL
      if (expense.slipurl) {
        window.open(expense.slipurl, "_blank");
      } else if (expense.slipname) {
        const url = `${API_BASE_URL}/uploads/${expense.slipname}`;
        window.open(url, "_blank");
      } else {
        alert("No document available to view");
      }
    } catch (err) {
      console.error("Error viewing document:", err);
      alert("Error viewing document. Please try again.");
    }
  };
  const handleDownloadDocument = async (expense) => {
    try {
      // If we have an expense ID, try to get a fresh pre-signed URL
      if (expense.ekey) {
        const response = await api.get(`/expenses/document/${expense.ekey}`);

        if (response.data.success && response.data.url) {
          // Extract original filename from the URL or use the provided name
          let filename = expense.slipname;
          if (!filename && response.data.name) {
            filename = response.data.name;
          }
          if (!filename) {
            // Try to extract filename from URL if no name is provided
            const urlParts = response.data.url.split("/");
            const lastPart = urlParts[urlParts.length - 1];
            // Remove any query parameters
            filename = lastPart.split("?")[0];
          }

          // Fetch the file content first, then create a blob URL
          fetch(response.data.url)
            .then((res) => res.blob())
            .then((blob) => {
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = blobUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(blobUrl);
              document.body.removeChild(a);
            });
          return;
        }
      }

      // Fallback to using the stored URL
      if (expense.slipurl || expense.slipname) {
        const docUrl =
          expense.slipurl ||
          `${API_BASE_URL}/uploads/${expense.slipname}`;
        const filename = expense.slipname || "document";

        // Fetch the file content first, then create a blob URL
        fetch(docUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
          });
      } else {
        alert("No document available to download");
      }
    } catch (err) {
      console.error("Error downloading document:", err);
      alert("Error downloading document. Please try again.");
    }
  };

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button
          className="back-button"
          onClick={() => navigate("/DirectorManagerViewFuelExpense")}
        >
          Back
        </button>
      </div>

      {/* Centered title - properly positioned above the filters */}
      <h2
        style={{
          textAlign: "center",
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "6.5rem",
        }}
      >
        Expenses for {truckRegNum}
      </h2>

      <div className="action-bar">
        <div
          className="filter-section7"
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div
            className="dropdown-container"
            style={{ display: "flex", gap: "10px" }}
          >
            <select
              className="dropdown"
              value={year}
              onChange={handleYearChange}
            >
              <option value="all">All Years</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <select
              className="dropdown"
              value={month}
              onChange={handleMonthChange}
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading expenses...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <table className="expenses-table2">
          <thead>
            <tr>
              <th>Expense Cost</th>
              <th>Document by</th>
              <th>Date</th>
              <th>Display</th>
              <th>Slip</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? (
              expenses.map((expense, index) => (
                <tr key={expense.ekey || index}>
                  <td>
                    R{" "}
                    {typeof expense.expensecost === "number"
                      ? expense.expensecost.toFixed(2)
                      : expense.expensecost}
                  </td>
                  <td>{expense.documentfrom}</td>
                  <td>{formatDate(expense.slipuploaddate)}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => handleViewDocument(expense)}
                      disabled={!expense.slipurl && !expense.slipname}
                    >
                      View
                    </button>
                  </td>
                  <td>
                    {expense.slipurl || expense.slipname ? (
                      <button
                        className="download-button"
                        onClick={() => handleDownloadDocument(expense)}
                      >
                        Download
                      </button>
                    ) : (
                      <span>No slip</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  No expenses found for this truck
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Full Screen Image/Document Viewer */}
      {viewerOpen && (
        <div className="fullscreen-viewer">
          <div className="viewer-header">
            <button
              className="close-button"
              onClick={() => setViewerOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="viewer-content">
            {viewerUrl.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewerUrl} title="PDF Viewer" />
            ) : (
              <img
                src={viewerUrl || "/placeholder.svg"}
                alt="Expense Document"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorExpenses;
