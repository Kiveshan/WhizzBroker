"use client";
import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api"; // Import the configured Axios instance
import "../css/Expenses1.css";

const ExpenseSubmission = ({ onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const truckId = location.state?.truckId;
  const truckRegNum = location.state?.truckRegNum;
  const ponum = location.state?.ponum || "";
  // Ensure expenseType is parsed as a number
  const expenseType = Number(location.state?.expenseType) || null;

  const [formData, setFormData] = useState({
    expenseCost: "0",
    orderno: "",
    invoiceNumber: "", // Add invoice number field
    vat: "", // Add VAT field
    ...(expenseType === 5 ? { documentFrom: "Controller", driverName: "", driverFullName: "" } : {}),
  });

  const [file, setFile] = useState(null);
  const [driverOptions, setDriverOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    if (!ponum) {
      setSubmitMessage("Error: Missing required purchase order number. Redirecting...");
      setTimeout(() => navigate("/Creditors/PurchaseOrders"), 2000);
    }
  }, [truckId, ponum, navigate]);
  useEffect(() => {
    if (ponum) {
      setFormData((prev) => ({ ...prev, orderno: ponum }));
    }
  }, [ponum]);

  useEffect(() => {
    if (expenseType === 5) {
      const fetchDrivers = async () => {
        try {
          const response = await api.get("/employees/drivers");
          if (!response.data) {
            throw new Error("Failed to fetch drivers");
          }
          const data = response.data;
          console.log("Drivers from backend:", data);
          const options = data.map((driver) => ({
            value: driver.userid,
            label: `${driver.name} ${driver.surname}`,
            fullName: `${driver.name} ${driver.surname}`,
          }));
          setDriverOptions(options);
        } catch (error) {
          console.error("Error fetching drivers:", error);
        }
      };
      fetchDrivers();
    }
  }, [expenseType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (expenseType === 5 && name === "documentFrom" && value !== "Driver") {
      setFormData((prev) => ({
        ...prev,
        driverName: "",
        driverFullName: "",
      }));
    }
  };

  const handleDriverChange = (selectedOption) => {
    setFormData({
      ...formData,
      driverName: selectedOption ? selectedOption.value : "",
      driverFullName: selectedOption ? selectedOption.fullName : "",
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting || uploadProgress === 100) return;
    submittingRef.current = true;

    setIsSubmitting(true);
    setSubmitMessage("");
    setUploadProgress(0);
    if (expenseType === 5 && !truckId) {
      setSubmitMessage("Error: No truck selected for fuel expense");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }


    if (expenseType === 5 && formData.documentFrom === "Driver" && !formData.driverName) {
      setSubmitMessage("Error: Please select a driver");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }

    if (!file) {
      setSubmitMessage("Error: Please upload a petrol slip");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }

    if (!formData.orderno) {
      setSubmitMessage("Error: Please enter an order number");
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }

    try {
      const formDataToSend = new FormData();
      if (expenseType === 5) {
        formDataToSend.append("documentFrom", formData.documentFrom);
      }
      formDataToSend.append("expenseCost", formData.expenseCost);
      if (truckId) {
        formDataToSend.append("truckId", truckId);
      }
      if (ponum) {
        formDataToSend.append("ponum", ponum);
      }
      formDataToSend.append("invoiceNumber", formData.invoiceNumber);
      if (formData.vat) {
        formDataToSend.append("vat", formData.vat);
      }
      if (truckRegNum) {
        formDataToSend.append("truckRegNum", truckRegNum);
      }
      if (expenseType) {
        formDataToSend.append("expenseType", expenseType);
      }
      if (file) formDataToSend.append("slip", file);
      formDataToSend.append("orderno", formData.orderno);
      if (expenseType === 5 && formData.documentFrom === "Driver" && formData.driverName) {
        formDataToSend.append("driverId", formData.driverName);
      }

      setUploadProgress(10);
      setTimeout(() => setUploadProgress(30), 300);
      setTimeout(() => setUploadProgress(50), 600);

      console.log("Sending expense data to server with S3 upload...");
      const response = await api.post("/api/po-form/upload-slip", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setUploadProgress(80);
      setTimeout(() => setUploadProgress(100), 200);

      console.log("Upload response:", response.data);

      if (response.data.success) {
        setSubmitMessage("Expense submitted successfully!");

        // Redirect back to ViewPOForm after 2 seconds
        setTimeout(() => {
          // Fetch the complete PO data before navigating back
          const fetchPODataAndNavigate = async () => {
            try {
              const response = await api.get(`/api/po-form/details/${ponum}`);
              const completePOData = response.data;

              navigate("/Creditors/PurchaseOrder/View", {
                state: {
                  poData: completePOData,
                  truckId: truckId,
                  truckRegNum: truckRegNum,
                  uploadSuccess: true
                }
              });
            } catch (error) {
              console.error('Error fetching PO data for navigation:', error);
              // Fallback navigation with minimal data
              navigate("/Creditors/PurchaseOrder/View", {
                state: {
                  poData: {
                    ponum: ponum,
                    expense: expenseType === 5 ? "Fuel" : "Other"
                  },
                  truckId: truckId,
                  truckRegNum: truckRegNum,
                  uploadSuccess: true
                }
              });
            }
          };

          fetchPODataAndNavigate();
        }, 2000);
      } else {
        setSubmitMessage("Error: Failed to submit expense");
      }

      // Rest of the submit logic remains unchanged
    } catch (error) {
      console.error("Error submitting expense:", error);
      setSubmitMessage(`Error: ${error.message}`);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };
  const handleCancel = () => {
    setFile(null);
    setFilePreview(null);
  };

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <h2 className="expense-title">
        {truckRegNum && `Add Expense for ${truckRegNum}`}
      </h2>

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-card">
          <div className="form-grid">
            {expenseType === 5 && (
              <div className="form-field">
                <label htmlFor="documentFrom">Document From</label>
                <select
                  id="documentFrom"
                  name="documentFrom"
                  value={formData.documentFrom || "Controller"}
                  onChange={handleInputChange}
                  className="dropdown"
                >
                  <option value="Controller">Controller</option>
                  <option value="Driver">Driver</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            )}

            {expenseType === 5 && formData.documentFrom === "Driver" && (
              <div className="form-field driver-field">
                <label htmlFor="driverSelect">Driver Name</label>
                <Select
                  inputId="driverSelect"
                  options={driverOptions}
                  onChange={handleDriverChange}
                  isSearchable
                  placeholder="Select a driver"
                  className="driver-select"
                  classNamePrefix="driver-select"
                />
                {formData.driverFullName && (
                  <div className="driver-info">
                    Selected: {formData.driverFullName}
                  </div>
                )}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="invoiceNumber">Invoice Number</label>
              <input
                id="invoiceNumber"
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleInputChange}
                placeholder="Enter invoice number"
              />
            </div>

            <div className="form-field">
              <label htmlFor="orderno">Purchase Order Number</label>
              <input
                id="orderno"
                type="text"
                name="orderno"
                value={ponum}
                // onChange={handleInputChange}
                // placeholder="Enter order number"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="expenseCost">Expense Cost (Excl. VAT)</label>
              <div className="currency-field">
                <span>R</span>
                <input
                  id="expenseCost"
                  type="text"
                  name="expenseCost"
                  value={formData.expenseCost.replace(/^R/, "")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    setFormData({
                      ...formData,
                      expenseCost: value,
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="vat">Input VAT</label>
              <div className="currency-field">
                <span>R</span>
                <input
                  id="vat"
                  type="text"
                  name="vat"
                  value={formData.vat.replace(/^R/, "")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    // Ensure only 2 decimal places
                    const parts = value.split(".");
                    if (parts.length > 2) {
                      parts.pop();
                    }
                    if (parts[1] && parts[1].length > 2) {
                      parts[1] = parts[1].substring(0, 2);
                    }
                    const formattedValue = parts.join(".");
                    setFormData({
                      ...formData,
                      vat: formattedValue,
                    });
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>


          </div>

          <div className="upload-section">
            <label>Slip</label>

            {!file ? (
              <div
                className="upload-area"
                onClick={() => document.getElementById("file-upload").click()}
              >
                <div className="upload-content">
                  <svg className="upload-icon" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                  </svg>
                  <div className="upload-text">
                    <p>Click to upload or drag and drop</p>
                    <p className="upload-hint">PNG, JPG or PDF (max 50MB)</p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
            ) : (
              <div className="file-preview-box">
                <div className="file-info">
                  {file.type.startsWith("image/") ? (
                    <svg className="file-type-icon" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  ) : (
                    <svg className="file-type-icon" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                  <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={handleCancel}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>

                {filePreview && (
                  <div className="image-preview">
                    <img
                      src={filePreview || "/placeholder.svg"}
                      alt="Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          {submitMessage && (
            <div
              className={`message ${submitMessage.includes("Error") ? "error" : "success"
                }`}
            >
              {submitMessage}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting || uploadProgress === 100}
            >
              {isSubmitting ? "Uploading..." : uploadProgress === 100 ? "Submitted" : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExpenseSubmission;
