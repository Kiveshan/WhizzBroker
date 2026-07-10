"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"

const TokenExpiryNotification = () => {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [autoLogoutTimer, setAutoLogoutTimer] = useState(null)
  const { token, logout } = useAuth()

  // Auto logout function
  const performAutoLogout = useCallback(() => {
    console.log("Auto logout triggered - user did not extend session")
    setShowWarning(false)
    logout()
  }, [logout])

  useEffect(() => {
    let countdownInterval = null

    const handleTokenExpiring = (event) => {
      const { timeUntilExpiry } = event.detail
      const secondsLeft = Math.floor(timeUntilExpiry / 1000)

      console.log("Token expiring event received, seconds left:", secondsLeft)

      setShowWarning(true)
      setTimeLeft(secondsLeft)

      // Clear any existing auto logout timer
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
      }

      // Set auto logout timer for when countdown reaches 0
      const newAutoLogoutTimer = setTimeout(() => {
        performAutoLogout()
      }, timeUntilExpiry)
      setAutoLogoutTimer(newAutoLogoutTimer)

      // Start countdown display
      countdownInterval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime <= 0) {
            clearInterval(countdownInterval)
            // Don't call logout here - let the setTimeout handle it
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    const handleTokenExpired = () => {
      console.log("Token expired event received")
      setShowWarning(false)
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
        setAutoLogoutTimer(null)
      }
    }

    const handleUserLoggedOut = () => {
      console.log("User logged out event received")
      setShowWarning(false)
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
        setAutoLogoutTimer(null)
      }
    }

    // Listen for token expiration events
    window.addEventListener("tokenExpiring", handleTokenExpiring)
    window.addEventListener("tokenExpired", handleTokenExpired)
    window.addEventListener("userLoggedOut", handleUserLoggedOut)

    return () => {
      window.removeEventListener("tokenExpiring", handleTokenExpiring)
      window.removeEventListener("tokenExpired", handleTokenExpired)
      window.removeEventListener("userLoggedOut", handleUserLoggedOut)
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
        setAutoLogoutTimer(null)
      }
    }
  }, [autoLogoutTimer, performAutoLogout])

  const handleExtendSession = async () => {
    try {
      console.log("User clicked extend session")

      // Clear the auto logout timer
      if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer)
        setAutoLogoutTimer(null)
      }

      setShowWarning(false)

      // Here you could implement actual token refresh logic
      console.log("Session extension requested - implement refresh token logic here")

 
    } catch (error) {
      console.error("Failed to extend session:", error)
      logout()
    }
  }

  const handleDismiss = () => {
    console.log("User dismissed warning - auto logout will still occur")
    setShowWarning(false)
    // Note: Auto logout timer continues running even if dismissed
  }

  const handleLogoutNow = () => {
    console.log("User chose to logout immediately")
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer)
      setAutoLogoutTimer(null)
    }
    setShowWarning(false)
    logout()
  }

  if (!showWarning || !token) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="popup-backdrop">
      <div className={`popup-container ${showWarning ? "popup-show" : ""}`}>
        <button className="popup-close" onClick={handleDismiss}>
          <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="popup-header">
          <div className="header-content">
            <svg className="warning-icon animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3>Session Expiring Soon</h3>
              <p>You will be logged out automatically</p>
            </div>
          </div>
        </div>
        <div className="popup-content">
          <div className="countdown">
            <div className="timer-circle">
              <span>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
            <p>Time remaining until automatic logout</p>
            
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.max(0, (timeLeft / 120) * 100)}%` }} />
          </div>
          <div className="action-buttons">
            <button className="continue-button" onClick={handleExtendSession}>
              Continue Session
            </button>
            <div className="secondary-buttons">
              <button className="dismiss-button" onClick={handleDismiss}>
                Dismiss
              </button>
              <button className="logout-button" onClick={handleLogoutNow}>
                Logout Now
              </button>
            </div>
          </div>
        </div>
        <div className="popup-footer">
          <p>For security reasons, inactive sessions are automatically terminated after the countdown expires</p>
        </div>
      </div>
    </div>
  )
}

export default TokenExpiryNotification
