"use client"

import { useState, useEffect } from "react"
import "../../css/containerdetails.css"
import { useNavigate, useLocation } from "react-router-dom"
import "../../../../css/components.css"
import ErrorModal from "../../../../components/ErrorModal.jsx"
import api from "../../../../api" // Import the axios instance

const FCcontrollerInstructionDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get data from location state
  const {
    controllerData,
    isImport,
    instructionId,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
    preservedContainers, // Check for preserved containers
  } = location.state || {
    controllerData: null,
    isImport: false,
    instructionId: null,
    clientId: null,
    clientName: null,
    selectedMonth: null,
    selectedYear: null,
    activeFilter: null,
    preservedContainers: null,
  }

  // Log the received state for debugging
  console.log("FCcontrollerInstructionDetails received state:", location.state)
  console.log("FCcontrollerInstructionDetails - controllerData:", controllerData)
  console.log("FCcontrollerInstructionDetails - container counts:", {
    "6m": controllerData?.num_six_meters || 0,
    "12m": controllerData?.num_twelve_meters || 0,
    Abnormal: controllerData?.num_abnormal || 0,
  })
  console.log("FCcontrollerInstructionDetails - preservedContainers:", preservedContainers)

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
    console.log("initializeContainers called with updatedControllerData:", updatedControllerData)

    if (updatedControllerData && Object.keys(updatedControllerData).length > 0) {
      const containersList = []
      let containerId = 1

      console.log("Initializing containers with counts:", {
        "6m": updatedControllerData.num_six_meters || 0,
        "12m": updatedControllerData.num_twelve_meters || 0,
        Abnormal: updatedControllerData.num_abnormal || 0,
      })

      // Get the client's surcharge rate for container calculations
      let clientSurchargeRate = 0;
      if (updatedControllerData.surchargesAmount !== undefined && 
          updatedControllerData.surchargesAmount !== null && 
          updatedControllerData.surchargesAmount !== "") {
        const parsedRate = Number.parseFloat(updatedControllerData.surchargesAmount);
        if (!isNaN(parsedRate)) {
          clientSurchargeRate = parsedRate;
        }
      }
      
      console.log("Client surcharge rate for containers:", clientSurchargeRate);
      
      // Add 6m containers
      for (let i = 0; i < (updatedControllerData.num_six_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "6m",
          cargoDescription: "", // Add cargo description field
          hazardous: false, // Add hazardous field
          surcharges: Boolean(updatedControllerData.surcharges), // Add surcharges field
          "Surcharge Amount": Boolean(updatedControllerData.surcharges) ? clientSurchargeRate : 0, // Add surcharge amount
        })
      }

      // Add 12m containers
      for (let i = 0; i < (updatedControllerData.num_twelve_meters || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "12m",
          cargoDescription: "", // Add cargo description field
          hazardous: false, // Add hazardous field
          surcharges: Boolean(updatedControllerData.surcharges), // Add surcharges field
          "Surcharge Amount": Boolean(updatedControllerData.surcharges) ? clientSurchargeRate : 0, // Add surcharge amount
        })
      }

      // Add abnormal containers
      for (let i = 0; i < (updatedControllerData.num_abnormal || 0); i++) {
        containersList.push({
          id: containerId++,
          containerKey: null, // New container, no key yet
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: "Abnormal",
          cargoDescription: "", // Add cargo description field
          hazardous: false, // Add hazardous field
          surcharges: Boolean(updatedControllerData.surcharges), // Add surcharges field
          "Surcharge Amount": Boolean(updatedControllerData.surcharges) ? clientSurchargeRate : 0, // Add surcharge amount
        })
      }

      console.log("Initialized containers:", containersList)
      setContainers(containersList)
      setOriginalContainers([...containersList])
      setIsLoading(false)
    } else {
      console.log("No controller data available, redirecting back")
      // Redirect back if no data
      navigate("/FCcontrollerinstructions")
    }
  }

  // Fetch existing containers if instructionId is provided
  useEffect(() => {
    console.log("useEffect triggered with:", {
      controllerData: !!controllerData,
      preservedContainers: !!preservedContainers,
      instructionId: instructionId,
    })

    if (controllerData) {
      // Initialize updatedControllerData with controllerData
      console.log("Setting updatedControllerData from controllerData")
      setUpdatedControllerData(controllerData)
    }

    if (preservedContainers && preservedContainers.length > 0) {
      // Use preserved containers if available
      console.log("Using preserved containers:", preservedContainers)

      // Ensure the number of containers matches the counts in controllerData
      const syncedContainers = syncContainersWithCounts(preservedContainers)

      setContainers(syncedContainers)
      setOriginalContainers([...syncedContainers])
      setIsLoading(false)
    } else if (instructionId) {
      console.log("Fetching containers for instructionId:", instructionId)
      fetchContainers(instructionId)
    } else if (controllerData && Object.keys(controllerData).length > 0) {
      // Force a re-initialization when controllerData changes
      console.log("Initializing containers from controllerData")
      // Set a small delay to ensure state is updated
      setTimeout(() => {
        initializeContainers()
      }, 100)
    } else {
      console.log("No data available, redirecting back")
      // Redirect back if no data - pass all state back
      navigate("/FCcontrollerinstructions", {
        state: {
          clientId,
          clientName,
          selectedMonth,
          selectedYear,
          activeFilter,
        },
      })
    }
  }, [
    instructionId,
    controllerData,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
    preservedContainers,
  ])

  // Re-initialize containers when updatedControllerData changes
  useEffect(() => {
    console.log("updatedControllerData changed:", updatedControllerData)
    if (
      !preservedContainers &&
      !instructionId &&
      updatedControllerData &&
      Object.keys(updatedControllerData).length > 0
    ) {
      console.log("Re-initializing containers due to updatedControllerData change")
      initializeContainers()
    }
  }, [updatedControllerData, preservedContainers, instructionId])

  // Fetch containers for the given instruction ID using existing MVC endpoint
  const fetchContainers = async (id) => {
    setIsLoading(true)
    try {
      console.log(`Fetching containers for instruction ID: ${id}`)

      // Use the existing MVC endpoint from instructionRoute.js
      const response = await api.get(`/api/containers/${id}`)

      console.log("Containers data received:", response.data)

      if (response.data && response.data.length > 0) {
        // Map container data to our format
        const containersList = response.data.map((container, index) => {
          console.log("Processing container:", container);
          return {
            id: index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum ? container.containernum.toString() : "",
            weight: container.weight !== null ? container.weight.toString() : "",
            containerType: container.container_type || "Unknown",
            cargoDescription: container.cargo_description || "", // Add cargo description field
            hazardous: container["Hazardous"] === true || container.hazardous === true || false, // Handle case-sensitive column name
            surcharges: container["Add Surcharges"] === true || container.surcharges === true || Boolean(updatedControllerData.surcharges) || false, // Handle case-sensitive column name
            "Surcharge Amount": container["Surcharge Amount"] || 0
          };
        })

        // Ensure the number of containers matches the counts in controllerData
        const updatedContainersList = syncContainersWithCounts(containersList)

        setContainers(updatedContainersList)
        setOriginalContainers([...updatedContainersList])
      } else {
        // If no containers found, initialize based on controllerData
        console.log("No existing containers found, initializing new ones")
        initializeContainers()
      }
    } catch (error) {
      console.error("Error fetching containers:", error)

      // Handle axios error response
      if (error.response && error.response.status === 404) {
        console.log("No containers found, initializing from controller data")
        initializeContainers()
        return
      }

      // If error, initialize based on controllerData
      console.log("Error occurred, falling back to initialization")
      initializeContainers()
    } finally {
      setIsLoading(false)
    }
  }

  // Sync containers with counts in controllerData
  const syncContainersWithCounts = (existingContainers) => {
    if (!updatedControllerData) return existingContainers

    const counts = {
      "6m": updatedControllerData.num_six_meters || 0,
      "12m": updatedControllerData.num_twelve_meters || 0,
      Abnormal: updatedControllerData.num_abnormal || 0,
    }

    const currentCounts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    // Count existing containers by type
    existingContainers.forEach((container) => {
      if (container.containerType in currentCounts) {
        currentCounts[container.containerType]++
      }
    })

    // Create a new list with the correct number of containers
    const newContainers = [...existingContainers]
    let containerId = existingContainers.length + 1

    // Get the client's surcharge rate for container calculations
    let clientSurchargeRate = 0;
    if (updatedControllerData.surchargesAmount !== undefined && 
        updatedControllerData.surchargesAmount !== null && 
        updatedControllerData.surchargesAmount !== "") {
      const parsedRate = Number.parseFloat(updatedControllerData.surchargesAmount);
      if (!isNaN(parsedRate)) {
        clientSurchargeRate = parsedRate;
      }
    }

    // Add missing containers
    Object.keys(counts).forEach((type) => {
      const diff = counts[type] - currentCounts[type]
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          newContainers.push({
            id: containerId++,
            containerKey: null,
            containerNum: "",
            weight: isImport ? "" : null,
            containerType: type,
            cargoDescription: "", // Add cargo description field
            hazardous: false, // Initialize hazardous field
            surcharges: Boolean(updatedControllerData.surcharges), // Initialize surcharges field
            "Surcharge Amount": Boolean(updatedControllerData.surcharges) ? clientSurchargeRate : 0, // Initialize surcharge amount
          })
        }
      }
    })

    // Remove extra containers (from the end of each type group)
    Object.keys(counts).forEach((type) => {
      const diff = currentCounts[type] - counts[type]
      if (diff > 0) {
        // Find the indices of containers of this type, in reverse order
        const indices = []
        for (let i = newContainers.length - 1; i >= 0; i--) {
          if (newContainers[i].containerType === type) {
            indices.push(i)
            if (indices.length === diff) break
          }
        }
        // Remove containers at these indices
        indices.forEach((index) => {
          newContainers.splice(index, 1)
        })
      }
    })

    // Renumber container IDs
    newContainers.forEach((container, index) => {
      container.id = index + 1
    })

    return newContainers
  }

  // Handle container input change with real-time validation
  const handleContainerChange = (id, field, value) => {
    if (field === "containerNum") {
      // Get the current container
      const container = containers.find((c) => c.id === id)
      const currentValue = container ? container.containerNum : ""

      // For container numbers, enforce the format: 4 letters followed by 7 numbers
      if (value.length > 11) {
        // Prevent entering more than 11 characters
        return
      }

      // Create a new value by validating each character
      let newValue = ""
      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (i < 4) {
          // First 4 positions: only allow letters
          if (/^[a-zA-Z]$/.test(char)) {
            newValue += char
          }
        } else {
          // Positions 5-11: only allow numbers
          if (/^[0-9]$/.test(char)) {
            newValue += char
          }
        }
      }

      // Only update if the filtered value is different from the input
      if (newValue !== value) {
        return
      }

      // Real-time validation
      let error = null
      if (newValue.length > 0 && newValue.length < 11) {
        error = "Does not match correct format (ABCD1234567)"
      } else if (newValue.length === 11 && !/^[a-zA-Z]{4}[0-9]{7}$/.test(newValue)) {
        error = "Does not match correct format (ABCD1234567)"
      }

      // Update field errors
      setFieldErrors((prev) => ({
        ...prev,
        [`container-${id}`]: error,
      }))
    }

    // Update the container value
    setContainers((prevContainers) =>
      prevContainers.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
    setIsDataModified(true)

    // Clear any error for weight field
    if (field === "weight") {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`weight-${id}`]
        return newErrors
      })
    }
  }

  // Update the handleAddContainer function to use the state variable
  const handleAddContainer = (containerType) => {
    // Get the client's surcharge rate for container calculations
    let clientSurchargeRate = 0;
    if (updatedControllerData.surchargesAmount !== undefined && 
        updatedControllerData.surchargesAmount !== null && 
        updatedControllerData.surchargesAmount !== "") {
      const parsedRate = Number.parseFloat(updatedControllerData.surchargesAmount);
      if (!isNaN(parsedRate)) {
        clientSurchargeRate = parsedRate;
      }
    }
    
    setContainers((prevContainers) => [
      ...prevContainers,
      {
        id: prevContainers.length + 1,
        containerKey: null, // New container, no key yet
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: containerType,
        cargoDescription: "", // Add cargo description field
        hazardous: false, // Initialize hazardous field
        surcharges: Boolean(updatedControllerData.surcharges), // Initialize surcharges field
        "Surcharge Amount": Boolean(updatedControllerData.surcharges) ? clientSurchargeRate : 0, // Initialize surcharge amount
      },
    ])

    // Update container counts in updatedControllerData
    setUpdatedControllerData((prev) => {
      const updated = { ...prev }
      if (containerType === "6m") {
        updated.num_six_meters = (updated.num_six_meters || 0) + 1
      } else if (containerType === "12m") {
        updated.num_twelve_meters = (updated.num_twelve_meters || 0) + 1
      } else if (containerType === "Abnormal") {
        updated.num_abnormal = (updated.num_abnormal || 0) + 1
      }

      // Recalculate total_cost using new rate structure
      const totalCost = calculateTotalCostFromRates(
        updated.rateper_6 || 0,
        updated.rateper_12 || 0,
        updated.rateper_abnormal || 0,
        updated.num_six_meters || 0,
        updated.num_twelve_meters || 0,
        updated.num_abnormal || 0,
      )
      updated.total_cost = totalCost

      return updated
    })
  }

  // Update the handleDeleteContainer function to use the state variable
  const handleDeleteContainer = (id) => {
    const containerToDelete = containers.find((container) => container.id === id)

    setContainers((prevContainers) => {
      const filteredContainers = prevContainers.filter((container) => container.id !== id)

      // Reassign IDs to maintain sequential order
      return filteredContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))
    })

    // Update container counts in updatedControllerData
    if (containerToDelete) {
      setUpdatedControllerData((prev) => {
        const updated = { ...prev }
        if (containerToDelete.containerType === "6m") {
          updated.num_six_meters = Math.max(0, (updated.num_six_meters || 0) - 1)
        } else if (containerToDelete.containerType === "12m") {
          updated.num_twelve_meters = Math.max(0, (updated.num_twelve_meters || 0) - 1)
        } else if (containerToDelete.containerType === "Abnormal") {
          updated.num_abnormal = Math.max(0, (updated.num_abnormal || 0) - 1)
        }

        // Recalculate total_cost using new rate structure
        const totalCost = calculateTotalCostFromRates(
          updated.rateper_6 || 0,
          updated.rateper_12 || 0,
          updated.rateper_abnormal || 0,
          updated.num_six_meters || 0,
          updated.num_twelve_meters || 0,
          updated.num_abnormal || 0,
        )
        updated.total_cost = totalCost

        return updated
      })
    }

    // Clear any errors for this container
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`container-${id}`]
      delete newErrors[`weight-${id}`]
      return newErrors
    })
  }

  // Helper function to calculate total cost from individual rates
  const calculateTotalCostFromRates = (rate6, rate12, rateAbnormal, count6, count12, countAbnormal) => {
    return rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal
  }

  // Validate containers with updated container number format validation
  const validateContainers = () => {
    // Validate container counts match the specified counts in updatedControllerData
    const counts = countContainersByType()
    const newErrors = {}
    let isValid = true

    if (counts["6m"] !== (updatedControllerData.num_six_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 6m containers (${counts["6m"]}) does not match the specified count (${
          updatedControllerData.num_six_meters || 0
        }).`,
      })
      return false
    }

    if (counts["12m"] !== (updatedControllerData.num_twelve_meters || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of 12m containers (${counts["12m"]}) does not match the specified count (${
          updatedControllerData.num_twelve_meters || 0
        }).`,
      })
      return false
    }

    if (counts["Abnormal"] !== (updatedControllerData.num_abnormal || 0)) {
      setErrorModal({
        isOpen: true,
        message: `The number of Abnormal containers (${counts["Abnormal"]}) does not match the specified count (${
          updatedControllerData.num_abnormal || 0
        }).`,
      })
      return false
    }

    // Validate container numbers and weights
    for (const container of containers) {
      if (!container.containerNum) {
        newErrors[`container-${container.id}`] = "Field is required"
        isValid = false
      }
      // Check container number format (11 chars: 4 letters followed by 7 numbers)
      else if (container.containerNum.length !== 11) {
        newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      } else if (!/^[a-zA-Z]{4}[0-9]{7}$/.test(container.containerNum)) {
        newErrors[`container-${container.id}`] = "Does not match correct format (ABCD1234567)"
        isValid = false
      }

      if (isImport && (container.weight === "" || container.weight === null)) {
        newErrors[`weight-${container.id}`] = "Field is required"
        isValid = false
      } else if (isImport && container.weight && !/^[0-9]*\.?[0-9]*$/.test(container.weight)) {
        newErrors[`weight-${container.id}`] = "Numbers only"
        isValid = false
      }
    }

    setFieldErrors(newErrors)
    return isValid
  }

  // IMPROVED: Update the handleBackClick function to preserve all current form state
  const handleBackClick = () => {
    // Count current containers by type
    const counts = countContainersByType()

    // Create comprehensive form data with all current values including rates
    const finalControllerData = {
      ...updatedControllerData,
      num_six_meters: counts["6m"],
      num_twelve_meters: counts["12m"],
      num_abnormal: counts["Abnormal"],
      // Preserve rate fields for the form - ensure they're strings for input fields
      sixMeterRate: updatedControllerData.rateper_6?.toString() || updatedControllerData.sixMeterRate || "",
      twelveMeterRate: updatedControllerData.rateper_12?.toString() || updatedControllerData.twelveMeterRate || "",
      abnormalRate: updatedControllerData.rateper_abnormal?.toString() || updatedControllerData.abnormalRate || "",
    }

    // Recalculate total_cost using new rate structure
    const totalCost = calculateTotalCostFromRates(
      finalControllerData.rateper_6 || 0,
      finalControllerData.rateper_12 || 0,
      finalControllerData.rateper_abnormal || 0,
      counts["6m"],
      counts["12m"],
      counts["Abnormal"],
    )
    finalControllerData.total_cost = totalCost

    // Use the updated controller data for navigation
    console.log("Navigating back with updated container counts:", counts)
    console.log("Updated controller data:", finalControllerData)

    // Navigate back to FCcontrollerinstructions with the updated form data and all state parameters
    navigate("/FCcontrollerinstructions", {
      state: {
        preservedFormData: finalControllerData,
        preservedContainers: containers, // Add containers to state
        containerCounts: counts, // Explicitly pass counts
        instructionId: instructionId,
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
      },
    })
  }

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
    }

    containers.forEach((container) => {
      counts[container.containerType]++
    })

    return counts
  }

  // Update the handleSubmit function to use existing MVC endpoints with new rate structure
  const handleSubmit = async () => {
    // Validate containers first
    if (!validateContainers()) {
      // Don't show error modal for field validation errors
      // The tooltips will be displayed instead
      return
    }

    try {
      // Create a copy of updatedControllerData for submission
      const submissionData = { ...updatedControllerData }

      // Calculate total cost using new rate structure
      const totalCost = calculateTotalCostFromRates(
        submissionData.rateper_6 || 0,
        submissionData.rateper_12 || 0,
        submissionData.rateper_abnormal || 0,
        submissionData.num_six_meters || 0,
        submissionData.num_twelve_meters || 0,
        submissionData.num_abnormal || 0,
      )
      submissionData.total_cost = totalCost

      // Set weight to null since we're using Container-based rates
      submissionData.weight = null

      // Log the values for debugging
      console.log("Before API call - total_cost:", submissionData.total_cost)
      console.log("Before API call - rateper_6:", submissionData.rateper_6)
      console.log("Before API call - rateper_12:", submissionData.rateper_12)
      console.log("Before API call - rateper_abnormal:", submissionData.rateper_abnormal)

      // First update the instruction if needed
      if (instructionId) {
        const instructionUpdateData = {
          // Map frontend field names to backend field names
          client: Number.parseInt(submissionData.clientId) || 0,
          task: String(submissionData.task || ""),
          shipment_type: Number.parseInt(submissionData.shipmentTypeId) || 0,
          pickup: String(submissionData.pickup || ""),
          dropoff: String(submissionData.dropoff || ""),
          hazardous: Boolean(submissionData.hazardous),
          surchages: Boolean(submissionData.surcharges), // Note: backend uses 'surchages' not 'surcharges'
          pickuptime: submissionData.pickupTime || null,
          pickupdate: submissionData.pickupDate || null,
          stackdate: submissionData.stackDate || null,
          deadline: submissionData.deadline || null,
          fileref: String(submissionData.fileRef || ""),
          rateweight: "Container", // Always Container for this form
          description: String(submissionData.description || ""),
          status: String(submissionData.status || "In Progress"),
          vat: Number.parseInt(submissionData.vat) || 15,
          num_six_meters: Number.parseInt(submissionData.num_six_meters) || 0,
          num_twelve_meters: Number.parseInt(submissionData.num_twelve_meters) || 0,
          num_abnormal: Number.parseInt(submissionData.num_abnormal) || 0,
          weight: null, // Always null for Container-based rates
          total_cost: Number.parseFloat(submissionData.total_cost || 0),
          // Shipping fields
          booking_ref: String(submissionData.bookingRef || ""),
          vessel_name: String(submissionData.vesselName || ""),
          voyage_num: String(submissionData.voyageNo || ""),
          imo_num: String(submissionData.imoNo || ""),
          flag_reg: String(submissionData.flagReg || ""),
          // New rate fields
          rateper_6: Number.parseFloat(submissionData.rateper_6 || 0),
          rateper_12: Number.parseFloat(submissionData.rateper_12 || 0),
          rateper_abnormal: Number.parseFloat(submissionData.rateper_abnormal || 0),
        }

        console.log("Updating instruction with properly mapped data:", instructionUpdateData)

        // Use existing MVC endpoint from instructionRoute.js
        await api.put(`/api/instruction/${instructionId}`, instructionUpdateData)
      }

      // Prepare container data for API with explicit cargo_description
      const containerData = containers.map((container) => ({
        containernum: container.containerNum,
        weight: isImport ? Number.parseFloat(container.weight || 0) : null,
        container_type: container.containerType,
        cargo_description: container.cargoDescription || "", // Add cargo description field
        file_ref: container.fileRef || "", // Add file_ref field
        "Hazardous": container.hazardous || false,
        "Add Surcharges": container.surcharges || false,
        "Surcharge Amount": container["Surcharge Amount"] || 0
      }))

      console.log("Sending container data to API:", JSON.stringify(containerData, null, 2))

      // Use existing MVC endpoint from instructionRoute.js
      const response = await api.post(`/api/containers/${instructionId}`, containerData)

      console.log("API response:", response.data)

      if (response.data.success) {
        // Show success message if using mock data
        if (response.data.mockData) {
          setErrorModal({
            isOpen: true,
            message: "Success! (Using mock data: " + response.data.message + ")",
            onClose: () => {
              // Navigate to FCcontrollerDashboard immediately after closing the modal
              setErrorModal({ isOpen: false, message: "" })
              navigate("/FDashboard")
            },
          })
        } else {
          // Navigate to FCcontrollerDashboard immediately
          navigate("/FDashboard")
        }
      } else {
        throw new Error("Failed to save instruction: " + (response.data.message || "Unknown error"))
      }
    } catch (error) {
      console.error("Error saving instruction:", error)

      let errorMessage = "Failed to save instruction. Please try again."

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response
        errorMessage = data?.message || `HTTP error! Status: ${status}`
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response received from server. Please check your connection."
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
    }
  }

  // Tooltip component for field errors
  const ErrorTooltip = ({ message }) => {
    if (!message) return null

    return (
      <div className="error-tooltip">
        {message}
        <div className="tooltip-arrow"></div>
      </div>
    )
  }

  // Add debug information to the render
  console.log("Rendering FCcontrollerInstructionDetails with:", {
    isLoading,
    containersLength: containers.length,
    updatedControllerData: !!updatedControllerData,
    controllerDataKeys: updatedControllerData ? Object.keys(updatedControllerData) : [],
  })

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
                    <th>Cargo Description</th>
                    <th>Hazardous</th>
                    <th>Add Surcharges</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.length === 0 ? (
                    <tr>
                      <td colSpan={isImport ? 8 : 7} style={{ textAlign: "center", padding: "20px" }}>
                        No containers to display. Please check the container counts in the previous form.
                      </td>
                    </tr>
                  ) : (
                    containers.map((container, index) => (
                      <tr key={container.id} className={index % 2 === 1 ? "even-row" : ""}>
                        <td>{container.id}</td>
                        <td>{container.containerType}</td>
                        <td className="input-cell">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              value={container.containerNum}
                              onChange={(e) => {
                                const value = e.target.value
                                handleContainerChange(container.id, "containerNum", value)
                              }}
                              className={`container-input ${
                                fieldErrors[`container-${container.id}`] ? "error-field" : ""
                              }`}
                              placeholder="ABCD1234567"
                              maxLength={11}
                            />
                            {fieldErrors[`container-${container.id}`] && (
                              <ErrorTooltip message={fieldErrors[`container-${container.id}`]} />
                            )}
                          </div>
                        </td>
                        {isImport && (
                          <td className="input-cell">
                            <div className="input-wrapper">
                              <input
                                type="text"
                                value={container.weight}
                                onChange={(e) => {
                                  const value = e.target.value
                                  // Only allow numbers and decimal point
                                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    handleContainerChange(container.id, "weight", value)
                                  }
                                }}
                                className={`container-input ${
                                  fieldErrors[`weight-${container.id}`] ? "error-field" : ""
                                }`}
                                placeholder="Weight"
                              />
                              {fieldErrors[`weight-${container.id}`] && (
                                <ErrorTooltip message={fieldErrors[`weight-${container.id}`]} />
                              )}
                            </div>
                          </td>
                        )}
                        {/* Cargo Description cell */}
                        <td className="input-cell">
                          <div className="input-wrapper">
                            <input
                              type="text"
                              value={container.cargoDescription}
                              onChange={(e) => {
                                handleContainerChange(container.id, "cargoDescription", e.target.value)
                              }}
                              className="container-input"
                              placeholder="Enter cargo description"
                            />
                          </div>
                        </td>
                        {/* Hazardous checkbox cell */}
                        <td className="checkbox-cell" style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={container.hazardous}
                            onChange={(e) => {
                              handleContainerChange(container.id, "hazardous", e.target.checked)
                            }}
                            className="container-checkbox"
                          />
                        </td>
                        {/* Add Surcharges checkbox cell */}
                        <td className="checkbox-cell" style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={container.surcharges}
                            onChange={(e) => {
                              handleContainerChange(container.id, "surcharges", e.target.checked)
                            }}
                            className="container-checkbox"
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteContainer(container.id)}
                            className="delete-button"
                            style={{
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              padding: "5px 10px",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="submit-section">
            <button className="submit-button" onClick={handleSubmit}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default FCcontrollerInstructionDetails
