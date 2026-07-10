"use client";

import { useState } from "react";
import api from "../../../api"; // Import the Axios instance
import "../css/UserDetailView.css";

function UserDetailView({ user, onBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);

  const handleApprove = async () => {
    await updateUserStatus("approve");
  };

  const handleReject = () => {
    setShowRejectConfirmation(true);
  };

  const confirmReject = async () => {
    setShowRejectConfirmation(false);
    await updateUserStatus("reject");
  };

  const cancelReject = () => {
    setShowRejectConfirmation(false);
  };

  const updateUserStatus = async (action) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await api.post(
        `/admin/${action === "approve" ? "approve-user" : "reject-user"}`,
        {
          userid: user.userid,
          ...(action === "approve" && { roleid: 1 }),
        }
      );

      setSuccessMessage(response.data.message);

      // After 2 seconds, go back to the list
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to update user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-detail-view">
      <button className="back-button" onClick={onBack}>
        &larr; Back to List
      </button>

      <h2>User Details</h2>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="user-details-container">
        <div className="user-detail-row">
          <div className="detail-label">User ID:</div>
          <div className="detail-value">{user.userid}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Name:</div>
          <div className="detail-value">{user.name}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Surname:</div>
          <div className="detail-value">{user.surname}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Email:</div>
          <div className="detail-value">{user.email}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Company:</div>
          <div className="detail-value">
            {user.companyname || "Not provided"}
          </div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Registration Date:</div>
          <div className="detail-value">
            {new Date(user.dateofreg).toISOString().split("T")[0]}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="approve-button"
          onClick={handleApprove}
          disabled={isSubmitting || showRejectConfirmation}
        >
          {isSubmitting ? "Processing..." : "Approve User"}
        </button>

        <button
          className="reject-button"
          onClick={handleReject}
          disabled={isSubmitting || showRejectConfirmation}
        >
          {isSubmitting ? "Processing..." : "Reject User"}
        </button>
      </div>

      {showRejectConfirmation && (
        <div className="confirmation-popup">
          <div className="confirmation-content">
            <h3>Confirm Rejection</h3>
            <p>
              Are you sure you want to reject this user?
              <br />
              <strong>
                {user.name} {user.surname}
              </strong>{" "}
              from <strong>{user.companyname}</strong>
              <br />
              <br />
              This action will prevent the user from accessing the system.
            </p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={cancelReject}>
                Cancel
              </button>
              <button className="confirm-reject-button" onClick={confirmReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDetailView;
