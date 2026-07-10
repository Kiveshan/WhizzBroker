"use client";

import { useState, useEffect } from "react";
import Login from "../pages/auth/views/Login";
import Register from "../pages/auth/views/Register";
import styles from "../css/modal.module.css"; // Import CSS Module

const Modal = ({ isOpen, onClose, initialForm }) => {
  const [isLogin, setIsLogin] = useState(initialForm === "login");

  useEffect(() => {
    setIsLogin(initialForm === "login");
  }, [initialForm]);

  if (!isOpen) return null;

  // Close modal when clicking outside
  const handleBackgroundClick = (event) => {
    if (event.target.id === "modal-popup") {
      onClose();
    }
  };

  return (
    <div
      id="modal-popup"
      className={styles.modalPopup}
      onClick={handleBackgroundClick}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Close Button: only for Register; Login has its own close inside the card */}
        {!isLogin && (
          <button className={styles.closeBtn} onClick={onClose}>
            X
          </button>
        )}

        {isLogin ? (
          <Login
            switchToRegister={() => setIsLogin(false)}
            closePopup={onClose}
          />
        ) : (
          <Register
            switchToLogin={() => setIsLogin(true)}
            closePopup={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default Modal;