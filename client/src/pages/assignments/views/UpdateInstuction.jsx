
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/UpdateInstruction.css";
import api from "../../../api";
import { authFetch } from "../../../utils/authFetch.js";
import InvoicePreviewModal from "../../invoices/views/InviewPreviewModal.jsx";
import { API_BASE_URL, modalAnimation } from "./UpdateInstruction/constants";
import {
  normalizeString,
  dedupeDrivers,
  debugDriverData,
  calculateLegDriverRate,
  isAbnormalContainer,
  isTwelveMeterContainer,
} from "./UpdateInstruction/utils";
import LegTabsBar from "./UpdateInstruction/components/LegTabsBar";
import RouteHeader from "./UpdateInstruction/components/RouteHeader";
import DriversSection from "./UpdateInstruction/components/DriversSection";
import SummaryModal from "./UpdateInstruction/components/SummaryModal";
import {
  fetchAllContainers as fetchAllContainersData,
  fetchContainersForInstruction as fetchContainersForInstructionData,
} from "./UpdateInstruction/data/containers";
import {
  fetchDrivers as fetchDriversData,
  fetchTruckRegNums as fetchTruckRegNumsData,
} from "./UpdateInstruction/data/resources";
import {
  fetchStartingPoints as fetchStartingPointsData,
  fetchDestinations as fetchDestinationsData,
} from "./UpdateInstruction/data/locations";
import {
  checkIfWeightBased as checkIfWeightBasedData,
  fetchShipmentType as fetchShipmentTypeData,
  fetchDnOptions as fetchDnOptionsData,
} from "./UpdateInstruction/data/instruction";
import { fetchRate as fetchRateService } from "./UpdateInstruction/services/ratesService";
import {
  refreshLegData as refreshLegDataService,
  fetchLegsForInstruction as fetchLegsForInstructionService,
} from "./UpdateInstruction/services/legsService";
import { handleSave as handleSaveService } from "./UpdateInstruction/services/saveService";
import {
  checkContainersReachDropoff as checkContainersReachDropoffService,
  hasContainerReachedDropoff as hasContainerReachedDropoffService,
  hasUnsavedChanges as hasUnsavedChangesService,
} from "./UpdateInstruction/services/validationService";
import {
  handleFinaliseClick as handleFinaliseClickService,
  navigateToDocuments as navigateToDocumentsService,
} from "./UpdateInstruction/services/finaliseService";
import {
  handleAddLeg as handleAddLegHandler,
  handleSelectLeg as handleSelectLegHandler,
} from "./UpdateInstruction/handlers/legsHandlers";
import {
  ContainerWarningModal,
  MissingFieldsModal,
  NoDriversModal,
  UnsavedChangesModal,
  ContainerReachedDropoffModal,
} from "./UpdateInstruction/modals/ValidationModals";
import {
  BackConfirmModal,
  RemoveDriverConfirmModal,
  RemoveLegConfirmModal,
  DuplicateDriverModal,
} from "./UpdateInstruction/modals/ConfirmModals";

function UpdateInstruction() {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId || null;
  const selectedLegIndex = location.state?.selectedLegIndex;

  // Add a ref to track if we're coming from the documents page
  const isFromDocumentsPage = useRef(selectedLegIndex !== undefined);

  // Add a ref to the Add Driver button for positioning the modal
  const addDriverButtonRef = useRef(null);

  // Guard ref to prevent concurrent saves and track last-saved payload
  const isSavingRef = useRef(false);
  const lastSavedLegRef = useRef(null);

  const [drivers, setDrivers] = useState([]);
  const [legs, setLegs] = useState([]);
  const legsRef = useRef([]);
  const [currentLagIndex, setCurrentLagIndex] = useState(null);
  const [formData, setFormData] = useState({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });
  const [startingPoints, setStartingPoints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [rateError, setRateError] = useState("");
  const [employeeDrivers, setEmployeeDrivers] = useState([]);
  const [truckRegOptions, setTruckRegOptions] = useState([]);
  const [containerOptions, setContainerOptions] = useState([]);
  const [hasUnsavedNewLeg, setHasUnsavedNewLeg] = useState(false);
  const [containerDetailsMap, setContainerDetailsMap] = useState({}); // Map to store container details by number
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [existingDrivers, setExistingDrivers] = useState([]);
  const [noRatesRoutes, setNoRatesRoutes] = useState(new Set());
  // Add a visual indicator for edited fields
  const [editedFields, setEditedFields] = useState({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {}, // Change from array to object to track changes by driver ID
  });
  // Flag to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(location.state?.isCompleted ?? false);
  const [shipmentType, setShipmentType] = useState(null);
  // KSM DN Numbers (from the weight table) for the per-driver DN dropdown on
  // cross-haul break bulk (shipment type 4).
  const [dnOptions, setDnOptions] = useState([]);
  // New state for container validation
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerValidationDetails, setContainerValidationDetails] = useState({
    missingContainers: [],
    dropoff: "",
  });
  const [instructionContainers, setInstructionContainers] = useState([]);
  const [isLegSwitching, setIsLegSwitching] = useState(false);
  // New state for unsaved changes modal
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  // Add state for missing fields modal
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  // New state for pickup validation
  const [showPickupMismatchModal, setShowPickupMismatchModal] = useState(false);
  const [pickupMismatchDetails, setPickupMismatchDetails] = useState({
    firstLegStartingPoint: "",
    pickup: "",
  });
  // Add state for no drivers modal
  const [showNoDriversModal, setShowNoDriversModal] = useState(false);
  // Add state for back button confirmation modal
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);

  // Add state for driver removal confirmation modal
  const [showRemoveDriverModal, setShowRemoveDriverModal] = useState(false);
  const [driverToRemove, setDriverToRemove] = useState({
    index: null,
    name: "",
  });
  // Add after the driverToRemove state
  const [showRemoveLegModal, setShowRemoveLegModal] = useState(false);
  const [legToRemove, setLegToRemove] = useState({
    index: null,
    number: null,
    id: null,
  });
  const [instructionStatus, setInstructionStatus] = useState("");
  // Add this state variable at the top with other state variables
  const [shouldHideAddLegButton, setShouldHideAddLegButton] = useState(false);
const [hasProcessedSelectedLeg, setHasProcessedSelectedLeg] = useState(false);
  // Add this state variable with the other state variables
  const [showDuplicateDriverModal, setShowDuplicateDriverModal] =
    useState(false);
  const [duplicateDriverInfo, setDuplicateDriverInfo] = useState(null);
  const [rateWeight, setRateWeight] = useState(null);
const [isWeightBased, setIsWeightBased] = useState(false);
const [weightUnit, setWeightUnit] = useState('kg');
  // Add this state for container already reached dropoff modal
  const [showContainerReachedModal, setShowContainerReachedModal] =
    useState(false);
  const [containerReachedDetails, setContainerReachedDetails] = useState({
    containerNumber: "",
  });

  // Summary overlay state (moved from UploadInstructionDocuments)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  // Invoice preview modal state
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Add a new state variable to track which legs have been saved
  // Add this after the other state variables (around line 200)
  const [savedLegs, setSavedLegs] = useState(new Set());
  // Guard for leg switching to avoid stale updates
  const legSwitchIdRef = useRef(0);
  const currentLegIndexRef = useRef(null);

  // Add these state variables after the other state declarations
  const [rates, setRates] = useState({
    six_meter: 0,
    twelve_meter: 0,
    subbie_six_meter: 0,
    subbie_twelve_meter: 0,
  });
  const ratesRouteKeyRef = useRef(null);

  // Representative date used for rate pre-population when starting point or destination changes.
  // Seeded from the leg's first driver date on leg switch so new route selections use the
  // historically correct rate period rather than defaulting to today.
  const [legRouteDate, setLegRouteDate] = useState("");

  const handleMoveLeg = async (fromIndex, toIndex) => {
    if (isCompleted) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= legsRef.current.length || toIndex >= legsRef.current.length) return;

    if (currentLagIndex !== null && currentLagIndex >= 0 && currentLagIndex < legsRef.current.length) {
      const updatedLegsSnapshot = [...legsRef.current];
      updatedLegsSnapshot[currentLagIndex] = {
        ...updatedLegsSnapshot[currentLagIndex],
        startingPoint: formData.startingPoint,
        destination: formData.destination,
        driverRate: formData.driverRate,
        drivers: JSON.parse(JSON.stringify(drivers)),
      };
      setLegs(updatedLegsSnapshot);
      legsRef.current = updatedLegsSnapshot;
    }

    const prevLegs = [...legsRef.current];
    const nextLegs = [...prevLegs];
    const tmp = nextLegs[fromIndex];
    nextLegs[fromIndex] = nextLegs[toIndex];
    nextLegs[toIndex] = tmp;

    const renumberedLegs = nextLegs.map((leg, idx) => ({
      ...leg,
      legnumber: idx + 1,
    }));

    const nextCurrentIndex = (() => {
      if (currentLagIndex === null || currentLagIndex === undefined) return currentLagIndex;
      if (currentLagIndex === fromIndex) return toIndex;
      if (currentLagIndex === toIndex) return fromIndex;
      return currentLagIndex;
    })();

    setLegs(renumberedLegs);
    legsRef.current = renumberedLegs;
    setCurrentLagIndex(nextCurrentIndex);
    currentLegIndexRef.current = nextCurrentIndex;

    setSavedLegs((prev) => {
      const newSet = new Set();
      prev.forEach((idx) => {
        if (idx === fromIndex) newSet.add(toIndex);
        else if (idx === toIndex) newSet.add(fromIndex);
        else newSet.add(idx);
      });
      return newSet;
    });

    if (instructionId) {
      try {
        const savedLegsOnly = renumberedLegs.filter(
          (leg) => leg?.id && !leg.id.toString().startsWith("temp-")
        );

        // Phase 1: move to a temporary range to avoid unique/collision issues during swaps
        await Promise.all(
          savedLegsOnly.map((leg, idx) =>
            api.put(`/legs/${leg.id}/update-number`, { legnumber: 1000 + idx + 1 })
          )
        );

        // Phase 2: apply final 1..n numbering
        await Promise.all(
          savedLegsOnly.map((leg, idx) =>
            api.put(`/legs/${leg.id}/update-number`, { legnumber: idx + 1 })
          )
        );

        await refreshLegData();
      } catch (error) {
        console.error("Error updating leg numbers after reordering:", error);
      }
    }
  };

  useEffect(() => {
    legsRef.current = legs;
  }, [legs]);
  const checkIfWeightBased = async () => {
    return checkIfWeightBasedData({
      api,
      instructionId,
      setRateWeight,
      setIsWeightBased,
      setWeightUnit,
    });
  };
  // Improve the refreshLegData function to ensure data is properly refreshed
  // Update refreshLegData function to use Axios
  const refreshLegData = async () => {
    return refreshLegDataService({
      api,
      instructionId,
      legSwitchIdRef,
      currentLegIndexRef,
      legsRef,
      setLegs,
      setSavedLegs,
      setFormData,
      setDrivers,
      debugDriverData,
    });
  };
  // Add this function to handle leg removal
  // Update handleRemoveLeg to use Axios
  const handleRemoveLeg = async (legIndex, legId) => {

    setLegToRemove({
      index: legIndex,
      number: legIndex + 1,
      id: legId,
    });
    setShowRemoveLegModal(true);
  };
useEffect(() => {
  const fetchData = async () => {
    try {
      await fetchDrivers();
      await fetchTruckRegNums();
      await fetchShipmentType();
      await checkIfWeightBased();
      await fetchDnOptions();
      if (instructionId) {
        await fetchContainersForInstruction(instructionId);
        await fetchLegsForInstruction(instructionId);
        await fetchStartingPoints();
        await fetchDestinations();
        setInitialDataLoaded(true);
      } else {
        await fetchStartingPoints();
        await fetchDestinations();
        await fetchAllContainers();
        setInitialDataLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setInitialDataLoaded(true);
    }
  };

  fetchData();

  return () => {
    // Enhanced cleanup function
    console.log("Cleaning up UpdateInstruction component - clearing all state");
    
    // Clear all component state
    setDrivers([]);
    setCurrentLagIndex(null);
    isFromDocumentsPage.current = false;
    setHasProcessedSelectedLeg(false); // UNCOMMENT this line
    
    // Clear localStorage
    if (instructionId) {
      localStorage.removeItem(`instruction_${instructionId}_state`);
      console.log("Cleared localStorage for instruction:", instructionId);
    }
  };
}, [instructionId]);
useEffect(() => {
  // Only run this effect once when the component mounts with a selectedLegIndex
  if (initialDataLoaded && selectedLegIndex !== undefined && legs.length > 0 && !hasProcessedSelectedLeg) {
    console.log(`Selecting leg at index ${selectedLegIndex} after navigation`);
    // Make sure the selectedLegIndex is valid
    if (selectedLegIndex < legs.length) {
      // Force a clean state before selecting the leg
      setCurrentLagIndex(null);
      setDrivers([]);
      // Use setTimeout to ensure this happens after the current render cycle
      setTimeout(() => {
        handleSelectLeg(selectedLegIndex);
        setHasProcessedSelectedLeg(true); // Mark as processed
      }, 0);
    } else {
      console.error(`Selected leg index ${selectedLegIndex} is out of bounds (max: ${legs.length - 1})`);
    }
  }
}, [initialDataLoaded, legs.length, selectedLegIndex, hasProcessedSelectedLeg]);

  // Replace the fetchLegsForInstruction function with this updated version
  // Update fetchInstructionDetails in useEffect
  useEffect(() => {
    const fetchInstructionDetails = async () => {
      if (location.state?.isCompleted !== undefined) {
        setIsCompleted(location.state.isCompleted);
      } else if (instructionId) {
        try {
          const response = await api.get(`/instructions/${instructionId}`);
          const data = response.data;
          setIsCompleted(data.is_completed || data.status === "Completed");
          setInstructionStatus(data.status);
        } catch (error) {
          console.error("Error fetching instruction details:", error);
        }
      }
    };

    fetchInstructionDetails();
  }, [instructionId, location.state]);

  // In the fetchLegsForInstruction function in UpdateInstruction.jsx
  // Update fetchLegsForInstruction to use Axios
  const fetchLegsForInstruction = async (instructionId) => {
    return fetchLegsForInstructionService({
      api,
      instructionId,
      setLegs,
      setSavedLegs,
      setExistingDrivers,
      currentLagIndex,
      selectedLegIndex,
      setCurrentLagIndex,
      setFormData,
      setDrivers,
      debugDriverData,
      setInstructionContainers,
      setContainerDetailsMap,
      setContainerOptions,
    });
  };

  const fetchAllContainers = async () => {
    return fetchAllContainersData({ api, setContainerOptions });
  };

  const fetchContainersForInstruction = async (instructionId) => {
    return fetchContainersForInstructionData({
      api,
      instructionId,
      isWeightBased,
      setInstructionContainers,
      setContainerDetailsMap,
      setContainerOptions,
      fetchAllContainersFallback: fetchAllContainers,
    });
  };

  const fetchDrivers = async () => {
    return fetchDriversData({ api, setEmployeeDrivers });
  };

  const fetchTruckRegNums = async () => {
    return fetchTruckRegNumsData({ api, setTruckRegOptions });
  };

  const fetchStartingPoints = async () => {
    return fetchStartingPointsData({
      api,
      instructionId,
      setStartingPoints,
    });
  };

  const fetchDestinations = async () => {
    return fetchDestinationsData({
      api,
      instructionId,
      setDestinations,
    });
  };

  // Update the fetchRate function to return a Promise so we can chain .then() calls
  // Update fetchRate to use Axios
  const fetchRate = async (startingPoint, destination, targetLegIndex = currentLagIndex, requestId = legSwitchIdRef.current, legDate = null, skipDriverUpdate = false) => {
    return fetchRateService({
      api,
      startingPoint,
      destination,
      targetLegIndex,
      requestId,
      currentLagIndex,
      shipmentType,
      isCompleted,
      noRatesRoutes,
      setNoRatesRoutes,
      setRateError,
      legSwitchIdRef,
      currentLegIndexRef,
      setFormData,
      setDrivers,
      setLegs,
      legs,
      employeeDrivers,
      setRates,
      ratesRouteKeyRef,
      legDate,
      skipDriverUpdate,
    });
  };

  const addDriver = () => {
    if (currentLagIndex === null || isCompleted) return;

const newDriver = {
  id: Date.now(),
  driverid: "",
  truckregnumber: "",
  containernumber: "",
  container_type: "",
  date: "",
  dn: "",
  driverRate: isWeightBased ? "0" : "",
  isAbnormal: false,
};

    // Add the new driver
    setDrivers((prevDrivers) => [...prevDrivers, newDriver]);
  };

  const handleAddLeg = () => {
    return handleAddLegHandler({
      isCompleted,
      currentLagIndex,
      legs,
      drivers,
      formData,
      hasUnsavedChanges,
      setShowUnsavedChangesModal,
      setLegs,
      instructionId,
      legsRef,
      setCurrentLagIndex,
      currentLegIndexRef,
      setFormData,
      setDrivers,
      setEditedFields,
      setSavedLegs,
      setHasUnsavedNewLeg,
      setSavedMessage,
    });
  };

  const handleSelectLeg = (index) => {
    return handleSelectLegHandler({
      index,
      currentLagIndex,
      isCompleted,
      legs,
      formData,
      drivers,
      setLegs,
      legSwitchIdRef,
      currentLegIndexRef,
      setCurrentLagIndex,
      setFormData,
      ratesRouteKeyRef,
      setDrivers,
      setEditedFields,
      noRatesRoutes,
      setNoRatesRoutes,
      setRates,
      fetchRate,
      debugDriverData,
    });
  };
  // Replace the handleStartingPointChange function with this updated version
  // Replace the handleStartingPointChange function with this updated version
  const handleStartingPointChange = (e) => {
    if (isCompleted) return;

    const startingPoint = e.target.value;
    // Clear any previous error message when making a new selection
    setRateError("");

    const updatedFormData = {
      ...formData,
      startingPoint,
    };
    setFormData(updatedFormData);

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      startingPoint: true,
    }));

    // If both starting point and destination are selected, fetch the rate
    // Skip automatic rate logic for shipment type 4 (cross-haul break bulk)
    if (shipmentType !== 4 && startingPoint && formData.destination) {
      // Force a fresh rate fetch when route changes
      console.log("Route changed, fetching new rates...");

      // Reset rates to 0 immediately when changing route
      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => {
          const newDriver = { ...driver };

          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;

          // Check if this route has no rates
          const routeKey = `${startingPoint}-${formData.destination}`;
          if (noRatesRoutes.has(routeKey)) {
            newDriver.driverRate = "0";
            console.log(
              `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
            );
            return newDriver;
          }

          if (newDriver.container_type === "12m") {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_twelve_meter
                ? rates.subbie_twelve_meter.toString()
                : "0"
              : rates.twelve_meter
              ? rates.twelve_meter.toString()
              : "0";
          } else if (newDriver.container_type === "abnormal") {
            // For abnormal container types, keep existing rate or set to 0
            if (!newDriver.driverRate) {
              newDriver.driverRate = "0";
            }
            newDriver.isAbnormal = true; // Mark as abnormal to allow editing
          } else {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_six_meter
                ? rates.subbie_six_meter.toString()
                : "0"
              : rates.six_meter
              ? rates.six_meter.toString()
              : "0";
          }

          return newDriver;
        });

        setDrivers(updatedDrivers);
      }

      // Then fetch new rates, using legRouteDate so the correct rate period is loaded
      fetchRate(startingPoint, formData.destination, currentLagIndex, legSwitchIdRef.current, legRouteDate || null);
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs];
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        startingPoint,
      };
      setLegs(updatedLegs);
    }
  };

  // Replace the handleDestinationChange function with this updated version
  // Replace the handleDestinationChange function with this updated version
  const handleDestinationChange = (e) => {
    if (isCompleted) return;

    const destination = e.target.value;
    setRateError("");

    const updatedFormData = {
      ...formData,
      destination,
    };
    setFormData(updatedFormData);

    // Mark this field as edited
    setEditedFields((prev) => ({
      ...prev,
      destination: true,
    }));

    // If both starting point and destination are selected, fetch the rate
    // Skip automatic rate logic for shipment type 4 (cross-haul break bulk)
    if (shipmentType !== 4 && formData.startingPoint && destination) {
      // Force a fresh rate fetch when route changes
      console.log("Route changed, fetching new rates...");

      // Reset rates to 0 immediately when changing route
      setRates({
        six_meter: 0,
        twelve_meter: 0,
        subbie_six_meter: 0,
        subbie_twelve_meter: 0,
      });

      // Update driver rates to 0 immediately
      // Force update driver rates based on the new rates
      if (drivers.length > 0) {
        const updatedDrivers = drivers.map((driver) => {
          const newDriver = { ...driver };

          // Check if driver is a subcontractor (roleid = 6)
          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;

          // Check if this route has no rates
          const routeKey = `${formData.startingPoint}-${destination}`;
          if (noRatesRoutes.has(routeKey)) {
            newDriver.driverRate = "0";
            console.log(
              `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
            );
            return newDriver;
          }

          if (newDriver.container_type === "12m") {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_twelve_meter
                ? rates.subbie_twelve_meter.toString()
                : "0"
              : rates.twelve_meter
              ? rates.twelve_meter.toString()
              : "0";
          } else if (newDriver.container_type === "abnormal") {
            // For abnormal container types, keep existing rate or set to 0
            if (!newDriver.driverRate) {
              newDriver.driverRate = "0";
            }
            newDriver.isAbnormal = true; // Mark as abnormal to allow editing
          } else {
            newDriver.driverRate = isSubcontractor
              ? rates.subbie_six_meter
                ? rates.subbie_six_meter.toString()
                : "0"
              : rates.six_meter
              ? rates.six_meter.toString()
              : "0";
          }

          return newDriver;
        });

        setDrivers(updatedDrivers);
      }

      fetchRate(formData.startingPoint, destination, currentLagIndex, legSwitchIdRef.current, legRouteDate || null);
    }

    // Update the current leg if one is selected
    if (currentLagIndex !== null) {
      const updatedLegs = [...legs];
      updatedLegs[currentLagIndex] = {
        ...updatedLegs[currentLagIndex],
        destination,
      };
      setLegs(updatedLegs);
    }
  };

  // Handle driver date change — fetch only for the specific driver that changed.
  // Using a shared rates state here would overwrite all other drivers' rates,
  // which breaks legs where different drivers straddle a rate change boundary.
  // silent=true is used by the leg-entry refresh loop so individual driver calls
  // don't flicker the banner mid-loop. The loop sets the banner once after all
  // drivers are checked. silent=false (default) is normal user-interaction behaviour.
  const handleDriverDateChange = useCallback(async (driverIndex, newDate, silent = false) => {
    console.log(`[handleDriverDateChange] Driver ${driverIndex}, new date: ${newDate}`);
    console.log(`[handleDriverDateChange] Route: ${formData.startingPoint} -> ${formData.destination}`);

    if (!formData.startingPoint || !formData.destination || !newDate) {
      console.log("[handleDriverDateChange] Missing required data, returning early");
      return { hadError: false };
    }

    // Capture the current leg switch ID so we can discard the response if the
    // user switches legs before it arrives (bad-connection race condition guard).
    const requestLegId = legSwitchIdRef.current;

    try {
      console.log("[handleDriverDateChange] Making API call...");
      const response = await api.get("/api/driver-rates-with-subbie", {
        params: {
          startingpoint: formData.startingPoint,
          destination: formData.destination,
          legDate: newDate,
        },
      });

      // Discard if the user has switched to a different leg while this was in flight.
      if (legSwitchIdRef.current !== requestLegId) return { hadError: false };

      const data = response.data;
      console.log("[handleDriverDateChange] Rate fetch success:", data);
      if (!silent) setRateError(""); // Clear any previous rate error

      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || !prevDrivers[driverIndex]) return prevDrivers;
        const driver = prevDrivers[driverIndex];

        // Abnormal rates are manually entered — never auto-update them.
        if (isAbnormalContainer(driver.container_type)) return prevDrivers;

        const isSubcontractor =
          employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
            ?.roleid === 6;

        let newRate;
        if (isTwelveMeterContainer(driver.container_type)) {
          newRate = isSubcontractor
            ? data.subie_twelve_meter_rate
            : data.driver_twelve_meter_rate;
        } else {
          newRate = isSubcontractor
            ? data.subie_six_meter_rate
            : data.driver_six_meter_rate;
        }

        const updated = [...prevDrivers];
        updated[driverIndex] = {
          ...driver,
          driverRate: newRate != null ? newRate.toString() : "0",
          _rateEffectiveFrom: data.effective_from || null,
          _rateEffectiveTo: data.effective_to || null,
          _rateExplicitlyZero: false, // Clear the flag when valid rate is found
        };
        return updated;
      });
      return { hadError: false };
    } catch (error) {
      // Discard if the user has switched to a different leg while this was in flight.
      if (legSwitchIdRef.current !== requestLegId) return { hadError: false };

      console.log("[handleDriverDateChange] CATCH BLOCK ENTERED");
      console.log("[handleDriverDateChange] Error:", error);
      console.log("[handleDriverDateChange] Error.response:", error.response);
      console.log("[handleDriverDateChange] Error.response?.status:", error.response?.status);
      console.log("[handleDriverDateChange] Error.message:", error.message);

      if (error.response?.status === 404) {
        console.log("[handleDriverDateChange] 404 DETECTED - setting rate error and zero rate");
        const errorMsg =
          `No driver rate found for the selected date. ` +
          `There is no active rate effective on ${newDate}. ` +
          `Please check rate configuration or select a different date.`;
        if (!silent) setRateError(errorMsg);

        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || !prevDrivers[driverIndex]) return prevDrivers;
          const updated = [...prevDrivers];
          updated[driverIndex] = {
            ...updated[driverIndex],
            driverRate: "0",
            _rateEffectiveFrom: null,
            _rateEffectiveTo: null,
            _rateExplicitlyZero: true, // Flag to prevent useEffect from overwriting
          };
          console.log("Updated driver with zero rate:", updated[driverIndex]);
          return updated;
        });
        return { hadError: true, errorMsg };
      }
      console.error("Error fetching rate for date change (non-404):", error);
      return { hadError: false };
    }
  // Deps: re-create only when the route or driver-role data changes so the
  // useEffect([isLegSwitching]) refresh loop always closes over current values.
  }, [formData.startingPoint, formData.destination, employeeDrivers]);

  // Replace the handleBackClick function with this version
const handleBackClick = () => {
  // Clear any localStorage state that might interfere
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  
  // Reset navigation flag
  isFromDocumentsPage.current = false;
  
  // Save current leg data before checking for unsaved changes
  if (currentLagIndex !== null && !isCompleted) {
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      ...formData,
      drivers: [...drivers],
    };
    setLegs(updatedLegs);
  }

  // Check if there are unsaved changes
  if (hasUnsavedChanges()) {
    // Show confirmation modal
    setShowBackConfirmModal(true);
  } else {
    // No unsaved changes, navigate directly
    navigateBack();
  }
};
  // Helper function to navigate back
const navigateBack = () => {
  // Clear all state before navigation
  setCurrentLagIndex(null);
  setDrivers([]);
  setFormData({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });
  
  // Clear localStorage
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  
  // Force a clean navigation state
  navigate("/instructions", {
    state: { 
      clientId,
      timestamp: Date.now() // Force new state
    },
    replace: true,
  });
};

  // Function to check if all containers reach the dropoff destination
  const checkContainersReachDropoff = async (dropoff) => {
    return checkContainersReachDropoffService({
      legs,
      normalizeString,
      dropoff,
      isWeightBased,
      api,
      instructionId,
      weightUnit,
      instructionContainers,
    });
  };

  const hasContainerReachedDropoff = (containerNumber) => {
    return hasContainerReachedDropoffService({
      containerNumber,
      legs,
      instructionContainers,
      normalizeString,
    });
  };

  const hasUnsavedChanges = () => {
    return hasUnsavedChangesService({
      currentLagIndex,
      legs,
      savedLegs,
      editedFields,
      drivers,
    });
  };

  const navigateToDocuments = () => {
    return navigateToDocumentsService({
      instructionId,
      setHasProcessedSelectedLeg,
      isFromDocumentsPage,
      navigate,
      clientId,
      isCompleted,
      shipmentType,
    });
  };

  const handleFinaliseClick = async () => {
    return handleFinaliseClickService({
      legs,
      navigateToDocuments,
      setShowNoDriversModal,
      hasUnsavedChanges,
      setShowUnsavedChangesModal,
      API_BASE_URL,
      instructionId,
      checkContainersReachDropoff,
      isWeightBased,
      weightUnit,
      setContainerValidationDetails,
      setShowContainerModal,
    });
  };
  const fetchShipmentType = async () => {
    return fetchShipmentTypeData({ API_BASE_URL, instructionId, setShipmentType });
  };

  const fetchDnOptions = async () => {
    return fetchDnOptionsData({ api, instructionId, setDnOptions });
  };

  // Function to validate driver fields
  const validateDriverFields = () => {
    if (!drivers || drivers.length === 0) return true;

    const missing = [];

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      const driverNum = i + 1;

      if (!driver.driverid) {
        missing.push(`Driver ${driverNum}: Driver selection is required`);
      }

      if (!driver.truckregnumber) {
        missing.push(
          `Driver ${driverNum}: Truck registration number is required`
        );
      }

      if (!driver.containernumber) {
        missing.push(`Driver ${driverNum}: Container number is required`);
      }

      if (!driver.date) {
        missing.push(`Driver ${driverNum}: Date is required`);
      }
    }

    if (missing.length > 0) {
      setMissingFields(missing);
      setShowMissingFieldsModal(true);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    return handleSaveService({
      isSavingRef,
      currentLegIndexRef,
      currentLagIndex,
      isCompleted,
      saving,
      setSavedMessage,
      instructionId,
      API_BASE_URL,
      setInstructionStatus,
      formData,
      validateDriverFields,
      setSaving,
      setLegs,
      legs,
      drivers,
      dedupeDrivers,
      isWeightBased,
      instructionContainers,
      setHasUnsavedNewLeg,
      setSavedLegs,
      setEditedFields,
      refreshLegData,
      rates,
      shipmentType,
      employeeDrivers,
      calculateLegDriverRate,
      setDrivers,
      api,
    });
  };

  const getDriverName = (driverId) => {
    const driver = employeeDrivers.find(
      (d) => d.userid.toString() === driverId
    );
    return driver ? `${driver.name} ${driver.surname}` : "Unknown Driver";
  };

const shouldDisableAddLeg = async () => {
  if (isCompleted) return true;
  if (legs.length === 0) return false;

  try {
    const response = await authFetch(`${API_BASE_URL}/instructions/${instructionId}/details`);
    if (!response.ok) return false;

    const instructionDetails = await response.json();
    const dropoff = instructionDetails.dropoff;

    if (!dropoff) return false;
    const missingItems = await checkContainersReachDropoff(dropoff);
    return missingItems.length === 0;
  } catch (error) {
    console.error("Error in shouldDisableAddLeg:", error);
    return false;
  }
};

  useEffect(() => {
const checkContainersDestination = async () => {
  if (
    !instructionId ||
    legs.length === 0 ||
    instructionContainers.length === 0 && !isWeightBased
  ) {
    setShouldHideAddLegButton(false);
    return;
  }

  try {
    // Fetch the instruction details to get the dropoff location
    const response = await authFetch(
      `${API_BASE_URL}/instructions/${instructionId}/details`
    );
    if (!response.ok) {
      setShouldHideAddLegButton(false);
      return;
    }

    const instructionDetails = await response.json();
    const dropoff = instructionDetails.dropoff;
        if (!dropoff) {
          setShouldHideAddLegButton(false);
          return;
        }
const missingItems = await checkContainersReachDropoff(dropoff);

      console.log("Destination check result (missing items):", missingItems);
      setShouldHideAddLegButton(missingItems.length === 0);
    } catch (error) {
      console.error("Error checking container/weight destinations:", error);
      setShouldHideAddLegButton(false);
    }
  };

  checkContainersDestination();
}, [instructionId, legs, instructionContainers, isWeightBased]);

  // Seed legRouteDate from the first driver date on the newly selected leg so that
  // any subsequent starting-point / destination change fetches the correct rate period.
  useEffect(() => {
    if (currentLagIndex === null || !legs[currentLagIndex]) return;
    const firstDate = legs[currentLagIndex].drivers?.find((d) => d.date)?.date;
    setLegRouteDate(firstDate ? firstDate.toString().split("T")[0] : "");
  }, [currentLagIndex]);

  useEffect(() => {
  // Set switching flag when leg changes
  setIsLegSwitching(true);
  const timer = setTimeout(() => {
    setIsLegSwitching(false);
  }, 300); // Allow 300ms for leg switching to complete

  return () => clearTimeout(timer);
}, [currentLagIndex]);

  // After a leg switch settles, re-fetch the date-aware rate for each driver that has a
  // date. This simulates the "reselect container" workaround: if a business manager added
  // a rate that was previously missing, entering the leg picks it up automatically.
  // Only runs for in-progress instructions (isCompleted guard) and only when the leg has
  // a valid route and at least one driver with a date.
  useEffect(() => {
    if (isLegSwitching) return;
    if (isCompleted || currentLagIndex === null) return;
    if (!formData.startingPoint || !formData.destination) return;
    if (shipmentType === 4) return;

    // Re-fetch date-aware rates for each driver when entering a leg.
    // Simulates the "reselect container" workaround — picks up any rate
    // a business manager may have added since the leg was last saved.
    // Runs every leg entry (not just first) so re-visits also get fresh rates.
    const refreshSwitchId = legSwitchIdRef.current;
    (async () => {
      let firstError = "";
      for (let i = 0; i < drivers.length; i++) {
        if (legSwitchIdRef.current !== refreshSwitchId) break;
        const driver = drivers[i];
        if (
          driver.date &&
          (driver.container_type || "").toLowerCase() !== "abnormal"
        ) {
          // silent=true: suppress per-driver banner writes — set once after all checked.
          const result = await handleDriverDateChange(i, driver.date, true);
          if (result?.hadError && !firstError) firstError = result.errorMsg;
        }
      }
      // Only update the banner if we're still on the same leg.
      if (legSwitchIdRef.current === refreshSwitchId) {
        setRateError(firstError);
      }
    })();
  }, [isLegSwitching, handleDriverDateChange]);
useEffect(() => {
  // Don't update rates if we're currently switching legs or if instruction is completed
  if (isLegSwitching || drivers.length === 0 || isCompleted) {
    return;
  }
  if (shipmentType === 4) {
    return;
  }

  // Avoid applying stale rates from a different leg/route (prevents flicker on leg switches)
  const currentRouteKey = formData.startingPoint && formData.destination
    ? `${formData.startingPoint}-${formData.destination}`
    : null;
  if (!currentRouteKey || ratesRouteKeyRef.current !== currentRouteKey) {
    return;
  }

  console.log("Rates changed, updating driver rates:", rates);
  const updatedDrivers = drivers.map((driver) => {
    const newDriver = { ...driver };

    // Preserve any existing rate (including "0") - only apply shared rates to new drivers
    // or drivers without a rate set (e.g., newly added drivers)
    if (newDriver.driverRate !== "" && newDriver.driverRate !== null && newDriver.driverRate !== undefined) {
      console.log(
        `Preserving existing rate ${newDriver.driverRate} for driver ${driver.driverid}`
      );
      return newDriver;
    }

    // If driver has no rate but flags indicate it should be zero, set to "0"
    if (newDriver._rateExplicitlyZero || newDriver._rateNullInManage) {
      newDriver.driverRate = "0";
      console.log(
        `Setting zero rate for driver ${driver.driverid} (explicit zero or no manage rate)`
      );
      return newDriver;
    }

    const isSubcontractor =
      employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
        ?.roleid === 6;
    console.log(
      `Driver ${driver.driverid} is subcontractor: ${isSubcontractor}`
    );

    // Check if current route has no rates
    if (formData.startingPoint && formData.destination) {
      const routeKey = `${formData.startingPoint}-${formData.destination}`;
      if (noRatesRoutes.has(routeKey)) {
        newDriver.driverRate = "0";
        console.log(
          `Using 0 rate for driver ${driver.driverid} because route ${routeKey} has no rates`
        );
        return newDriver;
      }
    }

    if (isTwelveMeterContainer(newDriver.container_type)) {
      newDriver.driverRate = isSubcontractor
        ? rates.subbie_twelve_meter
          ? rates.subbie_twelve_meter.toString()
          : "0"
        : rates.twelve_meter
        ? rates.twelve_meter.toString()
        : "0";
    } else if (isAbnormalContainer(newDriver.container_type)) {
      // For abnormal container types, keep existing rate or set to 0
      if (!newDriver.driverRate) {
        newDriver.driverRate = "0";
      }
      newDriver.isAbnormal = true; // Mark as abnormal to allow editing
    } else {
      newDriver.driverRate = isSubcontractor
        ? rates.subbie_six_meter
          ? rates.subbie_six_meter.toString()
          : "0"
        : rates.six_meter
        ? rates.six_meter.toString()
        : "0";
    }

    console.log(
      `Updated driver ${driver.driverid} rate to ${newDriver.driverRate}`
    );
    return newDriver;
  });

  // Only update state if there are actual changes
  if (JSON.stringify(updatedDrivers) !== JSON.stringify(drivers)) {
    console.log("Updated driver rates based on new rates:", updatedDrivers);
    setDrivers(updatedDrivers);
  }
}, [
  rates,
  employeeDrivers,
  formData.startingPoint,
  formData.destination,
  noRatesRoutes,
  isLegSwitching, // Add this dependency
  isCompleted, // Add this dependency
  shipmentType,
]);

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 200 }}>
      <style>{modalAnimation}</style>
      {!(
        showContainerModal ||
        showUnsavedChangesModal ||
        showMissingFieldsModal ||
        showNoDriversModal ||
        showBackConfirmModal ||
        showPickupMismatchModal ||
        showContainerReachedModal ||
        showSummaryModal ||
        showInvoicePreview
      ) && (
        <div className="">
          <button className="back-button" onClick={handleBackClick}>
            Back
          </button>
        </div>
      )}

      <br />
      <LegTabsBar
        legs={legs}
        currentLagIndex={currentLagIndex}
        isCompleted={isCompleted}
        handleSelectLeg={handleSelectLeg}
        handleRemoveLeg={handleRemoveLeg}
        onMoveLeg={handleMoveLeg}
        shouldHideAddLegButton={shouldHideAddLegButton}
        handleAddLeg={handleAddLeg}
        hasUnsavedNewLeg={hasUnsavedNewLeg}
        setShowSummaryModal={setShowSummaryModal}
        setShowInvoicePreview={setShowInvoicePreview}
        handleFinaliseClick={handleFinaliseClick}
        navigate={navigate}
        clientId={clientId}
        instructionId={instructionId}
        shipmentType={shipmentType}
      />

      <SummaryModal
        show={showSummaryModal}
        legs={legs}
        onClose={() => setShowSummaryModal(false)}
      />

      <InvoicePreviewModal
        instructionId={instructionId}
        clientId={clientId}
        isOpen={showInvoicePreview}
        onClose={() => setShowInvoicePreview(false)}
        shipmentType={shipmentType}
      />

      <div className="px-4">
        <RouteHeader
          editedFields={editedFields}
          formData={formData}
          startingPoints={startingPoints}
          destinations={destinations}
          handleStartingPointChange={handleStartingPointChange}
          handleDestinationChange={handleDestinationChange}
          drivers={drivers}
          isCompleted={isCompleted}
          legsLength={legs.length}
          addDriverButtonRef={addDriverButtonRef}
          addDriver={addDriver}
          handleSave={handleSave}
          saving={saving}
          currentLagIndex={currentLagIndex}
        />

        <DriversSection
          currentLagIndex={currentLagIndex}
          drivers={drivers}
          setDrivers={setDrivers}
          employeeDrivers={employeeDrivers}
          truckRegOptions={truckRegOptions}
          instructionContainers={instructionContainers}
          containerOptions={containerOptions}
          containerDetailsMap={containerDetailsMap}
          isWeightBased={isWeightBased}
          weightUnit={weightUnit}
          isCompleted={isCompleted}
          rates={rates}
          shipmentType={shipmentType}
          dnOptions={dnOptions}
          formData={formData}
          addDriverButtonRef={addDriverButtonRef}
          addDriver={addDriver}
          handleSave={handleSave}
          saving={saving}
          setEditedFields={setEditedFields}
          editedFields={editedFields}
          legs={legs}
          setContainerReachedDetails={setContainerReachedDetails}
          setShowContainerReachedModal={setShowContainerReachedModal}
          hasContainerReachedDropoff={hasContainerReachedDropoff}
          setDriverToRemove={setDriverToRemove}
          setShowRemoveDriverModal={setShowRemoveDriverModal}
          savedMessage={savedMessage}
          savedLegs={savedLegs}
          onDateChange={handleDriverDateChange}
          rateError={rateError}
        />
      </div>
      <ContainerWarningModal
        show={showContainerModal}
        containerValidationDetails={containerValidationDetails}
        onClose={() => setShowContainerModal(false)}
      />

      <UnsavedChangesModal
        show={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
      />

      <MissingFieldsModal
        show={showMissingFieldsModal}
        missingFields={missingFields}
        onClose={() => setShowMissingFieldsModal(false)}
      />

      <NoDriversModal
        show={showNoDriversModal}
        onClose={() => setShowNoDriversModal(false)}
      />

      <BackConfirmModal
        show={showBackConfirmModal}
        onClose={() => setShowBackConfirmModal(false)}
        onConfirm={() => {
          setShowBackConfirmModal(false);
          navigateBack();
        }}
      />

      <RemoveDriverConfirmModal
        show={showRemoveDriverModal}
        driverName={driverToRemove.name}
        onClose={() => setShowRemoveDriverModal(false)}
        onConfirm={async () => {
          if (driverToRemove.index !== null) {
            const updatedDrivers = [...drivers];
            updatedDrivers.splice(driverToRemove.index, 1);
            setDrivers(updatedDrivers);
            const updatedLegs = [...legs];
            updatedLegs[currentLagIndex] = {
              ...updatedLegs[currentLagIndex],
              drivers: updatedDrivers,
            };
            setLegs(updatedLegs);
            try {
              setSaving(true);
              const currentLeg = legs[currentLagIndex];
              const isNewLeg =
                currentLeg.isNew ||
                currentLeg.id?.toString().startsWith("temp-");
              const legData = {
                legkey:
                  !isNewLeg &&
                  currentLeg.id &&
                  !isNaN(Number.parseInt(currentLeg.id))
                    ? currentLeg.id
                    : null,
                legnumber: currentLeg.legnumber || currentLagIndex + 1,
                startingpoint: formData.startingPoint,
                destination: formData.destination,
                driverrate: calculateLegDriverRate(updatedDrivers, rates, shipmentType),
                m1key: instructionId,
                drivers: updatedDrivers.map((driver) => {
                  // Use the per-driver rate already on the object (set via
                  // handleDriverDateChange or fetchRate) — reflects the correct
                  // date-aware rate rather than the shared rates snapshot.
                  const driverRateToSave = driver.driverRate || "0";
                  console.log(
                    `Driver ${driver.driverid} with container type ${driver.container_type} has rate: ${driverRateToSave}`
                  );

                  return {
                    id: driver.id,
                    driverid: driver.driverid || null,
                    truckregnumber: driver.truckregnumber || null,
                    containernumber: driver.containernumber || null,
                    container_type: driver.container_type || null,
                    dn: driver.dn || null,
                    driverRate: driverRateToSave,
                    date: driver.date || null,
                  };
                }),
              };
              const currentPayload = JSON.stringify(legData);
              if (lastSavedLegRef.current === currentPayload) {
                console.log("Skipping save: leg payload unchanged from last save");
                setSavedMessage("No changes to save");
                setTimeout(() => setSavedMessage(""), 3000);
                return;
              }
              lastSavedLegRef.current = currentPayload;
              const response = await authFetch(`${API_BASE_URL}/legs/save`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(legData),
              });

              const responseText = await response.text();
              let result;
              try {
                result = JSON.parse(responseText);
              } catch (e) {
                throw new Error(`Invalid JSON response: ${responseText}`);
              }

              if (!response.ok) {
                throw new Error(result.message || "Failed to save leg data");
              }
              setSavedMessage("Driver removed successfully!");
              setTimeout(() => setSavedMessage(""), 5000);
              await refreshLegData();
            } catch (error) {
              console.error("Error removing driver:", error);
              setSavedMessage("Error removing driver: " + error.message);
              setTimeout(() => setSavedMessage(""), 5000);
            } finally {
              setSaving(false);
            }
          }
          setShowRemoveDriverModal(false);
        }}
      />

      <RemoveLegConfirmModal
        show={showRemoveLegModal}
        legNumber={legToRemove.number}
        onClose={() => setShowRemoveLegModal(false)}
        onConfirm={async () => {
                  if (legToRemove.index !== null) {
                    try {
                      setSaving(true);

                      const isTemporaryLeg =
                        !legToRemove.id ||
                        legToRemove.id.toString().startsWith("temp-");

                      if (!isTemporaryLeg) {
                        await api.delete(`/legs/${legToRemove.id}`);

                        for (
                          let i = legToRemove.index + 1;
                          i < legs.length;
                          i++
                        ) {
                          const legToUpdate = legs[i];
                          if (
                            legToUpdate.id &&
                            !legToUpdate.id.toString().startsWith("temp-")
                          ) {
                            await api.put(
                              `/legs/${legToUpdate.id}/update-number`,
                              {
                                legnumber: i,
                              }
                            );
                          }
                        }
                      }

                      const updatedLegs = [...legs];
                      updatedLegs.splice(legToRemove.index, 1);

                      for (
                        let i = legToRemove.index;
                        i < updatedLegs.length;
                        i++
                      ) {
                        updatedLegs[i].legnumber = i + 1;
                      }

                      const hasRemainingUnsavedLeg = updatedLegs.some(
                        (leg) => leg.isNew || leg.id?.toString().startsWith("temp-")
                      );
                      setHasUnsavedNewLeg(hasRemainingUnsavedLeg);

                      setLegs(updatedLegs);

                      setSavedLegs((prevSavedLegs) => {
                        const newSavedLegs = new Set();
                        prevSavedLegs.forEach((index) => {
                          if (index < legToRemove.index) {
                            newSavedLegs.add(index);
                          } else if (index > legToRemove.index) {
                            newSavedLegs.add(index - 1);
                          }
                        });
                        return newSavedLegs;
                      });

                      if (currentLagIndex === legToRemove.index) {
                        const newIndex = Math.max(0, legToRemove.index - 1);
                        setCurrentLagIndex(newIndex);
                        currentLegIndexRef.current = newIndex;
                        const selectedLeg = updatedLegs[newIndex];
                        setFormData({
                          startingPoint: selectedLeg.startingPoint || "",
                          driverRate: selectedLeg.driverRate || "",
                          destination: selectedLeg.destination || "",
                        });
                        if (
                          selectedLeg.drivers &&
                          selectedLeg.drivers.length > 0
                        ) {
                          setDrivers(selectedLeg.drivers);
                        } else {
                          setDrivers([]);
                        }
                      } else if (currentLagIndex > legToRemove.index) {
                        setCurrentLagIndex(currentLagIndex - 1);
                        currentLegIndexRef.current = currentLagIndex - 1;
                      }

                      setSavedMessage("Leg removed successfully!");
                      setTimeout(() => setSavedMessage(""), 5000);

                      if (!isTemporaryLeg) {
                        await refreshLegData();
                      }
                    } catch (error) {
                      console.error("Error removing leg:", error);
                      setSavedMessage("Error removing leg: " + error.message);
                      setTimeout(() => setSavedMessage(""), 5000);
                    } finally {
                      setSaving(false);
                    }
                  }
                  setShowRemoveLegModal(false);
        }}
      />

      <DuplicateDriverModal
        show={showDuplicateDriverModal}
        duplicateDriverInfo={duplicateDriverInfo}
        getDriverName={getDriverName}
        onClose={() => setShowDuplicateDriverModal(false)}
      />

      <ContainerReachedDropoffModal
        show={showContainerReachedModal}
        containerNumber={containerReachedDetails.containerNumber}
        onClose={() => setShowContainerReachedModal(false)}
      />
    </div>
  );
}

export default UpdateInstruction;
