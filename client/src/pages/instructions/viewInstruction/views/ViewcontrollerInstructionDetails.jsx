"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/containerdetails.css"
import "../../../../css/components.css"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"

const ViewcontrollerInstructionDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { controllerData, isImport, instructionId, clientId, clientName, selectedMonth, selectedYear, activeFilter } =
    location.state || {}

  // Debug log to verify state is being passed correctly
  console.log("ViewcontrollerInstructionDetails received state:", {
    instructionId,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  })

  // Handle back button click - ensure we pass all state back
  const handleBackClick = () => {
    navigate("/Viewcontrollerinstructions", {
      state: {
        instructionId,
        clientId,
        clientName,
        selectedMonth,
        selectedYear,
        activeFilter,
        preservedFormData: controllerData,
      },
    })
  }

  // State for container data
  const [containers, setContainers] = useState([])
  const [originalContainers, setOriginalContainers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  // Add a new state variable to track controller data changes
  const [updatedControllerData, setUpdatedControllerData] = useState(controllerData || {})

  // Add a state to track if data has been modified
  const [isDataModified, setIsDataModified] = useState(false)

  // Initialize containers based on container counts
  const initializeContainers = () => {
    if (controllerData) {
      const containersList = []
      let containerId = 1

      // Add 6m containers
      for (let i = 0; i < (controllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "6m",
          cargoDescription: "", // Add cargo description field
        })
      }

      // Add 12m containers
      for (let i = 0; i < (controllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "12m",
          cargoDescription: "", // Add cargo description field
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (controllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: "",
          containerType: "Abnormal",
          cargoDescription: "", // Add cargo description field
        })
      }

      setContainers(containersList)
      setOriginalContainers([...containersList])
      setIsLoading(false)
    }
  }

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    if (instructionId) {
      fetchContainers(instructionId)
    } else if (controllerData) {
      initializeContainers()
    } else {
      // Redirect back if no data
      navigate("/Viewcontrollerinstructions")
    }
  }, [instructionId, controllerData, navigate])

  // Re-initialize containers when updatedControllerData changes
  // useEffect(() => {
  //   if (!preservedContainers && !instructionId && updatedControllerData) {
  //     initializeContainers()
  //   }
  // }, [updatedControllerData, preservedContainers, instructionId])

  // Fetch containers for the given instruction ID
  const fetchContainers = async (id) => {
    setIsLoading(true)
    try {
      console.log(`Fetching containers for instruction ID: ${id}`)
      const response = await api.get(`/api/containers/${id}`)
      const data = response.data

      if (!data) {
        // If containers don't exist yet, initialize based on controllerData
        if (response.status === 404) {
          console.log("No containers found, initializing from controller data")
          initializeContainers()
          return
        }
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch containers: ${response.status} ${response.statusText}`)
      }

      console.log("Containers data received:", data)

      if (data && data.length > 0) {
        // Map container data to our format
        const containersList = data.map((container, index) => ({
          id: index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum ? container.containernum.toString() : "",
          weight: container.weight !== null ? container.weight.toString() : "",
          containerType: determineContainerType(index, controllerData),
          cargoDescription: container.cargo_description || "", // Add cargo description field
        }))

        // Ensure the number of containers matches the counts in controllerData
        const updatedContainersList = syncContainersWithCounts(containersList)

        setContainers(updatedContainersList)
      } else {
        // If no containers found, initialize based on controllerData
        initializeContainers()
      }
    } catch (error) {
      console.error("Error fetching containers:", error)
      if (error.response?.status === 404) {
        console.log("No containers found, initializing from controller data")
        initializeContainers()
        return
      }
      // If error, initialize based on controllerData
      initializeContainers()
    } finally {
      setIsLoading(false)
    }
  }

  // Sync containers with the counts from controllerData
  const syncContainersWithCounts = (containersList) => {
    if (!controllerData) return containersList

    const sixMCount = controllerData.num_six_meters || 0
    const twelveMCount = controllerData.num_twelve_meters || 0
    const abnormalCount = controllerData.num_abnormal || 0

    // Count current containers by type
    const currentCounts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    containersList.forEach((container) => {
      currentCounts[container.containerType]++
    })

    let result = [...containersList]
    let nextId = containersList.length + 1

    // Add missing containers
    for (let i = currentCounts["6m"]; i < sixMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "6m",
        cargoDescription: "", // Add cargo description field
      })
    }

    for (let i = currentCounts["12m"]; i < twelveMCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "12m",
        cargoDescription: "", // Add cargo description field
      })
    }

    for (let i = currentCounts["Abnormal"]; i < abnormalCount; i++) {
      result.push({
        id: nextId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "Abnormal",
        cargoDescription: "", // Add cargo description field
      })
    }

    // Remove excess containers
    if (
      currentCounts["6m"] > sixMCount ||
      currentCounts["12m"] > twelveMCount ||
      currentCounts["Abnormal"] > abnormalCount
    ) {
      // Filter containers to keep only the required number of each type
      const filteredContainers = []
      const typeCounts = { "6m": 0, "12m": 0, Abnormal: 0 }

      for (const container of result) {
        if (
          typeCounts[container.containerType] <
          (container.containerType === "6m"
            ? sixMCount
            : container.containerType === "12m"
              ? twelveMCount
              : abnormalCount)
        ) {
          filteredContainers.push(container)
          typeCounts[container.containerType]++
        }
      }

      // Reassign IDs to maintain sequential order
      result = filteredContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))
    }

    return result
  }

  // Determine container type based on index and controller data
  const determineContainerType = (index, data) => {
    if (!data) return "Unknown"

    const sixMCount = data.num_six_meters || 0
    const twelveMCount = data.num_twelve_meters || 0

    if (index < sixMCount) return "6m"
    if (index < sixMCount + twelveMCount) return "12m"
    return "Abnormal"
  }

  // Style for non-editable fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
  }

  return (
    <>
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => {
            // Check if we have a custom onClose function
            if (errorModal.onClose) {
              errorModal.onClose()
            } else {
              setErrorModal({ ...errorModal, isOpen: false })
            }
          }}
          message={errorModal.message}
        />
      )}

      <button className="back-button" onClick={handleBackClick}>
        Back
      </button>

      {/* Client Info - Hidden with CSS */}
      <div style={{ display: "none" }}>
        <span>
          <strong>Client:</strong> {clientName} (ID: {clientId})
        </span>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div
          className="success-message"
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
            textAlign: "center",
          }}
        >
          {successMessage}
        </div>
      )}

      <div className="container-details-wrapper">
        <div className="content">
          <br />

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Loading container data...</p>
            </div>
          ) : (
            <div className="container-table-wrapper">
              <table className="container-table1">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Container Type</th>
                    <th>Container Number</th>
                    {isImport && <th>Weight</th>}
                    <th>Cargo Description</th> {/* Add new column header */}
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container, index) => (
                    <tr key={container.id} className={index % 2 === 1 ? "even-row" : ""}>
                      <td>{container.id}</td>
                      <td>{container.containerType}</td>
                      <td>
                        <input
                          type="text"
                          value={container.containerNum}
                          readOnly
                          className="container-input"
                          style={nonEditableStyle}
                        />
                      </td>
                      {isImport && (
                        <td>
                          <input
                            type="text"
                            value={container.weight}
                            readOnly
                            className="container-input"
                            style={nonEditableStyle}
                          />
                        </td>
                      )}
                      {/* Add new Cargo Description cell */}
                      <td>
                        <input
                          type="text"
                          value={container.cargoDescription}
                          readOnly
                          className="container-input"
                          style={nonEditableStyle}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ViewcontrollerInstructionDetails
