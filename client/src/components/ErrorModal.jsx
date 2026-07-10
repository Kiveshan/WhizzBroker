"use client"
import { useEffect } from "react"
import "../css/error-modal.css"

const ErrorModal = ({ isOpen, onClose, message, isSuccess = false }) => {
  useEffect(() => {
    // Auto-close success modal after 3 seconds
    if (isOpen && isSuccess) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSuccess, onClose]);

  if (!isOpen) return null;

  const modalClass = isSuccess ? "success-modal" : "error-modal";
  const title = isSuccess ? "Success" : "Error";
  const icon = isSuccess ? "✓" : "!";

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${modalClass}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          {!isSuccess && (
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          )}
        </div>
        <div className="modal-body">
          <div className="modal-icon">{icon}</div>
          <p>{message}</p>
        </div>
        {!isSuccess && (
          <div className="modal-footer">
            <button className="modal-button" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorModal

