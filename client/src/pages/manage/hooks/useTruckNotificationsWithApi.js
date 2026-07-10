"use client"

import { useState, useEffect, useCallback } from "react"
import { useApi } from "../hooks/useApi.js" // Import useApi at the top

export function useTruckNotifications() {
  const [notifications, setNotifications] = useState({
    expiring: [],
    expired: [],
    count: 0,
    loading: false,
    error: null,
  })

  const api = useApi() // Initialize useApi here

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications((prev) => ({ ...prev, loading: true, error: null }))

      console.log("Fetching truck license notifications...")

      // Use your existing API utility that handles authentication
      // const { useApi } = await import("../hooks/useApi.js") // No longer needed here
      // const api = useApi() // No longer needed here

      // Fetch trucks with expiring licenses (30 days)
      const expiringResponse = await api.get("/api/trucks/notifications/expiring?days=30")
      const expiredResponse = await api.get("/api/trucks/notifications/expired")

      console.log("Expiring trucks:", expiringResponse.data)
      console.log("Expired trucks:", expiredResponse.data)

      const expiring = expiringResponse.data || []
      const expired = expiredResponse.data || []
      const totalCount = expiring.length + expired.length

      setNotifications({
        expiring,
        expired,
        count: totalCount,
        loading: false,
        error: null,
      })

      console.log(`Total notifications: ${totalCount}`)
    } catch (err) {
      console.error("Error fetching truck notifications:", err)
      setNotifications((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load notifications",
      }))
    }
  }, [api])

  // Auto-refresh notifications every 5 minutes
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    refreshNotifications: fetchNotifications,
  }
}
