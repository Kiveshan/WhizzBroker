"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../../css/CompanyInstructionView.css"
import api from "../../../../api"
import Pagination from "../../../../components/Pagination"

const CompanyInstructionView = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalNewInstructions, setTotalNewInstructions] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)
  const [containerSearch, setContainerSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [containerSearchLoading, setContainerSearchLoading] = useState(false)
  const [searchMatchingClientIds, setSearchMatchingClientIds] = useState(null)

  useEffect(() => {
    const fetchClientStats = async () => {
      try {
        setLoading(true)
        const response = await api.get("/api/instructions/client-instruction-stats")

        const data = response.data
        console.log("Client data received:", data) // Debug log

        // Ensure all clients have the required properties as numbers
        const processedData = data.map((client) => ({
          ...client,
          new_count: Number.parseInt(client.new_count) || 0,
          in_progress_count: Number.parseInt(client.in_progress_count) || 0,
          completed_count: Number.parseInt(client.completed_count) || 0,
        }))

        // Calculate total new instructions
        const totalNew = processedData.reduce((sum, client) => sum + client.new_count, 0)
        setTotalNewInstructions(totalNew)

        setClients(processedData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching client statistics:", error)
        const errorMessage =
          error.response?.data?.message || error.message || "Failed to load client data. Please try again later."
        setError(errorMessage)
        setLoading(false)
      }
    }

    fetchClientStats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(containerSearch), 400)
    return () => clearTimeout(timer)
  }, [containerSearch])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchMatchingClientIds(null)
      setContainerSearchLoading(false)
      return
    }

    const runSearch = async () => {
      try {
        setContainerSearchLoading(true)
        const response = await api.get(`/api/instructions/search?q=${encodeURIComponent(debouncedSearch.trim())}`)
        const instructions = response.data || []
        const clientIds = new Set(
          instructions
            .flatMap((i) => [i.client, i.clientid, i.m5clientkey, i.client_id, i.client_key, i.clientId])
            .filter(Boolean)
            .map((id) => String(id).trim()),
        )
        setSearchMatchingClientIds(clientIds)
      } catch (err) {
        console.error("Error running instruction search", err)
      } finally {
        setContainerSearchLoading(false)
      }
    }

    runSearch()
  }, [debouncedSearch])

  const getFilteredClients = () => {
    if (!debouncedSearch.trim() || searchMatchingClientIds === null) return clients
    return clients.filter((client) => searchMatchingClientIds.has(String(client.m5clientkey).trim()))
  }

  const filteredClients = getFilteredClients()

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const currentClients = filteredClients.slice(indexOfFirstRecord, indexOfLastRecord)

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  // Style for centered cells
  const centeredCellStyle = {
    textAlign: "center",
  }

  // Bell animation keyframes
  const bellKeyframes = `
@keyframes bellShake {
0% { transform: rotate(0); }
15% { transform: rotate(5deg); }
30% { transform: rotate(-5deg); }
45% { transform: rotate(4deg); }
60% { transform: rotate(-4deg); }
75% { transform: rotate(2deg); }
85% { transform: rotate(-2deg); }
92% { transform: rotate(1deg); }
100% { transform: rotate(0); }
}
`

  // Replace the handleBackClick function with this improved version
  const handleBackClick = () => {
    // Try to get the user data from localStorage
    const userData = localStorage.getItem("user")
    let userRoleId = null

    if (userData) {
      try {
        // Parse the user data and get the role ID
        const parsedUserData = JSON.parse(userData)
        userRoleId = parsedUserData.roleid
        console.log("User role from localStorage:", userRoleId)
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error)
      }
    }

    // If we couldn't get the role ID from user data, try direct roleId
    if (!userRoleId) {
      userRoleId = localStorage.getItem("roleId") || localStorage.getItem("userRoleId")
      console.log("Direct role ID from localStorage:", userRoleId)
    }

    // Convert to number if it's a string
    userRoleId = Number.parseInt(userRoleId, 10)
    console.log("Final user role ID for navigation:", userRoleId)

    // Navigate based on role ID
    if (userRoleId === 1) {
      navigate("/Dashboard")
    } else if (userRoleId === 2) {
      navigate("/ControllerDashboard")
    } else if (userRoleId === 4) {
      navigate("/DirectorDashboard")
    } else if (userRoleId === 3) {
      navigate("/FDashboard")
    } else {
      console.log("No valid role found, navigating to landing page")
      navigate("/")
    }
  }

  // Bell icon component for table header
  const BellIcon = ({ count }) => {
    const hasNewInstructions = count > 0

    const bellStyle = {
      width: "24px",
      height: "24px",
      fill: count > 0 ? "#ff0000" : "#00cc00", // Red if count > 0, green otherwise
      animation: hasNewInstructions ? "bellShake 2s infinite" : "none",
      position: "relative",
    }

    const countStyle = {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "black",
    }

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <style>{bellKeyframes}</style>
        {/* Solid bell SVG */}
        <svg style={bellStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {count > 0 && <span style={countStyle}>{count}</span>}
      </div>
    )
  }

  // Bell icon component for table rows
  const RowBellIcon = ({ count }) => {
    // Only render if count > 0
    if (count <= 0) return null

    const bellStyle = {
      width: "20px",
      height: "20px",
      fill: "#ff0000", // Red bell
      animation: "bellShake 2s infinite",
      display: "inline-block",
      position: "relative",
    }

    const countStyle = {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "black",
    }

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <style>{bellKeyframes}</style>
        {/* Solid bell SVG */}
        <svg style={bellStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        <span style={countStyle}>{count}</span>
      </div>
    )
  }

  // Bell container style for header
  const bellContainerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  }

  // Table style to override any existing CSS
  const tableStyle = {
    width: "100%",
    maxWidth: "1200px",
    marginLeft: "auto",
    marginRight: "auto",
    borderCollapse: "collapse",
  }

  return (
    <div className="" style={{ textAlign: "center" }}>
      {/* Back Button */}
      <div className="client-payments-header" style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "1000px", textAlign: "left" }}>
          <button className="back-button" onClick={handleBackClick}>
            Back
          </button>
        </div>
      </div>

      {/* Container search - above the table */}
      <div className="company-instruction-view-search-bar">
        <input
          type="text"
          className="company-instruction-view-search-input"
          placeholder="Search by container number or client ref"
          value={containerSearch}
          onChange={(e) => setContainerSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table3" style={{ display: "flex", justifyContent: "center" }}>
        {loading ? (
          <p>Loading client data...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <>
            <table style={tableStyle}>
              <thead className="bg-blue-300">
                <tr>
                  <th className="p-3" style={{ fontWeight: "bold" }}>
                    Company
                  </th>
                  <th className="p-3" style={{ fontWeight: "bold" }}>
                    Representative
                  </th>
                  <th className="p-3" style={{ fontWeight: "bold" }}>
                    Email
                  </th>
                  <th className="p-3" style={{ ...centeredCellStyle, fontWeight: "bold" }}>
                    <div style={bellContainerStyle}>
                      New <BellIcon count={totalNewInstructions} />
                    </div>
                  </th>
                  <th className="p-3" style={{ ...centeredCellStyle, fontWeight: "bold" }}>
                    In Progress
                  </th>
                  <th className="p-3" style={{ ...centeredCellStyle, fontWeight: "bold" }}>
                    Completed
                  </th>
                  <th className="p-3" style={{ fontWeight: "bold" }}>
                    Instructions
                  </th>
                </tr>
              </thead>
              <tbody>
                {containerSearchLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center p-3">
                      Searching...
                    </td>
                  </tr>
                ) : currentClients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-3">
                      {containerSearch.trim() ? "No clients found for that container number or client ref" : "No client data available"}
                    </td>
                  </tr>
                ) : (
                  currentClients.map((client, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{client.companyname}</td>
                      <td className="p-3">{client.representative}</td>
                      <td className="p-3">{client.email}</td>
                      <td className="p-3" style={centeredCellStyle}>
                        {client.new_count > 0 ? <RowBellIcon count={client.new_count} /> : "0"}
                      </td>
                      <td className="p-3" style={centeredCellStyle}>
                        {client.in_progress_count}
                      </td>
                      <td className="p-3" style={centeredCellStyle}>
                        {client.completed_count}
                      </td>
                      <td className="p-3">
                        <button
                          className={`company-instruction-view-view-button ${client.new_count > 0 ? "red-state" : ""}`}
                          onClick={() =>
                            navigate("/CompanyInstructions", {
                              state: {
                                clientId: client.m5clientkey,
                                clientName: client.companyname,
                                containerSearch: containerSearch.trim() || undefined,
                              },
                            })
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && filteredClients.length > 0 && (
        <div className="company-instruction-view-pagination-container">
          <Pagination
            totalRecords={filteredClients.length}
            recordsPerPage={recordsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}

export default CompanyInstructionView
