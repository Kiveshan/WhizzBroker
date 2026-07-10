"use client"

import { useState, useEffect, useCallback } from "react"

export function useTrailerNotifications() {
  const [notifications, setNotifications] = useState({
    expiring: [],
    expired: [],
    count: 0,
    loading: false,
    error: null,
  })

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications((prev) => ({ ...prev, loading: true, error: null }))

      console.log("Fetching trailer license notifications...")

      // Get the auth token from localStorage
      const token = localStorage.getItem("token") || localStorage.getItem("authToken")

      if (!token) {
        throw new Error("No authentication token found")
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      console.log("Making trailer API calls with token:", token ? "Token present" : "No token")

      // Fetch trailers with expiring licenses (30 days)
      const expiringResponse = await fetch("/api/trailers/notifications/expiring?days=30", { headers })
      const expiredResponse = await fetch("/api/trailers/notifications/expired", { headers })

      console.log("Expiring trailers response status:", expiringResponse.status)
      console.log("Expired trailers response status:", expiredResponse.status)

      if (!expiringResponse.ok) {
        const expiringError = await expiringResponse.text()
        console.error("Expiring trailers API error:", expiringError)
        throw new Error(`Expiring API Error: ${expiringResponse.status} - ${expiringError}`)
      }

      if (!expiredResponse.ok) {
        const expiredError = await expiredResponse.text()
        console.error("Expired trailers API error:", expiredError)
        throw new Error(`Expired API Error: ${expiredResponse.status} - ${expiredError}`)
      }

      const expiring = await expiringResponse.json()
      const expired = await expiredResponse.json()

      console.log("Expiring trailers:", expiring)
      console.log("Expired trailers:", expired)

      const totalCount = (expiring?.length || 0) + (expired?.length || 0)

      setNotifications({
        expiring: expiring || [],
        expired: expired || [],
        count: totalCount,
        loading: false,
        error: null,
      })

      console.log(`Total trailer notifications: ${totalCount}`)
    } catch (err) {
      console.error("Error fetching trailer notifications:", err)
      setNotifications((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load notifications",
      }))
    }
  }, [])

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
