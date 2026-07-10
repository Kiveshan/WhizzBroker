// components/InvoicePreviewModal.jsx
"use client";
import { useState, useEffect } from "react";
import ClientInvoice from "./ClientInvoice"; // Adjust path as needed
import "../css/InvoicePreviewModal.css";
import api from "../../../api";

const InvoicePreviewModal = ({ 
  instructionId, 
  clientId, 
  isOpen, 
  onClose, 
  shipmentType 
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && instructionId) {
      fetchPreviewData();
    }
  }, [isOpen, instructionId]);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get preview data from backend using shared axios client
      const response = await api.post(`/api/invoices/preview/${instructionId}`, {
        clientId,
        shipmentType,
        preview: true,
      });

      const data = response.data;
      if (data.success) {
        setPreviewData(data.data);
      } else {
        throw new Error(data.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error("Error fetching preview data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreviewData(null);
    setLoading(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="invoice-preview-modal-overlay">
      <div className="invoice-preview-modal">
        {/* Header */}
        <div className="invoice-preview-header">
          <h2>Invoice Preview</h2>
          <div className="preview-actions">
            <button 
              className="preview-close-btn" 
              onClick={handleClose}
            >
              × Close Preview
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="preview-loading">
            <div className="loading-spinner"></div>
            <p>Generating invoice preview...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="preview-error">
            <h3>Preview Error</h3>
            <p>{error}</p>
            <button className="error-retry-btn" onClick={fetchPreviewData}>
              Retry
            </button>
            <button className="error-close-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        )}

        {/* Preview Content */}
        {!loading && !error && previewData && (
          <div className="preview-content">
            <ClientInvoice 
              previewData={previewData}
              isPreview={true}
              onClosePreview={handleClose}
            />
          </div>
        )}

        {/* Footer */}
        <div className="invoice-preview-footer">
          <p className="preview-note">
            This is a preview of what the final invoice will look like. 
            Changes made here won't affect the actual invoice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;