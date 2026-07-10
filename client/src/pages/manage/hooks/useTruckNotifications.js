"use client"

import { useState, useEffect, useCallback } from "react"

export function useTruckNotifications() {
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

      console.log("Fetching truck license notifications...")

      // Get the auth token from localStorage (adjust this based on how you store tokens)
      const token = localStorage.getItem("token") || localStorage.getItem("authToken")

      if (!token) {
        throw new Error("No authentication token found")
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      console.log("Making API calls with token:", token ? "Token present" : "No token")

      // Fetch trucks with expiring licenses (30 days)
      const expiringResponse = await fetch("/api/trucks/notifications/expiring?days=30", { headers })
      const expiredResponse = await fetch("/api/trucks/notifications/expired", { headers })

      console.log("Expiring response status:", expiringResponse.status)
      console.log("Expired response status:", expiredResponse.status)

      if (!expiringResponse.ok) {
        const expiringError = await expiringResponse.text()
        console.error("Expiring API error:", expiringError)
        throw new Error(`Expiring API Error: ${expiringResponse.status} - ${expiringError}`)
      }

      if (!expiredResponse.ok) {
        const expiredError = await expiredResponse.text()
        console.error("Expired API error:", expiredError)
        throw new Error(`Expired API Error: ${expiredResponse.status} - ${expiredError}`)
      }

      const expiring = await expiringResponse.json()
      const expired = await expiredResponse.json()

      console.log("Expiring trucks:", expiring)
      console.log("Expired trucks:", expired)

      const totalCount = (expiring?.length || 0) + (expired?.length || 0)

      setNotifications({
        expiring: expiring || [],
        expired: expired || [],
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
