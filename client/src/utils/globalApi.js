const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

// Global token expiration handler
const handleTokenExpiration = () => {
  // Clear local storage
  localStorage.removeItem("token")
  localStorage.removeItem("user")

  // Dispatch custom events
  window.dispatchEvent(new CustomEvent("tokenExpired"))
  window.dispatchEvent(new CustomEvent("userLoggedOut"))

  // Redirect to login
  window.location.href = "/"
}

// Enhanced error handler
const handleApiError = (error) => {
  console.error("API Error:", error)

  if (error.response) {
    const { status, data } = error.response

    // Check for token expiration
    if (status === 401 || (data && data.message && data.message.includes("token"))) {
      handleTokenExpiration()
      return
    }

    throw new Error(data.message || `HTTP ${status}: ${error.response.statusText}`)
  } else if (error.request) {
    throw new Error("Network error - please check your connection")
  } else {
    throw new Error(error.message || "An unexpected error occurred")
  }
}

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Generic API request function
const apiRequest = async (url, options = {}) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(`${API_BASE_URL}${url}`, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.message || `HTTP ${response.status}`)
      error.response = { status: response.status, data: errorData }
      throw error
    }

    return await response.json()
  } catch (error) {
    handleApiError(error)
  }
}

// HTTP methods
export const globalApi = {
  get: (url, options = {}) => apiRequest(url, { method: "GET", ...options }),

  post: (url, data, options = {}) =>
    apiRequest(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),

  put: (url, data, options = {}) =>
    apiRequest(url, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),

  delete: (url, options = {}) => apiRequest(url, { method: "DELETE", ...options }),

  patch: (url, data, options = {}) =>
    apiRequest(url, {
      method: "PATCH",
      body: JSON.stringify(data),
      ...options,
    }),
}

export default globalApi
