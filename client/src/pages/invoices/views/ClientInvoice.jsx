"use client";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../css/InvoiceTemplate.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../../api";

// Utility function for formatting dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

// Utility function for formatting currency
const formatCurrency = (amount) => {
  if (!amount || amount === 0) return "R 0.00";
  return `R ${Number(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Debug utility
const debug = (message, data) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data);
  }
};

// Utility function to compute correct surcharge amount per container type
const getSurchargeAmount = (container) => {
  if (!container.add_surcharges) return 0;
  return container.is_12m_surcharge
    ? (container.surcharge_12m_amount || 0)
    : (container.surcharge_amount || 0);
};

const ClientInvoice = forwardRef(({ 
  previewData, 
  isPreview = false, 
  instructionId,
  onClosePreview 
}, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Extract ID from URL or location state
  const id = params.id || (location.state && location.state.id);

  // Get client information if available
  const clientInfo = location.state || {};
  const { clientId, clientName, returnToClientView } = clientInfo;

  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Add preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(isPreview);
  const componentRef = useRef(null);
  const invoiceRef = useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({
    amount: "",
    invoice_num: "",
    additional_destination_info: "",
    date: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Use ref forwarding
  useImperativeHandle(ref, () => ({
    generatePDF: () => generatePDF()
  }));

  // Update data source for preview mode
  const finalInvoiceData = previewData || invoiceData;

  // Disable editing in preview mode
  const canEdit = !isPreviewMode && !isPreview && JSON.parse(localStorage.getItem("user")).roleid === 3;

  useEffect(() => {
    let isMounted = true;

    const fetchInvoiceData = async () => {
      try {
        if (!id && !previewData) {
          if (isMounted) {
            setError("No invoice ID provided");
            setLoading(false);
          }
          return;
        }

        // If we have preview data, use it directly
        if (previewData) {
          if (isMounted) {
            setInvoiceData(previewData);
            setEditData({
              amount: previewData.total_cost || "",
              invoice_num: previewData.invoice_num || "",
              additional_destination_info: previewData.additional_destination_info || "",
              date: previewData.date || "",
            });
            setLoading(false);
          }
          return;
        }

        const requestUrl = `/api/invoices/${id}`;
        debug("Fetching invoice data from:", requestUrl);

        const response = await api.get(requestUrl);

        debug("Response status:", response.status);
        debug("Received invoice data:", response.data);

        if (response.data.data && response.data.data.containers) {
          response.data.data.containers = response.data.data.containers.map(
            (container) => ({
              container_number:
                container.container_number || container.containernum || "",
              weight: container.weight || null,
              container_type: container.container_type || "",
              container_type_key: container.container_type_key || "",
              cargo_description: container.cargo_description || "",
              add_surcharges: container.add_surcharges || false,
              hazardous: container.hazardous || false,
              surcharge_amount: container.surcharge_amount || 0,
              is_12m_surcharge: container.is_12m_surcharge || false,
              surcharge_12m_amount: container.surcharge_12m_amount || 0,
              hazardous_amount: container.hazardous_amount || 0,
              vgm: container.vgm || false,
              vgm_amount: container.vgm_amount || 0,
              truckregnumber: container.truckregnumber || null,
              rate_per_container: container.rate_per_container || 0,
              leg_rate: container.leg_rate || 0,
              base_rate: container.base_rate || 0,
              has_special_rate: container.has_special_rate || false,
              leg_date: container.leg_date || null,
            })
          );
        }

        if (isMounted) {
          setInvoiceData(response.data.data);
          setEditData({
            amount: response.data.data.total_cost || "",
            invoice_num: response.data.data.invoice_num || "",
            additional_destination_info: response.data.data.additional_destination_info || "",
            date: response.data.data.date || "",
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching invoice data:", err);

        if (isMounted) {
          let errorMessage = "Failed to load invoice data";

          if (err.response) {
            const { status, data } = err.response;

            if (status === 401 || status === 403) {
              navigate("/");
              return;
            }

            if (
              typeof data === "string" &&
              (data.trim().startsWith("<!DOCTYPE") ||
                data.trim().startsWith("<html"))
            ) {
              errorMessage =
                "Received HTML instead of JSON. This may indicate a proxy configuration issue.";
            } else {
              errorMessage = `HTTP error! Status: ${status}. ${
                data?.message || data || ""
              }`;
            }
          } else if (err.request) {
            errorMessage =
              "No response received from server. Please check your connection.";
          } else {
            errorMessage = err.message;
          }

          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    if (!isPreview) {
      fetchInvoiceData();
    }

    return () => {
      isMounted = false;
    };
  }, [id, navigate, previewData, isPreview]);

  // NEW: Handle PDF generation event for preview
  useEffect(() => {
    const handleGeneratePDF = () => {
      generatePDF();
    };

    document.addEventListener('generatePDF', handleGeneratePDF);
    return () => document.removeEventListener('generatePDF', handleGeneratePDF);
  }, [finalInvoiceData]);

  const handleEditClick = () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      return;
    }
    setIsEditMode(true);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditData({
      amount: finalInvoiceData.total_cost || "",
      invoice_num: finalInvoiceData.invoice_num || "",
      additional_destination_info: finalInvoiceData.additional_destination_info || "",
      date: finalInvoiceData.date || "",
    });
    setSaveError(null);
    setShowConfirmDialog(false);
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveClick = () => {
    if (isPreviewMode) return; // Disable save in preview mode
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    if (isPreviewMode) return; // Disable save in preview mode

    setSaveLoading(true);
    setSaveError(null);

    try {
      const updateData = {
        m1key: finalInvoiceData.m1key,
        rate: editData.amount ? Number.parseFloat(editData.amount) : undefined,
        invoice_num: editData.invoice_num || undefined,
        additional_destination_info: editData.additional_destination_info || undefined,
        date: editData.date || undefined,
      };

      const response = await api.put(
        "/api/invoice/update-instruction",
        updateData
      );

      if (response.data.success) {
        setInvoiceData({
          ...finalInvoiceData,
          total_cost: response.data.data.total_cost || finalInvoiceData.total_cost,
          invoice_num:
            response.data.data.invoice_num || finalInvoiceData.invoice_num,
          additional_destination_info: 
            response.data.data.additional_destination_info || finalInvoiceData.additional_destination_info,
          date: response.data.data.date || finalInvoiceData.date,
        });
        setIsEditMode(false);
        setShowConfirmDialog(false);
      } else {
        setSaveError(response.data.message || "Failed to save changes");
      }
    } catch (err) {
      console.error("Error saving invoice changes:", err);
      setSaveError(
        err.response?.data?.message || err.message || "Failed to save changes"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const calculateVAT = (amount) => {
    if (finalInvoiceData?.invoice?.vat_amount !== undefined) {
      return Number(finalInvoiceData.invoice.vat_amount);
    }

    if (finalInvoiceData?.vat !== undefined && finalInvoiceData?.vat !== null && amount) {
      const vatRate = Number(finalInvoiceData.vat) / 100;
      return amount * vatRate;
    }

    return 0;
  };

  const generatePDF = () => {
    setPdfLoading(true);

    try {
      const pdfContainers = finalInvoiceData.containers || [];
      const weightItems = finalInvoiceData.weightItems || [];
      const isWeightBased = Number(finalInvoiceData.shipment_type_key) === 4;
      const isCompactLayout = true;

      // Create new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Brand and typography
      const brand = {
        primary: [45, 55, 72], // dark slate
        accent: [70, 130, 180], // steel blue
        light: [245, 247, 250],
        gray: [110, 120, 140],
      };

      // Set up fonts and sizes based on layout (smaller to ensure 10+ rows per page)
      const fonts = isCompactLayout
        ? {
            title: 16,
            header: 12,
            normal: 10,
            small: 9,
            tiny: 8,
          }
        : {
            title: 18,
            header: 14,
            normal: 11,
            small: 10,
            tiny: 9,
          };

      // Reduced margins for maximum space utilization
      const margins = {
        left: isCompactLayout ? 10 : 15,
        right: isCompactLayout ? 10 : 15,
        top: isCompactLayout ? 10 : 15,
      };

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = margins.top;

      // Header band
      doc.setFillColor(...brand.primary);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fonts.title);
      doc.text(finalInvoiceData.companyname || "", margins.left, 12);
      doc.setFontSize(fonts.header);
      doc.setFont('helvetica', 'normal');
      doc.text('TAX INVOICE', pageWidth - margins.right, 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      currentY = 18 + 6;
      // Two-column Company (From) and Client (Bill To)
      const colGap = 8;
      const colWidth = (pageWidth - margins.left - margins.right - colGap) / 2;
      doc.setFontSize(fonts.small);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brand.gray);
      doc.text('FROM', margins.left, currentY);
      doc.text('BILL TO', margins.left + colWidth + colGap, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      currentY += 5;

      const leftDetails = [
        finalInvoiceData.cluster_box,
        finalInvoiceData.address,
        finalInvoiceData.suburb,
        `VAT Reg No: ${finalInvoiceData.vat_reg_num || ''}`,
        `Cellphone: ${finalInvoiceData.phonenumber || ''}`,
      ].filter(Boolean);

      const rightDetails = [
        finalInvoiceData.client_name,
        finalInvoiceData.client_address,
        finalInvoiceData.client_suburb,
        `Telephone: ${finalInvoiceData.client_telephone || ''}`,
        `Email: ${finalInvoiceData.client_email || ''}`,
        `VAT Reg No: ${finalInvoiceData.client_vat || ''}`,
      ].filter(Boolean);

      const maxLines = Math.max(leftDetails.length, rightDetails.length);
      for (let i = 0; i < maxLines; i++) {
        if (leftDetails[i]) {
          doc.text(String(leftDetails[i]), margins.left, currentY);
        }
        if (rightDetails[i]) {
          doc.text(String(rightDetails[i]), margins.left + colWidth + colGap, currentY);
        }
        currentY += 5;
      }
      currentY += 4;

      // Invoice meta row (Invoice No and Date)
      doc.setFontSize(fonts.normal);
      doc.setFont('helvetica', 'normal');
      const invMetaLeft = `Invoice No: ${finalInvoiceData.invoice_num || ''}`;
      const invoiceDateForPdf = editData.date || finalInvoiceData.date;
      const invMetaRight = `Date: ${formatDate(invoiceDateForPdf)}`;
      doc.text(invMetaLeft, margins.left, currentY);
      doc.text(invMetaRight, pageWidth - margins.right, currentY, { align: 'right' });
      currentY += 8;

      // Destination table (compact)
      doc.setFontSize(fonts.small);

      // Destination Table - Updated to include additional destination info
      const destinationRoute = `${finalInvoiceData.pickup || ""} to ${
        finalInvoiceData.dropoff || ""
      }`;
      const destinationData = [["Destination", destinationRoute]];
      
      // Add additional destination info if it exists
      if (finalInvoiceData.additional_destination_info) {
        destinationData.push(["Additional Info", finalInvoiceData.additional_destination_info]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: destinationData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 1.2,
          lineWidth: 0.1,
          overflow: 'ellipsize',
          lineColor: brand.gray,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 32 },
          1: { cellWidth: "auto" },
        },
        margin: { left: margins.left, right: margins.right },
      });

      currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 5 : 7);

      // Invoice details table (Booking Ref, File Number, Description, Vessel/Ref)
      const detailsRows = [
        ["Booking Ref", finalInvoiceData.booking_ref || ""],
        ["File Number", finalInvoiceData.file_no || ""],
        ["Description", finalInvoiceData.description || ""],
        ["Vessel/Ref", finalInvoiceData.vessel_name || ""],
      ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

      if (detailsRows.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [],
          body: detailsRows,
          theme: "grid",
          styles: {
            fontSize: fonts.small,
            cellPadding: 1.2,
            lineWidth: 0.1,
            overflow: 'ellipsize',
            lineColor: brand.gray,
          },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 32 },
            1: { cellWidth: "auto" },
          },
          margin: { left: margins.left, right: margins.right },
        });

        currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 5 : 7);
      }

      // Table for items: weight items when shipment_type_key=4, otherwise containers
      let tableHeaders = [];
      let tableData = [];
      const isSetRate = finalInvoiceData.is_set_rate === true || finalInvoiceData.rateweight === "SetRate";
      if (isSetRate) {
        // Use weight table structure with Unit Rate column only (no Price for set rate)
        tableHeaders = [
          "KSM/DM No",
          "Ticket No",
          "Receipt Book No",
          "Weight",
          "Unit Rate",
        ];
        tableData = (weightItems && weightItems.length > 0)
          ? weightItems.map((wi) => [
              wi.ksm_dm_no || "",
              wi.ticket_no || "",
              wi.receipt_book_no || "",
              (Number(wi.weight || 0)).toFixed(2),
              formatCurrency(Number(wi.unitrate || 0)),
            ])
          : [["No weight items", "", "", "", ""]];
      } else if (isWeightBased) {
        tableHeaders = [
          "KSM/DM No",
          "Ticket No",
          "Receipt Book No",
          "Weight",
          "Unit Rate",
          "Price",
        ];
        tableData = (weightItems && weightItems.length > 0)
          ? weightItems.map((wi) => [
              wi.ksm_dm_no || "",
              wi.ticket_no || "",
              wi.receipt_book_no || "",
              (Number(wi.weight || 0)).toFixed(2),
              formatCurrency(Number(wi.unitrate || 0).toFixed ? Number(wi.unitrate || 0) : wi.unitrate || 0),
              formatCurrency(Number(wi.price || 0)),
            ])
          : [["No weight items", "", "", "", "", ""]];
      } else {
        // Enhanced Container Table with all new columns - Updated for PDF
        const hasWeights = pdfContainers.some(
          (container) => container.weight && container.weight !== "N/A"
        );
        const hasSurcharges = pdfContainers.some(
          (container) =>
            container.add_surcharges || container.surcharge_amount > 0
        );
        const hasHazardous = pdfContainers.some(
          (container) => container.hazardous || container.hazardous_amount > 0
        );
        const hasVGM = pdfContainers.some(
          (container) => container.vgm || container.vgm_amount > 0
        );
        const hasTrucks = pdfContainers.some(
          (container) => container.truckregnumber
        );
        // Determine column visibility
        const containerHeaders = ["#", "Cont. No", "Type"];
        if (hasWeights) containerHeaders.push("Weight");
        if (hasTrucks) containerHeaders.push("Truck");
        // Always show Base Rate column
        containerHeaders.push("Base");
        if (hasSurcharges) containerHeaders.push("Surch.");
        if (hasHazardous) containerHeaders.push("Haz");
        if (hasVGM) containerHeaders.push("VGM");
        // Always show Total column
        containerHeaders.push("Total");

        tableHeaders = containerHeaders;
        tableData =
          pdfContainers.length > 0
            ? pdfContainers.map((container, index) => {
                const row = [
                  index + 1,
                  container.container_number || "N/A",
                  container.container_type || "Standard"
                ];

                if (hasWeights && container.weight && container.weight !== "N/A") {
                  row.push(`${container.weight} kg`);
                } else if (hasWeights) {
                  row.push("-");
                }
                if (hasTrucks) {
                  row.push(container.truckregnumber || "-");
                }
                const baseRateValue = container.base_rate || 0;
                row.push(formatCurrency(baseRateValue || 0));
                if (hasSurcharges) {
                  const surchargeAmt = getSurchargeAmount(container);
                  const surchargeText = surchargeAmt > 0 ? formatCurrency(surchargeAmt) : "-";
                  row.push(surchargeText);
                }
                if (hasHazardous) {
                  const hazardText =
                    container.hazardous_amount > 0
                      ? formatCurrency(container.hazardous_amount)
                      : "-";
                  row.push(hazardText);
                }
                if (hasVGM) {
                  const vgmText =
                    container.vgm_amount > 0
                      ? formatCurrency(container.vgm_amount)
                      : "-";
                  row.push(vgmText);
                }
                const totalValue = (baseRateValue || 0)
                  + getSurchargeAmount(container)
                  + (container.hazardous_amount || 0)
                  + (container.vgm_amount || 0);
                row.push(formatCurrency(totalValue));
                return row;
              })
            : [["No container information", "", "", "", "", "", "", "", ""]];
      }

      // Calculate available height for the table and enforce compact row styling
      const footerReserve = 16; // space for footer
      const availableHeight = pageHeight - currentY - footerReserve - 10; // include bottom margin

      autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: fonts.tiny,
          cellPadding: 1.0,
          lineWidth: 0.1,
          overflow: 'ellipsize',
          lineColor: brand.gray,
        },
        headStyles: {
          fillColor: brand.accent,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: isWeightBased ? 28 : 10 }, // thin index column in container view
          1: { cellWidth: isWeightBased ? 22 : 28 },
          2: { cellWidth: isWeightBased ? 32 : undefined },
          3: { cellWidth: isWeightBased ? 16 : undefined },
          4: { cellWidth: isWeightBased ? 22 : undefined },
          5: { cellWidth: isWeightBased ? 22 : undefined },
          // remaining numeric columns kept compact
        },
        margin: { left: margins.left, right: margins.right },
        tableWidth: pageWidth - margins.left - margins.right,
        bodyStyles: {
          valign: 'middle',
        },
        rowPageBreak: 'avoid',
        pageBreak: 'auto',
        didParseCell: (data) => {
          // Force header row height to be minimal and readable
          if (data.section === 'head') {
            data.cell.styles.minCellHeight = 6;
          } else {
            data.cell.styles.minCellHeight = 5.5;
          }
        },
        didDrawPage: (data) => {
          // Footer with page numbers
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            str,
            pageWidth - margins.right,
            pageHeight - 6,
            { align: 'right' }
          );
        },
      });

      currentY = doc.lastAutoTable.finalY + (isCompactLayout ? 8 : 10);

      // Calculate invoice values - FIXED
      const amount = isSetRate
        ? (finalInvoiceData.total_cost || 0)
        : isWeightBased
        ? (weightItems || []).reduce((sum, wi) => sum + Number(wi.price || 0), 0)
        : (finalInvoiceData.total_cost || 0);
      const vatRate = finalInvoiceData.vat ? (Number(finalInvoiceData.vat) / 100) : 0;
      const vat = amount * vatRate;
      const total = amount + vat;

      // FIXED Summary Table - Proper two-column layout
      const summaryHeaders = ["Description", "Amount"];
      const summaryData = [
        ["Amount (excl. VAT)", formatCurrency(amount)],
        ...(vat > 0 ? [["VAT (" + finalInvoiceData.vat + "%)", formatCurrency(vat)]] : []),
        ["Total Amount", formatCurrency(total)],
      ];

      // Estimate height needed for summary table: header row + body rows at ~9mm each
      const summaryRowHeight = 9;
      const summaryTableHeight = (1 + summaryData.length) * summaryRowHeight;
      const bottomMargin = 16; // reserve for footer
      if (currentY + summaryTableHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = margins.top;
      }

      autoTable(doc, {
        startY: currentY,
        head: [summaryHeaders],
        body: summaryData,
        theme: "grid",
        styles: {
          fontSize: fonts.small,
          cellPadding: 2,
          lineWidth: 0.1,
          halign: "left",
          lineColor: brand.gray,
        },
        headStyles: {
          fillColor: brand.accent,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: {
          valign: "middle",
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 80, halign: "left" },
          1: { halign: "right", cellWidth: 40 },
        },
        margin: { left: margins.left, right: margins.right },
        didParseCell: function(data) {
          // Make the total row more prominent
          if (data.section === 'body' && data.row.index === summaryData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            if (data.column.index === 1) {
              data.cell.styles.halign = 'right';
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Banking Details
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "normal");
      
      const bankingDetails = [
        `Account Name: ${finalInvoiceData.name_of_acc || ""}`,
        `Bank Name: ${finalInvoiceData.bank || ""}`,
        `Account Number: ${finalInvoiceData.account_num || ""}`,
        `Branch Code: ${finalInvoiceData.branch_code || ""}`,
        `SWIFT Code: ${finalInvoiceData.swift_code || ""}`,
      ].filter(Boolean);

      bankingDetails.forEach((detail) => {
        doc.text(detail, margins.left, currentY);
        currentY += 5;
      });

      currentY += 5;

      // Footer note
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Please ensure the invoice number is referenced when making payment.",
        margins.left,
        currentY
      );
      currentY += 8;
      
      doc.setFont("helvetica", "normal");
      doc.text(
        `Thank you for choosing ${finalInvoiceData.companyname || ""}.`,
        margins.left,
        currentY
      );

      // Save the PDF
      const invoiceDateForFile = editData.date || finalInvoiceData.date;
      const fileName = isPreviewMode || isPreview 
        ? `Invoice_Preview_${finalInvoiceData.invoice_num || instructionId || 'NO'}_${formatDate(invoiceDateForFile)}.pdf`
        : `Invoice_${finalInvoiceData.invoice_num || 'NO'}_${formatDate(invoiceDateForFile)}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // UPDATED: Action buttons rendering
  const renderActionButtons = () => {
    if (isPreviewMode || isPreview) {
      return (
        <div className={`invoicedownloadbtn1 ${isPreview ? 'preview-mode' : ''}`}>
          <div className="preview-controls">
            <button
              className="preview-back-btn"
              onClick={onClosePreview || (() => setIsPreviewMode(false))}
              disabled={pdfLoading}
            >
              ← Back to Documents
            </button>
            <button
              className="preview-download-btn"
              onClick={generatePDF}
              disabled={pdfLoading}
            >
              {pdfLoading ? "Generating PDF..." : "📄 Download PDF"}
            </button>
            {!isPreview && (
              <button
                className="preview-edit-btn"
                onClick={() => {
                  setIsPreviewMode(false);
                }}
                disabled={pdfLoading}
              >
                ✏️ Edit Invoice
              </button>
            )}
          </div>
        </div>
      );
    }

    // Existing non-preview buttons
    return (
      <div className="invoicedownloadbtn1">
        {canEdit && (
          <button className="edit-btn" onClick={handleEditClick}>
            Edit
          </button>
        )}
        <button
          className="download-btn"
          onClick={generatePDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>
    );
  };

  if (loading && !previewData) {
    return (
      <div className={`client-invoice-wrapper ${isPreview ? 'preview-mode' : ''}`}>
        <div className="invoice-page">
          <div className="loading">Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (error && !previewData) {
    return (
      <div className={`client-invoice-wrapper ${isPreview ? 'preview-mode' : ''}`}>
        <div className="invoice-page">
          <div className="loading-error">{error}</div>
          <div className="invoicedownloadbtn1">
            <button className="back-btn" onClick={() => navigate("/invoices")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!finalInvoiceData) {
    return (
      <div className={`client-invoice-wrapper ${isPreview ? 'preview-mode' : ''}`}>
        <div className="invoice-page">
          <div className="loading-error">No invoice data found.</div>
          <div className="invoicedownloadbtn1">
            <button className="back-btn" onClick={() => navigate("/invoices")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWeightBasedView = Number(finalInvoiceData.shipment_type_key) === 4;
  const isSetRateView = finalInvoiceData.is_set_rate === true || finalInvoiceData.rateweight === "SetRate";
  const weightItemsView = finalInvoiceData.weightItems || [];
  const amount = isSetRateView
    ? (finalInvoiceData.invoice?.amount || finalInvoiceData.total_cost || 0)
    : isWeightBasedView
    ? weightItemsView.reduce((sum, wi) => sum + Number(wi.price || 0), 0)
    : (finalInvoiceData.invoice?.amount || finalInvoiceData.total_cost || 0);
  const vat = calculateVAT(amount);
  const total = finalInvoiceData.invoice?.total_amount || amount + vat;

  const roleId = JSON.parse(localStorage.getItem("user")).roleid;

  const containers = finalInvoiceData.containers || [];

  return (
    <div className={`client-invoice-wrapper ${isPreview ? 'preview-mode' : ''}`} ref={componentRef}>
      {isPreview && (
        <div className="preview-mode-indicator">
          👁️ PREVIEW MODE
        </div>
      )}
      <div className="invoice-page">
        <div className="invoice-paper" ref={invoiceRef}>
          {/* Transport and Logistics section */}
          <div className="transport-section">
            <div className="section-title">{finalInvoiceData.companyname}</div>
          </div>

          {/* Middle section with company details */}
          <div className="middle-section">
            <div className="company-info">
              {finalInvoiceData.cluster_box}
              <br />
              {finalInvoiceData.address}
              <br />
              {finalInvoiceData.suburb}
              <br />
              VAT Reg No: {finalInvoiceData.vat_reg_num}
              <br />
              Cellphone: {finalInvoiceData.phonenumber}
            </div>
          </div>

          {/* Invoice Title section */}
          <div className="invoice-title-section">
            <div className="invoice-title">Tax Invoice</div>
            <div className="document-number">
              Invoice No: {isEditMode && !isPreviewMode && !isPreview ? (
                <input
                  type="text"
                  value={editData.invoice_num}
                  onChange={(e) => handleInputChange("invoice_num", e.target.value)}
                  className="edit-input invoice-num-input"
                  placeholder="Enter invoice number"
                />
              ) : (
                finalInvoiceData.invoice_num
              )}
            </div>
          </div>

          {/* Sender Details */}
          <div className="sender-details">
            <div>{finalInvoiceData.client_name}</div>
            <div>{finalInvoiceData.client_address}</div>
            <div>{finalInvoiceData.client_suburb}</div>
            <div>Telephone: {finalInvoiceData.client_telephone}</div>
            <div>
              Date: {isEditMode && !isPreviewMode && !isPreview ? (
                <input
                  type="date"
                  value={editData.date ? editData.date.substring(0, 10) : ""}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className="edit-input date-input"
                />
              ) : (
                formatDate(editData.date || finalInvoiceData.date)
              )}
            </div>
            <div>Email: {finalInvoiceData.client_email}</div>
            <div>VAT Reg No: {finalInvoiceData.client_vat}</div>
          </div>

          {/* Vessel/Ref and Destination - Updated */}
          <div className="vessel-destination">
            <div className="vessel">Starting: {finalInvoiceData.pickup}</div>
            <div className="destination" id="destination">
              <div className="dropoff-row">
                <div className="dropoff" id="dropoff">
                  Destination: {finalInvoiceData.dropoff}
                </div>
                {!isPreviewMode && !isPreview && isEditMode && (
                  <div className="additional-destination-edit">
                    <span className="additional-label">Additional:</span>
                    <input
                      type="text"
                      value={editData.additional_destination_info}
                      onChange={(e) => handleInputChange("additional_destination_info", e.target.value)}
                      className="edit-input additional-destination-input"
                      placeholder="Add additional destination info..."
                    />
                  </div>
                )}
              </div>
              {!isEditMode && finalInvoiceData.additional_destination_info && (
                <div className="additional-destination-display">
                  Additional: {finalInvoiceData.additional_destination_info}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details">
            <table className="details-table">
              <tbody>
                <tr>
                  <td className="label">Booking Ref</td>
                  <td className="value">{finalInvoiceData.booking_ref}</td>
                </tr>
                <tr>
                  <td className="label">File Number</td>
                  <td className="value">{finalInvoiceData.file_no}</td>
                </tr>
                <tr>
                  <td className="label">Description</td>
                  <td className="value">{finalInvoiceData.description}</td>
                </tr>
                <tr>
                  <td className="label">Vessel/Ref</td>
                  <td className="value">{finalInvoiceData.vessel_name}</td>
                </tr>
              </tbody>
            </table>

            {/* Items section: weight items for shipment_type 4, else containers */}
            <div className="container-section">
              {isSetRateView ? (
                <table className="container-table5">
                  <thead>
                    <tr>
                      <th>KSM/DM No</th>
                      <th>Ticket No</th>
                      <th>Receipt Book No</th>
                      <th>Weight</th>
                      <th>Unit Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightItemsView.length > 0 ? (
                      weightItemsView.map((wi, idx) => (
                        <tr key={idx}>
                          <td>{wi.ksm_dm_no || ''}</td>
                          <td>{wi.ticket_no || ''}</td>
                          <td>{wi.receipt_book_no || ''}</td>
                          <td>{Number(wi.weight || 0).toFixed(2)}</td>
                          <td>{formatCurrency(Number(wi.unitrate || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No weight items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : isWeightBasedView ? (
                <table className="container-table5">
                  <thead>
                    <tr>
                      <th>KSM/DM No</th>
                      <th>Ticket No</th>
                      <th>Receipt Book No</th>
                      <th>Weight</th>
                      <th>Unit Rate</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightItemsView.length > 0 ? (
                      weightItemsView.map((wi, idx) => (
                        <tr key={idx}>
                          <td>{wi.ksm_dm_no || ''}</td>
                          <td>{wi.ticket_no || ''}</td>
                          <td>{wi.receipt_book_no || ''}</td>
                          <td>{Number(wi.weight || 0).toFixed(2)}</td>
                          <td>{formatCurrency(Number(wi.unitrate || 0))}</td>
                          <td>{formatCurrency(Number(wi.price || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No weight items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="container-table5">
                  <thead>
                    <tr>
                      <th className="row-index-header">#</th>
                      <th className="container-number-header">
                        Container Number
                      </th>
                      <th className="type-header">Type</th>
                      {containers.some(
                        (container) =>
                          container.weight && container.weight !== "N/A"
                      ) && <th className="weight-header">Weight</th>}
                      {containers.some(
                        (container) => container.truckregnumber
                      ) && <th className="truck-header">Truck Reg</th>}
                      <th className="rate-header">Base Rate</th>
                      {containers.some(
                        (c) => c.add_surcharges && (c.surcharge_amount > 0 || c.surcharge_12m_amount > 0)
                      ) && <th className="surcharge-header">Surcharge</th>}
                      {containers.some(
                        (container) =>
                          container.hazardous || container.hazardous_amount > 0
                      ) && <th className="hazardous-header">Haz</th>}
                      {containers.some(
                        (container) => container.vgm || container.vgm_amount > 0
                      ) && <th className="vgm-header">VGM</th>}
                      <th className="total-header">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.length > 0 ? (
                      containers.map((container, index) => {
                        const hasWeight =
                          container.weight && container.weight !== "N/A";
                        const hasTruck = container.truckregnumber;
                        const baseRateValue = container.base_rate || 0;
                        const hasSurcharge =
                          container.add_surcharges && (container.surcharge_amount > 0 || container.surcharge_12m_amount > 0);
                        const hasHazard =
                          container.hazardous || container.hazardous_amount > 0;
                        const hasVGM = container.vgm || container.vgm_amount > 0;
                        const totalValue = (baseRateValue || 0)
                          + getSurchargeAmount(container)
                          + (container.hazardous_amount || 0)
                          + (container.vgm_amount || 0);

                        return (
                          <tr key={index}>
                            <td className="row-index">{index + 1}</td>
                            <td className="container-number">
                              {container.container_number ||
                                `Container ${index + 1}`}
                            </td>
                            <td className="container-type">
                              {container.container_type || "Standard"}
                            </td>
                            {containers.some(
                              (c) => c.weight && c.weight !== "N/A"
                            ) && (
                              <td className="weight">
                                {hasWeight ? `${container.weight} kg` : "N/A"}
                              </td>
                            )}
                            {containers.some((c) => c.truckregnumber) && (
                              <td className="truck-reg">
                                {hasTruck ? container.truckregnumber : "-"}
                              </td>
                            )}
                            <td className="rate" title={"Base rate"}>
                              {formatCurrency(baseRateValue || 0)}
                            </td>
                            {containers.some(
                              (c) => c.add_surcharges && (c.surcharge_amount > 0 || c.surcharge_12m_amount > 0)
                            ) && (
                              <td className="surcharge">
                                {hasSurcharge
                                  ? formatCurrency(getSurchargeAmount(container))
                                  : "-"}
                              </td>
                            )}
                            {containers.some(
                              (c) => c.hazardous || c.hazardous_amount > 0
                            ) && (
                              <td className="hazardous">
                                {hasHazard
                                  ? formatCurrency(container.hazardous_amount)
                                  : "-"}
                              </td>
                            )}
                            {containers.some(
                              (c) => c.vgm || c.vgm_amount > 0
                            ) && (
                              <td className="vgm">
                                {hasVGM
                                  ? formatCurrency(container.vgm_amount)
                                  : "-"}
                              </td>
                            )}
                            <td className="total" title="Base + Surcharge + Haz + VGM">
                              {formatCurrency(totalValue)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="container-number" colSpan="9">
                          No container information
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Summary Table */}
              <div className="summary-section">
                <table className="container-table5">
                  <thead>
                    <tr>
                      <th className="summary-header" colSpan="2">
                        Invoice Summary
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="summary-label">Amount (excl. VAT)</td>
                      <td className="summary-value">
                        {isEditMode && !isPreviewMode && !isPreview ? (
                          <input
                            type="text"
                            value={editData.amount}
                            onChange={(e) =>
                              handleInputChange("amount", e.target.value)
                            }
                            className="edit-input amount-input"
                            placeholder="0.00"
                          />
                        ) : (
                          formatCurrency(amount)
                        )}
                      </td>
                    </tr>
                    {vat > 0 && (
                      <tr>
                        <td className="summary-label">
                          VAT ({finalInvoiceData.vat}%)
                        </td>
                        <td className="summary-value">{formatCurrency(vat)}</td>
                      </tr>
                    )}
                    <tr className="summary-total-row">
                      <td className="summary-total-label">Total Amount</td>
                      <td className="summary-total-value">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="banking-details">
            <div>Account Name: {finalInvoiceData.name_of_acc}</div>
            <div>Bank Name: {finalInvoiceData.bank}</div>
            <div>Account Number: {finalInvoiceData.account_num}</div>
            <div>Branch Code: {finalInvoiceData.branch_code}</div>
            <div>SWIFT Code: {finalInvoiceData.swift_code}</div>
            <div className="payment-note">
              Please ensure the invoice number is referenced when making
              payment.
            </div>
            <div className="thank-you">
              Thank you for choosing {finalInvoiceData.companyname}.
            </div>
          </div>
        </div>

        {showConfirmDialog && !isPreviewMode && !isPreview && (
          <div className="confirmation-dialog-overlay">
            <div className="confirmation-dialog">
              <h3>Confirm Changes</h3>
              <p>Are you sure you want to save these changes?</p>
              <div className="dialog-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={saveLoading}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleConfirmSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditMode && !isPreviewMode && !isPreview ? (
          <div className="edit-controls">
            {saveError && <div className="error-message">{saveError}</div>}
            <button
              className="cancel-edit-btn"
              onClick={handleCancelEdit}
              disabled={saveLoading}
            >
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={handleSaveClick}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          renderActionButtons()
        )}
      </div>
    </div>
  );
});

ClientInvoice.displayName = 'ClientInvoice';

export default ClientInvoice;