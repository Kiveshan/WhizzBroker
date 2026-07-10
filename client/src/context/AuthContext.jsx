"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      console.error("Error checking token expiration:", error)
      return true
    }
  }, [])

  // Get token expiration time in milliseconds
  const getTokenExpirationTime = useCallback((token) => {
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload.exp * 1000 // Convert to milliseconds
    } catch (error) {
      console.error("Error getting token expiration time:", error)
      return null
    }
  }, [])

  // Logout function
  const logout = useCallback(() => {
    console.log("Logging out user...")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)

    // Dispatch logout event
    window.dispatchEvent(new CustomEvent("userLoggedOut"))

    // Redirect to login page
    window.location.href = "/"
  }, [])

  // Login function
  const login = useCallback((userData, authToken) => {
    console.log("Logging in user:", userData.name)
    localStorage.setItem("token", authToken)
    localStorage.setItem("user", JSON.stringify(userData))
    setToken(authToken)
    setUser(userData)
  }, [])

  // Check token expiration and emit events
  const checkTokenExpiration = useCallback(() => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    const expirationTime = getTokenExpirationTime(currentToken)
    if (!expirationTime) {
      console.log("Could not get token expiration time, logging out...")
      logout()
      return
    }

    const currentTime = Date.now()
    const timeUntilExpiry = expirationTime - currentTime

    console.log("Token check:", {
      currentTime: new Date(currentTime).toISOString(),
      expirationTime: new Date(expirationTime).toISOString(),
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000) + " seconds",
    })

    // If token is expired
    if (timeUntilExpiry <= 0) {
      console.log("Token has expired, logging out...")
      logout()
      return
    }

    // If token expires in 2 minutes (120 seconds) or less, show warning
    if (timeUntilExpiry <= 120000) {
      // 5 minutes in milliseconds
      console.log("Token expiring soon, showing warning...")
      window.dispatchEvent(
        new CustomEvent("tokenExpiring", {
          detail: { timeUntilExpiry },
        }),
      )
    }
  }, [getTokenExpirationTime, logout])

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")

      if (storedToken && storedUser) {
        try {
          // Check if token is still valid
          if (!isTokenExpired(storedToken)) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
            console.log("User authenticated from storage")
          } else {
            console.log("Stored token is expired, clearing storage...")
            localStorage.removeItem("token")
            localStorage.removeItem("user")
          }
        } catch (error) {
          console.error("Error parsing stored user data:", error)
          localStorage.removeItem("token")
          localStorage.removeItem("user")
        }
      }

      setLoading(false)
    }

    initializeAuth()
  }, [isTokenExpired])

  // Set up token expiration checking interval
  useEffect(() => {
    let intervalId

    if (token && !isTokenExpired(token)) {
      // Check token expiration every 10 seconds for more responsive detection
      intervalId = setInterval(() => {
        checkTokenExpiration()
      }, 10000) // 10 seconds

      // Also check immediately
      checkTokenExpiration()
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [token, isTokenExpired, checkTokenExpiration])

  // Listen for token expiration events from API calls
  useEffect(() => {
    const handleTokenExpired = () => {
      console.log("Received token expired event from API, logging out...")
      logout()
    }

    const handleUserLoggedOut = () => {
      console.log("User logged out event received")
      setUser(null)
      setToken(null)
    }

    window.addEventListener("tokenExpired", handleTokenExpired)
    window.addEventListener("userLoggedOut", handleUserLoggedOut)

    return () => {
      window.removeEventListener("tokenExpired", handleTokenExpired)
      window.removeEventListener("userLoggedOut", handleUserLoggedOut)
    }
  }, [logout])

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user && !isTokenExpired(token),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
