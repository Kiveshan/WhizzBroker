"use client"

const CustomAlert = ({ message, onClose, type = "info" }) => {
  const getAlertClass = () => {
    switch (type) {
      case "success":
        return "custom-alert success"
      case "error":
        return "custom-alert error"
      case "warning":
        return "custom-alert warning"
      default:
        return "custom-alert"
    }
  }

  return (
    <div className={getAlertClass()}>
      <div className="alert-content">
        <span className="alert-message">{message}</span>
        <button className="alert-close-btn" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  )
}

export default CustomAlert
