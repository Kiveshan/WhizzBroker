"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../css/ClientStatement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TransactionsTableWrapper from "./TransactionsTableWrapper.jsx";
import api from "../../../api"; // Import the axios instance

const ClientStatement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { statementId } = location.state || {};

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAgeAnalysisOpen, setIsAgeAnalysisOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transactionsState, setTransactionsState] = useState([]); // editable details
  const [isEditMode, setIsEditMode] = useState(false);

  // Add ref for PDF generation
  const statementRef = useRef(null);
  const roleId = JSON.parse(localStorage.getItem("user")).roleid;
  console.log(roleId);

  useEffect(() => {
    if (!statementId) {
      setError("No statement selected");
      setLoading(false);
      return;
    }

    const fetchStatement = async () => {
      try {
        // Use axios instead of fetch
        const response = await api.get(`/api/statement/${statementId}`);

        if (response.data.success) {
          console.log("Statement data received:", response.data.data); // Debug log
          console.log("Invoices data:", response.data.data.invoices); // Debug log for invoices
          console.log("Addons data:", response.data.data.addons); // Debug log for addons
          console.log("Payments data:", response.data.data.payments); // Debug log for payments
          setStatement(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch statement");
        }
      } catch (err) {
        console.error("Error fetching statement:", err);

        let errorMessage = "Failed to fetch statement";

        if (err.response) {
          const { status, data } = err.response;

          if (status === 401 || status === 403) {
            // Handle unauthorized or forbidden
            navigate("/");
            return;
          }

          errorMessage = data?.message || `HTTP error! Status: ${status}`;
        } else if (err.request) {
          errorMessage =
            "No response received from server. Please check your connection.";
        } else {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStatement();
  }, [statementId, navigate]);

  // When statement changes, seed editable transaction state
  useEffect(() => {
    if (!statement) return;

    const referenceCollator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const compareReferenceAsc = (a, b) =>
      referenceCollator.compare(String(a || ""), String(b || ""));

    const openingBalance = statement.opening_balance;

    // Totals for the statement month (server already filtered by month)
    const invoicedAmount =
      statement.invoices.reduce((sum, inv) => sum + inv.amount, 0) +
      statement.addons.reduce((sum, addon) => sum + addon.amount, 0);
    const amountPaid = statement.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const creditNotesAmount =
      statement.credit_notes?.reduce(
        (sum, creditNote) => sum + creditNote.amount,
        0
      ) || 0;
    const totalMonthPayments = amountPaid + creditNotesAmount;
    const insuranceCredit = Number.parseFloat(
      statement.insurance_amount || 0
    );

    // Build a single aggregated Payments row, then list all invoices/add-ons for the statement month
    const charges = [
      ...statement.invoices.map((invoice) => ({
        type: "Invoice",
        date: new Date(invoice.date),
        details: invoice.formatted_details || "",
        reference: invoice.invoice_num || "",
        amount: invoice.amount,
        payment: null,
      })),
      ...statement.addons.map((addon) => ({
        type: "Invoice",
        date: new Date(addon.date),
        details: addon.formatted_details || "",
        reference: addon.addon_num || addon.invoice_num || "",
        amount: addon.amount,
        payment: null,
      })),
    ].sort((a, b) => {
      const refDiff = compareReferenceAsc(a.reference, b.reference);
      if (refDiff !== 0) return refDiff;
      return a.date - b.date;
    });

    const insuranceRow =
      insuranceCredit > 0
        ? {
            type: "Insurance",
            date: new Date(statement.generation_date),
            details: "Monthly insurance credit",
            reference: "",
            amount: null,
            payment: insuranceCredit,
          }
        : null;

    const paymentsRow = {
      type: "Payments",
      date: new Date(statement.generation_date),
      details: totalMonthPayments > 0 ? "Payments & credit notes" : "",
      reference: "",
      amount: null,
      payment: totalMonthPayments,
    };

    const baseTransactions = [
      ...(insuranceRow ? [insuranceRow] : []),
      paymentsRow,
      ...charges,
    ];

    let running = openingBalance;
    const withBalance = baseTransactions.map((tx) => {
      if (tx.type === "Invoice" || tx.type === "Add-on") {
        running += tx.amount;
      } else if (tx.payment) {
        running -= tx.payment;
      }
      return { ...tx, balance: running };
    });

    setTransactionsState(withBalance);
  }, [statement]);

  // Helper to get display date as previous day
  const getDisplayDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    // subtract one day
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-GB");
  };

  // Generate PDF using jsPDF for consistent formatting
  const generatePDF = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Theme similar to ClientInvoice
      const brand = {
        primary: [45, 55, 72],
        accent: [70, 130, 180],
        gray: [110, 120, 140],
      };
      const fonts = { title: 16, header: 12, normal: 10, small: 9, tiny: 8 };
      const margins = { left: 10, right: 10, top: 10 };
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = margins.top;

      // Header band
      doc.setFillColor(...brand.primary);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fonts.title);
      doc.text(statement.company_name || "", margins.left, 12);
      doc.setFontSize(fonts.header);
      doc.setFont('helvetica', 'normal');
      doc.text('STATEMENT OF ACCOUNT', pageWidth - margins.right, 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      currentY = 18 + 6;

      // Two-column From / To
      const colGap = 8;
      const colWidth = (pageWidth - margins.left - margins.right - colGap) / 2;
      doc.setFontSize(fonts.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brand.gray);
      doc.text('FROM', margins.left, currentY);
      doc.text('TO', margins.left + colWidth + colGap, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      currentY += 5;

      const leftDetails = [
        statement.cluster_box,
        statement.address,
        statement.suburb,
        statement.vat_reg_num ? `VAT Reg No: ${statement.vat_reg_num}` : null,
        statement.phonenumber ? `Cellphone: ${statement.phonenumber}` : null,
      ].filter(Boolean);

      const safeClient = statement.client || {};
      const rightDetails = [
        safeClient.name,
        safeClient.address,
        safeClient.suburb,
        safeClient.phone ? `Telephone: ${safeClient.phone}` : null,
        safeClient.email ? `Email: ${safeClient.email}` : null,
      ].filter(Boolean);

      const maxLines = Math.max(leftDetails.length, rightDetails.length);
      for (let i = 0; i < maxLines; i++) {
        const leftText = leftDetails[i] ? String(leftDetails[i]) : null;
        const rightText = rightDetails[i] ? String(rightDetails[i]) : null;
        let rowHeight = 0;
        if (leftText) {
          const wrapped = doc.splitTextToSize(leftText, colWidth);
          doc.text(wrapped, margins.left, currentY);
          rowHeight = Math.max(rowHeight, wrapped.length * 5);
        }
        if (rightText) {
          const wrappedR = doc.splitTextToSize(rightText, colWidth);
          doc.text(wrappedR, margins.left + colWidth + colGap, currentY);
          rowHeight = Math.max(rowHeight, wrappedR.length * 5);
        }
        currentY += Math.max(5, rowHeight || 5);
      }
      currentY += 4;

      // Statement meta row
      doc.setFontSize(fonts.normal);
      const metaRight = `Date: ${getDisplayDate(statement.generation_date)}`;
      doc.text(metaRight, pageWidth - margins.right, currentY, { align: 'right' });
      currentY += 8;

      // Account Summary table
      const openingBalance = statement.opening_balance;
      const invoicedAmount = statement.invoices.reduce((s, i) => s + i.amount, 0) + statement.addons.reduce((s, a) => s + a.amount, 0);
      const amountPaid = statement.payments.reduce((s, p) => s + p.amount, 0);
      const creditNotesAmount = (statement.credit_notes || []).reduce(
        (s, c) => s + c.amount,
        0
      );
      const insuranceCredit = Number.parseFloat(
        statement.insurance_amount || 0
      );
      const totalAmountPaid = amountPaid + creditNotesAmount;
      const totalCredits = totalAmountPaid + insuranceCredit;
      const balanceDue = openingBalance - totalCredits + invoicedAmount;

      const summaryRows = [
        ["Opening Balance", `R${openingBalance.toFixed(2)}`],
        ["Invoiced Amount", `R${invoicedAmount.toFixed(2)}`],
        ["Payments & Credit Notes", `R${totalAmountPaid.toFixed(2)}`],
      ];

      if (insuranceCredit > 0) {
        summaryRows.push(["Insurance Credit", `R${insuranceCredit.toFixed(2)}`]);
      }

      summaryRows.push(["Balance Due", `R${balanceDue.toFixed(2)}`]);

      autoTable(doc, {
        startY: currentY,
        head: [["Description", "Amount"]],
        body: summaryRows,
        theme: "grid",
        styles: { fontSize: fonts.small, cellPadding: 1.6, lineWidth: 0.1, lineColor: brand.gray },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
        margin: { left: margins.left, right: margins.right },
      });
      currentY = doc.lastAutoTable.finalY + 6;

      // Transactions table
      const sourceTransactions =
        transactionsState && transactionsState.length > 0
          ? transactionsState
          : transactionsWithBalance;

      const txRows = sourceTransactions.map((tx) => {
        let detailsForPdf = tx.details || "";

        // Only for PDF: Replace the arrow with " - " and clean up spacing
        if (detailsForPdf.includes("→")) {
          detailsForPdf = detailsForPdf
            .replace(/→/g, "-")
            .replace(/\s*-\s*/g, " - ")
            .trim();
        }

        // Optional: Force wrap long lines better by limiting consecutive spaces
        detailsForPdf = detailsForPdf.replace(/\s+/g, " ");

        return [
          tx.date.toLocaleDateString("en-GB"),
          tx.type,
          detailsForPdf,
          tx.reference || "",
          tx.amount ? `R${tx.amount.toFixed(2)}` : "",
          tx.payment ? `R${tx.payment.toFixed(2)}` : "",
          `R${tx.balance.toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Date", "Transaction", "Details", "Reference", "Amount", "Payment", "Balance"]],
        body: [
          [getDisplayDate(statement.generation_date), "Opening Balance", "", "", "R0", "", `R${openingBalance.toFixed(2)}`],
          ...txRows,
        ],
        theme: "grid",
        styles: {
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: fonts.tiny,
          cellPadding: 1.4,
          lineWidth: 0.1,
          lineColor: brand.gray,
          overflow: 'linebreak',
          valign: 'top',
          lineHeight: 1.2,
        },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 20 }, // Date
          1: { cellWidth: 20 }, // Transaction
          2: { cellWidth: 72, overflow: 'linebreak' }, // Details (wider)
          3: { cellWidth: 18 }, // Reference (narrower)
          4: { cellWidth: 20, halign: 'right' }, // Amount
          5: { cellWidth: 20, halign: 'right' }, // Payment
          6: { cellWidth: 20, halign: 'right' }, // Balance
        },
        tableWidth: pageWidth - margins.left - margins.right,
        margin: { left: margins.left, right: margins.right },
        rowPageBreak: 'auto',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            // Ensure multi-line wrapping behaves predictably for Details
            data.cell.styles.overflow = 'linebreak';
            data.cell.styles.valign = 'top';
          }
        },
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(str, pageWidth - margins.right, pageHeight - 6, { align: 'right' });
        },
      });

      currentY = doc.lastAutoTable.finalY + 6;

      // Age Analysis table - reordered: 91+, 61-90, 31-60, Current
      autoTable(doc, {
        startY: currentY,
        head: [["91 Days +", "61-90 Days", "31-60 Days", "Current"]],
        body: [[
          `R${statement.aging["90days"].toFixed(2)}`,
          `R${statement.aging["60days"].toFixed(2)}`,
          `R${statement.aging["30days"].toFixed(2)}`,
          `R${statement.aging.current.toFixed(2)}`,
        ]],
        theme: "grid",
        styles: { fontSize: fonts.small, cellPadding: 1.6, lineWidth: 0.1, lineColor: brand.gray },
        headStyles: { fillColor: brand.accent, textColor: [255,255,255], fontStyle: "bold" },
        margin: { left: margins.left, right: margins.right },
      });

      // Save
      const fileName = `Statement-${statement.statement_key}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading)
    return (
      <div className="client-statement-wrapper">
        <div>Loading statement...</div>
      </div>
    );
  if (error)
    return (
      <div className="client-statement-wrapper">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  if (!statement)
    return (
      <div className="client-statement-wrapper">
        <div>Please select a statement from the list.</div>
      </div>
    );

  // Calculate totals (include payments and credit notes)
  const invoicedAmount =
    statement.invoices.reduce((sum, inv) => sum + inv.amount, 0) +
    statement.addons.reduce((sum, addon) => sum + addon.amount, 0);
  const amountPaid = statement.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const creditNotesAmount =
    statement.credit_notes?.reduce(
      (sum, creditNote) => sum + creditNote.amount,
      0
    ) || 0;
  const totalAmountPaid = amountPaid + creditNotesAmount;
  const insuranceCredit = Number.parseFloat(statement.insurance_amount || 0);
  const totalCredits = totalAmountPaid + insuranceCredit;
  const openingBalance = statement.opening_balance; // Use the stored opening balance
  const balanceDue = openingBalance - totalCredits + invoicedAmount;

  // Helper: fix strings that arrive with spaces between every character
  const fixTokenSpacing = (s) => {
    if (!s) return s;
    const tokens = String(s).trim().split(/\s+/);
    const singleCount = tokens.filter((t) => t.length === 1).length;
    if (tokens.length === 0) return '';
    // Only rebuild if most tokens are single letters (likely corrupted spacing)
    if (singleCount < tokens.length * 0.6) {
      return tokens.join(' ');
    }
    const rebuilt = [];
    let buffer = '';
    for (const tok of tokens) {
      if (tok.length === 1) {
        buffer += tok;
      } else {
        if (buffer) {
          rebuilt.push(buffer);
          buffer = '';
        }
        rebuilt.push(tok);
      }
    }
    if (buffer) rebuilt.push(buffer);
    return rebuilt.join(' ');
  };

  // Helper function to format invoice and addon details
  const formatDetails = (item, type) => {
    if (type === "Invoice") {
      const pickup = fixTokenSpacing(item.pickup || "");
      const dropoff = fixTokenSpacing(item.dropoff || "");
      console.log("Invoice details:", { pickup, dropoff, item }); // Debug log
      if (pickup && dropoff) {
        return `${pickup} → ${dropoff}`.replace(/\s+/g, ' ').trim();
      } else if (pickup) {
        return pickup.replace(/\s+/g, ' ').trim();
      } else if (dropoff) {
        return `→ ${dropoff}`.replace(/\s+/g, ' ').trim();
      } else {
        return fixTokenSpacing(item.task || item.invoice_num || `Invoice #${item.ikey}`).replace(/\s+/g, ' ').trim();
      }
    } else if (type === "Add-on") {
      console.log("Addon details:", { item }); // Debug log
      return fixTokenSpacing(item.description || item.invoice_num || `Add-on #${item.addon_id}`).replace(/\s+/g, ' ').trim();
    } else if (type === "Credit Note") {
      console.log("Credit Note details:", { item }); // Debug log
      return fixTokenSpacing(item.description || `Credit Note #${item.credit_note_id}`).replace(/\s+/g, ' ').trim();
    }
    return "";
  };

  // Build transactions array for UI/PDF: single Payments row, then all invoices/add-ons for the statement month
  const referenceCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const compareReferenceAsc = (a, b) =>
    referenceCollator.compare(String(a || ""), String(b || ""));

  const charges = [
    ...statement.invoices.map((invoice) => ({
      type: "Invoice",
      date: new Date(invoice.date),
      details: formatDetails(invoice, "Invoice"),
      reference: invoice.invoice_num || "",
      amount: invoice.amount,
      payment: null,
    })),
    ...statement.addons.map((addon) => ({
      type: "Invoice",
      date: new Date(addon.date),
      details: formatDetails(addon, "Add-on"),
      reference: addon.addon_num || addon.invoice_num || "",
      amount: addon.amount,
      payment: null,
    })),
  ].sort((a, b) => {
    const refDiff = compareReferenceAsc(a.reference, b.reference);
    if (refDiff !== 0) return refDiff;
    return a.date - b.date;
  });

  const insuranceRow =
    insuranceCredit > 0
      ? {
          type: "Insurance",
          date: new Date(statement.generation_date),
          details: "Monthly insurance credit",
          reference: "",
          amount: null,
          payment: insuranceCredit,
        }
      : null;

  const paymentsRow = {
    type: "Payments",
    date: new Date(statement.generation_date),
    details: totalAmountPaid > 0 ? "Payments & credit notes" : "",
    reference: "",
    amount: null,
    payment: totalAmountPaid,
  };

  const transactions = [
    ...(insuranceRow ? [insuranceRow] : []),
    paymentsRow,
    ...charges,
  ];

  // Calculate running balance
  let runningBalance = openingBalance; // Start with the opening balance
  const transactionsWithBalance = transactions.map((tx) => {
    if (tx.type === "Invoice" || tx.type === "Add-on") {
      runningBalance += tx.amount;
    } else if (tx.payment) {
      runningBalance -= tx.payment;
    }
    return { ...tx, balance: runningBalance };
  });

  // Determine if this is a small table that should fit on one page
  const isSmallTable = transactions.length <= 3; // Update to consider total transactions

  // Use editable state for UI transactions when available
  const uiTransactions =
    transactionsState && transactionsState.length > 0
      ? transactionsState
      : transactionsWithBalance;

  const handleDetailChange = (index, value) => {
    setTransactionsState((prev) => {
      const next = prev && prev.length > 0 ? [...prev] : [...transactionsWithBalance];
      if (!next[index]) return next;
      next[index] = { ...next[index], details: value };
      return next;
    });
  };

  return (
    <div className="client-statement-wrapper">
      <div className="statement-page">
        <div className="statement-paper" ref={statementRef}>
          {/* Header */}
          <div className="statement-header1">
            <h1>{statement.company_name}</h1>
          </div>

          {/* Statement Info and Client Info Section */}
          <div className="statement-info-section">
            {/* Client Info - Left Side */}
            <div className="client-info">
              <div className="to-label">To</div>
              {statement.client && (
                <>
                  {statement.client.representative && (
                    <div className="client-name">
                      {statement.client.representative}
                    </div>
                  )}
                  {statement.client.name && (
                    <div className="client-name">{statement.client.name}</div>
                  )}
                  {statement.client.email && (
                    <div className="client-email">{statement.client.email}</div>
                  )}
                  {statement.client.phone && (
                    <div className="client-phone">{statement.client.phone}</div>
                  )}
                  {(statement.client.address || statement.client.suburb) && (
                    <div
                      className="client-address"
                      style={{ maxWidth: "250px", overflowWrap: "break-word" }}
                    >
                      {statement.client.address}
                      {statement.client.suburb
                        ? `, ${statement.client.suburb}`
                        : ""}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Statement Title and Account Summary - Right Side */}
            <div className="statement-title">
              <h2>Statement of Accounts</h2>
              <div className="statement-date">
                {getDisplayDate(statement.generation_date)}
              </div>

              <h3>Account Summary</h3>

              <table className="summary-table">
                <tbody>
                  <tr>
                    <td className="summary-label">Opening Balance</td>
                    <td className="summary-value">
                      R{openingBalance.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="summary-label">Invoiced Amount</td>
                    <td className="summary-value">
                      R{invoicedAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="summary-label">Payments &amp; Credit Notes</td>
                    <td className="summary-value">
                      R{totalAmountPaid.toFixed(2)}
                    </td>
                  </tr>
                  {insuranceCredit > 0 && (
                    <tr>
                      <td className="summary-label">Insurance Credit</td>
                      <td className="summary-value">
                        R{insuranceCredit.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="summary-label">Balance Due:</td>
                    <td className="summary-value">R{balanceDue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Horizontal Line */}
          <div className="statement-divider"></div>

          {/* Transactions Table - Now wrapped with TransactionsTableWrapper */}
          <div
            className={`transactions-section ${
              isSmallTable ? "small-table" : ""
            }`}
          >
            <div className="statement-transactions-actions">
              <button
                type="button"
                className="edit-details-btn"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? "Done Editing Details" : "Edit Details"}
              </button>
            </div>
            <TransactionsTableWrapper>
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>Date</th>
                    <th style={{ width: "15%" }}>Transactions</th>
                    <th style={{ width: "25%" }}>Details</th>
                    <th style={{ width: "15%" }}>Reference</th>
                    <th style={{ width: "12%" }}>Amount</th>
                    <th style={{ width: "12%" }}>Payments</th>
                    <th style={{ width: "12%" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {getDisplayDate(statement.generation_date)}
                    </td>
                    <td>Opening Balance</td>
                    <td></td>
                    <td></td>
                    <td>R0</td>
                    <td></td>
                    <td>R{openingBalance.toFixed(2)}</td>
                  </tr>
                  {uiTransactions.map((tx, index) => (
                    <tr key={index}>
                      <td>{tx.date.toLocaleDateString("en-GB")}</td>
                      <td>{tx.type}</td>
                      <td>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={tx.details || ""}
                            onChange={(e) =>
                              handleDetailChange(index, e.target.value)
                            }
                            style={{ width: "100%" }}
                          />
                        ) : (
                          tx.details
                        )}
                      </td>
                      <td>{tx.reference || ""}</td>
                      <td>{tx.amount ? `R${tx.amount.toFixed(2)}` : ""}</td>
                      <td>{tx.payment ? `R${tx.payment.toFixed(2)}` : ""}</td>
                      <td>R{tx.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TransactionsTableWrapper>
          </div>

          {/* Balance Due Summary */}
          <div className="balance-due-summary">
            <div className="balance-due-label">Balance Due</div>
            <div className="balance-due-amount">R{balanceDue.toFixed(2)}</div>
          </div>

          {/* Age Analysis */}
          <div
            className={`age-analysis-section ${
              isSmallTable ? "small-table" : ""
            }`}
          >
            <div
              className="age-analysis-header"
              onClick={() => setIsAgeAnalysisOpen(!isAgeAnalysisOpen)}
            >
              <span>Age Analysis</span>
              <span
                className={`dropdown-arrow ${isAgeAnalysisOpen ? "open" : ""}`}
              >
                ▼
              </span>
            </div>

            {isAgeAnalysisOpen && (
              <div className="age-analysis-content">
                <table className="age-analysis-table">
                  <thead>
                    <tr>
                      <th>91 Days +</th>
                      <th>61-90 Days</th>
                      <th>31-60 Days</th>
                      <th>Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>R{statement.aging["90days"].toFixed(2)}</td>
                      <td>R{statement.aging["60days"].toFixed(2)}</td>
                      <td>R{statement.aging["30days"].toFixed(2)}</td>
                      <td>R{statement.aging.current.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="statementdownloadbtn1">
          <button
            className={`download-btn ${isGenerating ? "generating" : ""}`}
            onClick={generatePDF}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientStatement;
