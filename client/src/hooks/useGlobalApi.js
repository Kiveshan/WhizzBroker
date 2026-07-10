"use client"

import { useState, useCallback } from "react"
import { globalApi } from "../utils/globalApi.js"

export const useGlobalApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const makeRequest = useCallback(async (apiCall) => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiCall()
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback((url, options) => makeRequest(() => globalApi.get(url, options)), [makeRequest])

  const post = useCallback((url, data, options) => makeRequest(() => globalApi.post(url, data, options)), [makeRequest])

  const put = useCallback((url, data, options) => makeRequest(() => globalApi.put(url, data, options)), [makeRequest])

  const del = useCallback((url, options) => makeRequest(() => globalApi.delete(url, options)), [makeRequest])

  const patch = useCallback(
    (url, data, options) => makeRequest(() => globalApi.patch(url, data, options)),
    [makeRequest],
  )

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    patch,
    clearError: () => setError(null),
  }
}

export default useGlobalApi
