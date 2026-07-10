"use client";

import { useState, useEffect } from "react";
import { FaSave, FaTimes, FaSpinner } from "react-icons/fa";


// Component Props
const ExpenseTypeForm = ({
  expenseType = {},
  loading = false,
  isEditing = false,
  onSubmit = () => {},
  onCancel = () => {},
  onChange = () => {},
}) => {
  // State Management
  const [formData, setFormData] = useState({
    expense: expenseType.expense || "",
  });
  const [errors, setErrors] = useState({});

  // Initialize form with expenseType data
  useEffect(() => {
    console.log("ExpenseTypeForm received expense type data:", expenseType);
    if (expenseType && Object.keys(expenseType).length > 0) {
      setFormData({
        expense: expenseType.expense || "",
      });
    }
  }, [expenseType]);

  // Handlers
  const handleInputChange = (field, value) => {
    console.log(`Field ${field} changed to:`, value);
    setFormData((prev) => ({ ...prev, [field]: value }));
    onChange(field, value);

    // Clear field-specific error
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.expense?.trim()) {
      newErrors.expense = "Expense type name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);
    console.log("Is editing:", isEditing);

    if (!validateForm()) {
      console.log("Form validation failed:", errors);
      return;
    }

    try {
      console.log("Calling onSubmit with form data...");
      const success = await onSubmit(formData);
      console.log("onSubmit result:", success);
      if (success) {
        console.log("Form submission successful");
      } else {
        console.log("Form submission failed");
      }
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };

  const handleCancel = () => {
    console.log("Form cancelled");
    setFormData({ expense: "" });
    setErrors({});
    onCancel();
  };

  // Render
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2 className="modal-title">
              {isEditing ? "Edit Expense Type" : "Add New Expense Type"}
            </h2>
            <button
              onClick={handleCancel}
              className="close-button"
              disabled={loading}
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="expense" className="form-label">
              Expense Type Name *
            </label>
            <input
              type="text"
              id="expense"
              value={formData.expense}
              onChange={(e) => handleInputChange("expense", e.target.value)}
              className={`form-input ${errors.expense ? "input-error" : ""}`}
              placeholder="Enter expense type name"
              disabled={loading}
            />
            {errors.expense && <p className="error-message">{errors.expense}</p>}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner" />
                  <span>{isEditing ? "Updating..." : "Adding..."}</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>{isEditing ? "Update" : "Add"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseTypeForm;