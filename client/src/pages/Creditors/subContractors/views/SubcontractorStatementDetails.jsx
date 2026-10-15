"use client";

import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../../../api";
import jsPDF from "jspdf";
import { Workbook } from "exceljs";
import { loadBrandLogo, brandLogoHeight } from "../../../../utils/brandLogo.js";
import {
  requestStatementExport,
  uploadStatementDocument,
  fetchStatementExports,
  statementFromPayload,
  saveBlob,
  openStoredDocument,
} from "../services/statementExportService";
import {
  formatRand,
  formatStatementDate,
  formatLegDate,
} from "../services/statementFormatting.js";
import "../css/SubcontractorStatementDetail.css";

// A statement can run to hundreds of legs, so the on-screen table is paged.
// Exports are unaffected — they render from the server payload, not from this
// view, so a downloaded document always contains every leg.
const LEGS_PER_PAGE_OPTIONS = [
  { value: 50, label: "50 rows" },
  { value: 100, label: "100 rows" },
  { value: 200, label: "200 rows" },
  { value: 100000, label: "All rows" },
];

const GROUP_OPTIONS = ["None", "Client", "Week"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08" -> "August 2026". Split rather than parsed: "YYYY-MM-DD" reads as
 *  UTC midnight and renders as the previous month west of UTC. */
const formatPeriodLabel = (period) => {
  if (!period) return "";
  const [year, month] = String(period).split("-").map(Number);
  return `${MONTH_NAMES[month - 1] || ""} ${year}`.trim();
};

/** Calendar-week bucket within the statement month, e.g. "1-7 August". */
const weekLabelFor = (dateValue, period) => {
  const day = new Date(dateValue).getDate();
  if (Number.isNaN(day)) return "Unknown week";
  const start = Math.floor((day - 1) / 7) * 7 + 1;
  const [year, month] = String(period).split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const end = Math.min(start + 6, daysInMonth);
  return `${start}-${end} ${MONTH_NAMES[month - 1] || ""}`.trim();
};

/**
 * Bucket legs for display. Subtotals and counts are taken from the full set of
 * legs handed in, so a collapsed group still reports its real total.
 */
const buildLegGroups = (legs, grouping, period, collapsed) => {
  const buckets = new Map();

  legs.forEach((leg) => {
    const key =
      grouping === "Client"
        ? leg.clientName || "Unknown client"
        : weekLabelFor(leg.date, period);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(leg);
  });

  return Array.from(buckets.entries()).map(([key, rows]) => {
    const isCollapsed = Boolean(collapsed[key]);
    return {
      key,
      label: key,
      showHeader: true,
      collapsed: isCollapsed,
      countLabel: `${rows.length} ${rows.length === 1 ? "leg" : "legs"}`,
      subtotal: rows.reduce((sum, leg) => sum + Number(leg.rate || 0), 0),
      rows: isCollapsed ? [] : rows,
    };
  });
};

const SubcontractorStatementDetail = () => {
  const location = useLocation();
  const {
    statementKey,
    period,
    subcontractorName,
    subcontractorId,
    subei_reg_num,
    vatStatus,
  } = location.state || {};

  // Midday avoids any timezone rolling the month backwards when the date is
  // formatted for display or a filename.
  const date = period ? `${period}-01T12:00:00` : null;

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [subcontractorInfo, setSubcontractorInfo] = useState(null);

  // Export snapshots: every document produced from this statement, frozen at
  // the moment it was produced.
  const [exportHistory, setExportHistory] = useState([]);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState(false);

  const statementRef = useRef(null);
  const tableScrollRef = useRef(null);

  // Period and VAT status still have to appear in the filename even though the
  // statement number is gone from the documents themselves: without them, the
  // VAT and Non-VAT copies of the same month would overwrite each other in a
  // downloads folder.
  const buildFilename = (extension) =>
    [
      "Subcontractor-Statement",
      String(subcontractorName || "").trim().replace(/\s+/g, "-"),
      period,
      vatStatus === "NON_VAT" ? "NonVAT" : "VAT",
    ]
      .filter(Boolean)
      .join("-") + `.${extension}`;

  const [legPage, setLegPage] = useState(1);
  const [legsPerPage, setLegsPerPage] = useState(100);
  const [legQuery, setLegQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState(1);
  const [grouping, setGrouping] = useState("None");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const periodLabel = formatPeriodLabel(period);

  // The month the legs were driven — carried straight through from the list.
  const exportPeriod = period;

  const refreshExports = useCallback(async () => {
    if (!subei_reg_num || !exportPeriod) return;
    try {
      const rows = await fetchStatementExports({
        subeiRegNum: subei_reg_num,
        period: exportPeriod,
        vatStatus: vatStatus,
      });
      setExportHistory(rows);
    } catch (err) {
      console.error("Error fetching export history:", err);
    }
  }, [subei_reg_num, exportPeriod, vatStatus]);

  useEffect(() => {
    refreshExports();
  }, [refreshExports]);

  useEffect(() => {
    setLegPage(1);
    setLegQuery("");
    setGrouping("None");
    setCollapsedGroups({});
  }, [statementKey]);

  // Any change of view starts the leg table from the top. The table scrolls
  // inside its own container, and that scroll position otherwise survives the
  // change: switching grouping, sorting, paging or searching while scrolled
  // opened the new view partway down, with its first rows already tucked under
  // the sticky column header — which read as rows being cut off or missing.
  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [statementKey, grouping, sortKey, sortDir, legPage, legsPerPage, legQuery]);

  useEffect(() => {
    if (!statementKey || !subei_reg_num) {
      setError("No statement selected");
      setLoading(false);
      return;
    }

    const fetchStatementDetail = async () => {
      try {
        setLoading(true);

        // Three independent lookups, so they go in parallel rather than in
        // series — the legs query is the slow one and the other two no longer
        // wait behind it.
        //
        // The server resolves the statement's legs from the key; the page no
        // longer round-trips a leg list it would have to keep in step.
        const [response, companyResponse, subResponse] = await Promise.all([
          api.get("/subcontractor/statement-details", {
            params: { statementKey, subei_reg_num },
          }),
          api.get("/subcontractor/company-info", {
            params: { roleid: 1, status: "active" },
          }),
          api.get("/subcontractor/info", { params: { subei_reg_num } }),
        ]);

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

        const companyData = companyResponse.data[0] || {};
        // Only the name is rendered anywhere (statement header, PDF header and
        // footer). The address/phone/email fields were unused and carried US
        // placeholder values that would have printed on a real statement.
        setCompanyInfo({
          name: (companyData.companyname || "").trim(),
        });

        const subData = subResponse.data[0] || {};
        setSubcontractorInfo({
          name: subcontractorName,
          location: subData.location || "N/A",
          contact_person: subData.contact_person || "N/A",
        });

        setStatement({
          subcontractorName,
          subcontractorId,
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
  }, [statementKey, date, subcontractorId, subcontractorName, subei_reg_num]);

  // `statement` is a PARAMETER here, deliberately shadowing the component state
  // of the same name: a document must render from the server's frozen snapshot
  // payload, never from whatever the page happens to be displaying. Returns the
  // rendered file instead of saving it, so the caller can both hand it to the
  // user and upload it against the snapshot.
  // `logo` is from loadBrandLogo() ({ dataUrl } or null); null lays the header
  // out as plain text, as before the TDA letterhead was added.
  const buildPdf = (statement, logo = null) => {
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

    // Professional Header with gradient-like background. The box grows when the
    // logo is present so the letterhead sits above the legal company name.
    const logoWidth = 48;
    const headerHeight = logo ? 32 : 25;
    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin - 5, y - 5, pageWidth + 10, headerHeight, 3, 3, "F");

    // Header border
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin - 5, y - 5, pageWidth + 10, headerHeight, 3, 3, "S");

    if (logo) {
      doc.addImage(
        logo.dataUrl,
        "JPEG",
        margin + pageWidth / 2 - logoWidth / 2,
        y - 1,
        logoWidth,
        brandLogoHeight(logoWidth)
      );
    }

    // Company Name
    doc.setFontSize(logo ? 12 : 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(
      companyInfo.name,
      margin + pageWidth / 2,
      logo ? y - 1 + brandLogoHeight(logoWidth) + 5 : y + 8,
      { align: "center" }
    );

    // Company Details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mediumGray);

    y += headerHeight + 10;

    // Document Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("SUBCONTRACTOR STATEMENT", margin + pageWidth / 2, y, {
      align: "center",
    });
    y += 15;

    // Statement Date Box. The statement-number box that used to sit beside it
    // was dropped, so the date box is centred rather than left in a half-width
    // column with a gap where the number was.
    const boxWidth = (pageWidth - 10) / 2;
    const boxX = margin + (pageWidth - boxWidth) / 2;

    doc.setFillColor(...lightGray);
    doc.roundedRect(boxX, y, boxWidth, 15, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, y, boxWidth, 15, 2, 2, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("STATEMENT DATE", boxX + boxWidth / 2, y + 5, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text(
      formatStatementDate(statement.generationDate),
      boxX + boxWidth / 2,
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
          formatLegDate(item.date),
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

    return {
      blob: doc.output("blob"),
      filename: buildFilename("pdf"),
    };
  };

  // Same shadowing rule as buildPdf: renders from the snapshot payload, returns
  // the file rather than saving it.
  const buildExcel = async (statement) => {
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

      // Header Info. The statement number was removed, so date and VAT status
      // shift left into the columns it used to occupy.
      worksheet.getCell(`A${currentRow}`).value = "Statement Date:";
      worksheet.getCell(`B${currentRow}`).value = formatStatementDate(
        statement.generationDate
      );
      worksheet.getCell(`D${currentRow}`).value = "VAT Status:";
      worksheet.getCell(`E${currentRow}`).value = vatStatus === "NON_VAT" ? "Non VAT" : "VAT";
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
          formatLegDate(item.date),
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

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        blob: new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename: buildFilename("xlsx"),
      };
    } catch (err) {
      console.error("Error building Excel workbook:", err);
      // Surfaced by handleExport, which reports it and re-enables the buttons.
      throw err;
    }
  };

  /**
   * Print/export is what makes a statement real, so it is the moment we freeze
   * it. The server re-derives the figures, stores that snapshot, and returns the
   * payload; the document is rendered from that payload and the resulting file
   * is uploaded back against the same snapshot.
   *
   * Re-exporting content that has not changed hands back the document already on
   * file rather than producing a second one, so a reprint is byte-for-byte what
   * the subcontractor received the first time.
   */
  const handleExport = async (format) => {
    if (isGenerating || !statement || !companyInfo || !subcontractorInfo) return;

    if (!exportPeriod) {
      setExportError(true);
      setExportMessage("Cannot determine the statement period for this export.");
      return;
    }

    setIsGenerating(true);
    setExportError(false);
    setExportMessage("");

    try {
      const result = await requestStatementExport({
        subeiRegNum: subei_reg_num,
        period: exportPeriod,
        vatStatus,
        format,
      });

      if (!result.document_pending && result.export?.document_url) {
        openStoredDocument(result.export.document_url);
        setExportMessage(
          `Statement unchanged — re-issued the ${format} already on file.`
        );
        await refreshExports();
        return;
      }

      const snapshot = statementFromPayload(result.payload, {
        subcontractorName,
        subcontractorId,
        generationDate: date,
      });

      const { blob, filename } =
        format === "PDF" ? buildPdf(snapshot, await loadBrandLogo()) : await buildExcel(snapshot);

      saveBlob(blob, filename);

      // The snapshot exists either way; a failed upload leaves it without a
      // stored document rather than losing the record of the export.
      try {
        await uploadStatementDocument(result.export.export_id, blob, filename);
        setExportMessage(
          `${format} downloaded and saved to export history.`
        );
      } catch (uploadErr) {
        console.error("Error archiving statement document:", uploadErr);
        setExportError(true);
        setExportMessage(
          `${format} downloaded, but archiving the copy failed. The export is recorded; the stored document is missing.`
        );
      }

      await refreshExports();
    } catch (err) {
      console.error("Error exporting statement:", err);
      setExportError(true);
      setExportMessage(
        err.response?.data?.message || `Failed to export ${format}.`
      );
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

  // --- Search, sort, group -------------------------------------------------
  // Subtotals are computed over the whole filtered set, never over one page, so
  // a group's subtotal is always that group's real total. Grouping therefore
  // shows every row: a subtotal that disagreed with the rows beneath it would
  // be worse than a long table.
  const query = legQuery.trim().toLowerCase();
  const filteredLegs = query
    ? statement.workItems.filter((leg) =>
        [
          leg.clientName,
          leg.containerNumber,
          leg.destination,
          leg.instructionNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    : statement.workItems.slice();

  const sortedLegs = filteredLegs.sort((a, b) => {
    const left = a[sortKey];
    const right = b[sortKey];
    if (sortKey === "rate") return (Number(left) - Number(right)) * sortDir;
    if (sortKey === "date") return (new Date(left) - new Date(right)) * sortDir;
    return String(left ?? "").localeCompare(String(right ?? "")) * sortDir;
  });

  const filteredTotal = sortedLegs.reduce(
    (sum, leg) => sum + Number(leg.rate || 0),
    0
  );

  const isGrouped = grouping !== "None";
  const totalPages = Math.max(1, Math.ceil(sortedLegs.length / legsPerPage));
  const safePage = Math.min(legPage, totalPages);
  const pageStart = isGrouped ? 0 : (safePage - 1) * legsPerPage;
  const pagedLegs = isGrouped
    ? sortedLegs
    : sortedLegs.slice(pageStart, pageStart + legsPerPage);

  const legGroups = isGrouped
    ? buildLegGroups(pagedLegs, grouping, period, collapsedGroups)
    : [{ key: "all", showHeader: false, rows: pagedLegs }];

  const rangeLabel =
    sortedLegs.length === 0
      ? "No legs match this search"
      : isGrouped
      ? `Showing all ${sortedLegs.length} legs`
      : `Showing ${pageStart + 1}-${pageStart + pagedLegs.length} of ${
          sortedLegs.length
        }`;

  const legCountLabel = `${sortedLegs.length} ${
    sortedLegs.length === 1 ? "leg" : "legs"
  }`;

  const allLegsLabel = `${statement.workItems.length} ${
    statement.workItems.length === 1 ? "leg" : "legs"
  }`;

  const caretFor = (key) =>
    sortKey === key ? (sortDir === 1 ? " ↑" : " ↓") : "";

  const toggleSort = (key) => {
    setSortDir((dir) => (sortKey === key ? -dir : 1));
    setSortKey(key);
    setLegPage(1);
  };

  const sortableHeader = (key, label, className) => (
    <th
      className={`${className} sortable`}
      onClick={() => toggleSort(key)}
      title={`Sort by ${label}`}
    >
      {label}
      <span className="sort-caret">{caretFor(key)}</span>
    </th>
  );

  return (
    <div className="statement-detail-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          {/* Masthead */}
          <div className="statement-masthead">
            <div>
              {companyInfo.name && (
                <div className="company-name">{companyInfo.name}</div>
              )}
              <div className="company-tagline">
                Statement of work completed by subcontractor
              </div>
            </div>
            <div className="masthead-right">
              <div className="masthead-kicker">Subcontractor Statement</div>
              <div className="masthead-period">{periodLabel}</div>
            </div>
          </div>

          {/* Bill-to, key figures, and the export panel */}
          <div className="head-grid">
            <div className="meta-grid">
              <div>
                <div className="field-label">Bill to</div>
                <div className="billed-party">{subcontractorInfo.name}</div>
                <div className="billed-detail">
                  {subcontractorInfo.location}
                  <br />
                  Contact: {subcontractorInfo.contact_person}
                </div>
                <div className="meta-row-group">
                  <div>
                    <div className="field-label">Statement date</div>
                    <div className="field-value">
                      {formatStatementDate(date)}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Reg no</div>
                    <div className="field-value">{subei_reg_num}</div>
                  </div>
                  <div>
                    <div className="field-label">VAT status</div>
                    <div className="field-value">
                      {vatStatus === "NON_VAT" ? "Non VAT" : "VAT"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="total-callout">
                <div>
                  <div className="callout-label">Total amount due</div>
                  <div className="callout-value">
                    {formatRand(statement.summary.finalAmount)}
                  </div>
                </div>
                <div className="callout-meta">
                  {allLegsLabel} &middot; {periodLabel}
                </div>
              </div>
            </div>

            <aside className="export-panel">
              <div>
                <div className="field-label">Issue statement</div>
                <div className="export-buttons">
                  <button
                    className="export-btn primary"
                    onClick={() => handleExport("PDF")}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Working..." : "Download PDF"}
                  </button>
                  <button
                    className="export-btn secondary"
                    onClick={() => handleExport("XLSX")}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Working..." : "Download Excel"}
                  </button>
                </div>
                {/* Load-bearing, not decoration: exports render from the
                    server's frozen payload, so the search and paging below
                    cannot silently truncate a document. */}
                <div className="export-note">
                  Exports always contain every leg, regardless of the filters
                  below.
                </div>
              </div>

              {exportMessage && (
                <div
                  className={`export-message ${exportError ? "error" : "success"}`}
                  role="status"
                >
                  {exportMessage}
                </div>
              )}

              <div className="export-history">
                <div className="field-label">Export history</div>
                {exportHistory.length === 0 ? (
                  <div className="export-history-empty">
                    Not exported yet. Downloading a copy archives exactly what
                    was sent.
                  </div>
                ) : (
                  <div className="export-history-list">
                    {exportHistory.map((row) => {
                      const drifted =
                        Math.abs(
                          Number(row.amount) -
                            Number(statement.summary.finalAmount)
                        ) > 0.005;

                      return (
                        <div className="export-entry" key={row.export_id}>
                          <div className="export-entry-main">
                            <div className="export-entry-head">
                              <span className="export-format">
                                {row.document_format || "—"}
                              </span>{" "}
                              &middot; {formatRand(row.amount)}
                            </div>
                            <div className="export-entry-sub">
                              {new Date(row.exported_at).toLocaleString(
                                "en-ZA",
                                { dateStyle: "medium", timeStyle: "short" }
                              )}{" "}
                              &middot; {row.exported_by_name || "—"}
                            </div>
                            {drifted && (
                              <div className="export-drift">
                                Differs from current figures
                              </div>
                            )}
                          </div>
                          {row.document_url ? (
                            <button
                              className="export-open"
                              onClick={() =>
                                openStoredDocument(row.document_url)
                              }
                            >
                              Open
                            </button>
                          ) : (
                            <span className="export-missing">Not archived</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Work completed */}
          <div className="work-heading">
            <div className="work-title">Work completed</div>
            <div className="work-range">{rangeLabel}</div>
          </div>

          <div className="work-toolbar">
            <input
              type="text"
              className="leg-search"
              placeholder="Search client, container, destination..."
              value={legQuery}
              onChange={(e) => {
                setLegQuery(e.target.value);
                setLegPage(1);
              }}
            />

            <div className="group-toggle">
              <span className="group-label">Group</span>
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={`group-btn ${grouping === option ? "active" : ""}`}
                  onClick={() => {
                    setGrouping(option);
                    setCollapsedGroups({});
                    setLegPage(1);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            <select
              className="rows-per-page"
              value={legsPerPage}
              disabled={isGrouped}
              title={
                isGrouped
                  ? "Grouped statements show every leg, so each subtotal matches the rows beneath it"
                  : "Rows per page"
              }
              onChange={(e) => {
                setLegsPerPage(Number(e.target.value));
                setLegPage(1);
              }}
            >
              {LEGS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="table-container" ref={tableScrollRef}>
            <table className="work-items-table">
              <thead>
                <tr>
                  {sortableHeader("date", "Date", "col-date")}
                  {sortableHeader(
                    "containerNumber",
                    "Container no",
                    "col-starting"
                  )}
                  {sortableHeader("clientName", "Client", "col-client")}
                  {sortableHeader(
                    "destination",
                    "Destination",
                    "col-destination"
                  )}
                  {sortableHeader(
                    "instructionNumber",
                    "Instr no",
                    "col-instruction-number"
                  )}
                  {sortableHeader("rate", "Rate", "col-rate")}
                  <th className="col-instruction">Instructions</th>
                </tr>
              </thead>
              {legGroups.map((group) => (
                <tbody key={group.key}>
                  {group.showHeader && (
                    <tr
                      className="group-row"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.key]: !prev[group.key],
                        }))
                      }
                    >
                      <td colSpan="4" className="group-label-cell">
                        {group.collapsed ? "▸" : "▾"} {group.label}
                      </td>
                      <td className="group-count">{group.countLabel}</td>
                      <td className="group-subtotal">
                        {formatRand(group.subtotal)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {group.rows.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index % 2 === 0 ? "row-even" : "row-odd"}
                    >
                      <td className="col-date">{formatLegDate(item.date)}</td>
                      <td className="col-starting">{item.containerNumber}</td>
                      <td className="col-client">{item.clientName}</td>
                      <td className="col-destination">{item.destination}</td>
                      <td className="col-instruction-number">
                        {item.instructionNumber}
                      </td>
                      <td className="col-rate">{formatRand(item.rate)}</td>
                      <td className="col-instruction">{item.instruction}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <div className="work-footer">
            {!isGrouped && totalPages > 1 && (
              <div className="pager">
                <button
                  className="pager-btn"
                  onClick={() => setLegPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
                <span className="pager-summary">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  className="pager-btn"
                  onClick={() => setLegPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>
            )}

            <div className="totals-block">
              <div className="totals-row">
                <span>Subtotal &middot; {legCountLabel}</span>
                <span className="totals-value">{formatRand(filteredTotal)}</span>
              </div>
              <div className="totals-row grand">
                <span>Total amount due</span>
                <span className="totals-value grand-value">
                  {formatRand(statement.summary.finalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="statement-footnote">
            <span>{companyInfo.name}</span>
            <span>
              Statement period {periodLabel} &middot; {allLegsLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorStatementDetail;
