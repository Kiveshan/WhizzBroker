import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import html2pdf from "html2pdf.js";
import { Workbook } from "exceljs";
import CompanyHeader from "../../../../components/CompanyHeader";
import "../../purchaseOrder/css/PO.css";
import "../../purchaseOrder/css/ViewPOForm-print.css";
import api from "../../../../api.js"; // Updated to use api.js

const ViewStatement = () => {
  const { state } = useLocation();
  const printRef = useRef();
  const navigate = useNavigate();
  const [poData, setPoData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const currentDate = new Date();
  const year = state?.selectedYear || currentDate.getFullYear();
  const month =
    state?.selectedMonth ||
    currentDate.toLocaleString("default", { month: "long" });

  const toLocalDateOnlyString = (date) => {
    if (!(date instanceof Date)) return "";
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const supplierId = state?.supplierId;
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
        ].indexOf(month);
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const fromDate = toLocalDateOnlyString(firstDay);
        const toDate = toLocalDateOnlyString(lastDay);

        const res = await api.get(`/api/statements`, {
          params: { supplierId, fromDate, toDate },
        });

        const purchaseOrders = res.data;
        const supplier_name =
          purchaseOrders.length > 0 ? purchaseOrders[0].supplier : "Unknown";

        setPoData({ purchaseOrders, supplier_name });
      } catch (err) {
        console.error("Failed to fetch purchase orders:", err);
      }
    };

    fetchPOs();
  }, [state?.supplierId, state?.selectedYear, state?.selectedMonth]);

  if (!poData) {
    return <div>No purchase order data available.</div>;
  }

  const purchaseOrders = poData.purchaseOrders || [];
  const supplierName = poData.supplier_name || "Unknown Supplier";
  const totalAmount = purchaseOrders.reduce(
    (sum, po) => sum + (po.total || 0),
    0
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

const formatAmount = (amount) => {
  if (amount === null || amount === undefined || amount === 0) return "N/A";
  return `R${Number.parseFloat(amount).toFixed(2)}`;
};

  const handleDownload = () => {
    const element = printRef.current;
    if (!element) return alert("Nothing to download.");
    const options = {
      margin: 0.5,
      filename: `Statement_${supplierName}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(element).save();
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const workbook = new Workbook();
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet("Statement");

      worksheet.columns = [
        { key: "date", width: 14 },
        { key: "type", width: 18 },
        { key: "poNumber", width: 16 },
        { key: "receivedBy", width: 18 },
        { key: "invoice", width: 16 },
        { key: "truckReg", width: 14 },
        { key: "description", width: 30 },
        { key: "amount", width: 14 },
      ];

      let rowIndex = 1;

      worksheet.getCell(`A${rowIndex}`).value = "Supplier:";
      worksheet.getCell(`B${rowIndex}`).value = supplierName;
      worksheet.getCell(`D${rowIndex}`).value = "Generated at:";
      worksheet.getCell(`E${rowIndex}`).value = new Date().toLocaleString("en-ZA");
      rowIndex += 1;

      worksheet.getCell(`A${rowIndex}`).value = "Period:";
      worksheet.getCell(`B${rowIndex}`).value = `${month} ${year}`;
      rowIndex += 2;

      const headerRow = worksheet.getRow(rowIndex);
      headerRow.values = [
        "Date",
        "Type",
        "PO Number",
        "Received By",
        "Invoice #",
        "Truck Reg",
        "Description",
        "Amount",
      ];
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6F3FF" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      rowIndex += 1;

      purchaseOrders.forEach((po, index) => {
        const row = worksheet.getRow(rowIndex);
        row.values = [
          formatDate(po.date),
          po.expense_type || "N/A",
          po.ponum || "N/A",
          po.received_by || "N/A",
          po.invoice_number || "N/A",
          po.truckregnum || "N/A",
          po.description || "N/A",
          Number(po.total || 0),
        ];

        row.getCell(8).numFmt = '"R"#,##0.00';
        row.getCell(8).alignment = { horizontal: "right" };

        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }

        row.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        rowIndex += 1;
      });

      rowIndex += 1;
      worksheet.getCell(`G${rowIndex}`).value = "Total";
      worksheet.getCell(`G${rowIndex}`).font = { bold: true };
      worksheet.getCell(`H${rowIndex}`).value = Number(totalAmount || 0);
      worksheet.getCell(`H${rowIndex}`).numFmt = '"R"#,##0.00';
      worksheet.getCell(`H${rowIndex}`).font = { bold: true };
      worksheet.getCell(`H${rowIndex}`).alignment = { horizontal: "right" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeSupplier = String(supplierName || "Supplier")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "");
      link.download = `Statement_${safeSupplier}_${month}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export statement to Excel:", err);
      alert("Failed to export to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBack = () => {
    navigate("/Creditors/CredStatements");
  };

  return (
    <div className="po-form-wrapper">
      <div className="po-form-container">
        <button className="back-button" onClick={handleBack}>
          Back
        </button>
        <div
          ref={printRef}
          className="print-container"
          style={{ width: "600px" }}
        >
          <CompanyHeader subtitle="Creditors Statement" />
          <div className="po-header-section">
            <h2>{supplierName}</h2>
          </div>

          <div className="line-items">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>PO Number</th>
                  <th>Received By</th>
                  <th>Invoice #</th>
                  <th>Truck Reg</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      No purchase orders found for this supplier in {month}{" "}
                      {year}.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.ponum}>
                      <td>{formatDate(po.date)}</td>
                      <td>{po.expense_type || "N/A"}</td>
                      <td>{po.ponum || "N/A"}</td>
                      <td>{po.received_by || "N/A"}</td>
                      <td>{po.invoice_number || "N/A"}</td>
                      <td>{po.truckregnum || "N/A"}</td>
                      <td>{po.description || "N/A"}</td>
                      <td>{formatAmount(po.total || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="totals-section">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label-cell">Total</td>
                  <td className="amount-cell">{formatAmount(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="submit-section">
          <button
            type="button"
            className="view-button"
            onClick={handleDownload}
          >
            Download
          </button>
          <button
            type="button"
            className="view-button"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{ marginLeft: "10px" }}
          >
            {isExporting ? "Exporting..." : "Export to Excel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewStatement;
