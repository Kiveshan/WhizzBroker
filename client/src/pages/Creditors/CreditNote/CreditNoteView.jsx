"use client";

import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../../api.js";
import "./css/CreditNoteForm.css"; // Reuse the same CSS for layout
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CreditNoteView = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const params = useParams(); // Get creditNoteId from route params
  const { clientId, clientName } = state || {};
  const creditNoteId = params.creditNoteId;

const [formData, setFormData] = useState({
  accountNo: "",
  documentNo: "",
  documentDate: "",
  instructionNo: "",
  vessel: "",
  destination: "",
  refNo: "",
  items: [],
  subTotal: "",
  vat: "",
  totalAmount: "",
  vatRate: 0.15, // Default VAT rate, will be updated by instruction from DB
});
  const [companyDetails, setCompanyDetails] = useState({
    companyname: "",
    company_reg_num: "",
    address: "",
    cluster_box: "",
    email: "",
    cell_num: "",
    cell_num2: "",
  });
  const [companyError, setCompanyError] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientDetails, setClientDetails] = useState({});
  const [clientError, setClientError] = useState(null);

  useEffect(() => {
const fetchCreditNote = async () => {
  try {
    setLoading(true);
    const response = await api.get(`/api/credit-notes/by-id/${creditNoteId}`);
    const creditNote = response.data.data || {};

    // Fetch instruction details using m1key
    let instructionDetails = {};
    if (creditNote.m1key) {
      const instructionResponse = await api.get(`/api/instruction-details/${creditNote.m1key}`);
      instructionDetails = instructionResponse.data.data || {};
    }

    // Reconstruct items from arrays and description
    const descriptions = creditNote.description ? creditNote.description.split('\n') : [];
    const containernumArray = creditNote.containernum ? creditNote.containernum.split(', ') : [];
    const items = (creditNote.amount || []).map((amount, index) => ({
      description: descriptions[index] || "",
      containerNumber: containernumArray[index] || "",
      total: parseFloat(amount).toFixed(2),
    }));

    const subTotal = (creditNote.amount || []).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    const vatRate = instructionDetails.vat ? instructionDetails.vat / 100 : 0.15; // Pull VAT from DB and convert to decimal
    const vat = subTotal * vatRate;
    const totalAmount = subTotal + vat;

    setFormData({
      accountNo: creditNote.account_no || "",
      documentNo: creditNote.doc_no || "",
      documentDate: creditNote.creditnote_date ? creditNote.creditnote_date.split('T')[0] : "",
      instructionNo: creditNote.m1key || "",
      vessel: instructionDetails.vessel_name || "",
      destination: instructionDetails.dropoff || "",
      refNo: instructionDetails.clientFileRef || "", 
      items,
      subTotal: subTotal.toFixed(2),
      vat: vat.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      vatRate, 
    });
  } catch (err) {
    setError("Failed to fetch credit note or instruction details");
    console.error("Error fetching credit note or instruction details:", err);
  } finally {
    setLoading(false);
  }
};

    const fetchCompanyDetails = async () => {
      try {
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
      }
    };

    const fetchClientDetails = async () => {
      try {
        const response = await api.get(`/clients/${clientId}`);
        setClientDetails(response.data.data);
      } catch (err) {
        setClientError("Failed to fetch client details");
        console.error("Error fetching client details:", err);
      }
    };

    fetchCreditNote();
    fetchCompanyDetails();
    fetchClientDetails();
  }, [creditNoteId, clientId]);

  const handleBack = () => {
    navigate("/credit-note-list", { state: { clientId, clientName } });
  };

const handleDownloadPDF = async () => {
  const element = document.querySelector(".credit-note-form-container");
  if (!element) {
    console.error("Form container not found");
    return;
  }

  try {
    // Temporarily adjust styles to ensure all content is visible
    const originalStyle = element.style.cssText;
    element.style.padding = "20px";
    element.style.boxSizing = "border-box";
    element.style.overflow = "visible";
    element.style.width = "794px"; // A4 width in pixels at 96 DPI
    element.style.minHeight = "1123px"; // A4 height in pixels at 96 DPI

    // Capture the form container as a canvas
    const canvas = await html2canvas(element, {
      scale: 3, // Higher resolution for better quality
      useCORS: true,
      logging: false,
      windowWidth: 794, // Match A4 width
      windowHeight: 1123, // Match A4 height
      ignoreElements: (el) => el.classList.contains("download-button-container"), // Skip the button
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 190; // A4 width minus margins (210mm - 10mm left - 10mm right)
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10; // Start position with 10mm margin

    // Add image to PDF
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, position, imgWidth, imgHeight);

    // Handle multi-page content
    heightLeft -= pageHeight - 20; // Account for margins
    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight + 10;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    // Save the PDF
    pdf.save(`Credit_Note_${formData.documentNo || creditNoteId}.pdf`);

    // Restore original styles
    element.style.cssText = originalStyle;
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};


  if (loading) {
    return <div>Loading credit note...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="credit-note-form-wrapper">
      <div className="credit-note-form-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="company-header">
          {companyError ? (
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

        <h2 className="credit-note-form-title">CREDIT NOTE VIEW</h2>

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
                readOnly
              />
            </div>
            <div className="form-group">
              <label htmlFor="documentNo">Document No</label>
              <input
                type="text"
                id="documentNo"
                value={formData.documentNo}
                readOnly
              />
            </div>
            <div className="form-group">
              <label htmlFor="documentDate">Document Date</label>
              <input
                type="text"
                id="documentDate"
                value={formData.documentDate}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="document-details">
          <div className="form-group">
            <label htmlFor="instructionNo">Instruction No</label>
            <input
              type="text"
              id="instructionNo"
              value={formData.instructionNo}
              readOnly
            />
          </div>
          <div className="form-group">
            <label htmlFor="destination">Destination</label>
            <input
              type="text"
              id="destination"
              value={formData.destination}
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
              readOnly
            />
          </div>
          <div className="form-group">
            <label htmlFor="refNo">Ref No</label>
            <input
              type="text"
              id="refNo"
              value={formData.refNo}
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
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <textarea
                    id={`description-${index}`}
                    value={item.description}
                    readOnly
                  ></textarea>
                </td>
                <td>
                  <input
                    type="text"
                    value={item.containerNumber}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.total}
                    readOnly
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
                <input type="text" id="subTotal" value={formData.subTotal} readOnly placeholder="0.00" />
              </div>
            </div>

              <div className="form-group">
                <label htmlFor="vat">VAT ({(formData.vatRate * 100).toFixed(0)}%)</label>
                <div className="input-with-currency">
                  <span className="currency-symbol">R</span>
                  <input type="text" id="vat" value={formData.vat} readOnly placeholder="0.00" />
                </div>
              </div>

            <div className="form-group">
              <label htmlFor="totalAmount">Total</label>
              <div className="input-with-currency">
                <span className="currency-symbol">R</span>
                <input type="text" id="totalAmount" value={formData.totalAmount} readOnly placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>

        <div className="download-button-container">
          <button onClick={handleDownloadPDF} className="download-button">
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteView;