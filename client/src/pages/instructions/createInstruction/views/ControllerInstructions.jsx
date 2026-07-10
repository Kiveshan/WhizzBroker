"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import {
  fetchRates as fetchRatesService,
  fetchSetRate as fetchSetRateService,
} from "../../../../services/instructionService"
import { useInstructionData } from "../../../../hooks/useInstructionData"
import { useContainerManagement } from "../../../../hooks/useContainerManagement"
import { useWeightRows } from "../../../../hooks/useWeightRows"
import { useCreateInstructionSubmit } from "../../../../hooks/useCreateInstructionSubmit"
import { useCreateFormHandlers } from "../../../../hooks/useCreateFormHandlers"
import { validateForm as validateFormUtil } from "../../../../utils/instructions/validation"
import { checkRateCountMismatch as checkRateCountMismatchUtil } from "../../../../utils/instructions/rateCountMismatch"
import { ControllerInstructionsLayout } from "./ControllerInstructionsLayout"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true)

  const vesselNameStyles = useMemo(
    () => ({
      container: { width: "150px", minWidth: "150px", maxWidth: "150px", margin: "0", padding: "0", flex: "0 0 150px", position: "relative", zIndex: 1 },
      input: { width: "100%", minWidth: "100%", maxWidth: "100%", padding: "6px 8px", fontSize: "0.9rem", height: "32px", boxSizing: "border-box", margin: "0", display: "block", flex: "0 0 100%", border: "1px solid #ced4da", borderRadius: "4px" },
      label: { fontSize: "0.85rem", marginBottom: "4px", display: "block" },
      wrapper: { padding: "4px 0", width: "100%", margin: "0" },
    }),
    [],
  )

  const preservedFormData = useMemo(() => location.state?.preservedFormData || null, [location.state])
  const containerCounts = useMemo(
    () => location.state?.containerCounts || { "6m": 0, "12m": 0, Abnormal: 0 },
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

  const [fieldErrors, setFieldErrors] = useState({})
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState("")

  const [clientStartingPoints, setClientStartingPoints] = useState([])
  const [clientDestinations, setClientDestinations] = useState([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [showNoRatesModal, setShowNoRatesModal] = useState(false)

  const [locationIsLoading, setIsLoading] = useState({ startingPoints: false, destinations: false })

  const { clients, shipmentTypes, isLoading: hookIsLoading } = useInstructionData({
    onError: (msg) => console.error("[CREATE] data load error:", msg),
    on404: () => setShowNoRatesModal(true),
  })

  const isLoading = {
    clients: hookIsLoading.clients,
    shipmentTypes: hookIsLoading.shipmentTypes,
    startingPoints: locationIsLoading.startingPoints,
    destinations: locationIsLoading.destinations,
  }

  const {
    weightRows,
    setWeightRows,
    weightRowsRef,
    addWeightRow,
    updateWeightRow,
  } = useWeightRows()

  const removeWeightRow = useCallback(
    (id) => setWeightRows((prev) => prev.filter((row) => row.id !== id)),
    [setWeightRows],
  )

  const [rateLockStatus, setRateLockStatus] = useState({ sixMeter: false, twelveMeter: false })
  const [rateFieldsEnabled, setRateFieldsEnabled] = useState({ sixMeter: false, twelveMeter: false, abnormal: false })

  const isFieldValid = useCallback(
    (fieldName, value) => {
      switch (fieldName) {
        case "clientId": case "shipmentTypeId": case "task": case "pickup": case "dropoff":
        case "pickupTime": case "pickupDate": case "deadline": case "bookingRef":
        case "fileRef": case "description":
          return value && value.trim() !== ""
        case "stackDate": case "vesselName":
          return !isCrossHaul ? value && value.trim() !== "" : true
        case "weight": case "unitrate":
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
      if (name === "imoNo" && value !== "" && !/^\d*$/.test(value)) return
      if (name === "flagReg" && value !== "" && !/^[A-Za-z\s]*$/.test(value)) return
      const newValue = type === "checkbox" ? checked : value
      setFormData((prev) => ({ ...prev, [name]: newValue }))
      if (fieldErrors[name] && isFieldValid(name, newValue)) {
        setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
      }
    },
    [fieldErrors, isFieldValid],
  )

  const [formData, setFormData] = useState(() => {
    const defaultFormData = {
      clientId: "", clientName: "", representative: "", contactDetails: "", email: "",
      task: "", shipmentTypeId: "", shipmentTypeName: "", startingPoints: [],
      destinations: [], selectedStartingPoint: "", selectedDestination: "",
      pickup: "", dropoff: "", surchargesAmount: "", stackDate: "", lastFreeDate: "",
      fileRef: "", bookingRef: "", vesselName: "", rateWeight: "Container", weight: "",
      vat: 15, description: "", rateper_6: "", rateper_12: "", abnormalRate: "",
      rateper_breakbulk: "", unitrate: "", setRateAmount: "", num_six_meters: 0,
      num_twelve_meters: 0, num_abnormal: 0, num_breakbulk: 0, total_cost: 0,
      preserveSurcharges: false, sixMeterRate: "", twelveMeterRate: "",
    }

    if (!preservedFormData && !location.state) return defaultFormData

    const locationData = {
      startingPoints: location.state?.startingPoints || preservedFormData?.startingPoints || [],
      destinations: location.state?.destinations || preservedFormData?.destinations || [],
      selectedStartingPoint: location.state?.selectedStartingPoint || preservedFormData?.selectedStartingPoint || preservedFormData?.pickup || location.state?.pickup || "",
      selectedDestination: location.state?.selectedDestination || preservedFormData?.selectedDestination || preservedFormData?.dropoff || location.state?.dropoff || "",
    }

    return {
      ...defaultFormData,
      ...preservedFormData,
      ...locationData,
      pickup: preservedFormData?.pickup || location.state?.pickup || location.state?.controllerData?.pickup || locationData.selectedStartingPoint || locationData.pickup || "",
      dropoff: preservedFormData?.dropoff || location.state?.dropoff || location.state?.controllerData?.dropoff || locationData.selectedDestination || locationData.dropoff || "",
      vat: preservedFormData && preservedFormData.vat !== undefined ? Number(preservedFormData.vat) : 15,
      total_cost: Number(preservedFormData?.total_cost) || 0,
    }
  })

  const isAddOn = formData.shipmentTypeId === "5"

  const {
    containers,
    setContainers,
    containersRef,
    containerFieldErrors,
    setContainerFieldErrors,
    initializeContainers,
    handleContainerChange,
  } = useContainerManagement({
    isImport,
    isExport,
    isCrossHaul,
    isWeightBased,
    clientId: formData.clientId,
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    shipmentTypeId: formData.shipmentTypeId,
    isAddOn,
    isReadOnly: false,
  })

  const showContainerDetails = containers.length > 0 && !isWeightBased
  const allowVgmUI = formData.shipmentTypeId !== "4"

  // ─── new hooks ───────────────────────────────────────────────────────────────

  const { submitInstruction, isSubmitting, submitError, setSubmitError } =
    useCreateInstructionSubmit({
      formData,
      containers,
      isWeightBased,
      isCrossHaul,
      isImport,
      isExport,
      isSetRate,
      isSetRateMode,
      isAddOn,
      allowVgmUI,
      setRateValue,
      containersRef,
      weightRowsRef,
      navigate,
    })

  const fetchRates = useCallback(async (clientId, start, destination) => {
    if (!clientId || !start || !destination) return null
    try {
      return await fetchRatesService(clientId, start, destination)
    } catch (error) {
      console.error("[fetchRates] Error fetching rates:", error)
      return null
    }
  }, [])

  const {
    handleClientChange,
    handlePickupChange,
    handleDropoffChange,
    handleShipmentTypeChange,
    handleContainerCountChange,
    openCalendar,
  } = useCreateFormHandlers({
    formData,
    setFormData,
    clients,
    shipmentTypes,
    initializeContainers,
    containersRef,
    setWeightRows,
    setFieldErrors,
    setRateLockStatus,
    setClientStartingPoints,
    setClientDestinations,
    setIsLoadingLocations,
    setIsLoading,
    setShowNoRatesModal,
  })

  // ─── validation ──────────────────────────────────────────────────────────────

  const validateForm = useCallback(() => {
    const { fieldErrors: fErrors } = validateFormUtil(formData, [], {
      mode: "create", isAddOn, isCrossHaul, isWeightBased, isSetRate, isSetRateMode,
    })
    return fErrors
  }, [formData, isCrossHaul, isWeightBased, isAddOn, isSetRate, isSetRateMode])

  const validateContainers = useCallback(() => {
    if (isAddOn || isWeightBased || isSetRateMode || !showContainerDetails || containers.length === 0) return true
    const errors = {}
    const containerNumbers = []
    let isValid = true
    const isExportShipment = isExport || formData.shipmentTypeId === "2"
    for (const container of containers) {
      const containerId = container.id
      if (!isExportShipment) {
        if (!container.containerNum || container.containerNum.trim() === "") {
          errors[`container-${containerId}`] = "Container number is required"
          isValid = false
        } else {
          const upper = container.containerNum.toUpperCase()
          if (containerNumbers.includes(upper)) {
            errors[`container-${containerId}`] = "Container number must be unique"
            isValid = false
          } else {
            containerNumbers.push(upper)
          }
        }
      }
      if (isImport && container.weight && typeof container.weight === "string" && container.weight.trim() !== "") {
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
  }, [isAddOn, isWeightBased, isSetRateMode, showContainerDetails, containers, isImport, isExport, formData.shipmentTypeId])

  const checkRateCountMismatch = useCallback(
    () => checkRateCountMismatchUtil(formData, { isAddOn, isWeightBased, isSetRateMode, isCrossHaul }),
    [formData, isAddOn, isWeightBased, isSetRateMode, isCrossHaul]
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      const errors = validateForm()
      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
      if (!isWeightBased && !isSetRateMode && showContainerDetails) {
        if (!validateContainers()) {
          const containerSection = document.querySelector(".container-details-section")
          if (containerSection) containerSection.scrollIntoView({ behavior: "smooth", block: "start" })
          return
        }
      }
      const { needsConfirmation, message } = checkRateCountMismatch()
      if (needsConfirmation) { setConfirmationMessage(message); setShowConfirmationPopup(true); return }
      await submitInstruction()
    },
    [validateForm, validateContainers, checkRateCountMismatch, isWeightBased, isSetRateMode, showContainerDetails, submitInstruction],
  )

  const handleConfirmSubmit = useCallback(async () => {
    setShowConfirmationPopup(false)
    await submitInstruction()
  }, [submitInstruction])

  const handleCancelSubmit = useCallback(() => setShowConfirmationPopup(false), [])

  // ─── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const weightBasedUnits = ["kg", "mÂ³", "ton"]
    const newIsWeightBased = weightBasedUnits.includes(formData.rateWeight)
    const newIsSetRateMode = formData.rateWeight === "SetRate"
    const newIsCrossHaul = formData.shipmentTypeId === "3" || formData.shipmentTypeId === "4"
    const newIsImport = formData.shipmentTypeId === "1"
    const newIsExport = formData.shipmentTypeId === "2"
    if (newIsWeightBased !== isWeightBased) setIsWeightBased(newIsWeightBased)
    if (newIsSetRateMode !== isSetRateMode) setIsSetRateMode(newIsSetRateMode)
    if (newIsCrossHaul !== isCrossHaul) setIsCrossHaul(newIsCrossHaul)
    if (newIsImport !== isImport) setIsImport(newIsImport)
    if (newIsExport !== isExport) setIsExport(newIsExport)
  }, [formData.rateWeight, formData.shipmentTypeId, isWeightBased, isCrossHaul, isImport, isExport, isSetRateMode])

  useEffect(() => {
    if (formData.shipmentTypeId === "5" && formData.rateWeight !== "Container") {
      setFormData((prev) => ({ ...prev, rateWeight: "Container" }))
    }
  }, [formData.shipmentTypeId, formData.rateWeight])

  useEffect(() => {
    const fetchSetRate = async () => {
      const { clientId, pickup, dropoff } = formData
      if (!isSetRate || !clientId || !pickup || !dropoff) return
      try {
        const data = await fetchSetRateService(clientId, pickup, dropoff)
        if (data && data.set_rate != null) {
          const n = Number(data.set_rate)
          setSetRateValue(Number.isNaN(n) ? 0 : n)
        } else {
          setSetRateValue(0)
        }
      } catch {
        setSetRateValue(0)
      }
    }
    fetchSetRate()
  }, [isSetRate, formData.clientId, formData.pickup, formData.dropoff])

  useEffect(() => {
    if (isWeightBased || isAddOn) { setRateLockStatus({ sixMeter: false, twelveMeter: false }); return }
    const { pickup, dropoff, clientId } = formData
    if (!clientId || !pickup || !dropoff) {
      setFormData((prev) => ({ ...prev, sixMeterRate: "", twelveMeterRate: "", abnormalRate: "", rateper_breakbulk: "", surchargesAmount: "" }))
      setRateLockStatus({ sixMeter: false, twelveMeter: false })
      return
    }
    const fetchAndUpdateRates = async () => {
      try {
        const rates = await fetchRates(clientId, pickup, dropoff)
        setFormData((prev) => {
          const updates = { ...prev }
          const newLock = { sixMeter: false, twelveMeter: false }
          if (rates) {
            if (rates.sixMeterRate != null && Number.parseFloat(rates.sixMeterRate) > 0) { updates.sixMeterRate = Number.parseFloat(rates.sixMeterRate).toFixed(2); newLock.sixMeter = true } else { updates.sixMeterRate = "" }
            if (rates.twelveMeterRate != null && Number.parseFloat(rates.twelveMeterRate) > 0) { updates.twelveMeterRate = Number.parseFloat(rates.twelveMeterRate).toFixed(2); newLock.twelveMeter = true } else { updates.twelveMeterRate = "" }
            updates.abnormalRate = rates.abnormalRate != null ? Number.parseFloat(rates.abnormalRate).toFixed(2) : ""
            updates.rateper_breakbulk = rates.rateper_breakbulk != null ? Number.parseFloat(rates.rateper_breakbulk).toFixed(2) : ""
          } else {
            updates.sixMeterRate = ""; updates.twelveMeterRate = ""; updates.abnormalRate = ""; updates.rateper_breakbulk = ""; updates.surchargesAmount = ""
          }
          setRateLockStatus(newLock)
          return updates
        })
      } catch {
        setFormData((prev) => ({ ...prev, sixMeterRate: "", twelveMeterRate: "", abnormalRate: "", rateper_breakbulk: "", surchargesAmount: "" }))
        setRateLockStatus({ sixMeter: false, twelveMeter: false })
      }
    }
    fetchAndUpdateRates()
  }, [formData.clientId, formData.pickup, formData.dropoff, fetchRates, isWeightBased, isAddOn])

  useEffect(() => {
    const newState = {
      sixMeter: formData.num_six_meters > 0,
      twelveMeter: formData.num_twelve_meters > 0,
      abnormal: formData.num_abnormal > 0,
      breakBulk: formData.num_breakbulk > 0,
    }
    if (JSON.stringify(rateFieldsEnabled) !== JSON.stringify(newState)) {
      setRateFieldsEnabled(newState)
    }
  }, [formData.num_six_meters, formData.num_twelve_meters, formData.num_abnormal, formData.num_breakbulk, rateFieldsEnabled])

  // ─── display values ──────────────────────────────────────────────────────────

  const nonEditableStyle = useMemo(() => ({ backgroundColor: "#f5f5f5", cursor: "not-allowed" }), [])
  const disabledRateStyle = useMemo(() => ({ backgroundColor: "#f5f5f5", color: "rgba(0, 0, 0, 0.38)", cursor: "not-allowed" }), [])

  const spinnerKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `

  const isLoadingComplete = !isLoading.clients && !isLoading.shipmentTypes
  const hasDataFailure = isLoadingComplete && (clients.length === 0 || shipmentTypes.length === 0)

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <ControllerInstructionsLayout
      spinnerKeyframes={spinnerKeyframes}
      showConfirmationPopup={showConfirmationPopup}
      confirmationMessage={confirmationMessage}
      handleConfirmSubmit={handleConfirmSubmit}
      handleCancelSubmit={handleCancelSubmit}
      showNoRatesModal={showNoRatesModal}
      setShowNoRatesModal={setShowNoRatesModal}
      isLoadingLocations={isLoadingLocations}
      isLoadingComplete={isLoadingComplete}
      hasDataFailure={hasDataFailure}
      handleSubmit={handleSubmit}
      formData={formData}
      setFormData={setFormData}
      clients={clients}
      fieldErrors={fieldErrors}
      setFieldErrors={setFieldErrors}
      fieldRefs={fieldRefs}
      handleClientChange={handleClientChange}
      handlePickupChange={handlePickupChange}
      clientStartingPoints={clientStartingPoints}
      handleDropoffChange={handleDropoffChange}
      clientDestinations={clientDestinations}
      isLoading={isLoading}
      isWeightBased={isWeightBased}
      isSetRateMode={isSetRateMode}
      isSetRate={isSetRate}
      setIsSetRate={setIsSetRate}
      setRateValue={setRateValue}
      rateFieldsEnabled={rateFieldsEnabled}
      rateLockStatus={rateLockStatus}
      handleInputChange={handleInputChange}
      handleShipmentTypeChange={handleShipmentTypeChange}
      handleContainerCountChange={handleContainerCountChange}
      shipmentTypes={shipmentTypes}
      isCrossHaul={isCrossHaul}
      isImport={isImport}
      isExport={isExport}
      isAddOn={isAddOn}
      lastFreeDateRef={lastFreeDateRef}
      etaDateRef={etaDateRef}
      today={today}
      showContainerDetails={showContainerDetails}
      allowVgmUI={allowVgmUI}
      containers={containers}
      containerFieldErrors={containerFieldErrors}
      handleContainerChange={handleContainerChange}
      isSubmitting={isSubmitting}
      submitError={submitError}
      weightRows={weightRows}
      updateWeightRow={updateWeightRow}
      removeWeightRow={removeWeightRow}
      addWeightRow={addWeightRow}
      vesselNameStyles={vesselNameStyles}
      nonEditableStyle={nonEditableStyle}
      disabledRateStyle={disabledRateStyle}
      navigate={navigate}
      openCalendar={openCalendar}
    />
  )
}

export default ControllerInstructions
