// Utility function to extract filename from S3 URL
export const extractFilenameFromUrl = (url) => {
  if (!url) return "Unknown Document"
  try {
    const decodedPath = decodeURIComponent(new URL(url).pathname)
    const parts = decodedPath.split("/")
    const filename = parts[parts.length - 1].split("?")[0]
    return filename || "Unknown Document"
  } catch (error) {
    console.error(`Error extracting filename from URL ${url}:`, error)
    return "Unknown Document"
  }
}

// Format currency
export const formatCurrency = (amount) => {
  if (!amount) return "R 0.00"
  return `R ${Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-ZA")
}

// Debounce function for search/filter
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
