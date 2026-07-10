import axios from "axios"

export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include credentials (cookies) with requests
  timeout: 30000, // 30s — tolerate backend/DB cold starts instead of failing
})

// Global token expiration handler
const handleTokenExpiration = () => {
  console.log("Token expired, triggering auto logout...")

  // Clear local storage
  localStorage.removeItem("token")
  localStorage.removeItem("user")

  // Dispatch custom events for the global system
  window.dispatchEvent(new CustomEvent("tokenExpired"))
  window.dispatchEvent(new CustomEvent("userLoggedOut"))

  // Redirect to login if not already there
  if (window.location.pathname !== "/") {
    window.location.href = "/"
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("API Error:", error)

    if (error.response) {
      const { status, data } = error.response

      // Check for token expiration
      if (status === 401 || (data && data.message && data.message.includes("token"))) {
        console.log("Token expired, triggering auto logout...")
        handleTokenExpiration()
        return Promise.reject(new Error("Session expired. Please log in again."))
      }

      // Handle other HTTP errors - preserve status for frontend handling
      const errorMessage = data?.message || data?.error || `HTTP ${status}: ${error.response.statusText}`
      const enhancedError = new Error(errorMessage)
      enhancedError.response = error.response  // Preserve the response object
      return Promise.reject(enhancedError)
    } else if (error.request) {
      // Network error
      return Promise.reject(new Error("Network error - please check your connection"))
    } else {
      // Other errors
      return Promise.reject(new Error(error.message || "An unexpected error occurred"))
    }
  },
)

export default api
