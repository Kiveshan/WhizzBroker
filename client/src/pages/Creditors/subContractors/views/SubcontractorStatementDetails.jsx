"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../../../../api";
import jsPDF from "jspdf";
import { Workbook } from "exceljs";
import "../css/SubcontractorStatementDetail.css";

const SubcontractorStatementDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("Received state:", location.state);
  const {
    statementId,
    subcontractorName,
    subcontractorId,
    subei_reg_num,
    legids,
    date,
    vatStatus,
  } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [subcontractorInfo, setSubcontractorInfo] = useState(null);

  const statementRef = useRef(null);

  useEffect(() => {
    if (!statementId || !legids) {
      setError("No statement or leg data selected");
      setLoading(false);
      return;
    }

    const fetchStatementDetail = async () => {
      try {
        setLoading(true);
        let legKeys;
        try {
          const parsedLegids = JSON.parse(legids);
          legKeys = parsedLegids.map((item) => item.legkey);
          console.log("Parsed legKeys:", legKeys);
        } catch (e) {
          console.error("Invalid legids JSON:", e, "Received:", legids);
          legKeys = [];
        }

        if (legKeys.length === 0) {
          throw new Error("No valid leg keys found in legids");
        }

        const response = await api.get("/subcontractor/statement-details", {
          params: {
            statementId,
            legKeys: legKeys.join(","),
            subei_reg_num,
          },
        });
        console.log("Statement details response:", response.data);

        if (!response.data)
          throw new Error("Failed to fetch statement details");

        const workItems = response.data.map((leg) => ({
          id: leg.legkey,
          date: leg.date,
          containerNumber: leg.containernumber || "N/A",
          destination: leg.destination,
          instructionNumber: leg.instruction_number || "N/A",
          clientName: leg.client_name || "N/A",
          rate: leg.driverrate || 0,
          instruction: leg.m1_description || "N/A",
        }));

        const totalAmount = workItems.reduce(
          (sum, item) => sum + (item.rate || 0),
          0
        );

        const companyResponse = await api.get("/subcontractor/company-info", {
          params: { roleid: 1, status: "active" },
        });
        const companyData = companyResponse.data[0] || {};
        setCompanyInfo({
          name: companyData.companyname || "Construction Management Pro",
          address:
            companyData.address ||
            "123 Business Ave, Suite 100, City, State 12345",
          phone: companyData.cell_num || "+1 (555) 000-0000",
          email: companyData.email || "billing@constructionpro.com",
        });

        const subResponse = await api.get("/subcontractor/info", {
          params: { subei_reg_num },
        });
        const subData = subResponse.data[0] || {};
        setSubcontractorInfo({
          name: subcontractorName,
          location: subData.location || "N/A",
          contact_person: subData.contact_person || "N/A",
        });

        setStatement({
          statementId,
          subcontractorName,
          subcontractorId,
          // generationDate is expected to already be adjusted (DB date minus 1 day)
          generationDate: date,
          workItems,
          summary: {
            totalAmount,
            finalAmount: totalAmount,
          },
        });
      } catch (err) {
        console.error("Error fetching statement detail:", err);
        setError(`Failed to fetch statement details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStatementDetail();
  }, [statementId, subcontractorId, subcontractorName, subei_reg_num, legids]);

  const generatePDF = () => {
    if (isGenerating || !statement || !companyInfo || !subcontractorInfo)
      return;
    setIsGenerating(true);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 15;
    const pageWidth = 210 - 2 * margin;
    let y = margin;

    // Colors (RGB values)
    const primaryBlue = [44, 90, 160]; // #2c5aa0
    const lightBlue = [248, 251, 255]; // #f8fbff
    const lightGray = [248, 250, 252]; // #f8fafc
    const darkGray = [26, 54, 93]; // #1a365d
    const mediumGray = [74, 85, 104]; // #4a5568

    // Professional Header with gradient-like background
    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin - 5, y - 5, pageWidth + 10, 25, 3, 3, "F");

    // Header border
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin - 5, y - 5, pageWidth + 10, 25, 3, 3, "S");

    // Company Name
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(companyInfo.name, margin + pageWidth / 2, y + 8, {
      align: "center",
    });

    // Company Details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mediumGray);

    y += 35;

    // Document Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("SUBCONTRACTOR STATEMENT", margin + pageWidth / 2, y, {
      align: "center",
    });
    y += 15;

    // Statement Info Boxes
    const boxWidth = (pageWidth - 10) / 2;

    // Statement Number Box
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, boxWidth, 15, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, boxWidth, 15, 2, 2, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("STATEMENT NUMBER", margin + boxWidth / 2, y + 5, {
      align: "center",
    });
    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.text(`#${statementId}`, margin + boxWidth / 2, y + 11, {
      align: "center",
    });

    // Statement Date Box
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin + boxWidth + 10, y, boxWidth, 15, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + boxWidth + 10, y, boxWidth, 15, 2, 2, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("STATEMENT DATE", margin + boxWidth + 10 + boxWidth / 2, y + 5, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text(
      new Date(statement.generationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      margin + boxWidth + 10 + boxWidth / 2,
      y + 11,
      { align: "center" }
    );

    y += 25;

    // Billing Section
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, pageWidth, 25, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth, 25, 3, 3, "S");

    // Bill To Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("BILL TO:", margin + 5, y + 8);

    // Subcontractor Details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(subcontractorInfo.name, margin + 5, y + 14);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mediumGray);
    doc.text(subcontractorInfo.location, margin + 5, y + 18);
    doc.text(
      `Contact: ${subcontractorInfo.contact_person}`,
      margin + 5,
      y + 22
    );

    // Subcontractor ID (right aligned)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);

    y += 35;

    // Work Items Section Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("WORK COMPLETED", margin, y);

    // Underline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, margin + pageWidth, y + 2);
    y += 10;

    // Table Setup
    const tableHeaders = [
      "Date",
      "Container No",
      "Client",
      "Destination",
      "Instruction No",
      "Rate",
      "Instructions",
    ];
    // Adjust widths to suit new columns (must total pageWidth)
    const colWidths = [22, 30, 32, 28, 22, 18, 28];
    const columnPaddingX = 2;
    const columnPaddingY = 3;
    const baseRowHeight = 11;
    const lineHeight = 4;
    const headerRowHeight = 16;
    const headerLineHeight = 5;
    const headerPaddingY = 3;
    let x = margin;

    // Table Header
    doc.setFillColor(...primaryBlue);
    doc.rect(margin, y, pageWidth, headerRowHeight, "F");

    // Header borders
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.2);
    x = margin;
    for (let i = 0; i < colWidths.length - 1; i++) {
      x += colWidths[i];
      doc.line(x, y, x, y + headerRowHeight);
    }

    // Header text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    x = margin;
    tableHeaders.forEach((header, index) => {
      const textX = x + colWidths[index] / 2;
      const isInstructionHeader = header === "Instruction No";
      const headerLines = isInstructionHeader
        ? ["INSTRUCTION", "NO"]
        : [header.toUpperCase()];
      const totalHeaderHeight = headerLines.length * headerLineHeight;
      let textY =
        y + headerPaddingY + Math.max(headerLineHeight - 1, (headerRowHeight - totalHeaderHeight) / 2 + headerLineHeight / 2);
      headerLines.forEach((line) => {
        doc.text(line, textX, textY, { align: "center" });
        textY += headerLineHeight;
      });
      x += colWidths[index];
    });
    y += headerRowHeight;

    // Table Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);

    const columnSpecs = [
      {
        width: colWidths[0],
        align: "center",
        fontStyle: "bold",
        textColor: primaryBlue,
        formatter: (item) =>
          new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
      },
      {
        width: colWidths[1],
        align: "left",
        fontStyle: "normal",
        textColor: darkGray,
        formatter: (item) => item.containerNumber || "N/A",
      },
      {
        width: colWidths[2],
        align: "left",
        fontStyle: "normal",
        textColor: darkGray,
        formatter: (item) => item.clientName || "N/A",
      },
      {
        width: colWidths[3],
        align: "left",
        fontStyle: "normal",
        textColor: darkGray,
        formatter: (item) => item.destination || "N/A",
      },
      {
        width: colWidths[4],
        align: "center",
        fontStyle: "normal",
        textColor: darkGray,
        formatter: (item) => item.instructionNumber || "N/A",
      },
      {
        width: colWidths[5],
        align: "right",
        fontStyle: "bold",
        textColor: primaryBlue,
        formatter: (item) => `R${item.rate.toFixed(2)}`,
      },
      {
        width: colWidths[6],
        align: "left",
        fontStyle: "normal",
        textColor: mediumGray,
        fontSize: 7,
        formatter: (item) => item.instruction || "N/A",
      },
    ];

    statement.workItems.forEach((item, index) => {
      const processedCells = columnSpecs.map((spec) => {
        const rawValue = spec.formatter(item);
        const stringValue = Array.isArray(rawValue)
          ? rawValue.map((val) => String(val ?? ""))
          : String(rawValue ?? "");
        const lines = Array.isArray(stringValue)
          ? stringValue
          : doc.splitTextToSize(stringValue, spec.width - columnPaddingX * 2);
        return {
          ...spec,
          lines: Array.isArray(lines) ? lines : [lines],
        };
      });

      const maxLineCount = Math.max(
        ...processedCells.map((cell) => cell.lines.length)
      );
      const dynamicRowHeight = Math.max(
        baseRowHeight,
        columnPaddingY * 2 + maxLineCount * lineHeight
      );

      // Check for page break before drawing row
      if (y + dynamicRowHeight > 265) {
        doc.addPage();
        y = margin;

        // Redraw header on new page
        doc.setFillColor(...primaryBlue);
        doc.rect(margin, y, pageWidth, headerRowHeight, "F");
        doc.setDrawColor(255, 255, 255);
        x = margin;
        for (let i = 0; i < colWidths.length - 1; i++) {
          x += colWidths[i];
          doc.line(x, y, x, y + headerRowHeight);
        }
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        x = margin;
        tableHeaders.forEach((header, idx) => {
          const textX = x + colWidths[idx] / 2;
          const isInstructionHeader = header === "Instruction No";
          const headerLines = isInstructionHeader
            ? ["INSTRUCTION", "NO"]
            : [header.toUpperCase()];
          const totalHeaderHeight = headerLines.length * headerLineHeight;
          let textY =
            y + headerPaddingY + Math.max(headerLineHeight - 1, (headerRowHeight - totalHeaderHeight) / 2 + headerLineHeight / 2);
          headerLines.forEach((line) => {
            doc.text(line, textX, textY, { align: "center" });
            textY += headerLineHeight;
          });
          x += colWidths[idx];
        });
        y += headerRowHeight;
      }

      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, pageWidth, dynamicRowHeight, "F");
      }

      // Row borders
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageWidth, dynamicRowHeight, "S");

      // Column separators
      x = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        x += colWidths[i];
        doc.line(x, y, x, y + dynamicRowHeight);
      }

      // Render cell text
      x = margin;
      processedCells.forEach((cell) => {
        doc.setFontSize(cell.fontSize || 8);
        doc.setFont("helvetica", cell.fontStyle);
        doc.setTextColor(...cell.textColor);

        let textX = x + columnPaddingX;
        if (cell.align === "center") {
          textX = x + cell.width / 2;
        } else if (cell.align === "right") {
          textX = x + cell.width - columnPaddingX;
        }

        let textY = y + columnPaddingY + lineHeight - 1; // slight adjustment to center vertically
        cell.lines.forEach((line) => {
          doc.text(line, textX, textY, { align: cell.align });
          textY += lineHeight;
        });

        x += cell.width;
      });

      // Restore default font settings for next iteration
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      y += dynamicRowHeight;
    });

    y += 10;

    // Payment Summary Box
    const summaryBoxWidth = 80;
    const summaryBoxX = margin + pageWidth - summaryBoxWidth;

    // Summary box background and border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 25, 3, 3, "F");
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.8);
    doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 25, 3, 3, "S");

    // Summary header
    doc.setFillColor(...primaryBlue);
    doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 8, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PAYMENT SUMMARY", summaryBoxX + summaryBoxWidth / 2, y + 5, {
      align: "center",
    });

    // Subtotal
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mediumGray);
    doc.text("Subtotal:", summaryBoxX + 3, y + 13);
    doc.setTextColor(...darkGray);
    doc.setFont("helvetica", "bold");
    doc.text(
      `R${statement.summary.totalAmount.toFixed(2)}`,
      summaryBoxX + summaryBoxWidth - 3,
      y + 13,
      {
        align: "right",
      }
    );

    // Divider line
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.5);
    doc.line(
      summaryBoxX + 3,
      y + 16,
      summaryBoxX + summaryBoxWidth - 3,
      y + 16
    );

    // Total Amount Due
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("Total Amount Due:", summaryBoxX + 3, y + 21);
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(14);
    doc.text(
      `R${statement.summary.finalAmount.toFixed(2)}`,
      summaryBoxX + summaryBoxWidth - 3,
      y + 21,
      {
        align: "right",
      }
    );

    y += 35;

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + pageWidth, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...mediumGray);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Footer with page numbers and company name on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      // Company name left
      doc.text(companyInfo.name, margin, 287);
      // Page X of Y right
      doc.text(`Page ${i} of ${pageCount}`, 210 - margin, 287, { align: 'right' });
    }

    // Save PDF with descriptive filename
    const dateStr = new Date(statement.generationDate).toLocaleDateString('en-GB');
    doc.save(`Subcontractor-Statement-${statementId}-${subcontractorName}-${dateStr}.pdf`);
    setIsGenerating(false);
  };

  const generateExcel = async () => {
    if (isGenerating || !statement || !companyInfo || !subcontractorInfo)
      return;
    setIsGenerating(true);

    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet("Statement");

      // Set column widths
      worksheet.columns = [
        { width: 15 },
        { width: 18 },
        { width: 20 },
        { width: 18 },
        { width: 15 },
        { width: 15 },
        { width: 25 },
      ];

      let currentRow = 1;

      // Header Info
      worksheet.getCell(`A${currentRow}`).value = "Statement #";
      worksheet.getCell(`B${currentRow}`).value = statementId;
      worksheet.getCell(`D${currentRow}`).value = "Statement Date:";
      worksheet.getCell(`E${currentRow}`).value = new Date(statement.generationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      worksheet.getCell(`F${currentRow}`).value = "VAT Status:";
      worksheet.getCell(`G${currentRow}`).value = vatStatus === "NON_VAT" ? "Non VAT" : "VAT";
      currentRow += 2;

      // Subcontractor Info
      worksheet.getCell(`A${currentRow}`).value = "Subcontractor:";
      worksheet.getCell(`B${currentRow}`).value = subcontractorInfo.name;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = "Location:";
      worksheet.getCell(`B${currentRow}`).value = subcontractorInfo.location;
      currentRow++;
      worksheet.getCell(`A${currentRow}`).value = "Contact:";
      worksheet.getCell(`B${currentRow}`).value = subcontractorInfo.contact_person;
      currentRow += 2;

      // Work Items Header
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = [
        "Date",
        "Container Number",
        "Client",
        "Destination",
        "Instruction No",
        "Rate",
        "Instructions",
      ];
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
      currentRow++;

      // Work Items
      statement.workItems.forEach((item) => {
        const row = worksheet.getRow(currentRow);
        row.values = [
          new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          item.containerNumber || "N/A",
          item.clientName || "N/A",
          item.destination || "N/A",
          item.instructionNumber || "N/A",
          item.rate || 0,
          item.instruction || "N/A",
        ];

        row.getCell(6).numFmt = '"R"#,##0.00';
        currentRow++;
      });

      currentRow += 1;

      // Summary
      worksheet.getCell(`A${currentRow}`).value = "Total Amount Due:";
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = statement.summary.finalAmount;
      worksheet.getCell(`B${currentRow}`).numFmt = '"R"#,##0.00';
      worksheet.getCell(`B${currentRow}`).font = { bold: true };

      // Generate file
      const dateBG = new Date(statement.generationDate).toLocaleDateString("en-GB");
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Subcontractor-Statement-${statementId}-${subcontractorName}-${dateBG}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating Excel:", err);
      alert("Failed to generate Excel file. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading)
    return (
      <div className="statement-detail-wrapper">
        <div className="loading-message">Loading statement details...</div>
      </div>
    );
  if (error)
    return (
      <div className="statement-detail-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!statement || !companyInfo || !subcontractorInfo)
    return (
      <div className="statement-detail-wrapper">
        <div className="loading-message">
          Please select a statement from the list.
        </div>
      </div>
    );

  return (
    <div className="statement-detail-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          {/* Professional Header */}
          <div className="statement-header">
            <div className="company-logo-section">
              <h1 className="company-name">{companyInfo.name}</h1>
            </div>
          </div>

          {/* Statement Title */}
          <div className="statement-title-section">
            <div className="statement-number">Statement #{statementId}</div>
          </div>

          {/* Billing Information */}
          <div className="billing-section">
            <div className="billing-info">
              <div className="billing-header">Bill To:</div>
              <div className="subcontractor-details">
                <div className="subcontractor-name">
                  {subcontractorInfo.name}
                </div>
                <div className="subcontractor-address">
                  {subcontractorInfo.location}
                </div>
                <div className="contact-person">
                  <span className="label">Contact:</span>{" "}
                  {subcontractorInfo.contact_person}
                </div>
              </div>
            </div>
            <div className="statement-meta">
              <div className="meta-row">
                <span className="meta-label">Statement Date:</span>
                <span className="meta-value">
                  {new Date(statement.generationDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Subcontractor Reg No :</span>
                <span className="meta-value">{subcontractorId}</span>
              </div>
            </div>
          </div>

          {/* Work Items Table */}
          <div className="work-items-section">
            <h3 className="section-title">Work Completed</h3>
            <div className="table-container">
              <table className="work-items-table">
                <thead>
                  <tr>
                    <th className="col-date">Date</th>
                    <th className="col-starting">Container Number</th>
                    <th className="col-client">Client</th>
                    <th className="col-destination">Destination</th>
                    <th className="col-instruction-number">Instruction No</th>
                    <th className="col-rate">Rate</th>
                    <th className="col-instruction">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.workItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index % 2 === 0 ? "row-even" : "row-odd"}
                    >
                      <td className="col-date">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="col-starting">{item.containerNumber}</td>
                      <td className="col-client">{item.clientName}</td>
                      <td className="col-destination">{item.destination}</td>
                      <td className="col-instruction-number">
                        {item.instructionNumber}
                      </td>
                      <td className="col-rate">
                        R
                        {item.rate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="col-instruction">{item.instruction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="payment-summary-section">
            <div className="summary-container">
              <div className="summary-header">Payment Summary</div>
              <div className="summary-content">
                <div className="summary-row subtotal-row">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-value">
                    R
                    {statement.summary.totalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row total-row">
                  <span className="summary-label">Total Amount Due:</span>
                  <span className="summary-value">
                    R
                    {statement.summary.finalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="statement-actions">
          <button
            className="back-btn"
            onClick={() =>
              navigate("/Creditors/SubcontractorStatements", {
                state: {
                  subcontractorId: statement.subcontractorId,
                  subcontractorName: statement.subcontractorName,
                  subei_reg_num: subei_reg_num,
                },
              })
            }
          >
            Back
          </button>
          <button
            className={`download-btn ${isGenerating ? "generating" : ""}`}
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating PDF..." : "Download PDF"}
          </button>
          <button
            className={`download-btn ${isGenerating ? "generating" : ""}`}
            onClick={generateExcel}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating Excel..." : "Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorStatementDetail;
