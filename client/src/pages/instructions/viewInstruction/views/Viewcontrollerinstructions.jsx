"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/viewcontrollerinstructions.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"
import "../../../../css/components.css"

// ErrorTooltip component for displaying validation errors
const ErrorTooltip = ({ message }) => {
  if (!message) return null

  return (
    <div className="error-tooltip">
      <span className="error-icon">!</span>
      <div className="error-message">{message}</div>
    </div>
  )
}

const Viewcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true)
  const instructionId = location.state?.instructionId
  const preservedFormData = location.state?.preservedFormData || {}

  // Form data state with default values
  const getDefaultFormData = () => ({
    clientId: "",
    representative: "",
    contactDetails: "",
    email: "",
    shipmentTypeId: "",
    shipmentTypeName: "",
    ksmFileRef: "",
    pickup: "",
    dropoff: "",
    hazardous: false,
    surcharges: false,
    surchargesAmount: "",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    stackDate: "",
    lastFreeDate: "",
    clientFileRef: "",
    bookingRef: "",
    rateWeight: "Container",
    weight: "",
    vat: "",
    description: "",
    total_cost: 0,
    sixMeterRate: "",
    twelveMeterRate: "",
    abnormalRate: "",
    status: "",
    vesselName: "",
    unitrate: "",
    // Break bulk fields removed
    rateper_6: 0,
    rateper_12: 0,
    rateper_abnormal: 0,
    surchages: false,
    surcharge: 0,
    addon_invoice_number: "",
  })

  const [formData, setFormData] = useState(() => ({
    ...getDefaultFormData(),
    ...(preservedFormData || {}),
  }))

  // Refs for form fields
  const etaDateRef = useRef(null)
  const lastFreeDateRef = useRef(null)
  const vesselNameRef = useRef(null)

  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    ksmFileRef: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    stackDate: useRef(null),
    lastFreeDate: useRef(null),
    bookingRef: useRef(null),
    clientFileRef: useRef(null),
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    rateWeight: useRef(null),
    unitRate: useRef(null),
  }

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
    instruction: !!instructionId,
  })

  // State for container data
  const [containers, setContainers] = useState([])
  const [isLoadingContainers, setIsLoadingContainers] = useState(false)

  const [weightRows, setWeightRows] = useState([])

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for success message
  const [successMessage, setSuccessMessage] = useState("")

  // State to track if shipment type is Import
  const [isImport, setIsImport] = useState(false)

  // State to track if shipment type is Export
  const [isExport, setIsExport] = useState(false)

  // State to track if shipment type is cross-haul or shipmentID is 3
  const [isCrossHaulOrSpecial, setIsCrossHaulOrSpecial] = useState(false)

  const [isSetRate, setIsSetRate] = useState(false)
  const [setRateValue, setSetRateValue] = useState(0)

  // REMOVED: Dynamic fetching of set_rate - now using historical_set_rate from database
  // The historical value is loaded in fetchInstructionData and stored in setSetRateValue
  /*
  useEffect(() => {
    const fetchSetRate = async () => {
      if (isSetRate && formData.clientId && formData.pickup && formData.dropoff) {
        try {
          const encodedPickup = encodeURIComponent(formData.pickup)
          const encodedDropoff = encodeURIComponent(formData.dropoff)
          const response = await api.get(`/api/instructions/client/${formData.clientId}/set-rate/${encodedPickup}/${encodedDropoff}`)
          if (response.data && response.data.set_rate !== undefined) {
            setSetRateValue(Number(response.data.set_rate))
          }
        } catch (error) {
          console.error("Error fetching set_rate:", error)
          setSetRateValue(0)
        }
      }
    }
    fetchSetRate()
  }, [isSetRate, formData.clientId, formData.pickup, formData.dropoff])
  */

  // Style for non-editable fields - applied to ALL fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
  }

  // Format date from ISO to YYYY-MM-DD for date inputs
  const formatDateForInput = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return date.toISOString().split("T")[0]
  }

  // Format time from HH:MM:SS to HH:MM for time inputs
  const formatTimeForInput = (time) => {
    if (!time) return ""
    return time.substring(0, 5) // Get HH:MM from HH:MM:SS
  }

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1) // Go back to the previous page
  }

  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  const isAddOn = (() => {
    const id = (formData.shipmentTypeId || "").toString()
    const name = (formData.shipmentTypeName || "").toLowerCase()
    const selectedType = shipmentTypes.find((type) => (type.shipkey || type.id)?.toString() === id)
    const typeName = (selectedType?.shipmenttype || "").toLowerCase()
    return (
      id === "5" ||
      name === "add-on" ||
      name === "add on" ||
      typeName === "add-on" ||
      typeName === "add on"
    )
  })()

  // Check if shipment type is Cross-haul (type 3) or Cross-haul(break bulk) (type 4)
  const isCrossHaulShipment = () => {
    console.log("Checking if cross-haul shipment:", {
      shipmentTypeId: formData.shipmentTypeId,
      shipmentTypeName: formData.shipmentTypeName,
      shipmentTypes: shipmentTypes,
    })

    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
    console.log("Selected shipment type:", selectedShipmentType)

    // Check both by ID and by name
    const isCrossHaulById = formData.shipmentTypeId === "3" || formData.shipmentTypeId === "4"
    const isCrossHaulByType =
      selectedShipmentType && (
        selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul" ||
        selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul(break bulk)" ||
        selectedShipmentType.shipmenttype.toLowerCase() === "cross haul" ||
        selectedShipmentType.shipmenttype.toLowerCase() === "cross haul(break bulk)"
      )
    const isCrossHaulByName =
      formData.shipmentTypeName.toLowerCase() === "cross-haul" ||
      formData.shipmentTypeName.toLowerCase() === "cross-haul(break bulk)" ||
      formData.shipmentTypeName.toLowerCase() === "cross haul" ||
      formData.shipmentTypeName.toLowerCase() === "cross haul(break bulk)"

    const result = isCrossHaulById || isCrossHaulByType || isCrossHaulByName
    console.log("isCrossHaulShipment result:", result, "(byId:", isCrossHaulById, "byType:", isCrossHaulByType, "byName:", isCrossHaulByName, ")")

    return result
  }

  // Fetch all required data on component mount
  useEffect(() => {
    console.log("useEffect triggered with:", { instructionId, preservedFormData: !!preservedFormData })

    const fetchData = async () => {
      try {
        if (!instructionId) {
          console.log("No instructionId provided")
          navigate("/CompanyInstructions")
          return
        }

        console.log("Calling fetchInstructionData with ID:", instructionId)
        await fetchInstructionData(instructionId)

        // First fetch clients and shipment types
        await Promise.all([fetchClients(), fetchShipmentTypes()])

        // Then fetch container details after formData is set
        fetchContainerDetails()

        // Mark initial data as loaded
        setInitialDataLoaded(true)
        console.log("Initial data loading complete")
      } catch (error) {
        console.error("Error in fetchData:", error)
        setErrorModal({
          isOpen: true,
          message: `Failed to load required data: ${error.message || "Unknown error"}`,
        })
      }
    }

    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [instructionId, navigate])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    if (!id) {
      console.error("No instruction ID provided")
      throw new Error("No instruction ID provided")
    }

    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instructions/instruction/${id}`)
      const data = response.data

      if (!data) {
        throw new Error("No data received from server")
      }

      // Log the received data for debugging
      console.log("API Response Data:", data)

      console.log("Instruction data received:", data)

      // Start with default form data and override with API data
      const defaultFormData = getDefaultFormData()

      // Format dates and times for input fields
      const formattedData = {
        ...defaultFormData,
        clientId: data.client?.toString() || "",
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type?.toString() || "",
        shipmentTypeName: data.shipmenttype || "",
        ksmFileRef: data.ksmFileRef || "", // Updated from task to ksmFileRef
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        hazardous: Boolean(data.hazardous),
        surchages: Boolean(data.surchages), // Note: This matches the database field name (missing 'r')
        surcharge: data.surcharge || 0,
        stackDate: formatDateForInput(data.stackdate) || "",
        lastFreeDate: formatDateForInput(data.lastFreeDate) || "", // Updated from deadline to lastFreeDate
        clientFileRef: data.clientFileRef || "", // Updated from fileref to clientFileRef
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? data.weight.toString() : "",
        num_six_meters: Number(data.num_six_meters) || 0,
        num_twelve_meters: Number(data.num_twelve_meters) || 0,
        num_abnormal: Number(data.num_abnormal) || 0,
        num_breakbulk: Number(data.num_breakbulk) || 0, // Added missing field
        vat: data.vat,
        description: data.description || "",
        status: data.status || "",
        vesselName: data.vessel_name || "",
        total_cost: Number(data.total_cost) || 0,
        rateper_6: data.rateper_6 ? Number(data.rateper_6) : 0,
        rateper_12: data.rateper_12 ? Number(data.rateper_12) : 0,
        rateper_abnormal: data.rateper_abnormal ? Number(data.rateper_abnormal) : 0,
        rateper_breakbulk: data.rateper_breakbulk ? Number(data.rateper_breakbulk) : 0, // Added missing field
        unitrate: data.unitrate || "",
        is_set_rate: Boolean(data.is_set_rate) || false,
        historical_set_rate: data.historical_set_rate || null,
        addon_invoice_number: data.addon_invoice_number || "",
        // Break bulk fields removed
      }

      // Add detailed logging for VAT value
      console.log("VAT value from API:", {
        rawVat: data.vat,
        rawVatType: typeof data.vat,
        processedVat: formattedData.vat,
        processedVatType: typeof formattedData.vat
      })
            console.log("Formatted data before setFormData:", formattedData)
      setFormData(formattedData)

      setIsSetRate(Boolean(data.is_set_rate) || false)
      
      // Use historical set rate value from database instead of fetching dynamically
      if (data.is_set_rate && data.historical_set_rate) {
        setSetRateValue(Number(data.historical_set_rate))
      }

      if (String(data.shipment_type) === "4" && Array.isArray(data.weight_rows)) {
        const mappedRows = data.weight_rows.map((row, index) => ({
          id: row.weight_pk || index + 1,
          ksmDmNo: row.ksm_dm_no || "",
          ticketNo: row.ticket_no || "",
          receiptBookNo: row.receipt_book_no || "",
          weight:
            row.weight === null || row.weight === undefined
              ? ""
              : String(row.weight),
        }))
        setWeightRows(mappedRows)
      } else {
        setWeightRows([])
      }

      // Set isImport and isExport based on the fetched shipment type
      const shipmentTypeName = data.shipmenttype || ""
      const shipmentTypeIdValue = data.shipment_type?.toString() || ""
      const isImportValue = shipmentTypeName.toLowerCase() === "import" || shipmentTypeIdValue === "1"
      const isExportValue = shipmentTypeName.toLowerCase() === "export" || shipmentTypeIdValue === "2"
      console.log("Setting isImport to:", isImportValue)
      console.log("Setting isExport to:", isExportValue)
      setIsImport(isImportValue)
      setIsExport(isExportValue)

      // Set isCrossHaulOrSpecial based on shipment type or ID
      const isCrossHaul =
        shipmentTypeName.toLowerCase() === "cross-haul" || 
        shipmentTypeName.toLowerCase() === "cross haul" ||
        shipmentTypeName.toLowerCase() === "cross-haul(break bulk)" ||
        shipmentTypeName.toLowerCase() === "cross haul(break bulk)"
      const isSpecialId = data.shipment_type?.toString() === "3" || data.shipment_type?.toString() === "4"
      const isCrossHaulOrSpecialValue = isCrossHaul || isSpecialId
      console.log(
        "Setting isCrossHaulOrSpecial to:",
        isCrossHaulOrSpecialValue,
        "(shipmentTypeName: ",
        shipmentTypeName,
        ", shipment_type: ",
        data.shipment_type,
        ")",
      )
      setIsCrossHaulOrSpecial(isCrossHaulOrSpecialValue)

      // After setting all state, ensure loading is set to false
      setIsLoading((prev) => ({
        ...prev,
        instruction: false,
        clients: false,
        shipmentTypes: false,
        startingPoints: false,
        destinations: false,
      }))
    } catch (error) {
      console.error("Error fetching instruction data:", error)
      let errorMessage = "Failed to fetch instruction data. Please try again."

      // Set loading to false on error
      setIsLoading((prev) => ({
        ...prev,
        instruction: false,
      }))

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    }
  }

  // Fetch clients from API
  const fetchClients = async () => {
    try {
      console.log("Fetching clients...")
      const response = await api.get("/api/instructions/active-clients")
      const data = response.data

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid data format received from server")
      }

      console.log("Clients data received:", data.length, "records")
      setClients(data)
      return true
    } catch (error) {
      console.error("Error fetching clients:", error)
      // Don't show error for clients - we can proceed with empty clients list
      setClients([])
      return false
    }
  }

  // Fetch shipment types from API
  const fetchShipmentTypes = async () => {
    try {
      console.log("Fetching shipment types...")
      const response = await api.get("/api/instructions/shipment-types")
      const data = response.data

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid shipment types data format")
      }

      console.log("Shipment types data received:", data.length, "records")
      console.log("Shipment types data details:", JSON.stringify(data))
      
      // Ensure all shipment types have proper format
      const formattedTypes = data.map(type => ({
        shipkey: type.shipkey || type.id || 0,
        shipmenttype: type.shipmenttype || type.name || "Unknown"
      }))
      
      console.log("Formatted shipment types:", JSON.stringify(formattedTypes))
      setShipmentTypes(formattedTypes)
      return true
    } catch (error) {
      console.error("Error fetching shipment types:", error)
      // Set default shipment types if API fails
      const defaultTypes = [
        { shipkey: "1", shipmenttype: "import" },
        { shipkey: "2", shipmenttype: "export" },
        { shipkey: "3", shipmenttype: "cross-haul" },
        { shipkey: "4", shipmenttype: "cross-haul(break bulk)" },
      ]
      console.log("Using default shipment types")
      setShipmentTypes(defaultTypes)
      return true
    }
  }

  // Initialize containers based on controller data counts
  const initializeContainers = () => {
    if (!formData) {
      console.log("No formData available for container initialization")
      return []
    }

    console.log("Initializing containers with formData:", {
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
    })

    const containersList = []
    let containerId = 1

    // Ensure we have valid numbers for container counts
    const sixMeters = Number.parseInt(formData.num_six_meters) || 0
    const twelveMeters = Number.parseInt(formData.num_twelve_meters) || 0
    const abnormal = Number.parseInt(formData.num_abnormal) || 0

    // Add 6m containers
    for (let i = 0; i < sixMeters; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "6m",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false
      })
    }

    // Add 12m containers
    for (let i = 0; i < twelveMeters; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "12m",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false
      })
    }

    // Add abnormal containers
    for (let i = 0; i < abnormal; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "Abnormal",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false
      })
    }

    console.log(`Initialized ${containersList.length} containers`)
    return containersList
  }

  // Determine container type based on index and form data
  const determineContainerType = (index, data) => {
    if (!data) return "Unknown"
    const sixMCount = data.num_six_meters || 0
    const twelveMCount = data.num_twelve_meters || 0
    if (index < sixMCount) return "6m"
    if (index < sixMCount + twelveMCount) return "12m"
    return "Abnormal"
  }

  // Fetch container details
  const fetchContainerDetails = async () => {
    if (!instructionId) {
      console.log("No instructionId available for fetching container details")
      return
    }

    // Wait for formData to be available
    if (!formData) {
      console.log("formData not available yet, waiting...")
      return
    }

    console.log("Fetching container details with formData:", {
      instructionId,
      hasFormData: !!formData,
      containerCounts: formData
        ? {
            six_meters: formData.num_six_meters,
            twelve_meters: formData.num_twelve_meters,
            abnormal: formData.num_abnormal,
          }
        : "No formData",
    })

    setIsLoadingContainers(true)

    try {
      // First, try to fetch from the API
      const response = await api.get(`/api/instructions/containers/${instructionId}`)
      const data = response.data || []

      console.log("Containers data from API:", data)

      if (data && data.length > 0) {
        // Map container data to match the expected format
        const containersList = data.map((container, index) => {
          // Ensure container is not null or undefined before accessing properties
          if (!container) {
            console.log(`Container at index ${index} is null or undefined`);
            return {
              id: index + 1,
              containerKey: null,
              containerNum: "",
              weight: "",
              containerType: determineContainerType(index, formData),
              cargoDescription: "",
              hazardous: false,
              addSurcharges: false
            };
          }
          
          // Log the container data to debug
          console.log(`Container ${index} data:`, container);
          
          return {
            id: index + 1,
            containerKey: container.containerkey || null,
            containerNum: container.containernum ? String(container.containernum) : "",
            weight: container.weight != null ? String(container.weight) : "",
            containerType: container.container_type || determineContainerType(index, formData),
            cargoDescription: container.cargo_description || "",
            // The column names in PostgreSQL are case-sensitive with quotes
            // These fields might be missing if the backend query doesn't select them
            hazardous: container["Hazardous"] === true || false,
            addSurcharges: container["Add Surcharges"] === true || false,
            vgm: container["vgm"] === true || false,
          };
        })
        console.log("Mapped containers list:", containersList)
        setContainers(containersList)
      } else {
        // If no containers found in API, initialize from form data
        console.log("No containers found in API, initializing from form data")
        const initializedContainers = initializeContainers()
        console.log("Initialized containers:", initializedContainers)
        setContainers(initializedContainers)
      }
    } catch (error) {
      console.error("Error fetching containers:", error)
      // On error (including 404), initialize from form data
      console.log("Error fetching containers, initializing from form data")
      const initializedContainers = initializeContainers()
      console.log("Initialized containers on error:", initializedContainers)
      setContainers(initializedContainers)
    } finally {
      setIsLoadingContainers(false)
    }
  }

  // Call fetchContainerDetails when formData changes
  useEffect(() => {
    if (instructionId && formData) {
      console.log("formData updated, fetching container details")
      fetchContainerDetails()
    }
  }, [formData, instructionId])

  // Retry fetching data
  const handleRetryFetch = () => {
    if (isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations) {
      return // Don't retry if already loading
    }

    fetchClients()
    fetchShipmentTypes()
    if (instructionId) {
      fetchInstructionData(instructionId)
    }

    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  // Render loading state
  if (isLoading.instruction) {
    return (
      <div className="controller-instructions-root">
        <div className="controller-instructions-unique-wrapper">
          <h2 className="view-controller-instructions-title">Loading Instruction...</h2>
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading instruction data, please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (errorModal.isOpen) {
    return (
      <div className="controller-instructions-root">
        <div className="controller-instructions-unique-wrapper">
          <ErrorModal
            isOpen={errorModal.isOpen}
            message={errorModal.message}
            onClose={() => setErrorModal({ isOpen: false, message: "" })}
          />
          <div className="text-center my-5">
            <h3>Error Loading Instruction</h3>
            <p className="text-danger">{errorModal.message}</p>
            <button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main content - using the same layout as FCcontrollerinstructions
  return (
    <div className="controller-instructions-root">
      <div className="controller-instructions-unique-wrapper">
        {/* Header with Back Button */}
        <div className="controller-instructions-header">
          <button className="controller-instructions-back-button" onClick={handleBackClick}>
            Back
          </button>
        </div>

        {/* Success Message */}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {/* Loading indicator */}
        {!initialDataLoaded && (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading form data...</p>
          </div>
        )}

        {/* Error state */}
        {initialDataLoaded && clients.length === 0 && (
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error Loading Data</h4>
            <p>Failed to load required client data. Please try again.</p>
            <button onClick={handleRetryFetch} className="btn btn-primary">
              Retry
            </button>
          </div>
        )}

        {/* Main Form - Only show when data is loaded */}
        {initialDataLoaded && (
          <div className="controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
            {/* Client Information Section */}
            <div className="controller-instructions-form-section controller-instructions-client-info-section">
              <div className="controller-instructions-form-row">
                <div className="controller-instructions-form-field">
                  <label>Client</label>
                  <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                    <select
                      style={nonEditableStyle}
                      className="dropdown"
                      name="clientId"
                      value={formData.clientId || ""}
                      disabled={true}
                    >
                      <option value="" disabled>
                        Select Client
                      </option>
                      {clients.map((client) => (
                        <option key={client.m5clientkey} value={client.m5clientkey}>
                          {client.companyname}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="controller-instructions-form-field">
                  <label>Representative</label>
                  <input
                    type="text"
                    className="controller-instructions-form-input"
                    style={nonEditableStyle}
                    value={formData.representative || ""}
                    readOnly
                    placeholder="Autoload representative"
                    name="representative"
                    disabled={true}
                  />
                </div>
                <div className="controller-instructions-form-field">
                  <label>Contact Details</label>
                  <input
                    type="text"
                    className="controller-instructions-form-input"
                    placeholder="Autoload contact details"
                    name="contactDetails"
                    value={formData.contactDetails}
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
                <div className="controller-instructions-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    className="controller-instructions-form-input"
                    placeholder="Autoload email"
                    name="email"
                    value={formData.email}
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
              </div>
            </div>

            {/* Container and Booking Section */}
            <div className="controller-instructions-form-section">
              <div className="controller-instructions-form-row controller-instructions-trailer-container">
                <div
                  className="controller-instructions-container-section"
                >
                  <div className="controller-instructions-container-group">
                    <div className="controller-instructions-container-label">
                      <span className="controller-instructions-trailer-size-label">Trailer Size</span>
                      <label>No. of Containers</label>
                    </div>
                    <div className="controller-instructions-container-inputs">
                      <div className="controller-instructions-container-input">
                        <label>6m</label>
                        <div className="controller-instructions-container-rate-group">
                          <input
                            type="number"
                            value={formData.num_six_meters}
                            min="0"
                            name="num_six_meters"
                            readOnly
                            style={nonEditableStyle}
                          />
                          <div className="controller-instructions-input-wrapper controller-instructions-rate-input">
                            <input
                              type="text"
                              className="controller-instructions-form-input"
                              placeholder="Rate"
                              value={formData.rateper_6 || ""}
                              readOnly
                              style={nonEditableStyle}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="controller-instructions-container-input">
                        <label>12m</label>
                        <div className="controller-instructions-container-rate-group">
                          <input
                            type="number"
                            value={formData.num_twelve_meters}
                            min="0"
                            name="num_twelve_meters"
                            readOnly
                            style={nonEditableStyle}
                          />
                          <div className="controller-instructions-input-wrapper controller-instructions-rate-input">
                            <input
                              type="text"
                              className="controller-instructions-form-input"
                              placeholder="Rate"
                              value={formData.rateper_12 || ""}
                              readOnly
                              style={nonEditableStyle}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="controller-instructions-container-input">
                        <label>Abnormal</label>
                        <div className="controller-instructions-container-rate-group">
                          <input
                            type="number"
                            value={formData.num_abnormal}
                            min="0"
                            name="num_abnormal"
                            readOnly
                            style={nonEditableStyle}
                          />
                          <div className="controller-instructions-input-wrapper controller-instructions-rate-input">
                            <input
                              type="text"
                              className="controller-instructions-form-input"
                              placeholder="Rate"
                              value={formData.rateper_abnormal || ""}
                              readOnly
                              style={nonEditableStyle}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hazardous and Surcharges Checkboxes removed */}
                  </div>

                  {/* Booking Vertical Group */}
                  <div
                    className="controller-instructions-booking-vertical-group"
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxWidth: "220px",
                    }}
                  >
                    <div className="controller-instructions-form-field">
                      <label>Shipment Type</label>
                      <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                        <select
                          className="controller-instructions-dropdown"
                          name="shipmentTypeId"
                          value={formData.shipmentTypeId}
                          disabled={true}
                          style={nonEditableStyle}
                        >
                          <option value="" disabled>
                            Select Shipment
                          </option>
                          {shipmentTypes.map((type) => {
                            console.log("Rendering shipment type:", type);
                            return (
                              <option key={type.shipkey} value={type.shipkey}>
                                {type.shipmenttype}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="controller-instructions-form-field">
                      <label>Pickup Location</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.pickup}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          placeholder="Pickup location"
                          name="pickup"
                          value={formData.pickup || ""}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field">
                      <label>Dropoff Location</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.dropoff}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          placeholder="Dropoff location"
                          name="dropoff"
                          value={formData.dropoff || ""}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>

                    {/* Compact Rates per dropdown and input fields in one row */}
                    <div
                      className="controller-instructions-form-field"
                    >
                      <label>Unit per</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "100%" }}>
                        {/* Unit per dropdown */}
                        <div
                          className="controller-instructions-select-wrapper"
                          style={{ minWidth: "100px", marginTop: "0" }}
                        >
                          <select
                            className="controller-instructions-dropdown"
                            name="rateWeight"
                            value={formData.rateWeight || "Container"}
                            disabled={true}
                            style={{ ...nonEditableStyle, width: "100%", padding: "4px 8px" }}
                            ref={fieldRefs.rateWeight}
                          >
                            <option value="kg">kg</option>
                            <option value="m³">m³</option>
                            <option value="ton">ton</option>
                            <option value="Container">Container</option>
                          </select>
                        </div>

                        {/* Rate per unit and weight textboxes */}
                        {(formData.rateWeight === "kg" ||
                          formData.rateWeight === "m³" ||
                          formData.rateWeight === "ton") && (
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                              width: "100%",
                              alignItems: "center",
                            }}
                          >
                            {/* Unit Rate Field - inline text + input */}
                            <div
                              className="controller-instructions-form-field"
                              style={{
                                flex: 1,
                                minWidth: "150px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                margin: 0,
                              }}
                            >
                              <span
                                style={{
                                  whiteSpace: "nowrap",
                                  fontSize: "13px",
                                  color: "#333",
                                }}
                              >
                                {`Rate per ${formData.rateWeight}`}
                              </span>
                              <div
                                className="controller-instructions-input-wrapper"
                                ref={fieldRefs.unitRate}
                                style={{ width: "100%" }}
                              >
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  name="unitRate"
                                  value={formData.unitrate || ""}
                                  readOnly
                                  style={{ ...nonEditableStyle, width: "100%" }}
                                />
                              </div>
                            </div>

                            {/* Weight Field for non-type-4 shipments, or legacy type-4 instructions without weightRows */}
                            {(formData.shipmentTypeId !== "4" || weightRows.length === 0) && (
                              <div className="controller-instructions-form-field" style={{ flex: 1, minWidth: "150px" }}>
                                <label>{`Weight (${formData.rateWeight})`}</label>
                                <div
                                  className="controller-instructions-input-wrapper"
                                  ref={fieldRefs.weight}
                                  style={{ width: "100%" }}
                                >
                                  <input
                                    type="text"
                                    className="controller-instructions-form-input"
                                    name="weight"
                                    value={formData.weight || ""}
                                    readOnly
                                    style={{ ...nonEditableStyle, width: "100%" }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Set Rate checkbox - positioned below Unit per */}
                    {formData.shipmentTypeId === "4" && (
                      <div className="controller-instructions-form-field" style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                            <input type="checkbox" checked={isSetRate} disabled={true} />
                            Set Rate
                          </label>
                          {isSetRate && (
                            <div className="controller-instructions-input-wrapper" style={{ width: "140px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={Number.isFinite(Number(setRateValue)) ? String(setRateValue) : ""}
                                readOnly
                                disabled={true}
                                style={{ ...nonEditableStyle, width: "100%" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Date Time Group */}
                  <div
                    className="controller-instructions-date-time-group"
                  >
                    <div
                      className="controller-instructions-shipment-task-row"
                      style={{ order: -1, marginBottom: "8px" }}
                    >
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>Booking Reference</label>
                        <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter booking ref"
                            name="bookingRef"
                            value={formData.bookingRef}
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>Client File Reference</label>
                        <div className="controller-instructions-input-wrapper" ref={fieldRefs.clientFileRef}>
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Client File Reference"
                            name="clientFileRef"
                            value={formData.clientFileRef}
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className="controller-instructions-shipment-task-row"
                      style={{ marginBottom: "8px" }}
                    >
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>KSM File Reference</label>
                        <div className="controller-instructions-input-wrapper" ref={fieldRefs.ksmFileRef}>
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="KSM File Reference"
                            name="ksmFileRef"
                            value={formData.ksmFileRef}
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>Last Free Date</label>
                        <div className="controller-instructions-date-wrapper" ref={fieldRefs.lastFreeDate}>
                          <input
                            type="date"
                            className="controller-instructions-form-input"
                            name="lastFreeDate"
                            value={formData.lastFreeDate}
                            readOnly
                            style={nonEditableStyle}
                            ref={lastFreeDateRef}
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className="controller-instructions-shipment-task-row"
                      style={{ marginBottom: "8px" }}
                    >
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ maxWidth: "120px" }}
                      >
                        <label>VAT Rate %</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="number"
                            className="controller-instructions-form-input"
                            name="vat"
                            value={formData.vat }
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                      {((isAddOn && !isCrossHaulShipment()) ||
                        String(formData.shipmentTypeId) === "1" ||
                        String(formData.shipmentTypeId) === "2") && (
                        <div className="controller-instructions-form-field controller-instructions-small-field">
                          <label>{isImport ? "ETA Date" : "Stack Date"}</label>
                          <div className="controller-instructions-date-wrapper" ref={fieldRefs.stackDate}>
                            <input
                              type="date"
                              className="controller-instructions-form-input"
                              name="stackDate"
                              value={formData.stackDate}
                              readOnly
                              style={nonEditableStyle}
                              ref={etaDateRef}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="controller-instructions-form-field">
                      <label>Vessel Name</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.vesselName}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          placeholder="Enter vessel name"
                          name="vesselName"
                          value={formData.vesselName}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                    {isAddOn && (
                      <div className="controller-instructions-form-field">
                        <label>Add-On Invoice</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            value={formData.addon_invoice_number || "N/A"}
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                    )}
                    <div className="controller-instructions-form-field">
                      <label>Description</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.description}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          placeholder="Enter description"
                          name="description"
                          value={formData.description}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    className="controller-instructions-date-time-group"
                  >

                    {!isCrossHaulShipment() &&
                      !isAddOn &&
                      String(formData.shipmentTypeId) !== "1" &&
                      String(formData.shipmentTypeId) !== "2" && (
                        <div className="controller-instructions-form-field">
                          <label>{isImport ? "ETA Date" : "Stack Date"}</label>
                          <div className="controller-instructions-date-wrapper" ref={fieldRefs.stackDate}>
                            <input
                              type="date"
                              className="controller-instructions-form-input"
                              name="stackDate"
                              value={formData.stackDate}
                              readOnly
                              style={nonEditableStyle}
                              ref={etaDateRef}
                            />
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {formData.shipmentTypeId === "4" && weightRows.length > 0 && (
              <div
                className="controller-instructions-form-section"
                style={{ marginTop: "-100px", paddingTop: "0" }}
              >
                <div
                  className="controller-instructions-form-row"
                  style={{ marginTop: "0" }}
                >
                  <div className="controller-instructions-form-field" style={{ width: "100%" }}>
                    <label>Weight Details</label>
                    <div style={{ width: "100%" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                              KSM DN Number
                            </th>
                            <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                              Ticket Number
                            </th>
                            <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                              Receipt Book Number
                            </th>
                            <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                              Weight ({formData.rateWeight})
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {weightRows.map((row) => (
                            <tr key={row.id}>
                              <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={row.ksmDmNo || ""}
                                  readOnly
                                  style={{
                                    ...nonEditableStyle,
                                    width: "100%",
                                    fontSize: "12px",
                                    height: "26px",
                                  }}
                                />
                              </td>
                              <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={row.ticketNo || ""}
                                  readOnly
                                  style={{
                                    ...nonEditableStyle,
                                    width: "100%",
                                    fontSize: "12px",
                                    height: "26px",
                                  }}
                                />
                              </td>
                              <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={row.receiptBookNo || ""}
                                  readOnly
                                  style={{
                                    ...nonEditableStyle,
                                    width: "100%",
                                    fontSize: "12px",
                                    height: "26px",
                                  }}
                                />
                              </td>
                              <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={row.weight || ""}
                                  readOnly
                                  style={{
                                    ...nonEditableStyle,
                                    width: "100%",
                                    fontSize: "12px",
                                    height: "26px",
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Container Details Section */}
            {containers.length > 0 && (
              <div
                className="controller-instructions-form-section"
                style={isAddOn ? { marginTop: "-40px" } : undefined}
              >
                <div className="controller-instructions-container-details-section">
                  <h3>Container Details</h3>
                  {isLoadingContainers && (
                    <div className="controller-instructions-loading-message">Loading containers...</div>
                  )}
                  <div className="controller-instructions-container-table-wrapper">
                    <table className="controller-instructions-container-table">
                      <thead>
                        <tr>
                          <th>Container Type</th>
                          <th>{isExport || formData.shipmentTypeId === "2" ? "File Reference" : "Container Number"}</th>
                          {(isImport || formData.shipmentTypeId === "2" || formData.shipmentTypeId === "3") && <th>Weight (kg)</th>}
                          <th>Cargo Description</th>
                          <th>Hazardous</th>
                          <th>Add Surcharges</th>
                          <th>VGM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {containers.map((container) => (
                          <tr key={container.id}>
                            <td>{container.containerType}</td>
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={container.containerNum || "Not specified"}
                                  readOnly
                                  style={nonEditableStyle}
                                />
                              </div>
                            </td>
                            {(isImport || formData.shipmentTypeId === "2" || formData.shipmentTypeId === "3" || formData.shipmentTypeId === "1") && (
                              <td>
                                <div className="controller-instructions-input-wrapper">
                                  <input
                                    type="text"
                                    className="controller-instructions-form-input"
                                    value={container.weight || "Not specified"}
                                    readOnly
                                    style={nonEditableStyle}
                                  />
                                </div>
                              </td>
                            )}
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={container.cargoDescription || "Not specified"}
                                  readOnly
                                  style={nonEditableStyle}
                                />
                              </div>
                            </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={container.hazardous || false}
                                readOnly
                                disabled
                                style={nonEditableStyle}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={container.addSurcharges || false}
                                readOnly
                                disabled
                                style={nonEditableStyle}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={container.vgm || false}
                                readOnly
                                disabled
                                style={nonEditableStyle}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          message={errorModal.message}
          onClose={() => setErrorModal({ isOpen: false, message: "" })}
        />
      </div>
    </div>
  )
}

export default Viewcontrollerinstructions
