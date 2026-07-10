"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../../api.js";
import "./css/CreditNoteForm.css";
import Select from "react-select";

const CreditNoteForm = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clientId, clientName, month, year } = state || {};

  const [formData, setFormData] = useState({
    accountNo: "",
    documentNo: "",
    documentDate: "",
    instructionNo: "",
    vessel: "",
    destination: "",
    refNo: "",
    items: [{ description: "", containerNumber: "", total: "" }],
    subTotal: "",
    vat: "",
    totalAmount: "",
    vatRate: 0.15, // Default VAT rate, will be updated by instruction
  });
  const [companyDetails, setCompanyDetails] = useState({
    companyname: "",
    company_reg_num: "",
    address: "",
    cluster_box: "",
    email: "",
    cell_num: "",
    cell_num2: "",
    name_of_acc: "",
    bank: "",
    account_num: "",
    branch: "",
    branch_code: "",
  });
  const [companyError, setCompanyError] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientDetails, setClientDetails] = useState({});
  const [clientError, setClientError] = useState(null);
  const [containers, setContainers] = useState([]);
  const [instructions, setInstructions] = useState([]);

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        if (clientId) {
          const response = await api.get(`/clients/${clientId}`);
          setClientDetails(response.data.data || {});
        }
      } catch (err) {
        setClientError("Failed to fetch client details");
        console.error("Error fetching client details:", err);
      }
    };

    const fetchCompanyDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/company/ksm");
        const data = response.data.data || {};
        setCompanyDetails({
          companyname: data.companyname || "",
          company_reg_num: data.company_reg_num || "",
          address: data.cluster_box ? `${data.address || ""}, ${data.cluster_box}` : data.address || "",
          email: data.email || "",
          cell_num: data.cell_num || "",
          cell_num2: data.cell_num2 || "",
          name_of_acc: data.name_of_acc || "",
          bank: data.bank || "",
          account_num: data.account_num || "",
          branch: data.branch || "",
          branch_code: data.branch_code || "",
        });
      } catch (err) {
        setCompanyError("Failed to fetch company details");
        console.error("Error fetching company details:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchInstructions = async () => {
      try {
        if (clientId) {
          const response = await api.get(`/api/credit-notes/instructions/${clientId}`);
          setInstructions(response.data.data || []);
        }
      } catch (err) {
        setError("Failed to fetch instructions");
        console.error("Error fetching instructions:", err);
      }
    };

    const fetchLatestDocumentNumber = async () => {
      try {
        const response = await api.get("/api/latest-document-number");
        setFormData((prev) => ({
          ...prev,
          documentNo: response.data.data || "CR-1",
        }));
      } catch (err) {
        setError("Failed to fetch latest document number");
        console.error("Error fetching latest document number:", err);
        setFormData((prev) => ({
          ...prev,
          documentNo: "CR-1", // Fallback if API fails
        }));
      }
    };

    fetchClientDetails();
    fetchCompanyDetails();
    fetchInstructions();
    fetchLatestDocumentNumber();
  }, [clientId]);

  useEffect(() => {
    const fetchInstructionDetails = async () => {
      console.log("Fetching instruction details for instructionNo:", formData.instructionNo);
      if (formData.instructionNo) {
        try {
          const response = await api.get(`/api/instruction-details/${formData.instructionNo}`);
          const { dropoff, vessel_name, clientFileRef, vat } = response.data.data || {};
          console.log("Fetched instruction details:", { dropoff, vessel_name, clientFileRef, vat });
          setFormData((prev) => ({
            ...prev,
            destination: dropoff || "",
            vessel: vessel_name || "",
            refNo: clientFileRef || "",
            vatRate: vat != null ? vat / 100 : 0.15, // Convert percentage to decimal, default to 0.15 if null
          }));
        } catch (err) {
          console.error("Error fetching instruction details:", err);
          setError("Failed to fetch instruction details");
          setFormData((prev) => ({
            ...prev,
            vatRate: 0.15, // Fallback to 15% if fetch fails
          }));
        }

        try {
          const response = await api.get(`/api/containers/${formData.instructionNo}`);
          console.log("Fetched containers:", response.data.data);
          setContainers(response.data.data || []);
        } catch (err) {
          console.error("Error fetching containers:", err);
          setError("Failed to fetch containers");
        }
      } else {
        console.log("Clearing instruction details due to no instructionNo");
        setContainers([]);
        setFormData((prev) => ({
          ...prev,
          destination: "",
          vessel: "",
          refNo: "",
          vatRate: 0.15, // Reset to default when no instruction is selected
          items: prev.items.map((item) => ({ ...item, containerNumber: "" })),
        }));
      }
    };

    fetchInstructionDetails();
  }, [formData.instructionNo]);

  useEffect(() => {
    const calculateTotals = () => {
      const subTotal = formData.items.reduce((sum, item) => {
        const total = parseFloat(item.total) || 0;
        return sum + total;
      }, 0);

      const vat = subTotal * formData.vatRate; // Use dynamic VAT rate
      const totalAmount = subTotal + vat;

      setFormData((prev) => ({
        ...prev,
        subTotal: subTotal.toFixed(2),
        vat: vat.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      }));
    };

    calculateTotals();
  }, [formData.items, formData.vatRate]);

  const handleBack = () => {
    navigate("/credit-note-list", {
      state: { clientId, clientName },
    });
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id.includes("-")) {
      const [field, index] = id.split("-");
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === parseInt(index) ? { ...item, [field]: value } : item
        ),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleAddRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", containerNumber: "", total: "" }],
    }));
  };

  const handleDeleteRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const amounts = formData.items.map((item) => parseFloat(item.total) || 0);
      const containerIds = formData.items
        .map((item) => {
          const container = containers.find((c) => c.containernum === item.containerNumber);
          if (!container) {
            console.warn(`No container found for containerNumber: ${item.containerNumber}`);
            return null;
          }
          return parseInt(container.containerkey);
        })
        .filter((id) => id !== null);
      const descriptions = formData.items.map((item) => item.description).join('\n');

      const creditNoteData = {
        client_id: clientId,
        creditnote_date: formData.documentDate || new Date().toISOString().split('T')[0],
        amount: amounts,
        containerids: containerIds,
        doc_no: formData.documentNo,
        m1key: formData.instructionNo,
        description: descriptions,
        account_no: formData.accountNo,
      };
      console.log("Sending creditNoteData to API:", creditNoteData);

      const response = await api.post("/api/credit-notes", creditNoteData);
      console.log("Credit note saved:", response.data);
      navigate("/credit-note-list", { state: { clientId, clientName } });
    } catch (err) {
      setError("Failed to save credit note");
      console.error("Error saving credit note:", err);
    }
  };

  return (
    <div className="credit-note-form-wrapper">
      <div className="credit-note-form-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="company-header">
          {loading ? (
            <p>Loading company details...</p>
          ) : companyError ? (
            <p className="error-message">{companyError}</p>
          ) : (
            <>
              <h1>{companyDetails.companyname || ""}</h1>
<div className="company-details">
  <div className="company-details-row">
    <span>COMPANY REG NO: {companyDetails.company_reg_num || ""}</span>
    <span>{companyDetails.address || ""}</span>
  </div>
  <div className="company-details-row">
    <span>E-mail: {companyDetails.email || ""}</span>
    <span>Director Cell: {companyDetails.cell_num || ""}</span>
    <span>Accounts Cell: {companyDetails.cell_num2 || ""}</span>
  </div>
</div>
            </>
          )}
        </div>

        <h2 className="credit-note-form-title" style={{ textAlign: "center" }}>
          CREDIT NOTE
        </h2>

        <div className="client-document-section">
          <div className="client-section">
            <h3>{clientName}</h3>
            <p>{clientDetails.companyaddress || ""}, {clientDetails.suburb || ""}, {clientDetails.postalcode || ""}</p>
            <p>Vat Number: {clientDetails.vatregno || ""}</p>
            <p>Telephone: {clientDetails.cellnum || ""}</p>
            <p>Email: {clientDetails.email || ""}</p>
          </div>

          <div className="document-info-section">
            <div className="form-group">
              <label htmlFor="accountNo">Account No</label>
              <input
                type="text"
                id="accountNo"
                value={formData.accountNo}
                onChange={handleChange}
                placeholder="Enter Account No"
              />
            </div>
            <div className="form-group">
              <label htmlFor="documentNo">Document No</label>
              <input
                type="text"
                id="documentNo"
                value={formData.documentNo}
                onChange={handleChange}
                placeholder={formData.documentNo ? "" : "Enter Document No"}
                readOnly
              />
            </div>
            <div className="form-group">
              <label htmlFor="documentDate">Document Date</label>
              <input
                type="date"
                id="documentDate"
                value={formData.documentDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="document-details">
          <div className="form-group">
            <label htmlFor="instructionNo">Instruction No</label>
            <Select
              id="instructionNo"
              value={
                formData.instructionNo
                  ? { value: formData.instructionNo, label: formData.instructionNo }
                  : null
              }
              onChange={(selectedOption) =>
                handleChange({
                  target: {
                    id: "instructionNo",
                    value: selectedOption ? selectedOption.value : "",
                  },
                })
              }
              options={instructions.map((instr) => ({
                value: instr.m1key,
                label: instr.m1key,
              }))}
              placeholder=""
              isClearable
              classNamePrefix="select"
            />
          </div>
          <div className="form-group">
            <label htmlFor="destination">Destination</label>
            <input
              type="text"
              id="destination"
              value={formData.destination}
              onChange={handleChange}
              readOnly
            />
          </div>
        </div>

        <div className="vessel-section">
          <div className="form-group">
            <label htmlFor="vessel">Vessel - Voyage</label>
            <input
              type="text"
              id="vessel"
              value={formData.vessel}
              onChange={handleChange}
              readOnly
            />
          </div>
          <div className="form-group">
            <label htmlFor="refNo">Ref No</label>
            <input
              type="text"
              id="refNo"
              value={formData.refNo}
              onChange={handleChange}
              readOnly
            />
          </div>
        </div>

        <table className="description-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Container Number</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <textarea
                    id={`description-${index}`}
                    value={item.description}
                    onChange={handleChange}
                    placeholder="Enter Description"
                  ></textarea>
                </td>
                <td>
                  <Select
                    id={`containerNumber-${index}`}
                    value={
                      item.containerNumber
                        ? { value: item.containerNumber, label: item.containerNumber }
                        : null
                    }
                    onChange={(selectedOption) =>
                      handleChange({
                        target: {
                          id: `containerNumber-${index}`,
                          value: selectedOption ? selectedOption.value : "",
                        },
                      })
                    }
                    options={containers.map((container) => ({
                      value: container.containernum,
                      label: container.containernum,
                    }))}
                    placeholder="Search"
                    isClearable
                    classNamePrefix="select"
                  />
                </td>
                <td>
                  <div className="input-with-currency">
                    <span className="currency-symbol">R</span>
                    <input
                      type="text"
                      id={`total-${index}`}
                      value={item.total}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^R\s?/, "");
                        handleChange({
                          target: { id: `total-${index}`, value: val },
                        });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td>
                  <button
                    className="delete-row-button"
                    onClick={() => handleDeleteRow(index)}
                    disabled={formData.items.length === 1}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-row-button-container">
          <button
            type="button"
            className="add-row-button"
            onClick={handleAddRow}
          >
            +
          </button>
        </div>

        <div className="totals-banking-section">
          <div className="banking-details">
            <h4>BANKING DETAILS</h4>
            <p>Name Of Account: {companyDetails.name_of_acc || "N/A"}</p>
            <p>Bank: {companyDetails.bank || "N/A"}</p>
            <p>Account Number: {companyDetails.account_num || "N/A"}</p>
            <p>Branch: {companyDetails.branch || "N/A"}</p>
            <p>Branch Code: {companyDetails.branch_code || "N/A"}</p>
          </div>
          <div className="totals-section">
            <div className="form-group">
              <label htmlFor="subTotal">Sub Total</label>
              <div className="input-with-currency">
                <span className="currency-symbol">R</span>
                <input
                  type="text"
                  id="subTotal"
                  value={formData.subTotal}
                  readOnly
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="vat">VAT ({(formData.vatRate * 100).toFixed(0)}%)</label>
              <div className="input-with-currency">
                <span className="currency-symbol">R</span>
                <input
                  type="text"
                  id="vat"
                  value={formData.vat}
                  readOnly
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="totalAmount">Total</label>
              <div className="input-with-currency">
                <span className="currency-symbol">R</span>
                <input
                  type="text"
                  id="totalAmount"
                  value={formData.totalAmount}
                  readOnly
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="submit-button-container">
          <button
            type="submit"
            className="submit-button"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteForm;