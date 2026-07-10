"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import api from "../../../../api"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true)

  // Inline styles for the vessel name field
  const vesselNameStyles = useMemo(
    () => ({
      container: {
        width: "150px",
        minWidth: "150px",
        maxWidth: "150px",
        margin: "0",
        padding: "0",
        flex: "0 0 150px",
        position: "relative",
        zIndex: 1,
      },
      input: {
        width: "100%",
        minWidth: "100%",
        maxWidth: "100%",
        padding: "6px 8px",
        fontSize: "0.9rem",
        height: "32px",
        boxSizing: "border-box",
        margin: "0",
        display: "block",
        flex: "0 0 100%",
        border: "1px solid #ced4da",
        borderRadius: "4px",
      },
      label: {
        fontSize: "0.85rem",
        marginBottom: "4px",
        display: "block",
      },
      wrapper: {
        padding: "4px 0",
        width: "100%",
        margin: "0",
      },
    }),
    [],
  )

  // Memoize initial data to prevent recreation on re-renders
  const initialData = useMemo(
    () => ({
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      task: "",
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
      fileRef: "",
      bookingRef: "",
      vesselName: "",
      rateWeight: "Container",
      weight: "",
      vat: 15,
      description: "",
      total_cost: 0,
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      unitrate: "",
    }),
    [],
  )

  const preservedFormData = useMemo(() => location.state?.preservedFormData || null, [location.state])
  const containerCounts = useMemo(
    () =>
      location.state?.containerCounts || {
        "6m": 0,
        "12m": 0,
        Abnormal: 0,
      },
    [location.state],
  )

  const etaDateRef = useRef(null)
  const lastFreeDateRef = useRef(null)

  const fieldRefs = useRef({
    clientId: null,
    shipmentTypeId: null,
    task: null,
    pickup: null,
    dropoff: null,
    stackDate: null,
    lastFreeDate: null,
    bookingRef: null,
    fileRef: null,
    sixMeterRate: null,
    twelveMeterRate: null,
    abnormalRate: null,
    weight: null,
    description: null,
    vesselName: null,
  })

  const [isImport, setIsImport] = useState(false)
  const [isExport, setIsExport] = useState(false)
  const [isWeightBased, setIsWeightBased] = useState(false)
  const [isCrossHaul, setIsCrossHaul] = useState(false)
  const [isSetRateMode, setIsSetRateMode] = useState(false)
  const [isSetRate, setIsSetRate] = useState(false)
  const [setRateValue, setSetRateValue] = useState(0)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState({})
  const [containerFieldErrors, setContainerFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirmation popup state
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState("")

  // State for client-specific locations
  const [clientStartingPoints, setClientStartingPoints] = useState([])
  const [clientDestinations, setClientDestinations] = useState([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showNoRatesModal, setShowNoRatesModal] = useState(false)

  // Data loading states
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
  })

  // Data states
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])

  // Container states
  const [containers, setContainers] = useState([])
  const containersRef = useRef([])
  const [showContainerDetails, setShowContainerDetails] = useState(false)

  const [weightRows, setWeightRows] = useState([])
  const weightRowsRef = useRef([])

  const addWeightRow = useCallback(() => {
    setWeightRows((prev) => {
      const next = [
        ...prev,
        {
          id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
          ksmDmNo: "",
          ticketNo: "",
          receiptBookNo: "",
          weight: "",
        },
      ]
      console.log("[CREATE] ADD weight row - prev:", prev, "next:", next)
      return next
    })
  }, [])

  const updateWeightRow = useCallback((id, field, value) => {
    setWeightRows((prev) => {
      const next = prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      )
      console.log("[CREATE] UPDATE weight row", { id, field, value, prev, next })
      return next
    })
  }, [])

  const removeWeightRow = useCallback((id) => {
    setWeightRows((prev) => {
      const next = prev.filter((row) => row.id !== id)
      console.log("[CREATE] REMOVE weight row", { id, prev, next })
      return next
    })
  }, [])

  useEffect(() => {
    console.log("[CREATE] containers state changed:", containers)
    containersRef.current = containers
  }, [containers])

  useEffect(() => {
    console.log("[CREATE] weightRows changed:", weightRows)
    try {
      console.log(
        "[CREATE] weightRows changed (JSON):",
        JSON.stringify(weightRows, null, 2),
      )
    } catch (e) {
      // ignore stringify errors
    }
    weightRowsRef.current = weightRows
  }, [weightRows])

  // New state for rate locking
  const [rateLockStatus, setRateLockStatus] = useState({
    sixMeter: false,
    twelveMeter: false,
  })

  // Track which rate fields should be enabled
  const [rateFieldsEnabled, setRateFieldsEnabled] = useState({
    sixMeter: false,
    twelveMeter: false,
    abnormal: false,
  })

  // Helper function to check if a field is valid
  const isFieldValid = useCallback(
    (fieldName, value) => {
      switch (fieldName) {
        case "clientId":
        case "shipmentTypeId":
        case "task":
        case "pickup":
        case "dropoff":
        case "pickupTime":
        case "pickupDate":
        case "deadline":
        case "bookingRef":
        case "fileRef":
        case "description":
          return value && value.trim() !== ""
        case "stackDate":
          return !isCrossHaul ? value && value.trim() !== "" : true
        case "vesselName":
          return !isCrossHaul ? value && value.trim() !== "" : true
        case "weight":
        case "unitrate":
          if (fieldName === "unitrate" && isCrossHaul && isSetRate) return true
          return !isWeightBased || (value && value.trim() !== "")
        default:
          return true
      }
    },
    [isCrossHaul, isWeightBased, isSetRate],
  )

  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target

      // Special handling for IMO number (numbers only)
      if (name === "imoNo" && value !== "" && !/^\d*$/.test(value)) {
        return // Don't update if not a number
      }

      // Special handling for Flag Registration (letters and spaces only)
      if (name === "flagReg" && value !== "" && !/^[A-Za-z\s]*$/.test(value)) {
        return // Don't update if contains non-letter characters
      }

      // Update form data
      const newValue = type === "checkbox" ? checked : value
      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }))

      // Clear error when user starts typing and the field is no longer empty/invalid
      if (fieldErrors[name] && isFieldValid(name, newValue)) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    },
    [fieldErrors, isFieldValid],
  )

  // Initialize containers based on counts while preserving existing container data
  const initializeContainers = useCallback(
    (containerCounts = null) => {
      const counts = containerCounts || {
        num_six_meters: formData.num_six_meters || 0,
        num_twelve_meters: formData.num_twelve_meters || 0,
        num_abnormal: formData.num_abnormal || 0,
        num_breakbulk: formData.num_breakbulk || 0,
      }

      // Create a map of existing containers by type and index
      const existingContainersByType = {
        "6m": [],
        "12m": [],
        Abnormal: [],
        BreakBulk: [],
      }

      // Group existing containers by type
      containers.forEach((container) => {
        if (existingContainersByType[container.containerType]) {
          existingContainersByType[container.containerType].push(container)
        }
      })

      const containersList = []
      let containerId = 1

      // Helper function to get or create container
      const getOrCreateContainer = (type, index) => {
        const existing = existingContainersByType[type]
        if (index < existing.length) {
          // Use existing container if available
          return {
            ...existing[index],
            id: containerId++,
          }
        }
        // Create new container if needed
        return {
          id: containerId++,
          containerKey: null,
          containerNum: "",
          // Initialize file reference field for export shipments
          fileRef: "",
          // Initialize weight field for import, export, and cross-haul shipments
          weight: (isImport || isExport || isCrossHaul) ? "" : null,
          containerType: type,
          cargoDescription: "",
          // Initialize hazardous, addSurcharges, and vgm properties for each container
          hazardous: false,
          addSurcharges: false,
          surchargeAmount: 0,
          is_12m_surcharge: type === "12m",
          surcharge_12m_amount: 0,
          vgm: false,
        }
      }

      // Add 6m containers
      for (let i = 0; i < (counts.num_six_meters || 0); i++) {
        containersList.push(getOrCreateContainer("6m", i))
      }

      // Add 12m containers
      for (let i = 0; i < (counts.num_twelve_meters || 0); i++) {
        containersList.push(getOrCreateContainer("12m", i))
      }

      // Add abnormal containers
      for (let i = 0; i < (counts.num_abnormal || 0); i++) {
        containersList.push(getOrCreateContainer("Abnormal", i))
      }

      // Add break bulk containers for cross-haul
      if (isCrossHaul) {
        for (let i = 0; i < (counts.num_breakbulk || 0); i++) {
          containersList.push(getOrCreateContainer("BreakBulk", i))
        }
      }

      setContainers(containersList)
      // Show container details if there are any containers AND it's not weight-based
      setShowContainerDetails(containersList.length > 0 && !isWeightBased)
    },
    [containers, isImport, isExport, isCrossHaul, isWeightBased],
  )

  // Handle container input changes
  const handleContainerChange = useCallback(
    (id, field, value) => {
      const fetchSurchargeAmount = async (containerId) => {
        try {
          if (!formData.clientId || !formData.pickup || !formData.dropoff) {
            return 0
          }

          const response = await api.get(
            `/api/instructions/client/${formData.clientId}/rates`,
            {
              params: {
                start: formData.pickup,
                destination: formData.dropoff,
              },
            },
          )

          const container = containersRef.current.find((c) => c.id === containerId)
          const isTwelveMeter = container?.containerType === "12m"

          const sixMeterSurcharge =
            response.data.surcharges ??
            response.data.surcharge ??
            0

          const twelveMeterSurcharge =
            response.data.surcharge12m ??
            response.data.surcharge_12m ??
            response.data.surcharge12 ??
            response.data.surcharge_12 ??
            response.data.surcharges ??
            response.data.surcharge ??
            0

          return isTwelveMeter ? twelveMeterSurcharge : sixMeterSurcharge
        } catch (error) {
          console.error("❌ Error fetching surcharge amount:", error)
          return 0
        }
      }

      if (field === "containerNum") {
        // For export shipments, no validation is needed
        if (isExport || formData.shipmentTypeId === "2") {
          // Just ensure it doesn't exceed 20 characters
          if (value.length > 20) return
          
          // Clear any existing errors
          setContainerFieldErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[`container-${id}`]
            return newErrors
          })
        } else if (!isAddOn) {
          // For other shipment types, only check for uniqueness
          // No format validation, just ensure it doesn't exceed 20 characters
          if (value.length > 20) return

          // Check for duplicates in real-time
          let error = null
          if (value.trim() !== "") {
            const upperCaseValue = value.toUpperCase()
            const duplicateExists = containers.some(
              (container) => container.id !== id && container.containerNum.toUpperCase() === upperCaseValue,
            )
            if (duplicateExists) {
              error = "Container number must be unique"
            }
          }

          setContainerFieldErrors((prev) => ({
            ...prev,
            [`container-${id}`]: error,
          }))
        }
      } else if (field === "weight" && value !== "") {
        // Only allow numbers and decimal point for weight
        if (!/^\d*\.?\d*$/.test(value)) return

        // Clear weight error when user starts typing valid input
        setContainerFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[`weight-${id}`]
          return newErrors
        })
      } else if (field === "fileRef") {
        // Just ensure it doesn't exceed 20 characters
        if (value.length > 20) return
        
        // Clear any existing errors
        setContainerFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[`file-ref-${id}`]
          return newErrors
        })
      } else if (field === "weight" && value === "") {
        // Don't clear error immediately when field becomes empty for import
        // Let validation handle it
      }

      if (field === "addSurcharges") {
        if (value) {
          // Toggle on immediately for UI responsiveness, then fetch amount
          setContainers((prev) =>
            prev.map((container) =>
              container.id === id ? { ...container, addSurcharges: true } : container,
            ),
          )

          fetchSurchargeAmount(id).then((amount) => {
            setContainers((prev) =>
              prev.map((container) =>
                container.id === id
                  ? {
                      ...container,
                      surchargeAmount:
                        container.containerType === "12m" ? 0 : (Number(amount) || 0),
                      is_12m_surcharge: container.containerType === "12m",
                      surcharge_12m_amount:
                        container.containerType === "12m" ? (Number(amount) || 0) : 0,
                    }
                  : container,
              ),
            )
          })
        } else {
          setContainers((prev) =>
            prev.map((container) =>
              container.id === id
                ? {
                    ...container,
                    addSurcharges: false,
                    surchargeAmount: 0,
                    is_12m_surcharge: false,
                    surcharge_12m_amount: 0,
                  }
                : container,
            ),
          )
        }
        return
      }

      // Update container
      setContainers((prev) =>
        prev.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
      )
    },
    [containers],
  )

  // Initialize form data with preserved data if available, or default values
  const [formData, setFormData] = useState(() => {
    // Default form data structure
    const defaultFormData = {
      // Client and basic info
      clientId: "",
      clientName: "",
      representative: "",
      contactDetails: "",
      email: "",
      task: "",
      shipmentTypeId: "",
      shipmentTypeName: "",

      // Location data
      startingPoints: [],
      destinations: [],
      selectedStartingPoint: "",
      selectedDestination: "",
      pickup: "",
      dropoff: "",

      // Other form fields
      surchargesAmount: "",
      stackDate: "",
      lastFreeDate: "",
      fileRef: "",
      bookingRef: "",
      vesselName: "",
      rateWeight: "Container",
      weight: "",
      vat: 15,
      description: "",
      rateper_6: "",
      rateper_12: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      unitrate: "",
      setRateAmount: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      num_breakbulk: 0,
      total_cost: 0,
      preserveSurcharges: false,
      sixMeterRate: "",
      twelveMeterRate: "",
    }

    // If no preserved data, return defaults
    if (!preservedFormData && !location.state) {
      return defaultFormData
    }

    // Get location data from multiple possible sources with priority to location.state
    const locationData = {
      startingPoints: location.state?.startingPoints || preservedFormData?.startingPoints || [],
      destinations: location.state?.destinations || preservedFormData?.destinations || [],
      selectedStartingPoint:
        location.state?.selectedStartingPoint ||
        preservedFormData?.selectedStartingPoint ||
        preservedFormData?.pickup ||
        location.state?.pickup ||
        "",
      selectedDestination:
        location.state?.selectedDestination ||
        preservedFormData?.selectedDestination ||
        preservedFormData?.dropoff ||
        location.state?.dropoff ||
        "",
    }

    // Get container counts from multiple possible sources
    const containerCountsData = {
      num_six_meters: containerCounts?.["6m"] ?? preservedFormData?.num_six_meters ?? 0,
      num_twelve_meters: containerCounts?.["12m"] ?? preservedFormData?.num_twelve_meters ?? 0,
      num_abnormal: containerCounts?.["Abnormal"] ?? preservedFormData?.num_abnormal ?? 0,
      num_breakbulk: containerCounts?.["BreakBulk"] ?? preservedFormData?.num_breakbulk ?? 0,
    }

    // Create form data with preserved values or fall back to defaults
    const formData = {
      // Start with default values
      ...defaultFormData,

      // Apply preserved form data (from sessionStorage or previous navigation)
      ...(preservedFormData || {}),

      // Then apply any controller data from location state (highest priority)
      ...(location.state?.controllerData || {}),

      // Apply location data with proper fallbacks
      startingPoints: Array.isArray(locationData.startingPoints) ? [...locationData.startingPoints] : [],
      destinations: Array.isArray(locationData.destinations) ? [...locationData.destinations] : [],
      selectedStartingPoint: locationData.selectedStartingPoint || "",
      selectedDestination: locationData.selectedDestination || "",

      // Apply container counts
      ...containerCountsData,

      // Explicitly set client data from controller data if available
      ...(location.state?.controllerData?.clientId && {
        clientId: location.state.controllerData.clientId,
        clientName: location.state.controllerData.clientName,
        representative: location.state.controllerData.representative,
        contactDetails: location.state.controllerData.contactDetails,
        email: location.state.controllerData.email,
      }),

      // Handle pickup and dropoff with multiple fallback sources
      pickup:
        preservedFormData?.pickup ||
        location.state?.pickup ||
        location.state?.controllerData?.pickup ||
        locationData.selectedStartingPoint ||
        locationData.pickup ||
        "",
      dropoff:
        preservedFormData?.dropoff ||
        location.state?.dropoff ||
        location.state?.controllerData?.dropoff ||
        locationData.selectedDestination ||
        locationData.dropoff ||
        "",

      // Other special cases
      // IMPORTANT: preserve 0 as a valid VAT value instead of falling back to 15
      vat:
        preservedFormData && preservedFormData.vat !== undefined
          ? Number(preservedFormData.vat)
          : 15,
      total_cost: Number(preservedFormData?.total_cost) || 0,
    }

    return formData
  })

  const isAddOn = formData.shipmentTypeId === "5"

  // VGM is only applicable for certain shipment types. For shipment types 4
  // (cross-haul/break bulk) and 5 (add-on), VGM should behave like the other
  // non-applicable fields (null/false). This flag controls the UI.
  const allowVgmUI =
    formData.shipmentTypeId !== "4"

  // Update unit type and cross-haul states when form data changes
  useEffect(() => {
    const weightBasedUnits = ["kg", "mÂ³", "ton"]
    const newIsWeightBased = weightBasedUnits.includes(formData.rateWeight)
    const newIsSetRateMode = formData.rateWeight === "SetRate"
    const newIsCrossHaul = formData.shipmentTypeId === "3" || formData.shipmentTypeId === "4"
    const newIsImport = formData.shipmentTypeId === "1"
    const newIsExport = formData.shipmentTypeId === "2"

    if (newIsWeightBased !== isWeightBased) {
      setIsWeightBased(newIsWeightBased)
    }
    if (newIsSetRateMode !== isSetRateMode) {
      setIsSetRateMode(newIsSetRateMode)
    }
    if (newIsCrossHaul !== isCrossHaul) {
      setIsCrossHaul(newIsCrossHaul)
    }
    if (newIsImport !== isImport) {
      setIsImport(newIsImport)
    }
    if (newIsExport !== isExport) {
      setIsExport(newIsExport)
    }
  }, [formData.rateWeight, formData.shipmentTypeId, isWeightBased, isCrossHaul, isImport, isExport, isSetRateMode])

  // Ensure add-on shipment type (5) always uses Container as unit per
  useEffect(() => {
    if (formData.shipmentTypeId === "5" && formData.rateWeight !== "Container") {
      setFormData((prev) => ({
        ...prev,
        rateWeight: "Container",
      }))
    }
  }, [formData.shipmentTypeId, formData.rateWeight])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load clients
        const clientsResponse = await api.get("/api/instructions/active-clients")
        setClients(clientsResponse.data)
        setIsLoading((prev) => ({ ...prev, clients: false }))

        // Load shipment types
        const shipmentTypesResponse = await api.get("/api/instructions/shipment-types")
        setShipmentTypes(shipmentTypesResponse.data)
        setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))

        // Set other loading states to false since we're not loading them initially
        setIsLoading((prev) => ({
          ...prev,
          startingPoints: false,
          destinations: false,
        }))
      } catch (error) {
        console.error("Error loading initial data:", error)
        setIsLoading({
          clients: false,
          shipmentTypes: false,
          startingPoints: false,
          destinations: false,
        })
      }
    }

    loadInitialData()
  }, [])

  // Function to fetch rates for the selected client, pickup and dropoff
  const fetchRates = useCallback(async (clientId, start, destination) => {
    if (!clientId || !start || !destination) {
      return null
    }

    const url = `/api/instructions/client/${clientId}/rates`
    const params = { start, destination }

    try {
      const response = await api.get(url, { params })
      return response.data
    } catch (error) {
      console.error("[fetchRates] Error fetching rates:", error)
      return null
    }
  }, [])

  // Fetch set_rate for the current client + route when Set Rate is enabled
  useEffect(() => {
    const fetchSetRate = async () => {
      const { clientId, pickup, dropoff } = formData

      // Only fetch when the checkbox is on and we have a fully selected route
      if (!isSetRate || !clientId || !pickup || !dropoff) {
        return
      }

      try {
        // Reuse the same client-rate endpoint used for normal rates so that
        // we respect the selected starting point and destination.
        const rates = await fetchRates(clientId, pickup, dropoff)

        if (rates && rates.setRate != null) {
          const numericSetRate = Number(rates.setRate)
          setSetRateValue(Number.isNaN(numericSetRate) ? 0 : numericSetRate)
        } else {
          // No set_rate defined for this route – treat as 0 for now
          setSetRateValue(0)
        }
      } catch (error) {
        console.error("Error fetching set_rate:", error)
        setSetRateValue(0)
      }
    }

    fetchSetRate()
  }, [isSetRate, formData.clientId, formData.pickup, formData.dropoff, fetchRates])

  // Update rates when pickup or dropoff changes (only for container-based calculations)
  useEffect(() => {
    // Skip rate fetching for weight-based calculations and for add-on shipment type
    if (isWeightBased || isAddOn) {
      // Also reset rate lock status when switching to weight-based
      setRateLockStatus({ sixMeter: false, twelveMeter: false })
      return
    }

    const { pickup, dropoff, clientId } = formData

    // Check if we have all required fields
    if (!clientId || !pickup || !dropoff) {
      // Clear rates and unlock fields if conditions are not met
      setFormData((prev) => ({
        ...prev,
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
      }))
      setRateLockStatus({ sixMeter: false, twelveMeter: false })
      return
    }

    const fetchAndUpdateRates = async () => {
      try {
        const rates = await fetchRates(clientId, pickup, dropoff)

        setFormData((prev) => {
          const updates = { ...prev }
          const newRateLockStatus = { sixMeter: false, twelveMeter: false }

          if (rates) {
            // Update 6m rate and lock status
            if (rates.sixMeterRate != null && Number.parseFloat(rates.sixMeterRate) > 0) {
              updates.sixMeterRate = Number.parseFloat(rates.sixMeterRate).toFixed(2)
              newRateLockStatus.sixMeter = true
            } else {
              updates.sixMeterRate = "" // Clear if null/undefined/0
              newRateLockStatus.sixMeter = false // Ensure it's editable
            }

            // Update 12m rate and lock status
            if (rates.twelveMeterRate != null && Number.parseFloat(rates.twelveMeterRate) > 0) {
              updates.twelveMeterRate = Number.parseFloat(rates.twelveMeterRate).toFixed(2)
              newRateLockStatus.twelveMeter = true
            } else {
              updates.twelveMeterRate = "" // Clear if null/undefined/0
              newRateLockStatus.twelveMeter = false // Ensure it's editable
            }

            // Abnormal rate is always editable if count > 0, so no locking based on DB
            if (rates.abnormalRate != null) {
              updates.abnormalRate = Number.parseFloat(rates.abnormalRate).toFixed(2)
            } else {
              updates.abnormalRate = ""
            }

            // Break bulk rate is always editable if count > 0, so no locking based on DB
            if (rates.rateper_breakbulk != null) {
              updates.rateper_breakbulk = Number.parseFloat(rates.rateper_breakbulk).toFixed(2)
            } else {
              updates.rateper_breakbulk = ""
            }

            // Surcharge amounts will be calculated by backend on submit
            // No need to fetch or store surcharge amounts in frontend
          } else {
            // Clear all rate fields when no rates are found
            updates.sixMeterRate = ""
            updates.twelveMeterRate = ""
            updates.abnormalRate = ""
            updates.rateper_breakbulk = ""
            updates.surchargesAmount = ""
            newRateLockStatus.sixMeter = false
            newRateLockStatus.twelveMeter = false
          }

          setRateLockStatus(newRateLockStatus)
          return updates
        })
      } catch (error) {
        console.error("Error in fetchAndUpdateRates:", error)
          // Clear rates and unlock fields on error
          setFormData((prev) => ({
            ...prev,
            sixMeterRate: "",
            twelveMeterRate: "",
            abnormalRate: "",
            rateper_breakbulk: "",
            surchargesAmount: "",
          }))
          setRateLockStatus({ sixMeter: false, twelveMeter: false })
      }
    }

    fetchAndUpdateRates()
  }, [formData.clientId, formData.pickup, formData.dropoff, fetchRates, isWeightBased, isAddOn])

  // Update rate fields enabled state when container counts change
  useEffect(() => {
    const sixMeterEnabled = formData.num_six_meters > 0
    const twelveMeterEnabled = formData.num_twelve_meters > 0
    const abnormalEnabled = formData.num_abnormal > 0
    const breakBulkEnabled = formData.num_breakbulk > 0

    const newState = {
      sixMeter: sixMeterEnabled,
      twelveMeter: twelveMeterEnabled,
      abnormal: abnormalEnabled,
      breakBulk: breakBulkEnabled,
    }

    // Only update state if it has changed
    if (JSON.stringify(rateFieldsEnabled) !== JSON.stringify(newState)) {
      setRateFieldsEnabled(newState)
    }
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    formData.num_breakbulk,
    rateFieldsEnabled,
  ])

  // Handle client selection - FIXED VERSION
  const handleClientChange = useCallback(
    async (e) => {
      const clientId = e.target.value
      // Convert clientId to number for comparison since m5clientkey is an integer
      const selectedClient = clients.find((client) => client.m5clientkey === Number.parseInt(clientId, 10))

      setFormData((prev) => ({
        ...prev,
        clientId: clientId,
        clientName: selectedClient?.companyname || "",
        representative: selectedClient?.representative || "",
        contactDetails: selectedClient?.cellnum || "",
        email: selectedClient?.email || "",
        // Reset location-related fields when client changes
        pickup: "",
        dropoff: "",
        selectedStartingPoint: "",
        selectedDestination: "",
        // Reset rates and lock status when client changes
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
      }))
      setRateLockStatus({ sixMeter: false, twelveMeter: false })

      // Clear any existing errors
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.clientId
        return newErrors
      })

      // Load starting points for the selected client
      if (clientId) {
        setIsLoadingLocations(true)
        try {
          const response = await api.get(`/api/instructions/client/${clientId}/starting-points`)
          const startingPoints = response.data.map((point) => ({
            value: point.starting_point,
            label: point.starting_point,
          }))
          setClientStartingPoints(startingPoints)
          setFormData((prev) => ({ ...prev, startingPoints }))
        } catch (error) {
          console.error("Error loading starting points:", error)
          setClientStartingPoints([])
          if (error.response?.status === 404) {
            setShowNoRatesModal(true)
          }
        } finally {
          setIsLoadingLocations(false)
        }
      } else {
        setClientStartingPoints([])
        setClientDestinations([])
      }
    },
    [clients],
  )

  // Handle pickup location change
  const handlePickupChange = useCallback(
    async (e) => {
      const pickup = e.target.value
      setFormData((prev) => ({
        ...prev,
        pickup: pickup,
        selectedStartingPoint: pickup,
        // Reset destination when pickup changes
        dropoff: "",
        selectedDestination: "",
        // Reset rates and lock status when pickup changes
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
        surcharges: false, // Uncheck surcharges when pickup changes
      }))
      setRateLockStatus({ sixMeter: false, twelveMeter: false })

      // Clear any existing errors
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.pickup
        return newErrors
      })

      // Load destinations for the selected pickup
      if (pickup && formData.clientId) {
        setIsLoading((prev) => ({ ...prev, destinations: true }))
        try {
          const encodedPickup = encodeURIComponent(pickup)
          const response = await api.get(`/api/instructions/client/${formData.clientId}/destinations/${encodedPickup}`)
          const destinations = response.data.map((dest) => ({
            value: dest.destination,
            label: dest.destination,
          }))
          setClientDestinations(destinations)
          setFormData((prev) => ({ ...prev, destinations }))
        } catch (error) {
          console.error("Error loading destinations:", error)
          setClientDestinations([])
        } finally {
          setIsLoading((prev) => ({ ...prev, destinations: false }))
        }
      } else {
        setClientDestinations([])
      }
    },
    [formData.clientId],
  )

  // Handle dropoff location change
  const handleDropoffChange = useCallback((e) => {
    const dropoff = e.target.value
    setFormData((prev) => ({
      ...prev,
      dropoff: dropoff,
      selectedDestination: dropoff,
      // Reset rates and lock status when dropoff changes
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      surchargesAmount: "",
      surcharges: false, // Uncheck surcharges when dropoff changes
    }))
    setRateLockStatus({ sixMeter: false, twelveMeter: false })

    // Clear any existing errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.dropoff
      return newErrors
    })
  }, [])

  // Handle shipment type change
  const handleShipmentTypeChange = useCallback(
    (e) => {
      const shipmentTypeId = e.target.value
      const selectedType = shipmentTypes.find((type) => type.shipkey === shipmentTypeId)
      const isCrossHaulType = shipmentTypeId === "3" || shipmentTypeId === "4"
      const isBreakBulkType = shipmentTypeId === "4"
      const isImportType = shipmentTypeId === "1"
      const isExportType = shipmentTypeId === "2"
      const isRegularCrossHaulType = shipmentTypeId === "3"

      // Set appropriate rateWeight based on shipment type
      let newRateWeight = prev => prev.rateWeight;
      if (isImportType || isExportType || isRegularCrossHaulType) {
        // For import, export, and regular cross-haul, default to Container
        newRateWeight = "Container";
      } else if (isBreakBulkType) {
        // For cross-haul (break bulk), default to ton
        newRateWeight = "ton";
      }

      setFormData((prev) => ({
        ...prev,
        shipmentTypeId: shipmentTypeId,
        shipmentTypeName: selectedType?.shipmenttype || "",
        // Set vessel_name and stackDate to null for cross-haul types
        ...(isCrossHaulType && {
          vesselName: "",
          stackDate: "",
        }),
        // Set appropriate rateWeight based on shipment type
        rateWeight: newRateWeight,
      }))

      if (isBreakBulkType) {
        setWeightRows((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  id: 1,
                  ksmDmNo: "",
                  ticketNo: "",
                  receiptBookNo: "",
                  weight: "",
                },
              ],
        )
      } else {
        setWeightRows([])
      }

      // Clear any existing errors
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.shipmentTypeId
        return newErrors
      })
    },
    [shipmentTypes],
  )

  // Handle container count changes
  const handleContainerCountChange = useCallback(
    (field, value) => {
      const numValue = Number.parseInt(value, 10) || 0
      setFormData((prev) => ({
        ...prev,
        [field]: numValue,
      }))

      // Update containers when counts change
      // This logic needs to be careful not to re-initialize containers if it's weight-based,
      // even if break bulk is displayed.
      if (formData.rateWeight === "Container") {
        const newCounts = {
          num_six_meters: field === "num_six_meters" ? numValue : formData.num_six_meters,
          num_twelve_meters: field === "num_twelve_meters" ? numValue : formData.num_twelve_meters,
          num_abnormal: field === "num_abnormal" ? numValue : formData.num_abnormal,
          num_breakbulk: field === "num_breakbulk" ? numValue : formData.num_breakbulk,
        }
        initializeContainers(newCounts)
      }
    },
    [
      formData.rateWeight,
      formData.num_six_meters,
      formData.num_twelve_meters,
      formData.num_abnormal,
      formData.num_breakbulk,
      initializeContainers,
    ],
  )

  // Calendar helper function
  // Calendar helper function - using focus instead of showPicker
  const openCalendar = useCallback((ref) => {
    if (ref.current) {
      ref.current.focus()
    }
  }, [])

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {}

    // Required fields
    if (!formData.clientId) errors.clientId = "Client is required"
    if (!formData.shipmentTypeId) errors.shipmentTypeId = "Shipment type is required"
    if (!formData.pickup) errors.pickup = "Pickup location is required"
    if (!formData.dropoff) errors.dropoff = "Dropoff location is required"

    if (!isAddOn) {
      if (!formData.task) errors.task = "KSM File Reference is required"
      if (!formData.lastFreeDate) errors.lastFreeDate = "Last Free Date is required"
      if (!formData.bookingRef) errors.bookingRef = "Booking reference is required"
      if (!formData.fileRef) errors.fileRef = "Client File Reference is required"
      if (!formData.description) errors.description = "Description is required"
    }

    // Cross-haul specific validations (vessel name and stack date not required for cross-haul types)
    if (!isCrossHaul && !isAddOn) {
      if (!formData.vesselName) errors.vesselName = "Vessel name is required"
      if (!formData.stackDate) errors.stackDate = "Stack date is required"
    }

    // Weight-based validations
    if (isWeightBased) {
      if (formData.shipmentTypeId !== "4") {
        if (!formData.weight || formData.weight === "") {
          errors.weight = "Weight is required for weight-based calculations"
        }
      }
      const isCrossHaulSetRate = formData.shipmentTypeId === "4" && isSetRate
      if (!isCrossHaulSetRate && (!formData.unitrate || formData.unitrate === "")) {
        errors.unitrate = "Unit rate is required for weight-based calculations"
      }
    } else if (isSetRateMode) {
      if (!formData.setRateAmount || formData.setRateAmount === "") {
        errors.setRateAmount = "Set rate amount is required when unit type is Set Rate"
      }
    } else if (!isAddOn) {
      // Container-based validations (skip for add-on shipments)
      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal +
        (isCrossHaul && formData.rateWeight === "Container" ? formData.num_breakbulk : 0) // Only count breakbulk if it's container-based
      if (totalContainers === 0) {
        errors.containerCount = "At least one container is required"
      }

      // Break bulk validation for cross-haul + container
      if (isCrossHaul && formData.num_breakbulk > 0 && formData.rateWeight === "Container") {
        if (!formData.rateper_breakbulk || formData.rateper_breakbulk === "") {
          errors.rateper_breakbulk = "Break bulk rate is required when break bulk count > 0 and unit type is Container"
        }
      }
    }

    return errors
  }, [formData, isCrossHaul, isWeightBased, isAddOn, isSetRate])

  // Container validation function
  const validateContainers = useCallback(() => {
    if (isAddOn || isWeightBased || isSetRateMode || !showContainerDetails || containers.length === 0) {
      return true // No validation needed for weight-based, set-rate, or when no containers
    }

    const errors = {}
    const containerNumbers = []
    let isValid = true

    // For export shipments, skip container number validation
    const isExportShipment = isExport || formData.shipmentTypeId === "2"

    // Check each container
    for (const container of containers) {
      const containerId = container.id

      // For export shipments, File Reference is optional
      if (!isExportShipment) {
        // Check if container number is required and present
        if (!container.containerNum || container.containerNum.trim() === "") {
          errors[`container-${containerId}`] = "Container number is required"
          isValid = false
        } else {
          // Check for duplicates within current instruction
          const upperCaseContainerNum = container.containerNum.toUpperCase()
          if (containerNumbers.includes(upperCaseContainerNum)) {
            errors[`container-${containerId}`] = "Container number must be unique"
            isValid = false
          } else {
            containerNumbers.push(upperCaseContainerNum)
          }
        }
      }

      // Weight validation removed - weight is now optional for all containers
      // Still validate the format if weight is provided
      if (isImport && container.weight && container.weight.trim() !== "") {
        if (!/^\d*\.?\d*$/.test(container.weight)) {
          errors[`weight-${containerId}`] = "Weight must be a valid number"
          isValid = false
        } else if (Number.parseFloat(container.weight) <= 0) {
          errors[`weight-${containerId}`] = "Weight must be greater than 0"
          isValid = false
        }
      }
    }

    setContainerFieldErrors(errors)
    return isValid
  }, [isAddOn, isWeightBased, showContainerDetails, containers, isImport, isExport, formData.shipmentTypeId])

  // Check for rate/count mismatch and generate confirmation message
  const checkRateCountMismatch = useCallback(() => {
    // Skip mismatch check for weight-based, set-rate, and add-on shipments
    if (isWeightBased || isSetRateMode || isAddOn) {
      return { needsConfirmation: false, message: "" }
    }

    const containerTypesWithRatesButZeroCount = []
    const containerTypesWithCountAndRates = []

    // Check 6m containers
    const sixMeterRate = Number.parseFloat(formData.sixMeterRate) || 0
    const sixMeterCount = formData.num_six_meters || 0
    if (sixMeterRate > 0 && sixMeterCount === 0) {
      containerTypesWithRatesButZeroCount.push("6m")
    }
    if (sixMeterCount > 0 && sixMeterRate > 0) {
      containerTypesWithCountAndRates.push(`6m (${sixMeterCount} containers, Rate: R${sixMeterRate.toFixed(2)})`)
    }

    // Check 12m containers
    const twelveMeterRate = Number.parseFloat(formData.twelveMeterRate) || 0
    const twelveMeterCount = formData.num_twelve_meters || 0
    if (twelveMeterRate > 0 && twelveMeterCount === 0) {
      containerTypesWithRatesButZeroCount.push("12m")
    }
    if (twelveMeterCount > 0 && twelveMeterRate > 0) {
      containerTypesWithCountAndRates.push(`12m (${twelveMeterCount} containers, Rate: R${twelveMeterRate.toFixed(2)})`)
    }

    // Check abnormal containers
    const abnormalRate = Number.parseFloat(formData.abnormalRate) || 0
    const abnormalCount = formData.num_abnormal || 0
    if (abnormalRate > 0 && abnormalCount === 0) {
      containerTypesWithRatesButZeroCount.push("Abnormal")
    }
    if (abnormalCount > 0 && abnormalRate > 0) {
      containerTypesWithCountAndRates.push(`Abnormal (${abnormalCount} containers, Rate: R${abnormalRate.toFixed(2)})`)
    }

    // Check break bulk containers (only for cross-haul)
    if (isCrossHaul) {
      const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0
      const breakBulkCount = formData.num_breakbulk || 0
      if (breakBulkRate > 0 && breakBulkCount === 0) {
        containerTypesWithRatesButZeroCount.push("Break Bulk")
      }
      if (breakBulkCount > 0 && breakBulkRate > 0) {
        containerTypesWithCountAndRates.push(
          `Break Bulk (${breakBulkCount} containers, Rate: R${breakBulkRate.toFixed(2)})`,
        )
      }
    }

    // If there are rates set but counts are 0, show confirmation
    if (containerTypesWithRatesButZeroCount.length > 0) {
      let message = "You have containers with the following rates: "
      if (containerTypesWithCountAndRates.length > 0) {
        message += containerTypesWithCountAndRates.join(", ")
        message += ". Are you sure you want to continue?"
      } else {
        message = "You have set rates for container types with 0 containers. Are you sure you want to continue?"
      }

      return {
        needsConfirmation: true,
        message: message,
      }
    }

    return { needsConfirmation: false, message: "" }
  }, [formData, isWeightBased, isCrossHaul, isAddOn])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      // Validate form fields
      const errors = validateForm()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      // Validate containers if container details are shown
      if (!isWeightBased && !isSetRateMode && showContainerDetails) {
        const containerValidationPassed = validateContainers()
        if (!containerValidationPassed) {
          // Scroll to container details section
          const containerSection = document.querySelector(".container-details-section")
          if (containerSection) {
            containerSection.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          return
        }
      }

      // Check for rate/count mismatch
      const { needsConfirmation, message } = checkRateCountMismatch()
      if (needsConfirmation) {
        setConfirmationMessage(message)
        setShowConfirmationPopup(true)
        return
      }

      // Proceed with submission
      await submitInstruction()
    },
    [validateForm, validateContainers, checkRateCountMismatch, isWeightBased, showContainerDetails],
  )

  const submitInstruction = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError("")

    try {
      console.log("=== STARTING TOTAL COST CALCULATION ===")

      // Fetch set rate on-the-fly if Set Rate checkbox is checked (prevents race condition)
      let currentSetRateValue = setRateValue
      if (isSetRate && formData.clientId && formData.pickup && formData.dropoff) {
        console.log("[SET RATE] Fetching set rate on-the-fly to avoid race condition...")
        try {
          const rates = await fetchRates(formData.clientId, formData.pickup, formData.dropoff)
          if (rates && rates.setRate != null) {
            currentSetRateValue = Number(rates.setRate)
            console.log(`[SET RATE] Fetched fresh value: ${currentSetRateValue}`)
          } else {
            currentSetRateValue = 0
            console.log("[SET RATE] No set rate found for this route")
          }
        } catch (err) {
          console.error("[SET RATE] Error fetching:", err)
          currentSetRateValue = 0
        }
      }

      let totalCost = 0
      const costBreakdown = {
        calculationType: isWeightBased ? "weight-based" : isSetRateMode ? "set-rate" : "container-based",
        isWeightBased,
        isCrossHaul,
        unitType: formData.rateWeight,
        components: {},
      }

      // Calculate set rate value using the freshly fetched value
      const calculatedSetRateValue = Number.isFinite(Number(currentSetRateValue)) ? Number(currentSetRateValue) : 0

      console.log("DEBUG VALUES:", {
        isSetRateMode,
        isSetRate,
        isAddOn,
        shipmentTypeId: formData.shipmentTypeId,
        rateWeight: formData.rateWeight,
        setRateValue,
        currentSetRateValue,
        calculatedSetRateValue
      })

      const currentWeightRows = weightRowsRef.current || []

      if ((isSetRateMode || isSetRate) && !isAddOn) {
        const weightRowCount = currentWeightRows.length || 1
        totalCost = calculatedSetRateValue * weightRowCount

        costBreakdown.components = {
          setRateAmount: setRateValue,
          weightRowCount: weightRowCount,
          setRateCost: totalCost,
        }

        console.log("SET-RATE CALCULATION:")
        console.log(`  Set Rate Amount: R${setRateValue.toFixed(2)}`)
        console.log(`  Weight Row Count: ${weightRowCount}`)
        console.log(`  Total Cost: R${setRateValue.toFixed(2)} × ${weightRowCount} = R${totalCost.toFixed(2)}`)
      } else if (isWeightBased && !isAddOn) {
        // Weight-based calculation
        let baseWeight = 0
        if (formData.shipmentTypeId === "4") {
          baseWeight = currentWeightRows.reduce((sum, row) => {
            if (row.weight === null || row.weight === undefined || row.weight === "") {
              return sum
            }
            const parsed = Number.parseFloat(row.weight)
            return Number.isNaN(parsed) ? sum : sum + parsed
          }, 0)
        } else {
          baseWeight = Number.parseFloat(formData.weight || 0)
        }

        const unitRate = Number.parseFloat(formData.unitrate || 0)
        totalCost = baseWeight * unitRate

        costBreakdown.components = {
          weight: baseWeight,
          unitRate: unitRate,
          weightBasedCost: totalCost,
        }

        console.log("WEIGHT-BASED CALCULATION:")
        console.log(`  Weight: ${baseWeight} ${formData.rateWeight}`)
        console.log(`  Unit Rate: R${unitRate.toFixed(2)} per ${formData.rateWeight}`)
        console.log(`  Base Cost: ${baseWeight} × R${unitRate.toFixed(2)} = R${totalCost.toFixed(2)}`)
      } else {
        // Container-based calculation
        const sixMeterRate = Number.parseFloat(formData.sixMeterRate) || 0
        const twelveMeterRate = Number.parseFloat(formData.twelveMeterRate) || 0
        const abnormalRate = Number.parseFloat(formData.abnormalRate) || 0
        const breakBulkRate = Number.parseFloat(formData.rateper_breakbulk) || 0

        const sixMeterCount = formData.num_six_meters || 0
        const twelveMeterCount = formData.num_twelve_meters || 0
        const abnormalCount = formData.num_abnormal || 0
        const breakBulkCount = formData.num_breakbulk || 0

        const sixMeterCost = sixMeterRate * sixMeterCount
        const twelveMeterCost = twelveMeterRate * twelveMeterCount
        const abnormalCost = abnormalRate * abnormalCount

        // Break bulk cost only applies if it's cross-haul AND the rateWeight is 'Container'
        const breakBulkCost = isCrossHaul && formData.rateWeight === "Container" ? breakBulkRate * breakBulkCount : 0

        const surchargeTotal = (containersRef.current || []).reduce((sum, c) => {
          if (c.addSurcharges) {
            const resolved = c.is_12m_surcharge
              ? (Number(c.surcharge_12m_amount) || 0)
              : (Number(c.surchargeAmount) || 0)
            return sum + resolved
          }
          return sum
        }, 0)

        totalCost = sixMeterCost + twelveMeterCost + abnormalCost + breakBulkCost + surchargeTotal

        costBreakdown.components = {
          sixMeter: { count: sixMeterCount, rate: sixMeterRate, cost: sixMeterCost },
          twelveMeter: { count: twelveMeterCount, rate: twelveMeterRate, cost: twelveMeterCost },
          abnormal: { count: abnormalCount, rate: abnormalRate, cost: abnormalCost },
          breakBulk: {
            count: breakBulkCount,
            rate: breakBulkRate,
            cost: breakBulkCost,
            applicable: isCrossHaul && formData.rateWeight === "Container",
          },
          surcharges: { count: (containersRef.current || []).filter(c => c.addSurcharges).length, cost: surchargeTotal },
          containerBasedSubtotal: totalCost,
        }

        console.log("CONTAINER-BASED CALCULATION:")
        console.log(`  6m Containers: ${sixMeterCount} × R${sixMeterRate.toFixed(2)} = R${sixMeterCost.toFixed(2)}`)
        console.log(
          `  12m Containers: ${twelveMeterCount} × R${twelveMeterRate.toFixed(2)} = R${twelveMeterCost.toFixed(2)}`,
        )
        console.log(
          `  Abnormal Containers: ${abnormalCount} × R${abnormalRate.toFixed(2)} = R${abnormalCost.toFixed(2)}`,
        )

        if (isCrossHaul && formData.rateWeight === "Container") {
          console.log(`  Break Bulk: ${breakBulkCount} × R${breakBulkRate.toFixed(2)} = R${breakBulkCost.toFixed(2)}`)
        } else if (isCrossHaul) {
          console.log(`  Break Bulk: Not applicable (Unit type: ${formData.rateWeight})`)
        }

        console.log(`  Surcharges: R${surchargeTotal.toFixed(2)}`)

        console.log(`  Container Subtotal: R${totalCost.toFixed(2)}`)
      }

      // For add-on shipment type (5), force all financial values to zero
      if (formData.shipmentTypeId === "5") {
        console.log("[ADD-ON] Forcing totalCost to 0 for shipment type 5")
        totalCost = 0
      }

      // Note: Surcharge amounts are now calculated by the backend on submit
      // Frontend only tracks which containers have surcharges enabled
      const subtotalBeforeVAT = totalCost;

      costBreakdown.components.surcharges = {
        applied: containers.some(c => c.addSurcharges),
        amount: 0, // Backend will calculate actual amount
      };
      costBreakdown.components.subtotalBeforeVAT = subtotalBeforeVAT;

      console.log("SURCHARGES:");
      console.log(`  Containers with Surcharges: ${containers.filter(c => c.addSurcharges).length}`);
      console.log(`  Surcharge amounts will be calculated by backend on submit`);
      console.log(`  Subtotal (before VAT): R${subtotalBeforeVAT.toFixed(2)}`)

      // Calculate VAT (for display purposes only - not added to total cost saved to DB)
      const vatRate = formData.vat / 100
      const vatAmount = subtotalBeforeVAT * vatRate
      const totalWithVAT = subtotalBeforeVAT + vatAmount

      costBreakdown.components.vat = {
        rate: formData.vat,
        rateDecimal: vatRate,
        amount: vatAmount,
      }
      costBreakdown.components.totalWithVAT = totalWithVAT

      console.log("VAT CALCULATION (for reference only - NOT added to saved total):")
      console.log(`  VAT Rate: ${formData.vat}%`)
      console.log(`  VAT Amount: R${subtotalBeforeVAT.toFixed(2)} × ${vatRate} = R${vatAmount.toFixed(2)}`)
      console.log(`  Total with VAT: R${totalWithVAT.toFixed(2)}`)

      // Set the total cost to save (WITHOUT VAT)
      // Use set rate value if either isSetRateMode (SetRate unit type) or isSetRate (checkbox) is true
      if ((isSetRateMode || isSetRate) && !isAddOn) {
        const weightRowCount = currentWeightRows.length || 1
        totalCost = calculatedSetRateValue * weightRowCount
        costBreakdown.components.finalTotalSaved = totalCost
        console.log("FINAL COST BREAKDOWN (SET RATE):")
        console.log(`  Set Rate Amount: R${setRateValue.toFixed(2)}`)
        console.log(`  Weight Row Count: ${weightRowCount}`)
        console.log(`  Set Rate Cost: R${totalCost.toFixed(2)}`)
      } else {
        totalCost = subtotalBeforeVAT
        costBreakdown.components.finalTotalSaved = totalCost
        console.log("FINAL COST BREAKDOWN:")
        console.log(`  Base Cost: R${totalCost.toFixed(2)}`)
        console.log(`  Surcharges: Will be calculated by backend`)
        console.log(`  TOTAL COST SAVED TO DB (excluding VAT): R${totalCost.toFixed(2)}`)
        console.log(`  VAT (calculated but not saved): R${vatAmount.toFixed(2)}`)
        console.log(`  Total with VAT (for reference): R${totalWithVAT.toFixed(2)}`)
      }

      console.log("=== COST BREAKDOWN SUMMARY ===")
      console.log(JSON.stringify(costBreakdown, null, 2))
      console.log("=== END TOTAL COST CALCULATION ===")

      // Prepare instruction data with null values for cross-haul and weight-based
      // Remove hazardous and surcharges fields from formData to prevent them from being sent to m1_controller table
      const { hazardous, surcharges, ...formDataWithoutContainerFields } = formData;
      const isAddOnType = formData.shipmentTypeId === "5"

      const instructionData = {
        ...formDataWithoutContainerFields,
        total_cost: isAddOnType ? 0 : totalCost, // For add-on, always save 0
        is_set_rate: isSetRate, // Add is_set_rate boolean
        historical_set_rate: isSetRate ? currentSetRateValue : null, // Use freshly fetched value to avoid race condition
        // Set vessel_name and stackdate to null for cross-haul types
        vessel_name: isCrossHaul ? null : formData.vesselName,
        stackdate: isCrossHaul ? null : formData.stackDate,
        // UPDATED RATE SAVING LOGIC: For add-on (type 5), force all rates to 0.
        // Otherwise, set container rates to 0 if count is 0, null for weight-based, or 0 when unit is kg or ton
        rateper_6: isAddOnType
          ? 0
          : formData.rateWeight === "kg" || formData.rateWeight === "ton"
            ? 0
            : isWeightBased
              ? null
              : formData.num_six_meters === 0
                ? 0
                : formData.sixMeterRate === ""
                  ? null
                  : Number.parseFloat(formData.sixMeterRate || 0),
        rateper_12: isAddOnType
          ? 0
          : formData.rateWeight === "kg" || formData.rateWeight === "ton"
            ? 0
            : isWeightBased
              ? null
              : formData.num_twelve_meters === 0
                ? 0
                : formData.twelveMeterRate === ""
                  ? null
                  : Number.parseFloat(formData.twelveMeterRate || 0),
        rateper_abnormal: isAddOnType
          ? 0
          : formData.rateWeight === "kg" || formData.rateWeight === "ton"
            ? 0
            : isWeightBased
              ? null
              : formData.num_abnormal === 0
                ? 0
                : formData.abnormalRate === ""
                  ? null
                  : Number.parseFloat(formData.abnormalRate || 0),
        // Set container counts to 0 for weight-based or when unit is kg or ton or when Set Rate is active
        num_six_meters: (formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRate) ? 0 : formData.num_six_meters || 0,
        num_twelve_meters: (formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRate) ? 0 : formData.num_twelve_meters || 0,
        num_abnormal: (formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRate) ? 0 : formData.num_abnormal || 0,
        // Set break bulk fields. For add-on, force 0; otherwise null as it's removed from UI
        rateper_breakbulk: isAddOnType ? 0 : null,
        num_breakbulk: 0,
        // Set weight and unitrate appropriately. For add-on, force unitrate to 0.
        weight:
          isWeightBased && formData.shipmentTypeId !== "4"
            ? formData.weight === ""
              ? null
              : Number.parseFloat(formData.weight || 0)
            : null,
        unitrate: isAddOnType
          ? 0
          : isWeightBased
            ? formData.unitrate === "" ? null : Number.parseFloat(formData.unitrate || 0)
            : null,
        // Map field names for backend
        client: formData.clientId,
        shipment_type: formData.shipmentTypeId,
        pickuptime: formData.pickupTime,
        pickupdate: formData.pickupDate,
        deadline: formData.deadline,
        fileref: formData.fileRef,
        booking_ref: formData.bookingRef,
        rateweight: formData.rateWeight,
        status: "New",
        vat: formData.vat,
        // Note: surcharge_amount is now stored in container table, not in instruction table
      }

      // Prepare container data (only for container-based calculations AND if unit type is Container)
      // Also ensure container details are not saved when rateWeight is kg or ton
      // Note: Surcharge amounts will be calculated by backend based on client rates
      // CRITICAL FIX: Use containersRef.current to capture latest container data
      const currentContainers = containersRef.current || []
      
      console.log("[SAVE DEBUG] Preparing container data:", {
        containersState: containers,
        containersRef: containersRef.current,
        containerCount: currentContainers.length,
        isWeightBased,
        rateWeight: formData.rateWeight,
        shipmentTypeId: formData.shipmentTypeId
      })
      
      const containerData =
        !isWeightBased && formData.rateWeight === "Container" && formData.rateWeight !== "kg" && formData.rateWeight !== "ton"
          ? currentContainers.map((container) => ({
              container_type: container.containerType,
              containerNum: container.containerNum || "",  // Ensure containerNum is never undefined
              file_ref: container.fileRef || "", // Include file reference field for export shipments
              weight: (isImport || isExport || isCrossHaul) ? (container.weight === "" ? null : Number.parseFloat(container.weight || 0)) : null,
              cargo_description: container.cargoDescription || "",
              "Hazardous": container.hazardous || false,
              "Add Surcharges": container.addSurcharges || false,
              is_12m_surcharge: Boolean(container.is_12m_surcharge),
              surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
              // Only allow VGM to be true for allowed shipment types; otherwise force false
              "vgm": allowVgmUI ? (container.vgm || false) : false,
              // Note: "Surcharge Amount" and "vgm amount" will be calculated by backend
            }))
          : []
      
      // Validate that containers with counts have container numbers
      const containerValidation = containerData.filter(c => !c.containerNum || c.containerNum === "")
      if (containerValidation.length > 0 && !isAddOn) {
        console.warn("[SAVE WARNING] Containers missing numbers:", containerValidation)
      }

      let weightData = []
      if (formData.shipmentTypeId === "4") {
        // For cross-haul/break bulk, always send every visible row so the
        // backend can persist all of them exactly as entered.
        weightData = currentWeightRows.map((row) => {
          let numericWeight = null
          if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
            const parsed = Number.parseFloat(row.weight)
            numericWeight = Number.isNaN(parsed) ? null : parsed
          }

          const ksm = row.ksmDmNo || row.ksm_dm_no || null
          const ticket = row.ticketNo || row.ticket_no || null
          const receipt = row.receiptBookNo || row.receipt_book_no || null

          return {
            ksm_dm_no: ksm,
            ticket_no: ticket,
            receipt_book_no: receipt,
            weight: numericWeight,
          }
        })
      }

      console.log("=== SUBMITTING TO DATABASE ===")
      console.log("DEBUG FINAL VALUES:", {
        totalCost,
        isSetRateMode,
        isSetRate,
        isAddOn,
        isAddOnType,
        calculatedSetRateValue,
        setRateValue,
        currentSetRateValue
      })
      console.log("Instruction data being saved:", {
        ...instructionData,
        description: instructionData.description ? instructionData.description.substring(0, 50) + "..." : null, // Truncate for logging
      })
      console.log("Container data being saved:", containerData)
      console.log("Raw weightRows state (shipment type 4 only):", currentWeightRows)
      console.log(
        "Raw weightRows JSON (shipment type 4 only):",
        JSON.stringify(currentWeightRows, null, 2),
      )
      console.log("Weight rows being saved (shipment type 4 only):", weightData)
      console.log(
        "Weight rows JSON being saved (shipment type 4 only):",
        JSON.stringify(weightData, null, 2),
      )
      console.log("Final calculated total cost (WITHOUT VAT):", totalCost)
      console.log("Rate saving logic applied:")
      console.log(`  rateper_6: ${instructionData.rateper_6} (count: ${instructionData.num_six_meters})`)
      console.log(`  rateper_12: ${instructionData.rateper_12} (count: ${instructionData.num_twelve_meters})`)
      console.log(`  rateper_abnormal: ${instructionData.rateper_abnormal} (count: ${instructionData.num_abnormal})`)
      console.log(`  rateper_breakbulk: ${instructionData.rateper_breakbulk} (count: ${instructionData.num_breakbulk})`)

      // Save the instruction
      const response = await api.post("/api/instructions/save-instruction", {
        controllerData: instructionData,
        containerData: containerData,
        weightData: weightData,
      })

      if (response.data.success) {
        console.log("=== INSTRUCTION SAVED SUCCESSFULLY ===")
        console.log("Database response:", response.data)
        // Navigate to dashboard on success
        navigate("/ControllerDashboard")
      } else {
        throw new Error(response.data.message || "Failed to save instruction")
      }
    } catch (error) {
      console.error("=== ERROR SAVING INSTRUCTION ===")
      console.error("Error submitting form:", error)
      setSubmitError(error.response?.data?.message || error.message || "An error occurred while saving the instruction")
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isWeightBased, isCrossHaul, isImport, isSetRate, isSetRateMode, isAddOn, setRateValue, fetchRates, containers, weightRows, navigate])

  const handleConfirmSubmit = useCallback(async () => {
    setShowConfirmationPopup(false)
    await submitInstruction()
  }, [submitInstruction])

  const handleCancelSubmit = useCallback(() => {
    setShowConfirmationPopup(false)
  }, [])

  // ErrorTooltip component - Disabled
  const ErrorTooltip = () => null

  // Style objects
  const nonEditableStyle = useMemo(
    () => ({
      backgroundColor: "#f5f5f5",
      cursor: "not-allowed",
    }),
    [],
  )

  const disabledRateStyle = useMemo(
    () => ({
      backgroundColor: "#f5f5f5",
      color: "rgba(0, 0, 0, 0.38)",
      cursor: "not-allowed",
    }),
    [],
  )

  // Spinner styles
  const spinnerKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `

  // Determine if break bulk fields should be disabled
  const disableBreakBulkFields = formData.rateWeight !== "Container" || !isCrossHaul

  return (
    <div className="controller-instructions-unique-wrapper">
      <style>{spinnerKeyframes}</style>

      {/* Confirmation Popup */}
      {showConfirmationPopup && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#333" }}>Confirm Submission</h3>
            <p style={{ marginBottom: "20px", lineHeight: "1.5" }}>{confirmationMessage}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCancelSubmit}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                No, Let Me Edit
              </button>
              <button
                onClick={handleConfirmSubmit}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4a90e2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Rates Modal */}
      {showNoRatesModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>No Rates Available</h3>
            <p>This client has no rates configured. Please contact the manager to set up rates.</p>
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#4a90e2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
              onClick={() => setShowNoRatesModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>

      {/* Loading state removed as per requirements */}
      {isLoadingLocations && <div style={{ height: "20px" }}></div>}

      {/* Location error popup removed as per requirements */}
      {isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading data...</p>
        </div>
      ) : clients.length === 0 || shipmentTypes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Failed to load data from the database. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4a90e2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="controller-instructions-form-container"
        style={{ maxWidth: "1200px", width: "calc(100% - 40px)", margin: "0 auto", boxSizing: "border-box" }}
      >
        <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.clientId}>
                <select
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleClientChange}
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
                <ErrorTooltip message={fieldErrors.clientId} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Pick-Up Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.pickup}>
                <select
                  className={`dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                  name="pickup"
                  value={formData.pickup}
                  onChange={handlePickupChange}
                  disabled={!formData.clientId || isLoadingLocations}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {Array.isArray(clientStartingPoints) &&
                    clientStartingPoints.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.pickup} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Drop-Off Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.current.dropoff}>
                <select
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleDropoffChange}
                  disabled={!formData.clientId || !formData.pickup || isLoading.destinations}
                  className={
                    !formData.clientId || !formData.pickup
                      ? "controller-instructions-form-input disabled-field"
                      : "controller-instructions-form-input"
                  }
                >
                  {!formData.clientId || !formData.pickup ? (
                    <option value="">Please select client and pickup first</option>
                  ) : (
                    <option value="">Select Destination</option>
                  )}
                  {Array.isArray(clientDestinations) &&
                    clientDestinations.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.dropoff} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Representative</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                name="representative"
                value={formData.representative}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Contact Details</label>
              <input
                type="text"
                className="controller-instructions-form-input"
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
                name="email"
                value={formData.email}
                readOnly
                style={nonEditableStyle}
              />
            </div>
          </div>
        </div>
        {false && (
          <div className="controller-instructions-form-section">
            <div className="controller-instructions-form-row">
              <div className="controller-instructions-form-field">
                <label>Shipment Type</label>
                <div
                  className="controller-instructions-select-wrapper"
                  ref={fieldRefs.current.shipmentTypeId}
                >
                  <select
                    className={`dropdown ${
                      fieldErrors.shipmentTypeId
                        ? "controller-instructions-error-field"
                        : ""
                    }`}
                    name="shipmentTypeId"
                    value={formData.shipmentTypeId}
                    onChange={handleShipmentTypeChange}
                    disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                  >
                    <option value="" disabled>
                      Select Shipment
                    </option>
                    {shipmentTypes.map((type) => (
                      <option key={type.shipkey} value={type.shipkey}>
                        {type.shipmenttype}
                      </option>
                    ))}
                  </select>
                  <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main container + booking section: two columns side by side */}
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-container-section">
            {/* LEFT: Trailer size / containers / unit per */}
            <div className="controller-instructions-container-group">
              <div className="controller-instructions-container-label">
                <span className="controller-instructions-trailer-size-label">Trailer Size</span>
                <label>No. of Containers</label>
                {fieldErrors.containers && (
                  <div className="controller-instructions-container-error-message">{fieldErrors.containers}</div>
                )}
              </div>
              <div
                className="controller-instructions-container-inputs"
                style={{
                  opacity: isWeightBased || isSetRateMode ? 0.5 : 1,
                  pointerEvents: isWeightBased || isSetRateMode ? "none" : "auto",
                }}
              >
                <div className="controller-instructions-container-input">
                  <label>6m</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.sixMeterRate !== undefined && formData.sixMeterRate !== ""
                            ? Number.parseFloat(formData.sixMeterRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.sixMeterRate) {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: Number.parseFloat(prev.sixMeterRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.sixMeterRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              sixMeterRate: Number.parseFloat(prev.sixMeterRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor:
                            rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                              ? "#fff"
                              : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor:
                            rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                              ? "text"
                              : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.sixMeter || isWeightBased || rateLockStatus.sixMeter}
                        placeholder={
                          rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter ? "0.00" : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="controller-instructions-container-input">
                  <label>12m</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.twelveMeterRate !== undefined && formData.twelveMeterRate !== ""
                            ? Number.parseFloat(formData.twelveMeterRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.twelveMeterRate) {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: Number.parseFloat(prev.twelveMeterRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.twelveMeterRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              twelveMeterRate: Number.parseFloat(prev.twelveMeterRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor:
                            rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                              ? "#fff"
                              : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor:
                            rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                              ? "text"
                              : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.twelveMeter || isWeightBased || rateLockStatus.twelveMeter}
                        placeholder={
                          rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter ? "0.00" : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="controller-instructions-container-input">
                  <label>Abnormal</label>
                  <div className="controller-instructions-container-rate-group" style={{ display: "flex", width: "100px" }}>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                      disabled={isWeightBased || isSetRateMode}
                    />
                    <div style={{ width: "100%", marginLeft: "10px" }}>
                      <input
                        type="text"
                        value={
                          formData.abnormalRate !== undefined && formData.abnormalRate !== ""
                            ? Number.parseFloat(formData.abnormalRate).toFixed(2)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: value === "" ? "" : Number.parseFloat(value) || 0,
                            }))
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select()
                          if (formData.abnormalRate) {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: Number.parseFloat(prev.abnormalRate).toString(),
                            }))
                          }
                        }}
                        onBlur={() => {
                          if (formData.abnormalRate !== "") {
                            setFormData((prev) => ({
                              ...prev,
                              abnormalRate: Number.parseFloat(prev.abnormalRate),
                            }))
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "8px",
                          border: "1px solid #000",
                          borderRadius: "4px",
                          backgroundColor: rateFieldsEnabled.abnormal && !isWeightBased ? "#fff" : "#f5f5f5",
                          fontSize: "16px",
                          position: "relative",
                          zIndex: 1000,
                          cursor: rateFieldsEnabled.abnormal && !isWeightBased ? "text" : "not-allowed",
                        }}
                        disabled={!rateFieldsEnabled.abnormal || isWeightBased}
                        placeholder={rateFieldsEnabled.abnormal && !isWeightBased ? "0.00" : ""}
                      />
                    </div>
                  </div>
                </div>

                {fieldErrors.containerCount && (
                  <div
                    className="controller-instructions-error-message"
                    style={{
                      color: "#d32f2f",
                      fontSize: "0.75rem",
                      marginTop: "4px",
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "4px 8px",
                      backgroundColor: "#ffebee",
                      borderRadius: "4px",
                    }}
                  >
                    {fieldErrors.containerCount}
                  </div>
                )}
              </div>

              {/* Unit per / weight rate row */}
              <div className="controller-instructions-form-row" style={{ margin: "16px 0", padding: "0 10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "nowrap",
                    width: "100%",
                    justifyContent: "flex-start",
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>Unit per:</span>
                        <div className="controller-instructions-select-wrapper" style={{ width: "100px" }}>
                          <select
                            className="controller-instructions-dropdown"
                            name="rateWeight"
                            value={String(formData.rateWeight || "Container")}
                            onChange={handleInputChange}
                            disabled={
                              formData.shipmentTypeId === "1" ||
                              formData.shipmentTypeId === "2" ||
                              formData.shipmentTypeId === "3" ||
                              formData.shipmentTypeId === "5"
                            }
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "13px",
                              backgroundColor:
                                formData.shipmentTypeId === "1" ||
                                formData.shipmentTypeId === "2" ||
                                formData.shipmentTypeId === "3" ||
                                formData.shipmentTypeId === "4" ||
                                formData.shipmentTypeId === "5"
                                  ? "#e9ecef"
                                  : "#fff",
                              height: "32px",
                              lineHeight: "1",
                              cursor:
                                formData.shipmentTypeId === "1" ||
                                formData.shipmentTypeId === "2" ||
                                formData.shipmentTypeId === "3" ||
                                formData.shipmentTypeId === "5"
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2" ||
                            formData.shipmentTypeId === "3" ||
                            formData.shipmentTypeId === "5" ? (
                              <option value="Container">Container</option>
                            ) : formData.shipmentTypeId === "4" ? (
                              <>
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                              </>
                            ) : (
                              <>
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                                <option value="Container">Container</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    {isWeightBased && formData.shipmentTypeId !== "4" && (
                      <div
                        className="controller-instructions-weight-input-group"
                        ref={fieldRefs.current.weight}
                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                              placeholder="Wt"
                              name="weight"
                              value={formData.weight}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                              }}
                            />
                          </div>
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.unitrate ? "controller-instructions-error-field" : ""}`}
                              placeholder="Rate"
                              name="unitrate"
                              value={formData.unitrate || ""}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                              }}
                            />
                          </div>
                          <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>
                            {formData.rateWeight}
                          </span>
                        </div>
                        <ErrorTooltip message={fieldErrors.weight} />
                        <ErrorTooltip message={fieldErrors.unitrate} />
                      </div>
                    )}
                    {isWeightBased && formData.shipmentTypeId === "4" && (
                      <div>
                        <div
                          className="controller-instructions-weight-input-group"
                          ref={fieldRefs.current.weight}
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <div className="controller-instructions-input-wrapper" style={{ width: "100%" }}>
                            <input
                              type="text"
                              className={`controller-instructions-form-input ${fieldErrors.unitrate ? "controller-instructions-error-field" : ""}`}
                              placeholder="Rate"
                              name="unitrate"
                              value={formData.unitrate || ""}
                              disabled={isSetRate}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                  handleInputChange(e)
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                border: "1px solid #ced4da",
                                borderRadius: "4px",
                                fontSize: "12px",
                                height: "28px",
                                lineHeight: "1",
                                backgroundColor: isSetRate ? "#e9ecef" : "#fff",
                                cursor: isSetRate ? "not-allowed" : "text",
                              }}
                            />
                          </div>
                          <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>
                            {formData.rateWeight}
                          </span>
                          <ErrorTooltip message={fieldErrors.unitrate} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Set Rate checkbox - positioned below Unit per with spacing, completely outside flex row */}
              {formData.shipmentTypeId === "4" && (
                <div style={{ margin: "24px 10px 0", padding: "0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={isSetRate}
                        onChange={(e) => {
                          const nextChecked = e.target.checked
                          setIsSetRate(nextChecked)
                          if (nextChecked) {
                            setFormData((prev) => ({ ...prev, unitrate: "" }))
                            setFieldErrors((prev) => {
                              if (!prev.unitrate) return prev
                              const next = { ...prev }
                              delete next.unitrate
                              return next
                            })
                          }
                        }}
                      />
                      Break Bulk Set Rate
                    </label>
                    {isSetRate && (
                      <div className="controller-instructions-input-wrapper" style={{ width: "140px" }}>
                        <input
                          type="text"
                          className="controller-instructions-form-input"
                          value={Number.isFinite(Number(setRateValue)) ? String(setRateValue) : ""}
                          readOnly
                          disabled
                          style={{
                            width: "100%",
                            padding: "4px 6px",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            fontSize: "12px",
                            height: "28px",
                            lineHeight: "1",
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Booking + dates + VAT/vessel/description */}
            {true && (
              <div className="controller-instructions-booking-rates-group">
                {/* Top row: shipment type + refs */}
                <div
                  className="controller-instructions-booking-rates-row"
                  style={{ marginBottom: "8px", flexWrap: "wrap" }}
                >
                  {/* Shipment Type (normal shipments) */}
                  <div
                    className="controller-instructions-form-field"
                    style={{ flex: "1 1 160px" }}
                  >
                    <label>Shipment Type</label>
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.current.shipmentTypeId}
                    >
                      <select
                        className={`dropdown ${
                          fieldErrors.shipmentTypeId
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={
                          isLoading.shipmentTypes || shipmentTypes.length === 0
                        }
                      >
                        <option value="" disabled>
                          Select Shipment
                        </option>
                        {shipmentTypes.map((type) => (
                          <option key={type.shipkey} value={type.shipkey}>
                            {type.shipmenttype}
                          </option>
                        ))}
                      </select>
                      <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                    </div>
                  </div>

                  {/* Booking Ref */}
                  <div
                    className="controller-instructions-form-field"
                    style={{ flex: "1 1 180px" }}
                  >
                    <label>Booking Ref</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.bookingRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Booking ref"
                        name="bookingRef"
                        value={formData.bookingRef}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.bookingRef} />
                    </div>
                  </div>

                  {/* File Ref */}
                  <div className="controller-instructions-form-field" style={{ flex: "1 1 120px" }}>
                    <label>Client File Reference</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.fileRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Client File Reference"
                        name="fileRef"
                        value={formData.fileRef}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.fileRef} />
                    </div>
                  </div>

                  {/* Name of Task */}
                  <div className="controller-instructions-form-field" style={{ flex: "1 1 160px" }}>
                    <label>KSM File Reference</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.current.task}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                        placeholder="KSM File Reference"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                </div>

                {/* Date / description rows */}
                {isCrossHaul ? (
                  <>
                    {/* Cross-haul: Last Free Date row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ marginBottom: "8px", flexWrap: "wrap" }}
                    >
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>Last Free Date</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.lastFreeDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.lastFreeDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={lastFreeDateRef}
                            placeholder="Date here"
                            name="lastFreeDate"
                            value={formData.lastFreeDate}
                            onChange={handleInputChange}
                            min={today}
                            style={{ width: "100%" }}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.lastFreeDate} />
                        </div>
                      </div>
                    </div>

                    {/* Cross-haul: Description row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ flexWrap: "wrap" }}
                    >
                      <div
                        className="controller-instructions-form-field"
                        style={{ width: "100%" }}
                      >
                        <label>Description from Client</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.description}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.description
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Description from Client"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              height: "36px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.description} />
                        </div>
                      </div>
                    </div>
                    {formData.shipmentTypeId === "4" && (
                      <div
                        className="controller-instructions-form-row"
                        style={{ margin: "24px 0 8px", padding: "0 10px" }}
                      >
                        <div style={{ width: "100%" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "170px",
                                  }}
                                >
                                  KSM DN Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "150px",
                                  }}
                                >
                                  Ticket Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "180px",
                                  }}
                                >
                                  Receipt Book Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "140px",
                                  }}
                                >
                                  Weight ({formData.rateWeight})
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    minWidth: "110px",
                                  }}
                                ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {weightRows.map((row) => (
                                <tr key={row.id}>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ksmDmNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ksmDmNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ticketNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ticketNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.receiptBookNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "receiptBookNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.weight || ""}
                                      onChange={(e) => updateWeightRow(row.id, "weight", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeWeightRow(row.id)}
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #dc3545",
                                        backgroundColor: "#fff",
                                        color: "#dc3545",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{ padding: "10px 14px", textAlign: "left", backgroundColor: "#f4f8ff" }}
                                >
                                  <button
                                    type="button"
                                    onClick={addWeightRow}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "13px",
                                      borderRadius: "4px",
                                      border: "1px solid #4a90e2",
                                      backgroundColor: "#4a90e2",
                                      color: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Row
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Import/Export: Stack Date + Last Free Date row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ marginBottom: "8px", flexWrap: "wrap" }}
                    >
                      {/* Stack/ETA Date */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>{isImport ? "ETA" : "Stack Date"}</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={etaDateRef}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.stackDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={etaDateRef}
                            name="stackDate"
                            value={formData.stackDate}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "13px",
                              height: "32px",
                            }}
                            min={today}
                            disabled={false}
                            onClick={() => openCalendar(etaDateRef)}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.stackDate} />
                        </div>
                      </div>

                      {/* Last Free Date */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 140px" }}
                      >
                        <label>Last Free Date</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.lastFreeDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.lastFreeDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            ref={lastFreeDateRef}
                            placeholder="Date here"
                            name="lastFreeDate"
                            value={formData.lastFreeDate}
                            onChange={handleInputChange}
                            min={today}
                            style={{ width: "100%" }}
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <ErrorTooltip message={fieldErrors.lastFreeDate} />
                        </div>
                      </div>
                    </div>

                    {/* Import/Export: VAT + Vessel + Description row */}
                    <div
                      className="controller-instructions-booking-rates-row"
                      style={{ flexWrap: "wrap" }}
                    >
                      {/* VAT toggle */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "0 0 120px", minWidth: "100px" }}
                      >
                        <label>VAT</label>
                        <div className="controller-instructions-input-wrapper">
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontSize: "12px" }}>0%</span>
                            <input
                              type="checkbox"
                              checked={formData.vat !== 0}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  vat: e.target.checked ? 15 : 0,
                                }))
                              }
                              style={{ display: "none" }}
                            />
                            <span
                              className="vat-toggle-slider"
                              style={{
                                position: "relative",
                                width: "40px",
                                height: "20px",
                                borderRadius: "10px",
                                backgroundColor: formData.vat !== 0 ? "#4a90e2" : "#ccc",
                                transition: "background-color 0.2s ease",
                                display: "inline-block",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: "2px",
                                  left: formData.vat !== 0 ? "22px" : "2px",
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  backgroundColor: "#fff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  transition: "left 0.2s ease",
                                }}
                              />
                            </span>
                            <span style={{ fontSize: "12px" }}>15%</span>
                          </label>
                        </div>
                      </div>

                      {/* Vessel Name */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "1 1 160px", minWidth: "140px" }}
                      >
                        <label>Vessel Name</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.vesselName}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input vessel-name-input ${
                              fieldErrors.vesselName
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Vessel name"
                            name="vesselName"
                            value={formData.vesselName}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "12px",
                              height: "30px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.vesselName} />
                        </div>
                      </div>

                      {/* Description */}
                      <div
                        className="controller-instructions-form-field"
                        style={{ flex: "2 1 200px", minWidth: "160px" }}
                      >
                        <label>Description</label>
                        <div
                          className="controller-instructions-input-wrapper"
                          ref={fieldRefs.current.description}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.description
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "12px",
                              height: "30px",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.description} />
                        </div>
                      </div>
                    </div>
                    {formData.shipmentTypeId === "4" && (
                      <div
                        className="controller-instructions-form-row"
                        style={{ margin: "24px 0 8px", padding: "0 10px" }}
                      >
                        <div style={{ width: "100%" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "170px",
                                  }}
                                >
                                  KSM DN Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "150px",
                                  }}
                                >
                                  Ticket Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "180px",
                                  }}
                                >
                                  Receipt Book Number
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    minWidth: "140px",
                                  }}
                                >
                                  Weight ({formData.rateWeight})
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #dee2e6",
                                    padding: "10px 14px",
                                    backgroundColor: "#cfe5ff",
                                    minWidth: "110px",
                                  }}
                                ></th>
                              </tr>
                            </thead>
                            <tbody>
                              {weightRows.map((row) => (
                                <tr key={row.id}>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ksmDmNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ksmDmNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.ticketNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "ticketNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.receiptBookNo || ""}
                                      onChange={(e) => updateWeightRow(row.id, "receiptBookNo", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="controller-instructions-form-input"
                                      value={row.weight || ""}
                                      onChange={(e) => updateWeightRow(row.id, "weight", e.target.value)}
                                      style={{ width: "100%", fontSize: "13px", height: "32px" }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #dee2e6",
                                      padding: "6px 10px",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeWeightRow(row.id)}
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: "12px",
                                        borderRadius: "4px",
                                        border: "1px solid #dc3545",
                                        backgroundColor: "#fff",
                                        color: "#dc3545",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{ padding: "10px 14px", textAlign: "left", backgroundColor: "#f4f8ff" }}
                                >
                                  <button
                                    type="button"
                                    onClick={addWeightRow}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "13px",
                                      borderRadius: "4px",
                                      border: "1px solid #4a90e2",
                                      backgroundColor: "#4a90e2",
                                      color: "#fff",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Add Row
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Container Details Section - Only show for container-based calculations */}
        {!isWeightBased && showContainerDetails ? (
          <div className="container-details-section" style={{ margin: "20px 0", width: "100%" }}>
            <div
              className="controller-instructions-form-section"
              style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "4px" }}
            >
              <h4 style={{ marginBottom: "15px", color: "#0d6efd" }}>Container Details</h4>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ marginBottom: "0", backgroundColor: "white" }}>
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "15%" }}>Container Type</th>
                      <th style={{ width: "15%" }}>Container Number</th>
                      {(isExport || formData.shipmentTypeId === "2") && <th style={{ width: "15%" }}>File Reference</th>}
                      {(isImport || isExport || isCrossHaul) && <th style={{ width: "10%" }}>Weight</th>}
                      <th style={{ width: (isImport || isExport || isCrossHaul) ? "25%" : "40%" }}>Cargo Description</th>
                      <th style={{ width: "80px", textAlign: "center" }}>Hazardous</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Add Surcharges</th>
                      {allowVgmUI && (
                        <th style={{ width: "60px", textAlign: "center" }}>VGM</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id}>
                        <td>{container.id}</td>
                        <td>{container.containerType}</td>
                        <td>
                          <div style={{ position: "relative" }}>
                            <input
                              type="text"
                              className={`form-control form-control-sm ${containerFieldErrors[`container-${container.id}`] ? "is-invalid" : ""}`}
                              value={container.containerNum}
                              onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                              placeholder="Enter container number"
                              maxLength={20}
                              style={{
                                minWidth: "120px",
                                backgroundColor: containerFieldErrors[`container-${container.id}`]
                                  ? "#ffebee"
                                  : "white",
                                borderColor: containerFieldErrors[`container-${container.id}`] ? "#f44336" : "#ced4da",
                              }}
                            />
                            {containerFieldErrors[`container-${container.id}`] && (
                              <div
                                style={{
                                  position: "fixed",
                                  zIndex: 9999,
                                  backgroundColor: "#f44336",
                                  color: "white",
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                  transform: "translateY(4px)",
                                  pointerEvents: "none",
                                  maxWidth: "250px",
                                }}
                                ref={(el) => {
                                  if (el) {
                                    const input = el.previousElementSibling
                                    if (input) {
                                      const rect = input.getBoundingClientRect()
                                      el.style.left = `${rect.left}px`
                                      el.style.top = `${rect.bottom + 4}px`
                                    }
                                  }
                                }}
                              >
                                {containerFieldErrors[`container-${container.id}`]}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "-4px",
                                    left: "10px",
                                    width: "0",
                                    height: "0",
                                    borderLeft: "4px solid transparent",
                                    borderRight: "4px solid transparent",
                                    borderBottom: "4px solid #f44336",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        {(isExport || formData.shipmentTypeId === "2") && (
                          <td>
                            <div style={{ position: "relative" }}>
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`file-ref-${container.id}`] ? "is-invalid" : ""}`}
                                value={container.fileRef || ""}
                                onChange={(e) => handleContainerChange(container.id, "fileRef", e.target.value)}
                                placeholder="Enter file reference"
                                maxLength={20}
                                style={{
                                  minWidth: "120px",
                                  backgroundColor: containerFieldErrors[`file-ref-${container.id}`]
                                    ? "#ffebee"
                                    : "white",
                                  borderColor: containerFieldErrors[`file-ref-${container.id}`] ? "#f44336" : "#ced4da",
                                }}
                              />
                              {containerFieldErrors[`file-ref-${container.id}`] && (
                                <div
                                  style={{
                                    position: "fixed",
                                    zIndex: 9999,
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    padding: "6px 10px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                    transform: "translateY(4px)",
                                    pointerEvents: "none",
                                    maxWidth: "250px",
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const input = el.previousElementSibling
                                      if (input) {
                                        const rect = input.getBoundingClientRect()
                                        el.style.left = `${rect.left}px`
                                        el.style.top = `${rect.bottom + 4}px`
                                      }
                                    }
                                  }}
                                >
                                  {containerFieldErrors[`file-ref-${container.id}`]}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      left: "10px",
                                      width: "0",
                                      height: "0",
                                      borderLeft: "4px solid transparent",
                                      borderRight: "4px solid transparent",
                                      borderBottom: "4px solid #f44336",
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {(isImport || isExport || isCrossHaul) && (
                          <td>
                            <div style={{ position: "relative" }}>
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`weight-${container.id}`] ? "is-invalid" : ""}`}
                                value={container.weight || ""}
                                onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                                placeholder="Enter weight"
                                style={{
                                  minWidth: "80px",
                                  backgroundColor: containerFieldErrors[`weight-${container.id}`] ? "#ffebee" : "white",
                                  borderColor: containerFieldErrors[`weight-${container.id}`] ? "#f44336" : "#ced4da",
                                }}
                              />
                              {containerFieldErrors[`weight-${container.id}`] && (
                                <div
                                  style={{
                                    position: "fixed",
                                    zIndex: 9999,
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    padding: "6px 10px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                                    transform: "translateY(4px)",
                                    pointerEvents: "none",
                                    maxWidth: "250px",
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const input = el.previousElementSibling
                                      if (input) {
                                        const rect = input.getBoundingClientRect()
                                        el.style.left = `${rect.left}px`
                                        el.style.top = `${rect.bottom + 4}px`
                                      }
                                    }
                                  }}
                                >
                                  {containerFieldErrors[`weight-${container.id}`]}
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "-4px",
                                      left: "10px",
                                      width: "0",
                                      height: "0",
                                      borderLeft: "4px solid transparent",
                                      borderRight: "4px solid transparent",
                                      borderBottom: "4px solid #f44336",
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={container.cargoDescription}
                            onChange={(e) => handleContainerChange(container.id, "cargoDescription", e.target.value)}
                            placeholder="Enter cargo description"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={container.hazardous || false}
                              onChange={(e) => handleContainerChange(container.id, "hazardous", e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={container.addSurcharges || false}
                              onChange={(e) => handleContainerChange(container.id, "addSurcharges", e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </td>
                        {allowVgmUI && (
                          <td style={{ textAlign: "center" }}>
                            <div className="form-check" style={{ display: "flex", justifyContent: "center" }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={container.vgm || false}
                                onChange={(e) => handleContainerChange(container.id, "vgm", e.target.checked)}
                                style={{ cursor: "pointer" }}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
        <div className="controller-instructions-button-container" style={{ margin: "20px 0" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: "8px 24px",
              fontSize: "16px",
              fontWeight: "500",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              backgroundColor: "#4a90e2",
              borderColor: "#4a90e2",
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              "Submit Instruction"
            )}
          </button>
          {submitError && (
            <div className="alert alert-danger mt-3" role="alert" style={{ marginTop: "15px" }}>
              {submitError}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

export default ControllerInstructions



