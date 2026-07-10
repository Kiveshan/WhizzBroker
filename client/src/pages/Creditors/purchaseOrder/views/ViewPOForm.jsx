"use client"
import { useRef, useState,useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { authFetch } from "../../../../utils/authFetch.js"
import html2pdf from "html2pdf.js"
import { Upload } from "lucide-react"
import "../css/PO.css"
import "../css/ViewPOForm-print.css"
import CompanyHeader from "../../../../components/CompanyHeader"

const ViewPOForm = () => {
  const navigate = useNavigate()
  const printRef = useRef()
  const location = useLocation()
  
  const { poData } = location.state || {}
  const ponum = poData?.ponum || "";
  const truckId = location.state?.truckId || null;
const truckRegNum = location.state?.truckRegNum || "";
  const [uploadFile, setUploadFile] = useState(null)
  const [completePOData, setCompletePOData] = useState(null);
  const [slipStatus, setSlipStatus] = useState({ hasSlip: false, loading: true });
const [uploadSuccess, setUploadSuccess] = useState(location.state?.uploadSuccess || false);
useEffect(() => {
  const fetchCompletePOData = async () => {
    if (ponum) {
      try {
        const response = await authFetch(`/api/po-form/details/${ponum}`);
        const data = await response.json();
        setCompletePOData(data);
        console.log("Complete PO Data:", data);
      } catch (error) {
        console.error('Error fetching complete PO data:', error);
      }
    }
  };
  
  fetchCompletePOData();
}, [ponum]);
useEffect(() => {
  const checkSlipStatus = async () => {
    if (ponum) {
      try {
        const response = await authFetch(`/api/po-form/slip-status/${ponum}`);
        const data = await response.json();
        setSlipStatus({ ...data, loading: false });
      } catch (error) {
        console.error('Error checking slip status:', error);
        setSlipStatus({ hasSlip: false, loading: false });
      }
    }
  };
  
  checkSlipStatus();
}, [ponum, uploadSuccess]);
  if (!poData) {
    return (
      <div className="po-form-container">
        <button className="back-button" onClick={() => navigate("/Creditors/PurchaseOrders")}>
          Back
        </button>
        <div className="error-message">No purchase order data found</div>
      </div>
    )
  }

  const lineItems = poData.line_items || []
  const isFuelExpense = poData.expense === "Fuel" 

  // Only calculate totals for non-fuel expenses
  const subtotal = isFuelExpense ? 0 : lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const vat = isFuelExpense ? 0 : subtotal * 0.15
  const total = isFuelExpense ? 0 : subtotal + vat

  const handleBack = () => {
    navigate("/Creditors/PurchaseOrders")
  }
const handleViewSlip = async () => {
  try {
    const response = await authFetch(`/api/po-form/view-slip/${ponum}`);
    const data = await response.json();
    
    if (data.success && data.url) {
      window.open(data.url, '_blank');
    } else {
      alert('Error: Could not load slip');
    }
  } catch (error) {
    console.error('Error viewing slip:', error);
    alert('Error viewing slip. Please try again.');
  }
};
  const handleDownload = () => {
    const element = printRef.current
    if (!element) {
      alert("Content not ready for PDF generation")
      return
    }

    const opt = {
      margin: 0.3,
      filename: `Purchase_Order_${poData.ponum || "PO"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    }

    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>

        <div ref={printRef} className="print-container">
          <CompanyHeader subtitle="Purchase Order" />

          <div className="po-header-section">
            <h2>PURCHASE ORDER NUMBER: {poData.ponum}</h2>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Supplier</label>
                <div className="form-value">{poData.supplier || ""}</div>
              </div>
              <div className="form-group">
                <label>Date</label>
                <div className="form-value">{poData.date ? new Date(poData.date).toLocaleDateString() : ""}</div>
              </div>
              <div className="form-group">
                <label>Att</label>
                <div className="form-value">{poData.attention_to || ""}</div>
              </div>
              <div className="form-group">
                <label>Received by</label>
                <div className="form-value">{poData.received_by || ""}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ref/Reg No</label>
                <div className="form-value">{poData.reg_no || ""}</div>
              </div>
              <div className="form-group">
                <label>Date of Purchase Order</label>
                <div className="form-value">{poData.date ? new Date(poData.date).toLocaleDateString() : ""}</div>
              </div>
              <div className="form-group">
                <label>Subbie</label>
                <div className="form-value">{poData.subbie || ""}</div>
              </div>
              <div className="form-group">
                <label>Expense Type</label>
                <div className="form-value">{poData.expense || ""}</div>
              </div>
            </div>
          </div>

          <div className="line-items">
            <table className="line-items-table">
 <thead>
  <tr>
    <th>Description</th>
    <th>{isFuelExpense ? "Trucks" : "Quantity"}</th>
  </tr>
</thead>
<tbody>
  {lineItems.length > 0 ? (
    lineItems.map((item, index) => (
      <tr key={index}>
        <td>{item.description || ""}</td>
        <td>{isFuelExpense ? item.truckregnum || "Unknown" : item.quantity || 0}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="2">No line items found</td>
    </tr>
  )}
</tbody>

            </table>
          </div>


        </div>

        {/* MODIFY THIS: Add upload button next to download */}
<div className="submit-section">
  <button type="button" className="view-btn" onClick={handleDownload}>
    Download
  </button>
{!slipStatus.loading && (
  slipStatus.hasSlip ? (
    <button
      type="button"
      className="view-btn"
      style={{ marginLeft: "10px", cursor: "pointer" }}
      onClick={handleViewSlip}
    >
      View Slip
    </button>
  ) : (
    <button
      type="button"
      className="view-btn upload-btn"
      style={{ marginLeft: "10px", cursor: "pointer" }}
onClick={() => {
  // Use completePOData if available, otherwise fall back to poData
  const poDataToUse = completePOData || poData;
  const finalTruckId = poDataToUse.truckid;
  const finalTruckRegNum = poDataToUse.truckregnum || poDataToUse.reg_no;
  
  console.log("Navigation data from PO:", {
    finalTruckId,
    finalTruckRegNum,
    ponum,
    expenseType: poDataToUse.expense === "Fuel" ? 5 : null,
    poDataToUse // Log entire poData to see what's available
  });
  
  if (!finalTruckId && poDataToUse.expense === "Fuel") {
    alert("Error: No truck information found in this purchase order");
    return;
  }
  
  navigate("/ExpenseSubmission", {
    state: {
      truckId: finalTruckId,
      truckRegNum: finalTruckRegNum,
      ponum,
      expenseType: poDataToUse.expense === "Fuel" ? 5 : null, 
    },
  });
}}
    >
      <Upload size={16} style={{ marginRight: "5px" }} />
      Upload
    </button>
  )
)}
</div>
      </div>
    </div>
  )
}

export default ViewPOForm
