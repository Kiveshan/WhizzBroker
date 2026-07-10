"use client";

import { useState, useEffect, useRef } from "react";
import "../../css/controllerinstruction.css";
import { useNavigate, useLocation } from "react-router-dom";
import ErrorModal from "../../../../components/ErrorModal";
import api from "../../../../api";

// ErrorTooltip component for displaying validation errors
const ErrorTooltip = ({ message }) => {
  if (!message) return null;

  return (
    <div className="error-tooltip">
      <span className="error-icon">!</span>
      <div className="error-message">{message}</div>
    </div>
  );
};

const FCcontrollerinstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const preservedFormData = location.state?.preservedFormData;
  const containerCounts = location.state?.containerCounts;
  const instructionId = location.state?.instructionId;

  console.log("FCcontrollerinstructions received state:", location.state);
  console.log(
    "FCcontrollerinstructions - preservedFormData:",
    preservedFormData
  );
  console.log("FCcontrollerinstructions - containerCounts:", containerCounts);
  console.log("FCcontrollerinstructions - instructionId:", instructionId);

  // Extract all state from location
  const clientId = location.state?.clientId;
  const clientName = location.state?.clientName;
  const selectedMonth = location.state?.selectedMonth;
  const selectedYear = location.state?.selectedYear;
  const activeFilter = location.state?.activeFilter;

  // pickupDateRef removed
  const etaDateRef = useRef(null);
  const lastFreeDateRef = useRef(null);

  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    ksmFileRef: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    // pickupTime and pickupDate refs removed
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
    createdAt: useRef(null),
  };

  // Function to fetch VGM amount from client rates (mirrors surcharge/hazardous)
  const fetchVgmAmount = async (containerId) => {
    try {
      console.log(`⚖️ Fetching VGM rate for client ${formData.clientId}, route: ${formData.pickup} → ${formData.dropoff}`);
      const response = await api.get(
        `/api/instructions/client/${formData.clientId}/rates`,
        {
          params: {
            start: formData.pickup,
            destination: formData.dropoff
          }
        }
      );

      const vgmAmount = response.data.vgm || 0;
      console.log(`⚖️ Fetched VGM amount: ${vgmAmount} for container ${containerId}`);

      setContainers(prevContainers =>
        prevContainers.map(container =>
          container.id === containerId
            ? { ...container, vgmAmount: Number(vgmAmount) }
            : container
        )
      );

      recalculateTotalCost();
    } catch (error) {
      console.error('❌ Error fetching VGM amount:', error);
      // Fallback to 0 if fetch fails
      setContainers(prevContainers =>
        prevContainers.map(container =>
          container.id === containerId
            ? { ...container, vgmAmount: 0 }
            : container
        )
      );
      console.log(`⚠️ Using fallback VGM amount: 0 for container ${containerId}`);
    }
  };

  const [isImport, setIsImport] = useState(location.state?.isImport || false);
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;  // Fixed timezone handling
  const [weight, setWeight] = useState("");
  const [rateUpdateMessage, setRateUpdateMessage] = useState("");
  const [isSetRateMode, setIsSetRateMode] = useState(false);
  const [isSetRate, setIsSetRate] = useState(false);
  const [setRateValue, setSetRateValue] = useState(0);
  const [historicalSetRate, setHistoricalSetRate] = useState(null);
  const [showSetRateWarning, setShowSetRateWarning] = useState(false);

  const [weightRows, setWeightRows] = useState([]);

  const addWeightRow = () => {
    setWeightRows((prev) => [
      ...prev,
      {
        id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
        ksmDmNo: "",
        ticketNo: "",
        receiptBookNo: "",
        weight: "",
      },
    ]);
  };

  const updateWeightRow = (id, field, value) => {
    setWeightRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeWeightRow = (id) => {
    setWeightRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Log the isImport state for debugging
  useEffect(() => {
    console.log("isImport state changed:", isImport);
  }, [isImport]);

  // Check if instruction is already invoiced when component mounts
  useEffect(() => {
    if (instructionId) {
      checkIfInvoiced();
    }
  }, [instructionId]);

  // NEW: Track previous container counts to detect changes from 0 to >0
  const [prevContainerCounts, setPrevContainerCounts] = useState({
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
  });

  const [formData, setFormData] = useState(() => {
    // Default empty form data
    const defaultData = {
      // Rates
      rateper_6: preservedFormData?.rateper_6 || 0,
      rateper_12: preservedFormData?.rateper_12 || 0,
      rateper_abnormal: preservedFormData?.rateper_abnormal || 0,
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      unitRate: "",
      quantity: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    };

    if (preservedFormData) {
      // If we have container counts from navigation, use them
      if (containerCounts) {
        console.log(
          "Initializing form data with container counts:",
          containerCounts
        );
        const initialData = {
          ...defaultData,
          ...preservedFormData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        };
        // Set initial previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
        return initialData;
      }
      // If we just have preserved form data without container counts
      const initialData = {
        ...preservedFormData,
        rateWeight: "Container",
      };
      // Set initial previous counts
      setPrevContainerCounts({
        num_six_meters: preservedFormData.num_six_meters || 0,
        num_twelve_meters: preservedFormData.num_twelve_meters || 0,
        num_abnormal: preservedFormData.num_abnormal || 0,
      });
      return initialData;
    }
    return {
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      ksmFileRef: "",
      pickup: "",
      dropoff: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      lastFreeDate: "",
      clientFileRef: "",
      bookingRef: "",
      rateWeight: "Container",
      weight: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0,
      status: "",
    };
  });

  // Check if the instruction should be read-only based on status
  // Allow editing while In Progress; only Completed is locked.
  const isReadOnly = formData.status === "Completed";

  const [startingPoints, setStartingPoints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [clients, setClients] = useState([]);
  const [shipmentTypes, setShipmentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
    instruction: instructionId ? true : false,
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  });

  // Track when the current pickup/dropoff no longer matches any client rate
  const [hasRouteMismatch, setHasRouteMismatch] = useState(false);
  // "locked" = show legacy route as read-only, "editable" = normal dropdown behaviour
  const [routeEditMode, setRouteEditMode] = useState("editable");

  const isAddOn = (() => {
    const id = (formData.shipmentTypeId || "").toString();
    const name = (formData.shipmentTypeName || "").toLowerCase();
    const selectedType = shipmentTypes.find(
      (type) => (type.shipkey || type.id)?.toString() === id
    );
    const typeName = (selectedType?.shipmenttype || "").toLowerCase();
    return (
      id === "5" ||
      name === "add-on" ||
      name === "add on" ||
      typeName === "add-on" ||
      typeName === "add on"
    );
  })();

  // VGM is only applicable for certain shipment types. For shipment types 4
  // (cross-haul/break bulk) and 5 (add-on), VGM should behave like other
  // non-applicable fields (null/false). This flag is used when building the
  // container payload sent to the backend.
  const allowVgmUI =
    String(formData.shipmentTypeId) !== "4";

  // Ensure add-on shipment type (5) always uses Container as unit per
  useEffect(() => {
    if (String(formData.shipmentTypeId) === "5" && formData.rateWeight !== "Container") {
      setFormData((prev) => ({
        ...prev,
        rateWeight: "Container",
      }));
    }
  }, [formData.shipmentTypeId, formData.rateWeight]);

  // Fetch set rate value when isSetRate is enabled
  useEffect(() => {
    const fetchSetRate = async () => {
      if (isSetRate && formData.clientId && formData.pickup && formData.dropoff) {
        try {
          const encodedPickup = encodeURIComponent(formData.pickup)
          const encodedDropoff = encodeURIComponent(formData.dropoff)
          const response = await api.get(`/api/instructions/client/${formData.clientId}/set-rate/${encodedPickup}/${encodedDropoff}`)
          if (response.data && response.data.set_rate !== undefined) {
            const numericSetRate = Number(response.data.set_rate)
            setSetRateValue(numericSetRate)
            // Keep formData.setRateAmount in sync so save logic can use it
            setFormData((prev) => ({
              ...prev,
              setRateAmount: Number.isNaN(numericSetRate)
                ? ""
                : String(numericSetRate),
            }))
          }
        } catch (error) {
          console.error("Error fetching set_rate:", error)
          setSetRateValue(0)
        }
      }
    }
    fetchSetRate()
  }, [isSetRate, formData.clientId, formData.pickup, formData.dropoff])

  // Keep internal "mode" flag in sync with the checkbox
  useEffect(() => {
    setIsSetRateMode(isSetRate)
  }, [isSetRate])

  // Recalculate total cost when weight rows or unit rate changes for shipment type 4
  useEffect(() => {
    if (String(formData.shipmentTypeId) === "4" && !isAddOn) {
      recalculateTotalCost();
    }
  }, [weightRows, formData.unitRate, formData.shipmentTypeId]);

  // Check for set rate mismatch warning when historicalSetRate, setRateValue, status, or isSetRate changes
  useEffect(() => {
    // Only show warning when:
    // 1. Set rate is enabled
    // 2. Status is "New" or "In Progress"
    // 3. Both historical and current values are available and non-zero
    // 4. They don't match
    if (isSetRate && 
        (formData.status === "New" || formData.status === "In Progress") &&
        historicalSetRate !== null && 
        historicalSetRate !== 0 &&
        setRateValue !== 0 &&
        historicalSetRate !== setRateValue) {
      setShowSetRateWarning(true);
    } else {
      setShowSetRateWarning(false);
    }
  }, [isSetRate, formData.status, historicalSetRate, setRateValue]);

  // State for warning modal
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
    shipmentTypeId: "",
    shipmentTypeName: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [preservedContainers, setPreservedContainers] = useState(
    location.state?.preservedContainers || []
  );

  // Container state
  const [containers, setContainers] = useState([]);
  const containersRef = useRef([]);
  
  // Sync containersRef with containers state
  useEffect(() => {
    console.log("[UPDATE] containers state changed:", containers);
    containersRef.current = containers;
  }, [containers]);
  
  const [containerFieldErrors, setContainerFieldErrors] = useState({});
  const [containerSuccessMessage, setContainerSuccessMessage] = useState("");
  const [isContainerLoading, setIsContainerLoading] = useState(false);
  const [isContainerDataModified, setIsContainerDataModified] = useState(false);
  const [isInvoiced, setIsInvoiced] = useState(false);

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    message: "",
    action: null,
  });

  // Track pending delete targets for containers and weight rows
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [weightRowToDelete, setWeightRowToDelete] = useState(null);

  // Initialize containers based on container counts
  const initializeContainers = () => {
    console.log("Initializing containers with form data:", formData);
    const counts = {
      "6m": formData.num_six_meters || 0,
      "12m": formData.num_twelve_meters || 0,
      Abnormal: formData.num_abnormal || 0,
      BreakBulk: formData.num_breakbulk || 0,
    };

    // If we already have containers and counts are zero, don't clear them
    if (
      containers &&
      containers.length > 0 &&
      counts["6m"] === 0 &&
      counts["12m"] === 0 &&
      counts["Abnormal"] === 0 &&
      counts["BreakBulk"] === 0
    ) {
      console.log("Keeping existing containers as counts are zero");
      return;
    }

    const containersList = [];
    let containerId = 1;

    // Add 6m containers
    for (let i = 0; i < counts["6m"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        fileRef: "", // Added fileRef field
        weight:
          isImport ||
          String(formData.shipmentTypeId) === "2" ||
          String(formData.shipmentTypeId) === "3"
            ? ""
            : null, // Initialize weight for import, export, and cross-haul
        containerType: "6m",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false,
        surchargeAmount: 0,
        is_12m_surcharge: false,
        surcharge_12m_amount: 0,
        hazardousAmount: 0,
        vgm: false,
        vgmAmount: 0,
      });
    }

    // Add 12m containers
    for (let i = 0; i < counts["12m"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        fileRef: "", // Added fileRef field
        weight:
          isImport ||
          String(formData.shipmentTypeId) === "2" ||
          String(formData.shipmentTypeId) === "3"
            ? ""
            : null, // Initialize weight for import, export, and cross-haul
        containerType: "12m",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false,
        surchargeAmount: 0,
        is_12m_surcharge: true,
        surcharge_12m_amount: 0,
        hazardousAmount: 0,
        vgm: false,
        vgmAmount: 0,
      });
    }

    // Add abnormal containers
    for (let i = 0; i < counts["Abnormal"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        fileRef: "", // Added fileRef field
        weight:
          isImport ||
          String(formData.shipmentTypeId) === "2" ||
          String(formData.shipmentTypeId) === "3"
            ? ""
            : null, // Initialize weight for import, export, and cross-haul
        containerType: "Abnormal",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false,
        surchargeAmount: 0,
        is_12m_surcharge: false,
        surcharge_12m_amount: 0,
        hazardousAmount: 0,
        vgm: false,
        vgmAmount: 0,
      });
    }

    // Add break bulk containers
    for (let i = 0; i < counts["BreakBulk"]; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        fileRef: "", // Added fileRef field
        weight:
          isImport ||
          String(formData.shipmentTypeId) === "2" ||
          String(formData.shipmentTypeId) === "3"
            ? ""
            : null, // Initialize weight for import, export, and cross-haul
        containerType: "BreakBulk",
        cargoDescription: "",
        hazardous: false,
        addSurcharges: false,
        surchargeAmount: 0,
        is_12m_surcharge: false,
        surcharge_12m_amount: 0,
        hazardousAmount: 0,
      });
    }

    setContainers(containersList);
    setIsContainerLoading(false);
  };

  // Handle container input change with real-time validation
  const handleContainerChange = async (id, field, value) => {
    // Handle both camelCase and snake_case for file reference field
    if (field === "file_ref") {
      field = "fileRef"; // Convert to camelCase for consistency
    }
    if (field === "containerNum") {
      // Get the current container
      const container = containers.find((c) => c.id === id);
      const currentValue = container ? container.containerNum : "";

      // For container numbers, limit to 20 characters and allow alphanumeric only
      if (value.length > 20) {
        // Prevent entering more than 20 characters
        return;
      }

      // Create a new value by validating each character (alphanumeric only)
      let newValue = "";
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        // Allow only alphanumeric characters
        if (/^[a-zA-Z0-9]$/.test(char)) {
          newValue += char;
        }
      }

      // Only update if the filtered value is different from the input
      if (newValue !== value) {
        return;
      }

      // Clear error when user starts typing
      clearContainerFieldError(id, "container");
    } else if (field === "fileRef") {
      // Limit file reference to 20 characters (no special validation needed)
      if (value.length > 20) {
        return;
      }
      
      // Update the container fileRef value
      setContainers((prevContainers) =>
        prevContainers.map((container) =>
          container.id === id ? { ...container, fileRef: value } : container
        )
      );
      setIsContainerDataModified(true);
      console.log(`📄 Updated File Reference for container ${id} to: ${value}`);
      // Don't return - allow the function to continue processing
    }

    if (field === "weight") {
      // Clear error when user starts typing
      clearContainerFieldError(id, "weight");

      // Check if this container should have weight field based on shipment type
      const shouldHaveWeight =
        isImport ||
        String(formData.shipmentTypeId) === "2" ||
        String(formData.shipmentTypeId) === "3";

      if (!shouldHaveWeight) {
        console.log("Weight field not applicable for this shipment type");
        return;
      }

      // Sanitize weight value - convert empty string to null, validate numeric input
      let sanitizedValue = "";
      if (value && value.trim() !== "") {
        // Only allow valid numeric input (including decimals)
        if (/^[0-9]*\.?[0-9]*$/.test(value.trim())) {
          const numValue = Number.parseFloat(value.trim());
          if (!isNaN(numValue) && numValue >= 0) {
            sanitizedValue = numValue;
            console.log(
              `Container ${id} weight updated to:`,
              sanitizedValue,
              `(type: ${typeof sanitizedValue})`
            );
          } else {
            // Invalid number, keep as string for user feedback but will be sanitized on save
            sanitizedValue = value;
            console.log(
              `Container ${id} weight set to string value:`,
              sanitizedValue
            );
          }
        } else {
          // Invalid format, don't update
          console.log(`Container ${id} weight invalid format:`, value);
          return;
        }
      } else {
        console.log(`Container ${id} weight set to empty string`);
      }

      // Update with sanitized value (empty string for empty, number for valid input)
      setContainers((prevContainers) =>
        prevContainers.map((container) =>
          container.id === id
            ? { ...container, [field]: sanitizedValue }
            : container
        )
      );
      setIsContainerDataModified(true);
      return;
    }

    const fetchHazardousAmount = async (containerId) => {
  const container = containers.find(c => c.id === containerId)
  if (!container) return

  try {
    console.log(`🌐 Fetching hazardous rates for client ${formData.clientId}, route: ${formData.pickup} → ${formData.dropoff}`);
    const response = await api.get(
      `/api/instructions/client/${formData.clientId}/rates`,
      {
        params: {
          start: formData.pickup,
          destination: formData.dropoff
        }
      }
    )
    
    const hazardousAmount = response.data.hazardous || 0;
    console.log(`☣️ Fetched hazardous amount: ${hazardousAmount} for container ${container.containerNum || containerId}`);
    
    // Update container with hazardous amount
    setContainers(prevContainers => {
      const updatedContainers = prevContainers.map(c =>
        c.id === containerId
          ? { ...c, hazardousAmount: Number(hazardousAmount) }
          : c
      );
      console.log(`🔄 Updated container ${containerId} with hazardous amount: ${hazardousAmount}`);
      return updatedContainers;
    });
    
    // Force immediate recalculation to include hazardous amount
    setTimeout(() => recalculateTotalCost(), 0);
  } catch (error) {
    console.error('❌ Error fetching hazardous amount:', error);
    // Fallback to 0 if fetch fails
    setContainers(prevContainers =>
      prevContainers.map(c =>
        c.id === containerId
          ? { ...c, hazardousAmount: 0 }
          : c
      )
    );
    console.log(`⚠️ Using fallback hazardous amount: 0 for container ${container.containerNum || containerId}`);
  }
}

    // Handle hazardous, addSurcharges and vgm checkbox fields
    if (field === "hazardous" || field === "addSurcharges" || field === "vgm") {
      if (field === "addSurcharges") {
        console.log(`🔄 Surcharge checkbox ${value ? 'CHECKED' : 'UNCHECKED'} for container ${id}`);
        if (value) {
          // Checkbox checked - update state immediately, then fetch surcharge amount
          setContainers((prevContainers) =>
            prevContainers.map((container) =>
              container.id === id 
                ? { ...container, [field]: true }
                : container
            )
          );
          console.log(`📞 Calling fetchSurchargeAmount for container ${id}`);
          fetchSurchargeAmount(id);
        } else {
          // Checkbox unchecked - reset surcharge amount to 0
          setContainers((prevContainers) =>
            prevContainers.map((container) =>
              container.id === id 
                ? { ...container, [field]: value, surchargeAmount: 0, is_12m_surcharge: false, surcharge_12m_amount: 0 }
                : container
            )
          );
          console.log(`🔄 Surcharge unchecked - reset amount to 0 for container ${id}`);
          recalculateTotalCost();
        }
      } else if (field === "hazardous") {
        // Handle hazardous checkbox with rate fetching
        console.log(`☢️ Hazardous checkbox ${value ? 'CHECKED' : 'UNCHECKED'} for container ${id}`);
        if (value) {
          // Checkbox checked - fetch amount first, then update state
          console.log(`☢️ Hazardous checkbox CHECKED for container ${id} - fetching rate first`);
          try {
            const response = await api.get(
              `/api/instructions/client/${formData.clientId}/rates`,
              {
                params: {
                  start: formData.pickup,
                  destination: formData.dropoff
                }
              }
            );
            const hazardousAmount = response.data.hazardous || 0;
            console.log(`☣️ Fetched hazardous amount: ${hazardousAmount} for container ${id}`);
            
            // Update container with both flag and amount atomically
            setContainers((prevContainers) =>
              prevContainers.map((container) =>
                container.id === id 
                  ? { ...container, hazardous: true, hazardousAmount: Number(hazardousAmount) }
                  : container
              )
            );
            console.log(`🔄 Updated container ${id} with hazardous=true and amount=${hazardousAmount}`);
            
            // Force immediate recalculation
            setTimeout(() => recalculateTotalCost(), 0);
          } catch (error) {
            console.error('❌ Error fetching hazardous amount:', error);
            // Fallback: set flag true but amount 0
            setContainers((prevContainers) =>
              prevContainers.map((container) =>
                container.id === id 
                  ? { ...container, hazardous: true, hazardousAmount: 0 }
                  : container
              )
            );
          }
        } else {
          // Checkbox unchecked - reset hazardous amount to 0
          console.log(`☢️ Hazardous checkbox UNCHECKED for container ${id} - updating state and resetting amount to 0`);
          setContainers((prevContainers) =>
            prevContainers.map((container) =>
              container.id === id 
                ? { ...container, [field]: value, hazardousAmount: 0 }
                : container
            )
          );
          console.log(`🔄 Hazardous unchecked - reset amount to 0 for container ${id}`);
          console.log(`💲 Recalculating total cost due to hazardous flag change`);
          recalculateTotalCost();
        }
      } else if (field === "vgm") {
        console.log(`⚖️ VGM checkbox ${value ? 'CHECKED' : 'UNCHECKED'} for container ${id}`);
        if (value) {
          // Checkbox checked - update state immediately, then fetch VGM amount
          setContainers((prevContainers) =>
            prevContainers.map((container) =>
              container.id === id 
                ? { ...container, [field]: true }
                : container
            )
          );
          console.log(`📞 Calling fetchVgmAmount for container ${id}`);
          fetchVgmAmount(id);
        } else {
          // Checkbox unchecked - reset VGM amount to 0
          setContainers((prevContainers) =>
            prevContainers.map((container) =>
              container.id === id 
                ? { ...container, [field]: value, vgmAmount: 0 }
                : container
            )
          );
          console.log(`🔄 VGM unchecked - reset amount to 0 for container ${id}`);
          recalculateTotalCost();
        }
      }
      setIsContainerDataModified(true);
      return;
    }

    // Update the container value for other fields
    setContainers((prevContainers) =>
      prevContainers.map((container) =>
        container.id === id ? { ...container, [field]: value } : container
      )
    );
    setIsContainerDataModified(true);
  };

  // Validate container data
  const validateContainers = () => {
    const counts = countContainersByType();
    const newErrors = {};
    let isValid = true;

    containers.forEach((container) => {
      // Only validate container number if not export shipment type
      if (String(formData.shipmentTypeId) !== "2") {
        if (!container.containerNum) {
          newErrors[`container-${container.id}`] = "Container number is required";
          isValid = false;
        }
      }
      // No format validation - allowing any alphanumeric characters up to 20 characters

      // Validate weight for import, export, and cross-haul shipment types
      if (
        isImport ||
        String(formData.shipmentTypeId) === "2" ||
        String(formData.shipmentTypeId) === "3"
      ) {
        // Weight is required and must be a positive number
        if (
          container.weight === null ||
          container.weight === "" ||
          isNaN(Number(container.weight)) ||
          Number(container.weight) <= 0
        ) {
          newErrors[`weight-${container.id}`] = "Valid weight is required";
          isValid = false;
        }
      }
    });

    setContainerFieldErrors(newErrors);
    return isValid;
  };

  // Validate required form fields
  const validateRequiredFields = () => {
    const newErrors = {};
    let isValid = true;

    // Required fields for all instruction types
    const requiredFields = [
      { name: "clientId", label: "Client" },
      { name: "shipmentTypeId", label: "Shipment Type" },
      { name: "pickup", label: "Pickup Location" },
      { name: "dropoff", label: "Dropoff Location" },
      { name: "pickupDate", label: "Pickup Date" },
    ];

    // Check each required field
    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }
    });

    // Set the errors
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));

    // If there are errors, scroll to the first error field
    if (!isValid) {
      const firstErrorField = requiredFields.find(
        (field) => !formData[field.name]
      );
      if (firstErrorField) {
        scrollToField(firstErrorField.name);
      }
    }

    return isValid;
  };

  // Count containers by type
  const countContainersByType = () => {
    const counts = {
      "6m": 0,
      "12m": 0,
      Abnormal: 0,
      BreakBulk: 0,
    };

    containers.forEach((container) => {
      counts[container.containerType]++;
    });

    return counts;
  };

  // Fetch original data for comparison
  const fetchOriginalData = async () => {
    try {
      const response = await api.get(
        `/api/instructions/fc/instruction/${instructionId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching original data:", error);
      return null;
    }
  };

  // Check if instruction is already invoiced
  const checkIfInvoiced = async () => {
    try {
      if (!instructionId) return;

      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        console.error("No m1key found for instruction");
        return;
      }

      // Check if m1key exists in invoice table
      const response = await api.get(
        `/api/invoice/check/${instructionData.m1key}`
      );
      setIsInvoiced(response.data.exists);
    } catch (error) {
      console.error("Error checking if instruction is invoiced:", error);
      setIsInvoiced(false);
    }
  };

  // Validate container uniqueness
  const validateContainerUniqueness = () => {
    if (isAddOn) {
      return true;
    }
    const containerNumbers = containers
      .map((c) => c.containerNum)
      .filter((num) => num.trim() !== "");
    const uniqueNumbers = new Set(containerNumbers);

    if (containerNumbers.length !== uniqueNumbers.size) {
      setErrorModal({
        isOpen: true,
        message:
          "Container numbers must be unique within the same instruction.",
      });
      return false;
    }
    return true;
  };

  // Enhanced validation with field highlighting
  const validateAllFields = () => {
    const newErrors = {};
    let isValid = true;
    const isCrossHaul = isCrossHaulShipment();

    // Required fields validation
    const requiredFields = [
      { name: "clientId", label: "Client" },
      { name: "shipmentTypeId", label: "Shipment Type" },
      { name: "pickup", label: "Pickup Location" },
      { name: "dropoff", label: "Dropoff Location" },
      // pickupDate field removed
    ];

    if (!isAddOn) {
      requiredFields.push(
        { name: "ksmFileRef", label: "KSM File Reference" },
        { name: "clientFileRef", label: "Client File Reference" },
        { name: "bookingRef", label: "Booking Reference" },
        { name: "description", label: "Description" }
      );
    }

    // Add vessel name and stack date specifically for import and export shipment types
    if (!isAddOn && (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2")) {
      requiredFields.push({ name: "vesselName", label: "Vessel Name" });
      requiredFields.push({
        name: "stackDate",
        label: formData.shipmentTypeId === "1" ? "ETA Date" : "Stack Date",
      });

      console.log(
        "Validating vessel name and stack date for shipment type:",
        formData.shipmentTypeId
      );
    }

    // Add weight and unitRate as required fields when rateWeight is ton or kg
    // Skip unitRate requirement if Set Rate is checked
    if (formData.rateWeight === "ton" || formData.rateWeight === "kg") {
      if (String(formData.shipmentTypeId) !== "4") {
        requiredFields.push(
          { name: "weight", label: `Weight (${formData.rateWeight})` }
        );
      }
      if (!isSetRate) {
        requiredFields.push(
          { name: "unitRate", label: `Rate per ${formData.rateWeight}` }
        );
      }
    }

    requiredFields.forEach((field) => {
      if (!formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
      }
    });

    // Container validation (skip entirely for add-on shipments)
    const containerErrors = {};
    if (!isAddOn) {
      containers.forEach((container) => {
        // Only validate container number if not export shipment type
        if (String(formData.shipmentTypeId) !== "2" && !container.containerNum) {
          containerErrors[`container-${container.id}`] =
            "Container number is required";
          isValid = false;
        }
        // No format validation - allowing any alphanumeric characters up to 20 characters

        // Weight validation - only validate format if weight is provided
        if (
          isImport &&
          container.weight &&
          container.weight !== "" &&
          !/^[0-9]*\.?[0-9]*$/.test(container.weight)
        ) {
          containerErrors[`weight-${container.id}`] =
            "Weight must be a valid number";
          isValid = false;
        }
      });

      // Check container uniqueness
      if (!validateContainerUniqueness()) {
        isValid = false;
      }
    }

    setFieldErrors(newErrors);
    setContainerFieldErrors(containerErrors);

    return isValid;
  };

  // Clear field errors when user starts typing
  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
  };

  const clearContainerFieldError = (containerId, fieldType) => {
    setContainerFieldErrors((prev) => ({
      ...prev,
      [`${fieldType}-${containerId}`]: "",
    }));
  };

  // Check for rate/counter mismatch and show confirmation if needed
  const checkRateCounterMismatch = () => {
    if (isAddOn) {
      return true;
    }
    const mismatches = [];
    const containerTypesWithCounts = [];

    // Check each container type for rate > 0 but count = 0
    if (
      (formData.rateper_6 > 0 || Number(formData.rateper_6) > 0) &&
      formData.num_six_meters === 0
    ) {
      mismatches.push("6m");
    }
    if (
      (formData.rateper_12 > 0 || Number(formData.rateper_12) > 0) &&
      formData.num_twelve_meters === 0
    ) {
      mismatches.push("12m");
    }
    if (
      (formData.rateper_abnormal > 0 ||
        Number(formData.rateper_abnormal) > 0) &&
      formData.num_abnormal === 0
    ) {
      mismatches.push("Abnormal");
    }

    // If there are mismatches, collect container types with counts > 0
    if (mismatches.length > 0) {
      if (formData.num_six_meters > 0) {
        containerTypesWithCounts.push(
          `6m (${formData.num_six_meters} containers, Rate: R${formData.rateper_6})`
        );
      }
      if (formData.num_twelve_meters > 0) {
        containerTypesWithCounts.push(
          `12m (${formData.num_twelve_meters} containers, Rate: R${formData.rateper_12})`
        );
      }
      if (formData.num_abnormal > 0) {
        containerTypesWithCounts.push(
          `Abnormal (${formData.num_abnormal} containers, Rate: R${formData.rateper_abnormal})`
        );
      }

      // Show confirmation modal
      const message =
        containerTypesWithCounts.length > 0
          ? `You have containers with the following rates: ${containerTypesWithCounts.join(
              ", "
            )}. Are you sure you want to continue?`
          : "You have set rates for container types with 0 containers. Are you sure you want to continue?";

      setConfirmationModal({
        isOpen: true,
        message: message,
        action: "save",
      });
      return false; // Don't proceed with save
    }

    return true; // No mismatches, proceed with save
  };

  // Handle save changes with enhanced logic
  const handleSaveChanges = async () => {
    console.log("=== SAVE CHANGES INITIATED ===");

    // Special validation for vessel name and stack date for import and export shipment types
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      const errors = {};
      let hasSpecialValidationErrors = false;

      if (!formData.vesselName || !formData.vesselName.trim()) {
        errors.vesselName = "Vessel name is required";
        hasSpecialValidationErrors = true;
      }

      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = `${
          formData.shipmentTypeId === "1" ? "ETA" : "Stack"
        } date is required`;
        hasSpecialValidationErrors = true;
      }

      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log(
          "Special validation failed for vessel name or stack date:",
          errors
        );
        setErrorModal({
          isOpen: true,
          message: `Please provide ${
            Object.keys(errors).includes("vesselName") ? "vessel name" : ""
          } ${
            Object.keys(errors).includes("vesselName") &&
            Object.keys(errors).includes("stackDate")
              ? "and"
              : ""
          } ${
            Object.keys(errors).includes("stackDate")
              ? formData.shipmentTypeId === "1"
                ? "ETA date"
                : "stack date"
              : ""
          }`,
        });
        return;
      }
    }

    // Validate all fields first
    if (!validateAllFields()) {
      console.log("❌ Validation failed - blocking save operation");
      setErrorModal({
        isOpen: true,
        message: "Please fix all validation errors before saving.",
      });
      return;
    }

    // Check for rate/counter mismatch
    if (!checkRateCounterMismatch()) {
      console.log("⚠️ Rate/counter mismatch detected - showing confirmation");
      return;
    }

    // Proceed with actual save logic
    await performSave();
  };

  // Handle delete instruction
  const handleDeleteInstruction = () => {
    console.log("=== DELETE INSTRUCTION INITIATED ===");

    // Show confirmation modal
    setConfirmationModal({
      isOpen: true,
      message:
        "Are you sure you want to delete this instruction? This action cannot be undone.",
      action: "delete",
    });
  };

  // Handle create invoice
  const handleCreateInvoice = async () => {
    console.log("=== CREATE INVOICE INITIATED ===");

    try {
      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        console.error("No m1key found for instruction");
        setErrorModal({
          isOpen: true,
          message: "Could not create invoice: No instruction ID found.",
        });
        return;
      }

      // Show confirmation modal
      setConfirmationModal({
        isOpen: true,
        message:
          "Are you sure you want to create an invoice before dispatching containers?",
        action: "invoice",
      });
    } catch (error) {
      console.error("Error preparing invoice creation:", error);
      setErrorModal({
        isOpen: true,
        message: "Error preparing invoice creation. Please try again.",
      });
    }
  };

  // Perform the actual delete operation
  const performDelete = async () => {
    try {
      console.log(`Deleting instruction with ID: ${instructionId}`);
      setIsContainerLoading(true);

      // Call the API to delete the instruction
      const response = await api.delete(
        `/api/instructions/fc/instruction/${instructionId}`
      );

      console.log("Delete response:", response.data);

      // Show success message
      setContainerSuccessMessage("Instruction deleted successfully!");

      // Navigate back to the instructions list after a short delay
      setTimeout(() => {
        navigate("/ViewClientInstruction", {
          state: {
            clientId,
            clientName,
            selectedMonth,
            selectedYear,
            activeFilter,
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Error deleting instruction:", error);

      // Show error modal
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to delete instruction. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Perform the actual invoice creation
  const performInvoiceCreation = async () => {
    try {
      console.log(`Creating invoice for instruction with ID: ${instructionId}`);
      setIsContainerLoading(true);

      // Get the instruction data to get the m1key
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        throw new Error("No m1key found for instruction");
      }

      // Call the API to create an invoice for the instruction
      const response = await api.post(
        `/generate-invoice/${instructionData.m1key}`
      );

      console.log("Invoice creation response:", response.data);

      // Show success message
      setContainerSuccessMessage("Invoice created successfully!");

      // Update the isInvoiced state
      setIsInvoiced(true);
    } catch (error) {
      console.error("Error creating invoice:", error);

      // Show error modal
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to create invoice. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Extract the actual save logic into a separate function
  const performSave = async () => {
    try {
      setIsContainerLoading(true);
      setContainerSuccessMessage("");

      // Fetch original data for comparison
      console.log("📊 Fetching original data for comparison...");
      const originalData = await fetchOriginalData();

      // Helper function to format dates for database (YYYY-MM-DD)
      const formatDateForDB = (dateString) => {
        if (!dateString) return null;
        try {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
          }
          // Handle MM/DD/YYYY format
          if (dateString.includes("/")) {
            const [month, day, year] = dateString.split("/");
            if (year && month && day) {
              return `${year}-${month.padStart(2, "0")}-${day.padStart(
                2,
                "0"
              )}`;
            }
          }
          // Try to parse as Date object
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;  // Fixed timezone handling
          }
          return null;
        } catch (e) {
          console.error("Error formatting date:", e);
          return null;
        }
      };

      // Helper function to format time for database (HH:MM:SS)
      const formatTimeForDB = (timeString) => {
        if (!timeString) return null;
        try {
          const [hours, minutes] = timeString.split(":");
          return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
        } catch (e) {
          console.error("Error formatting time:", e);
          return null;
        }
      };

      // Recalculate total cost based on current values
      const numSix = formData.num_six_meters || 0;
      const numTwelve = formData.num_twelve_meters || 0;
      const numAbnormal = formData.num_abnormal || 0;

      const ratePer6 = numSix > 0 ? Number(formData.rateper_6 || 0) : 0;
      const ratePer12 = numTwelve > 0 ? Number(formData.rateper_12 || 0) : 0;
      const ratePerAbnormal =
        numAbnormal > 0 ? Number(formData.rateper_abnormal || 0) : 0;

      let baseCost = 0;
      console.log("DEBUG UPDATE isSetRateMode:", isSetRateMode, "formData.rateWeight:", formData.rateWeight, "formData.setRateAmount:", formData.setRateAmount);
      if (isSetRateMode && !isAddOn) {
        // Set Rate mode: use setRateAmount multiplied by weight row count
        const setRateValue = Number.parseFloat(formData.setRateAmount || 0);
        const weightRowCount = weightRows.length || 1;
        baseCost = Number.isNaN(setRateValue) ? 0 : setRateValue * weightRowCount;
        console.log("SET-RATE CALCULATION (UPDATE):");
        console.log(`  Set Rate Amount: R${setRateValue.toFixed(2)}`);
        console.log(`  Weight Row Count: ${weightRowCount}`);
        console.log(`  Total Cost: R${setRateValue.toFixed(2)} × ${weightRowCount} = R${baseCost.toFixed(2)}`);
      } else if (
        (formData.rateWeight === "kg" || formData.rateWeight === "ton") &&
        String(formData.shipmentTypeId) === "4"
      ) {
        // Shipment type 4: base cost = unit rate * sum(all row weights)
        const totalWeight = weightRows.reduce((sum, row) => {
          if (row.weight === null || row.weight === undefined || row.weight === "") {
            return sum;
          }
          const parsed = Number.parseFloat(row.weight);
          return Number.isNaN(parsed) ? sum : sum + parsed;
        }, 0);
        const unitRate = Number.parseFloat(formData.unitRate || 0);
        baseCost = totalWeight * unitRate;
      } else {
        // Container-based or simple weight-based using main counts
        baseCost =
          ratePer6 * numSix +
          ratePer12 * numTwelve +
          ratePerAbnormal * numAbnormal;
      }
      // Fetch fresh amounts on-the-fly to prevent race condition
      // If user clicks Save before async fetches complete, we need current values
      const fetchFreshAmounts = async () => {
        const freshContainers = await Promise.all(
          containers.map(async (container) => {
            // If flags are true but amounts might be stale, fetch fresh values
            if ((container.addSurcharges || container.hazardous || container.vgm) && 
                formData.clientId && formData.pickup && formData.dropoff) {
              try {
                const response = await api.get(
                  `/api/instructions/client/${formData.clientId}/rates`,
                  {
                    params: {
                      start: formData.pickup,
                      destination: formData.dropoff
                    }
                  }
                );

                const sixMeterSurcharge =
                  response.data.surcharges ?? 
                  response.data.surcharge ?? 
                  0;

                const twelveMeterSurcharge =
                  response.data.surcharge12m ?? 
                  response.data.surcharge_12m ?? 
                  response.data.surcharge12 ?? 
                  response.data.surcharge_12 ?? 
                  response.data.surcharges ?? 
                  response.data.surcharge ?? 
                  0;

                const isTwelveMeter = container.containerType === "12m";
                const resolvedSurcharge = isTwelveMeter ? twelveMeterSurcharge : sixMeterSurcharge;

                return {
                  ...container,
                  surchargeAmount: container.addSurcharges
                    ? (isTwelveMeter ? 0 : Number(resolvedSurcharge || 0))
                    : container.surchargeAmount,
                  is_12m_surcharge: isTwelveMeter,
                  surcharge_12m_amount: container.addSurcharges
                    ? (isTwelveMeter ? Number(resolvedSurcharge || 0) : 0)
                    : (container.surcharge_12m_amount || 0),
                  hazardousAmount: container.hazardous ? Number(response.data.hazardous || 0) : container.hazardousAmount,
                  vgmAmount: container.vgm ? Number(response.data.vgm || 0) : container.vgmAmount,
                };
              } catch (error) {
                console.error('Error fetching fresh amounts:', error);
                return container;
              }
            }
            return container;
          })
        );
        return freshContainers;
      };

      const freshContainers = await fetchFreshAmounts();

      // Calculate total surcharge from containers (using fresh amounts)
      const totalSurchargeAmount = freshContainers.reduce((total, container) => {
        if (!container.addSurcharges) return total;
        const resolved = container.is_12m_surcharge
          ? Number(container.surcharge_12m_amount || 0)
          : Number(container.surchargeAmount || 0)
        return total + resolved
      }, 0);
      // Calculate total hazardous amount from containers (using fresh amounts)
      const totalHazardousAmount = freshContainers.reduce((total, container) => {
        if (container.hazardous && container.hazardousAmount) {
          return total + Number(container.hazardousAmount || 0);
        }
        return total;
      }, 0);
      // Calculate total VGM amount from containers (using fresh amounts)
      const totalVgmAmount = freshContainers.reduce((total, container) => {
        if (container.vgm && container.vgmAmount) {
          return total + Number(container.vgmAmount || 0);
        }
        return total;
      }, 0);
      console.log(`💲 Total cost components (fresh) - Base: ${baseCost}, Surcharges: ${totalSurchargeAmount}, Hazardous: ${totalHazardousAmount}, VGM: ${totalVgmAmount}`);
      // In Set Rate mode, total cost is exactly the set rate amount (no surcharges/hazardous/VGM)
      const totalCost = isSetRateMode
        ? baseCost
        : Number((baseCost + totalSurchargeAmount + totalHazardousAmount + totalVgmAmount).toFixed(2));
      console.log("DEBUG FINAL totalCost before payload:", totalCost, "isSetRateMode:", isSetRateMode);

      // Prepare instruction update data with proper field mapping
      const isAddOnType = isAddOn;

      const instructionUpdateData = {
        // Map frontend fields to backend database fields
        client: formData.clientId,
        ksmFileRef: formData.ksmFileRef, // Updated from task to ksmFileRef to match DB schema
        shipment_type: formData.shipmentTypeId,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        // pickuptime and pickupdate fields removed
        stackdate: formatDateForDB(formData.stackDate),
        lastFreeDate: formatDateForDB(formData.lastFreeDate),
        clientFileRef: formData.clientFileRef,
        rateweight: formData.rateWeight,
        description: formData.description,
        status: formData.status,
        vat: formData.vat === 0 ? 0 : formData.vat || 15,
        num_six_meters:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numSix,
        num_twelve_meters:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numTwelve,
        num_abnormal:
          formData.rateWeight === "kg" || formData.rateWeight === "ton" || isSetRateMode
            ? 0
            : numAbnormal,
        num_breakbulk: 0,
        // For ton or kg, main weight is only used for non-type-4 shipments
        weight:
          formData.rateWeight !== "Container" && String(formData.shipmentTypeId) !== "4"
            ? formData.weight
              ? Number(formData.weight)
              : null
            : null,
        total_cost: isAddOnType ? 0 : totalCost,
        booking_ref: formData.bookingRef,
        vessel_name: formData.vesselName,
        rateper_6:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePer6,
        rateper_12:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePer12,
        rateper_abnormal:
          isAddOnType
            ? 0
            : formData.rateWeight === "kg" || formData.rateWeight === "ton"
              ? 0
              : ratePerAbnormal,
        rateper_breakbulk: isAddOnType ? 0 : 0,
        // For ton or kg, unitRate must be provided and not defaulted to 0
        unitrate:
          isAddOnType
            ? 0
            : formData.rateWeight !== "Container"
              ? formData.unitRate
                ? Number(formData.unitRate)
                : null
              : null,
        is_set_rate: isSetRate, // Set rate flag for database
        // When set rate is checked, overwrite historical_set_rate with current setRateValue
        historical_set_rate: isSetRate ? setRateValue : null,
        created_at: formData.createdAt || null, // Add creation date
      };

      // Prepare container data with containerKey for smart updates
      // When rateWeight is kg or ton, we don't save any container details
      // CRITICAL FIX: Use containersRef.current to capture latest container data
      const currentContainers = containersRef.current || [];
      
      console.log("[UPDATE SAVE DEBUG] Preparing container data:", {
        containersState: containers,
        containersRef: containersRef.current,
        containerCount: currentContainers.length,
        shipmentTypeId: formData.shipmentTypeId,
      });

      const containerData =
        formData.rateWeight === "kg" || formData.rateWeight === "ton"
          ? []
          : currentContainers.map((container) => {
              // Sanitize weight value
              let sanitizedWeight = null;
              if (
                container.weight !== null &&
                container.weight !== undefined &&
                container.weight !== ""
              ) {
                if (typeof container.weight === "string") {
                  const trimmedWeight = container.weight.trim();
                  if (trimmedWeight !== "") {
                    const parsedWeight = Number.parseFloat(trimmedWeight);
                    if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                      sanitizedWeight = parsedWeight;
                    }
                  }
                } else if (
                  typeof container.weight === "number" &&
                  container.weight >= 0
                ) {
                  sanitizedWeight = container.weight;
                }
              }

              return {
                containerKey: container.containerKey,
                containernum: container.containerNum || "",
                file_ref: container.fileRef || "",
                weight: sanitizedWeight,
                container_type: container.containerType || "",
                cargo_description: container.cargoDescription || "",
                "Hazardous": Boolean(container.hazardous),
                "Hazardous Amount": Number(container.hazardousAmount || 0),
                "Add Surcharges": Boolean(container.addSurcharges),
                "Surcharge Amount": Number(container.surchargeAmount || 0),
                is_12m_surcharge: Boolean(container.is_12m_surcharge),
                surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
                vgm: allowVgmUI ? Boolean(container.vgm) : false,
                "vgm amount": allowVgmUI ? Number(container.vgmAmount || 0) : 0,
              };
            });

      let weightData = [];
      if (String(formData.shipmentTypeId) === "4") {
        // For cross-haul/break bulk on the FC screen, always send every
        // visible row so the backend can persist everything the user sees.
        weightData = weightRows.map((row) => {
          let numericWeight = null;
          if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
            const parsed = Number.parseFloat(row.weight);
            numericWeight = Number.isNaN(parsed) ? null : parsed;
          }

          const ksm = row.ksmDmNo || row.ksm_dm_no || null;
          const ticket = row.ticketNo || row.ticket_no || null;
          const receipt = row.receiptBookNo || row.receipt_book_no || null;

          return {
            ksm_dm_no: ksm,
            ticket_no: ticket,
            receipt_book_no: receipt,
            weight: numericWeight,
          };
        });
      }

      // Debug: Log the container and weight data being sent to server
      console.log("🚀 CONTAINER DATA BEING SENT TO SERVER:");
      console.log("==========================================");
      containerData.forEach((container, index) => {
        console.log(`Container ${index}:`, {
          containerKey: container.containerKey,
          containernum: container.containernum,
          file_ref: container.file_ref,
          "Add Surcharges": container["Add Surcharges"],
          "Surcharge Amount": container["Surcharge Amount"],
          is_12m_surcharge: container.is_12m_surcharge,
          surcharge_12m_amount: container.surcharge_12m_amount,
          "Hazardous": container["Hazardous"],
          "Hazardous Amount": container["Hazardous Amount"],
          addSurchargesType: typeof container["Add Surcharges"],
          surchargeAmountType: typeof container["Surcharge Amount"],
          hazardousType: typeof container["Hazardous"],
          hazardousAmountType: typeof container["Hazardous Amount"],
          fileRefType: typeof container.file_ref
        });
      });

      console.log("Weight rows state (type 4 only):", weightRows);
      console.log("Weight data being sent (type 4 only):", weightData);

      // Console log comparison between old and new data
      console.log("📋 DATA COMPARISON:");
      console.log("===================");

      if (originalData) {
        console.log("🔄 INSTRUCTION CHANGES:");
        console.log(
          "Old total_cost:",
          originalData.total_cost,
          "→ New total_cost:",
          totalCost
        );
        console.log(
          "Old num_six_meters:",
          originalData.num_six_meters,
          "→ New num_six_meters:",
          numSix
        );
        console.log(
          "Old num_twelve_meters:",
          originalData.num_twelve_meters,
          "→ New num_twelve_meters:",
          numTwelve
        );
        console.log(
          "Old num_abnormal:",
          originalData.num_abnormal,
          "→ New num_abnormal:",
          numAbnormal
        );
        console.log(
          "Old rateper_6:",
          originalData.rateper_6,
          "→ New rateper_6:",
          ratePer6
        );
        console.log(
          "Old rateper_12:",
          originalData.rateper_12,
          "→ New rateper_12:",
          ratePer12
        );
        console.log(
          "Old rateper_abnormal:",
          originalData.rateper_abnormal,
          "→ New rateper_abnormal:",
          ratePerAbnormal
        );
        console.log(
          "Old task:",
          originalData.task,
          "→ New task:",
          formData.task
        );
        console.log(
          "Old description:",
          originalData.description,
          "→ New description:",
          formData.description
        );
      }

      console.log("💾 Sending update request to server...");
      console.log("Instruction data:", instructionUpdateData);
      console.log("Container data:", containerData);
      console.log("DEBUG PAYLOAD total_cost:", instructionUpdateData.total_cost, "isSetRateMode:", isSetRateMode);

      // Make the API call
      const response = await api.put(
        `/api/instructions/fc/update/${instructionId}`,
        {
          instructionData: instructionUpdateData,
          containers: containerData,
          weightData: weightData,
        }
      );

      console.log("✅ Server response:", response.data);

      // Check for successful response (status 200)
      if (response.status === 200) {
        console.log("🎉 Save operation completed successfully!");

        // Show success message
        setContainerSuccessMessage("Changes saved successfully!");
        setIsContainerDataModified(false);

        // Recalculate total cost to update UI with saved values
        recalculateTotalCost();

        // Navigate after 2 seconds
        setTimeout(() => {
          console.log("🚀 Navigating to instructions list...");
          navigate("/ViewClientInstruction");
        }, 2000);
      } else {
        console.warn("⚠️ Unexpected server response:", response);
        setErrorModal({
          isOpen: true,
          message:
            "Save completed but server response was unexpected. Please verify your changes.",
        });
      }
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      console.error("Error details:", error.response?.data || error.message);

      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to save changes. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  };

  // Handle confirmation modal actions
  const handleConfirmAction = () => {
    if (confirmationModal.action === "unlock-route") {
      // User confirmed they want to edit a legacy route: clear both
      // pickup and dropoff so they must choose from the current
      // starting points and destinations lists.
      setRouteEditMode("editable");
      setHasRouteMismatch(false);
      setFormData((prev) => ({
        ...prev,
        pickup: "",
        dropoff: "",
      }));
    } else if (confirmationModal.action === "delete-container") {
      if (containerToDelete) {
        setContainers((prev) => {
          const updated = prev.filter((c) => c.id !== containerToDelete.id);

          // Recalculate container counts based on remaining containers so
          // the "No. of Containers" fields stay in sync. The actual
          // database deletion will occur when the user saves, via the
          // existing update endpoint.
          const numSix = updated.filter((c) => c.containerType === "6m").length;
          const numTwelve = updated.filter(
            (c) => c.containerType === "12m"
          ).length;
          const numAbnormal = updated.filter(
            (c) => c.containerType === "Abnormal"
          ).length;
          const numBreakBulk = updated.filter(
            (c) => c.containerType === "BreakBulk"
          ).length;

          setFormData((prevForm) => ({
            ...prevForm,
            num_six_meters: numSix,
            num_twelve_meters: numTwelve,
            num_abnormal: numAbnormal,
            num_breakbulk: numBreakBulk,
          }));

          return updated;
        });
        setIsContainerDataModified(true);
      }
      setContainerToDelete(null);
    } else if (confirmationModal.action === "delete-weight") {
      if (weightRowToDelete) {
        setWeightRows((prev) =>
          prev.filter((row) => row.id !== weightRowToDelete.id)
        );
      }
      setWeightRowToDelete(null);
    } else if (confirmationModal.action === "save") {
      performSave();
    } else if (confirmationModal.action === "delete") {
      performDelete();
    } else if (confirmationModal.action === "invoice") {
      performInvoiceCreation();
    }
    setConfirmationModal({ isOpen: false, message: "", action: null });
  };

  const handleCancelAction = () => {
    setConfirmationModal({ isOpen: false, message: "", action: null });
    setContainerToDelete(null);
    setWeightRowToDelete(null);
  };

  // Ask for confirmation before deleting a container; if the
  // container has been assigned to legs, we adjust the message
  // based on a backend check.
  const handleRequestDeleteContainer = async (container) => {
    if (isReadOnly) return;

    try {
      let hasLegs = false;

      // Only check legs if we have both an instructionId and a
      // container number that could exist in the DB.
      if (instructionId && container.containerNum) {
        const response = await api.get(
          `/api/instructions/fc/container/${instructionId}/${encodeURIComponent(
            container.containerNum
          )}/legs-exists`,
        );
        hasLegs = Boolean(response.data?.hasLegs);
      }

      const message = hasLegs
        ? "This container currently has legs assigned. Deleting this container will also remove all associated assignments. Are you sure you want to continue?"
        : "Are you sure you want to delete this container?";

      setContainerToDelete(container);
      setConfirmationModal({
        isOpen: true,
        message,
        action: "delete-container",
      });
    } catch (error) {
      console.error("Error checking container legs before delete:", error);
      setErrorModal({
        isOpen: true,
        message:
          "Failed to verify container assignments before delete. Please try again.",
      });
    }
  };

  // Ask for confirmation before deleting a weight row
  const handleRequestDeleteWeightRow = (row) => {
    if (isReadOnly) return;

    setWeightRowToDelete(row);
    setConfirmationModal({
      isOpen: true,
      message: "Are you sure you want to delete this weight row?",
      action: "delete-weight",
    });
  };

  // Initialize containers when component mounts or container counts change
  useEffect(() => {
    console.log("Container loading effect triggered");
    console.log("Current instructionId:", instructionId);

    const loadContainers = async () => {
      // If we already have containers from the instruction data, don't load them again
      if (containers && containers.length > 0) {
        console.log("Containers already loaded from instruction data");
        return;
      }

      if (!instructionId) {
        console.log("No instructionId, initializing empty containers");
        initializeContainers();
        return;
      }

      // Only fetch containers if we don't have any yet
      console.log(
        "No containers loaded yet, fetching from API for instruction:",
        instructionId
      );
      setIsContainerLoading(true);

      try {
        const response = await api.get(
          `/api/instructions/fc/instruction/${instructionId}`
        );
        console.log("Containers API response:", response.data);

        if (response.data && response.data.length > 0) {
          const containersList = response.data.map((container, index) => ({
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            fileRef: container.file_ref || "", // Added fileRef mapping
            weight:
              container.weight !== null && container.weight !== undefined
                ? container.weight
                : null,
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
            hazardous: container.Hazardous || false,
            addSurcharges: container["Add Surcharges"] || false,
            surchargeAmount: Number(container["Surcharge Amount"] || 0),
            is_12m_surcharge: Boolean(container.is_12m_surcharge),
            surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
            hazardousAmount: container["Hazardous Amount"] || 0,
            vgm: container.vgm === true || container.vgm === 'true',
            vgmAmount: Number(container["vgm amount"] || 0),
          }));

          console.log("Setting containers from API:", containersList);
          setContainers(containersList);
          setIsContainerDataModified(false);
        } else if (
          formData.num_six_meters > 0 ||
          formData.num_twelve_meters > 0 ||
          formData.num_abnormal > 0
        ) {
          console.log(
            "No containers found in API, initializing based on form counts"
          );
          initializeContainers();
        }
      } catch (error) {
        console.error("Error loading containers:", error);
        if (error.response) {
          console.error("Error response data:", error.response.data);
          console.error("Error status:", error.response.status);
        }
        // Even if there's an error, try to initialize containers based on form data
        if (
          formData.num_six_meters > 0 ||
          formData.num_twelve_meters > 0 ||
          formData.num_abnormal > 0
        ) {
          console.log(
            "Error occurred, initializing containers based on form counts"
          );
          initializeContainers();
        }
      } finally {
        setIsContainerLoading(false);
      }
    };

    loadContainers();
  }, [
    instructionId,
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
  ]);

  const scrollToField = (fieldName) => {
    const fieldRef = fieldRefs[fieldName];
    if (fieldRef && fieldRef.current) {
      fieldRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        if (fieldRef.current.focus) {
          fieldRef.current.focus();
        }
      }, 500);
    }
  };

  const openCalendar = (ref) => {
    ref.current.click();
  };

  // First useEffect: Fetch clients and shipment types on initial load
  useEffect(() => {
    console.log("Initial data fetch started");

    const fetchInitialData = async () => {
      try {
        await Promise.all([fetchClients(), fetchShipmentTypes()]);

        // If we have an instructionId and no preserved data, fetch the instruction
        if (instructionId && !preservedFormData) {
          console.log("Calling fetchInstructionData with ID:", instructionId);
          await fetchInstructionData(instructionId);
        } else if (preservedFormData) {
          // If we have preserved data, update the import state
          if (preservedFormData.shipmentTypeName) {
            setIsImport(
              preservedFormData.shipmentTypeName.toLowerCase() === "import"
            );
          }
          // Update form data with preserved data
          setFormData((prev) => ({ ...prev, ...preservedFormData }));
        }
      } catch (error) {
        console.error("Error in initial data fetch:", error);
        setErrorModal({
          open: true,
          message: "Failed to load initial form data. Please try again.",
        });
      } finally {
        setIsLoading((prev) => ({ ...prev, instruction: false }));
      }
    };

    // Call the fetchInitialData function
    fetchInitialData();
  }, [instructionId, preservedFormData]);

  // Update form data when preserved data changes
  useEffect(() => {
    if (preservedFormData) {
      console.log("Updating form with preserved data:", preservedFormData);

      // Format dates before setting form data
      const formattedData = {
        ...preservedFormData,
        // pickupDate field removed
        stackDate: formatDateForInput(preservedFormData.stackDate),
        lastFreeDate: preservedFormData.deadline
          ? formatDateForInput(preservedFormData.deadline)
          : "",
      };

      // Update form data
      if (containerCounts) {
        console.log(
          "Updating form data with container counts:",
          containerCounts
        );
        const newFormData = {
          ...formattedData,
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
          rateWeight: "Container",
          weight: "",
        };
        setFormData(newFormData);
        // Update previous counts
        setPrevContainerCounts({
          num_six_meters: containerCounts["6m"] || 0,
          num_twelve_meters: containerCounts["12m"] || 0,
          num_abnormal: containerCounts["Abnormal"] || 0,
        });
      }

      // Update shipment type and isImport state
      if (preservedFormData.shipmentTypeName) {
        const isImportType =
          preservedFormData.shipmentTypeName.toLowerCase() === "import";
        setIsImport(isImportType);
      }

      // Update rate values from preserved data - check multiple possible sources
      if (preservedFormData.sixMeterRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_6: preservedFormData.sixMeterRate,
        }));
      } else if (preservedFormData.rateper_6 !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_6: preservedFormData.rateper_6,
        }));
      }

      if (preservedFormData.twelveMeterRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_12: preservedFormData.twelveMeterRate,
        }));
      } else if (preservedFormData.rateper_12 !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_12: preservedFormData.rateper_12,
        }));
      }

      if (preservedFormData.abnormalRate !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_abnormal: preservedFormData.abnormalRate,
        }));
      } else if (preservedFormData.rateper_abnormal !== undefined) {
        setFormData((prev) => ({
          ...prev,
          rateper_abnormal: preservedFormData.rateper_abnormal,
        }));
      }
    }
  }, [preservedFormData, containerCounts]);

  // Add a separate useEffect to handle isImport state when formData.shipmentTypeName changes
  useEffect(() => {
    if (formData.shipmentTypeName) {
      const isImportType = formData.shipmentTypeName.toLowerCase() === "import";
      setIsImport(isImportType);
    }
  }, [formData.shipmentTypeName]);

  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers);
    }
  }, [location.state?.preservedContainers]);

  // NEW: Effect to handle rate auto-population when count changes from 0 to >0
  useEffect(() => {
    // Only run if we have clients data and form data with clientId
    if (clients.length === 0 || !formData.clientId) {
      return;
    }

    const selectedClient = clients.find(
      (client) => client.m5clientkey.toString() === formData.clientId.toString()
    );
    if (!selectedClient) {
      return;
    }

    // Handle 6-meter containers
    const sixMeterChanged =
      prevContainerCounts.num_six_meters === 0 && formData.num_six_meters > 0;
    if (sixMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (formData.rateper_6 === "" ||
          formData.rateper_6 === "0" ||
          Number(formData.rateper_6) === 0) &&
        selectedClient.driver_six_meter_rate
      ) {
        const newRate = selectedClient.driver_six_meter_rate.toString();
        setFormData((prev) => ({ ...prev, rateper_6: newRate }));
        console.log(
          `Auto-populated 6m rate: ${newRate} (count changed from 0 to ${formData.num_six_meters})`
        );
      }
    }

    // Handle 12-meter containers
    const twelveMeterChanged =
      prevContainerCounts.num_twelve_meters === 0 &&
      formData.num_twelve_meters > 0;
    if (twelveMeterChanged) {
      // Only populate if current rate is empty or zero
      if (
        (formData.rateper_12 === "" ||
          formData.rateper_12 === "0" ||
          Number(formData.rateper_12) === 0) &&
        selectedClient.driver_twelve_meter_rate
      ) {
        const newRate = selectedClient.driver_twelve_meter_rate.toString();
        setFormData((prev) => ({ ...prev, rateper_12: newRate }));
        console.log(
          `Auto-populated 12m rate: ${newRate} (count changed from 0 to ${formData.num_twelve_meters})`
        );
      }
    }

    // Clear rates when count goes to 0
    if (
      formData.num_six_meters === 0 &&
      prevContainerCounts.num_six_meters > 0
    ) {
      setFormData((prev) => ({ ...prev, rateper_6: "" }));
      console.log("Cleared 6m rate (count went to 0)");
    }

    if (
      formData.num_twelve_meters === 0 &&
      prevContainerCounts.num_twelve_meters > 0
    ) {
      setFormData((prev) => ({ ...prev, rateper_12: "" }));
      console.log("Cleared 12m rate (count went to 0)");
    }

    if (formData.num_abnormal === 0 && prevContainerCounts.num_abnormal > 0) {
      setFormData((prev) => ({ ...prev, rateper_abnormal: "" }));
      console.log("Cleared abnormal rate (count went to 0)");
    }

    // Update previous counts for next comparison
    setPrevContainerCounts({
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
    });
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    clients,
    formData.clientId,
  ]);

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    if (!id) {
      console.error("No instruction ID provided to fetchInstructionData");
      return;
    }

    console.log("fetchInstructionData called with id:", id);
    setIsLoading((prev) => ({ ...prev, instruction: true }));
    try {
      console.log(`Fetching instruction data for ID: ${id}`);
      const response = await api.get(`/api/instructions/fc/instruction/${id}`);
      const data = response.data;

      console.log("Instruction data received:", data);

      if (!data) {
        throw new Error("No data returned from server");
      }

      // Set the main form data
      const newFormData = {
        clientId: data.client ? data.client.toString() : "",
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type ? data.shipment_type.toString() : "",
        shipmentTypeName: data.shipmenttype || "",
        ksmFileRef: data.ksmFileRef || "", // Updated from task to ksmFileRef
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        // pickupTime and pickupDate fields removed
        stackDate: formatDateForInput(data.stackdate) || "",
        lastFreeDate: data.lastFreeDate ? formatDateForInput(data.lastFreeDate) : "", // Updated from deadline to lastFreeDate
        clientFileRef: data.clientFileRef || "", // Updated from fileref to clientFileRef
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        weight: data.weight || "",
        setRateAmount: (data.is_set_rate === true || data.is_set_rate === "true" || data.is_set_rate === 1) ? (data.total_cost != null ? data.total_cost.toString() : "") : "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        num_breakbulk: data.num_breakbulk || 0,
        vat: data.vat === 0 ? 0 : data.vat || 15,
        description: data.description || "",
        vesselName: data.vessel_name || "",
        unitRate: data.unitrate || 0,
        total_cost: calculateTotalCostFromRates(
          data.rateper_6 || 0,
          data.rateper_12 || 0,
          data.rateper_abnormal || 0,
          data.num_six_meters || 0,
          data.num_twelve_meters || 0,
          data.num_abnormal || 0
        ),
        // Store rate data for preservation
        rateper_6: data.rateper_6 || 0,
        rateper_12: data.rateper_12 || 0,
        rateper_abnormal: data.rateper_abnormal || 0,
        rateper_breakbulk: data.rateper_breakbulk || 0,
        status: data.status || "",
        createdAt: formatDateForInput(data.created_at) || "", // Add creation date
      };

      setFormData(newFormData);

      // Load is_set_rate from database and set checkbox state
      if (data.is_set_rate === true || data.is_set_rate === "true" || data.is_set_rate === 1) {
        setIsSetRate(true);
      } else {
        setIsSetRate(false);
      }

      // Use historical set rate value when status is Completed
      if (data.is_set_rate && data.historical_set_rate) {
        setHistoricalSetRate(Number(data.historical_set_rate));
      } else {
        setHistoricalSetRate(null);
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
        }));
        setWeightRows(mappedRows.length > 0 ? mappedRows : [
          {
            id: 1,
            ksmDmNo: "",
            ticketNo: "",
            receiptBookNo: "",
            weight: "",
          },
        ]);
      } else {
        setWeightRows([]);
      }

      // Update isImport state based on loaded shipment type
      const isImportType =
        data.shipmenttype && data.shipmenttype.toLowerCase() === "import";
      setIsImport(isImportType);

      // Set initial previous counts for existing instruction
      setPrevContainerCounts({
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
      });

      // Set individual rate state variables from the backend response
      setFormData((prev) => ({
        ...prev,
        rateper_6: (data.rateper_6 || 0).toString(),
      }));
      setFormData((prev) => ({
        ...prev,
        rateper_12: (data.rateper_12 || 0).toString(),
      }));
      setFormData((prev) => ({
        ...prev,
        rateper_abnormal: (data.rateper_abnormal || 0).toString(),
      }));
      setWeight("");

      // Process containers if they exist in the response
      if (data.containers && data.containers.length > 0) {
        console.log(
          "Processing containers from instruction data:",
          data.containers
        );

        // Determine if weight should be loaded based on shipment type
        const shouldLoadWeight =
          isImportType ||
          String(data.shipment_type) === "2" ||
          String(data.shipment_type) === "3";

        console.log("Should load weight for containers:", {
          shipmentType: data.shipment_type,
          shipmentTypeString: String(data.shipment_type),
          isImportType,
          shouldLoadWeight,
        });

        // Log raw container data from database with all properties
        console.log(
          "Raw container data from database:",
          data.containers.map((c) => ({
            containerkey: c.containerkey,
            containernum: c.containernum,
            weight: c.weight,
            weight_type: typeof c.weight,
            container_type: c.container_type,
            cargo_description: c.cargo_description,
            // Log file_ref field from container data
            file_ref: c.file_ref,
            file_ref_exists: 'file_ref' in c,
            file_ref_type: typeof c.file_ref,
            // Log the exact property names and values for surcharge flags
            hazardous_flag: c["Hazardous"],
            hazardous_flag_type: typeof c["Hazardous"],
            hazardous_flag_value: String(c["Hazardous"]),
            hazardous_flag_boolean: Boolean(c["Hazardous"]),
            add_surcharges_flag: c["Add Surcharges"],
            add_surcharges_flag_type: typeof c["Add Surcharges"],
            add_surcharges_flag_value: String(c["Add Surcharges"]),
            add_surcharges_flag_boolean: Boolean(c["Add Surcharges"]),
            // Log all available properties on the container
            all_properties: Object.keys(c),
          }))
        );
        
        // Log the raw JSON string to see exact values without any conversion
        if (data.containers.length > 0) {
          console.log("First container raw JSON:", JSON.stringify(data.containers[0]));
        }
        
        // Log the first container object in full JSON format to see exact structure
        if (data.containers.length > 0) {
          console.log("First container full JSON:", JSON.stringify(data.containers[0], null, 2));
        }

        const containersList = data.containers.map((container, index) => {
          // Process each container's weight value
          let weightValue;
          if (shouldLoadWeight) {
            // For export and cross-haul, ensure weight is properly handled
            // Convert any numeric string to number, null/undefined to empty string
            if (container.weight !== null && container.weight !== undefined) {
              // Convert string weights to numbers
              if (
                typeof container.weight === "string" &&
                container.weight.trim() !== ""
              ) {
                weightValue = parseFloat(container.weight);
                if (isNaN(weightValue)) weightValue = "";
              } else {
                weightValue = container.weight;
              }
              console.log(
                `Container ${container.containernum} weight set to:`,
                weightValue,
                `(type: ${typeof weightValue})`
              );
            } else {
              weightValue = ""; // Empty string for editable types
              console.log(
                `Container ${container.containernum} has no weight, initializing as empty string`
              );
            }
          } else {
            weightValue = null; // Null for non-editable types
            console.log(
              `Container ${container.containernum} weight set to null (non-editable)`
            );
          }

          // Log individual container properties before mapping
          console.log(`Processing container ${index}:`, {
            containerkey: container.containerkey,
            containernum: container.containernum,
            hazardous_flag: container["Hazardous"],
            hazardous_flag_exists: "Hazardous" in container,
            add_surcharges_flag: container["Add Surcharges"],
            add_surcharges_flag_exists: "Add Surcharges" in container,
            vgm_flag: container.vgm,
            vgm_flag_exists: "vgm" in container,
          });
          
          // Try alternative property access methods with explicit boolean conversion
          // Add more detailed logging to diagnose the issue
          console.log(`Container ${index} property check:`, {
            hasHazardousProperty: "Hazardous" in container,
            hasAddSurchargesProperty: "Add Surcharges" in container,
            rawHazardousValue: container["Hazardous"],
            rawAddSurchargesValue: container["Add Surcharges"],
          });
          
          // Handle the hazardous flag - using the original column names from the database
          let hazardousValue = false;
          if (container["Hazardous"] !== undefined) {
            hazardousValue = container["Hazardous"] === true || container["Hazardous"] === 'true';
          }
            
          // Handle the add surcharges flag - using the original column names from the database
          let addSurchargesValue = false;
          if (container["Add Surcharges"] !== undefined) {
            addSurchargesValue = container["Add Surcharges"] === true || container["Add Surcharges"] === 'true';
          }

          // Handle the VGM flag - boolean from DB (already lower-case key)
          let vgmValue = false;
          if (container.vgm !== undefined) {
            vgmValue = container.vgm === true || container.vgm === 'true';
          }
          
          console.log(`Container ${index} resolved flags:`, {
            hazardous: hazardousValue,
            addSurcharges: addSurchargesValue
          });
          
          return {
            id: container.containerkey || index + 1,
            containerKey: container.containerkey,
            containerNum: container.containernum || "",
            fileRef: container.file_ref || "", // Add file_ref field from database
            weight: weightValue,
            containerType: container.container_type || "6m",
            cargoDescription: container.cargo_description || "",
            // Map the database column names to component property names with fallbacks
            hazardous: hazardousValue,
            addSurcharges: addSurchargesValue,
            surchargeAmount: Number(container["Surcharge Amount"] || 0),
            is_12m_surcharge: Boolean(container.is_12m_surcharge),
            surcharge_12m_amount: Number(container.surcharge_12m_amount || 0),
            hazardousAmount: Number(container["Hazardous Amount"] || 0),
            vgm: vgmValue,
            vgmAmount: Number(container["vgm amount"] || 0),
          };
        });

        console.log(
          "Setting containers from instruction data:",
          containersList
        );
        
        // Log detailed information about hazardous and surcharge flags in the mapped containers
        console.log("Container hazardous and surcharge flags:", 
          containersList.map(c => ({
            containerNum: c.containerNum,
            hazardous: c.hazardous,
            hazardous_type: typeof c.hazardous,
            addSurcharges: c.addSurcharges,
            addSurcharges_type: typeof c.addSurcharges
          }))
        );
        setContainers(containersList);
        setIsContainerDataModified(false);
      } else {
        console.log(
          "No containers found in instruction data, initializing based on counts"
        );
        initializeContainers();
      }
    } catch (error) {
      console.error("Error fetching instruction data:", error);
      let errorMessage = "Failed to fetch instruction data. Please try again.";

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, instruction: false }));
    }
  };

  // Second useEffect: Fetch starting points and destinations when clientId is available
  useEffect(() => {
    if (formData.clientId) {
      console.log(
        "Client ID available, fetching starting points and destinations"
      );
      fetchStartingPoints();

      // If we have a pickup value, use it to fetch destinations
      if (formData.pickup) {
        fetchDestinations(formData.pickup);
      }
    }
  }, [formData.clientId, formData.pickup]);

  // After data load, detect when there is no matching destination route for the
  // current client + pickup/dropoff combination. This allows us to keep
  // rendering the instruction while treating the route as a legacy, read-only
  // value until the user explicitly opts to edit it.
  useEffect(() => {
    // When destinations finish loading and we still have no entries for the
    // current client/pickup, treat the existing pickup/dropoff from the
    // instruction as a legacy route.
    if (
      !isLoading.destinations &&
      formData.clientId &&
      formData.pickup &&
      destinations.length === 0
    ) {
      console.log("[FC] Route mismatch detected for instruction:", {
        clientId: formData.clientId,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
      });
      setHasRouteMismatch(true);
      setRouteEditMode("locked");
    } else if (!isLoading.destinations && destinations.length > 0) {
      // If we do have destinations for this pickup, clear any previous mismatch
      setHasRouteMismatch(false);
      setRouteEditMode("editable");
    }
  }, [
    isLoading.destinations,
    destinations.length,
    formData.clientId,
    formData.pickup,
  ]);

  // Sync pickup/dropoff values when client rate names are updated
  // This handles the case where pickup/dropoff names in m5_client_rate table
  // have been renamed - the formData needs to be updated to match the current API values
  // IMPORTANT: Only skip sync when user has explicitly locked the route edit mode
  useEffect(() => {
    console.log(`[FC SYNC DEBUG] Pickup sync effect running:`, {
      isLoadingStartingPoints: isLoading.startingPoints,
      startingPointsCount: startingPoints.length,
      formDataPickup: formData.pickup,
      routeEditMode,
      shouldSkipSync: routeEditMode === "locked"
    });

    // Only skip auto-sync if user explicitly locked the route (for deleted clients)
    if (routeEditMode === "locked") {
      console.log(
        `[FC SYNC DEBUG] Skipping pickup sync - user locked route edit mode`
      );
      return;
    }

    if (
      !isLoading.startingPoints &&
      startingPoints.length > 0 &&
      formData.pickup
    ) {
      // Check if the current pickup value exists in the startingPoints array
      const matchingPoint = startingPoints.find(
        (point) => point.startingpoint === formData.pickup
      );

      console.log(`[FC SYNC DEBUG] Looking for pickup "${formData.pickup}" in startingPoints:`, {
        foundExactMatch: !!matchingPoint,
        startingPoints: startingPoints.map(p => p.startingpoint)
      });

      if (!matchingPoint) {
        // The current pickup value is not in the API results
        // This means the name was likely renamed in the database
        // Try to find a match by checking if any starting point name contains or is similar
        const possibleMatch = startingPoints.find((point) =>
          point.startingpoint
            .toLowerCase()
            .includes(formData.pickup.toLowerCase()) ||
          formData.pickup
            .toLowerCase()
            .includes(point.startingpoint.toLowerCase())
        );

        console.log(`[FC SYNC DEBUG] No exact match. Possible fuzzy match:`, possibleMatch);

        if (possibleMatch) {
          console.log(
            `[FC SYNC DEBUG] Updating pickup from "${formData.pickup}" to "${possibleMatch.startingpoint}"`
          );
          setFormData((prev) => ({
            ...prev,
            pickup: possibleMatch.startingpoint,
          }));
          // Also update destinations for the new pickup
          fetchDestinations(possibleMatch.startingpoint);
        } else {
          console.log(`[FC SYNC DEBUG] No fuzzy match found - pickup may be a completely new route`);
        }
      } else {
        console.log(`[FC SYNC DEBUG] Pickup "${formData.pickup}" matches API data - no update needed`);
      }
    } else {
      console.log(`[FC SYNC DEBUG] Conditions not met for pickup sync`, {
        loadingDone: !isLoading.startingPoints,
        hasStartingPoints: startingPoints.length > 0,
        hasPickup: !!formData.pickup
      });
    }
  }, [isLoading.startingPoints, startingPoints, formData.pickup, routeEditMode]);

  useEffect(() => {
    // Only skip auto-sync if user explicitly locked the route (for deleted clients)
    if (routeEditMode === "locked") {
      console.log(
        `[FC SYNC DEBUG] Skipping dropoff sync - user locked route edit mode`
      );
      return;
    }

    if (
      !isLoading.destinations &&
      destinations.length > 0 &&
      formData.dropoff
    ) {
      // Check if the current dropoff value exists in the destinations array
      const matchingDest = destinations.find(
        (dest) => dest.destination === formData.dropoff
      );

      if (!matchingDest) {
        // The current dropoff value is not in the API results
        // Try to find a match by checking if any destination name contains or is similar
        const possibleMatch = destinations.find((dest) =>
          dest.destination
            .toLowerCase()
            .includes(formData.dropoff.toLowerCase()) ||
          formData.dropoff
            .toLowerCase()
            .includes(dest.destination.toLowerCase())
        );

        if (possibleMatch) {
          console.log(
            `[FC SYNC DEBUG] Updating dropoff from "${formData.dropoff}" to "${possibleMatch.destination}"`
          );
          setFormData((prev) => ({
            ...prev,
            dropoff: possibleMatch.destination,
          }));
        }
      }
    }
  }, [isLoading.destinations, destinations, formData.dropoff, routeEditMode]);

  // useEffect to recalculate total cost when container surcharges or hazardous flags/amounts change
  useEffect(() => {
    if (containers.length > 0) {
      recalculateTotalCost();
    }
  }, [
    containers.map(c => c.addSurcharges).join(','), 
    containers.map(c => c.surchargeAmount).join(','),
    containers.map(c => c.hazardous).join(','),
    containers.map(c => c.hazardousAmount).join(','),
    containers.map(c => c.vgm).join(','),
    containers.map(c => c.vgmAmount).join(',')
  ]);

  // Function to fetch surcharge amount from client rates
  const fetchSurchargeAmount = async (containerId) => {
    try {
      console.log(`🌐 Fetching surcharge rates for client ${formData.clientId}, route: ${formData.pickup} → ${formData.dropoff}`);
      const response = await api.get(
        `/api/instructions/client/${formData.clientId}/rates`,
        {
          params: {
            start: formData.pickup,
            destination: formData.dropoff
          }
        }
      );

      const container = containers.find((c) => c.id === containerId);
      const isTwelveMeter = container?.containerType === "12m";

      // Backwards/forwards compatible mapping:
      // - Existing field (6m): "surcharges" (legacy), or "surcharge"
      // - New field (12m): "surcharge12m" (preferred), with fallbacks
      const sixMeterSurcharge =
        response.data.surcharges ??
        response.data.surcharge ??
        0;

      const twelveMeterSurcharge =
        response.data.surcharge12m ??
        response.data.surcharge_12m ??
        response.data.surcharge12 ??
        response.data.surcharge_12 ??
        response.data.surcharges ??
        response.data.surcharge ??
        0;

      const surchargeAmount = isTwelveMeter ? twelveMeterSurcharge : sixMeterSurcharge;
      console.log(
        `💰 Fetched surcharge amount: ${surchargeAmount} for container ${containerId} (type: ${container?.containerType || "unknown"})`
      );
      
      setContainers(prevContainers =>
        prevContainers.map(container =>
          container.id === containerId
            ? {
                ...container,
                // Keep legacy field for 6m only
                surchargeAmount: isTwelveMeter ? 0 : Number(surchargeAmount || 0),
                // Backend-aligned fields
                is_12m_surcharge: isTwelveMeter,
                surcharge_12m_amount: isTwelveMeter ? Number(surchargeAmount || 0) : 0,
              }
            : container
        )
      );
      
      recalculateTotalCost();
    } catch (error) {
      console.error('❌ Error fetching surcharge amount:', error);
      // Fallback to 0 if fetch fails
      setContainers(prevContainers =>
        prevContainers.map(container =>
          container.id === containerId
            ? { ...container, surchargeAmount: 0, is_12m_surcharge: false, surcharge_12m_amount: 0 }
            : container
        )
      );
      console.log(`⚠️ Using fallback surcharge amount: 0 for container ${containerId}`);
    }
  };

  // Helper function to calculate total cost from individual rates
  const calculateTotalCostFromRates = (
    rate6,
    rate12,
    rateAbnormal,
    count6,
    count12,
    countAbnormal
  ) => {
    const baseCost = rate6 * count6 + rate12 * count12 + rateAbnormal * countAbnormal;
    
    // Add container surcharge amounts
    const surchargeTotal = containers
      .filter(container => container.addSurcharges === true)
      .reduce((total, container) => {
        const resolved = container.is_12m_surcharge
          ? Number(container.surcharge_12m_amount || 0)
          : Number(container.surchargeAmount || 0);
        return total + resolved;
      }, 0);
    
    // Add container hazardous amounts
    const hazardousTotal = containers
      .filter(container => container.hazardous === true)
      .reduce((total, container) => {
        const hazAmount = Number(container.hazardousAmount) || 0;
        console.log(`☢️ Container ${container.id} hazardous amount: ${hazAmount}`);
        return total + hazAmount;
      }, 0);

    // Add container VGM amounts
    const vgmTotal = containers
      .filter(container => container.vgm === true)
      .reduce((total, container) => total + (Number(container.vgmAmount) || 0), 0);
    
    console.log(`💲 Total cost calculation - Base: ${baseCost}, Surcharges: ${surchargeTotal}, Hazardous: ${hazardousTotal}, VGM: ${vgmTotal}`);
    return baseCost + surchargeTotal + hazardousTotal + vgmTotal;
  };

  // Function for real-time total cost recalculation
  const recalculateTotalCost = () => {
    // For add-on shipment type (5), always force zero cost and zero rates
    if (isAddOn) {
      setFormData(prev => ({
        ...prev,
        total_cost: 0,
        rateper_6: 0,
        rateper_12: 0,
        rateper_abnormal: 0,
        rateper_breakbulk: 0,
        unitRate: 0,
      }));
      return;
    }

    // Handle shipment type 4 (break bulk) weight-based calculation
    if (String(formData.shipmentTypeId) === "4") {
      let baseCost = 0;
      if (isSetRateMode) {
        const setRateValue = Number.parseFloat(formData.setRateAmount || 0);
        const weightRowCount = weightRows.length || 1;
        baseCost = Number.isNaN(setRateValue) ? 0 : setRateValue * weightRowCount;
      } else if (formData.rateWeight === "kg" || formData.rateWeight === "ton") {
        const totalWeight = weightRows.reduce((sum, row) => {
          if (row.weight === null || row.weight === undefined || row.weight === "") {
            return sum;
          }
          const parsed = Number.parseFloat(row.weight);
          return Number.isNaN(parsed) ? sum : sum + parsed;
        }, 0);
        const unitRate = Number.parseFloat(formData.unitRate || 0);
        baseCost = totalWeight * unitRate;
      }

      setFormData(prev => ({ ...prev, total_cost: baseCost }));
      return;
    }

    // Container-based calculation for other shipment types
    const newTotalCost = calculateTotalCostFromRates(
      formData.rateper_6 || 0,
      formData.rateper_12 || 0,
      formData.rateper_abnormal || 0,
      formData.num_six_meters || 0,
      formData.num_twelve_meters || 0,
      formData.num_abnormal || 0
    );

    setFormData(prev => ({ ...prev, total_cost: newTotalCost }));
  };

  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }));
    try {
      console.log("Fetching active clients...");
      const response = await api.get("/api/instructions/active-clients");
      console.log(
        "Active clients data received:",
        response.data.length,
        "records"
      );
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching active clients:", error);
      let errorMessage = "Failed to fetch active clients. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch active clients: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setClients([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, clients: false }));
    }
  };

  const fetchShipmentTypes = async () => {
    setIsLoading((prev) => ({ ...prev, shipmentTypes: true }));
    try {
      console.log("Fetching shipment types...");
      const response = await api.get("/api/instructions/shipment-types");
      console.log(
        "Shipment types data received:",
        response.data.length,
        "records"
      );
      setShipmentTypes(response.data);
    } catch (error) {
      console.error("Error fetching shipment types:", error);
      let errorMessage = "Failed to fetch shipment types. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch shipment types: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setShipmentTypes([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, shipmentTypes: false }));
    }
  };

  const fetchStartingPoints = async () => {
    if (!formData.clientId) {
      console.log("No client ID available to fetch starting points");
      setStartingPoints([]);
      setIsLoading((prev) => ({ ...prev, startingPoints: false }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, startingPoints: true }));
    try {
      console.log(
        `Fetching starting points for client ${formData.clientId}...`
      );
      const response = await api.get(
        `/api/instructions/client/${formData.clientId}/starting-points`
      );
      console.log("Starting points data received:", response.data);

      // Ensure we have an array of objects with the correct structure
      const formattedStartingPoints = Array.isArray(response.data)
        ? response.data
            .map((point, index) => ({
              id: point.id || `point-${index}`,
              startingpoint:
                point.starting_point || point.startingpoint || String(point),
            }))
            .filter((point) => point.startingpoint) // Filter out any null/undefined values
        : [];

      console.log("Formatted starting points:", formattedStartingPoints);

      setStartingPoints(formattedStartingPoints);

      // If there's only one starting point, select it by default
      if (formattedStartingPoints.length === 1 && !formData.pickup) {
        setFormData((prev) => ({
          ...prev,
          pickup: formattedStartingPoints[0].startingpoint,
        }));
      }
    } catch (error) {
      console.error("Error fetching starting points:", error);
      let errorMessage = "Failed to fetch starting points. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch starting points: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setStartingPoints([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }));
    }
  };

  const fetchDestinations = async (startingPoint) => {
    if (!startingPoint) {
      setDestinations([]);
      return;
    }
    if (!formData.clientId || !startingPoint) {
      console.log(
        "No client ID or starting point available to fetch destinations"
      );
      setDestinations([]);
      setIsLoading((prev) => ({ ...prev, destinations: false }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, destinations: true }));
    try {
      console.log(
        `Fetching destinations for client ${formData.clientId} and starting point ${startingPoint}...`
      );
      const response = await api.get(
        `/api/instructions/client/${
          formData.clientId
        }/destinations/${encodeURIComponent(startingPoint)}`
      );
      console.log("Destinations data received:", response.data);

      // Ensure we have an array of objects with the correct structure
      const formattedDestinations = Array.isArray(response.data)
        ? response.data.map((dest) => ({
            id: dest.id || dest.destination,
            destination: dest.destination || String(dest),
          }))
        : [];

      setDestinations(formattedDestinations);

      // If there's only one destination, select it by default
      if (formattedDestinations.length === 1 && !formData.dropoff) {
        setFormData((prev) => ({
          ...prev,
          dropoff: formattedDestinations[0].destination,
        }));
      }
    } catch (error) {
      console.error("Error fetching destinations:", error);
      let errorMessage = "Failed to fetch destinations. Please try again.";
      if (error.response) {
        const { status } = error.response;
        errorMessage = `Failed to fetch destinations: ${status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          "No response received from server. Please check your connection.";
      }
      setErrorModal({
        isOpen: true,
        message: errorMessage,
      });
      setDestinations([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, destinations: false }));
    }
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const selectedClient = clients.find(
      (client) => client.m5clientkey.toString() === clientId
    );
    if (selectedClient) {
      setFormData({
        ...formData,
        clientId,
        representative: selectedClient.representative || "",
        contactDetails: selectedClient.cellnum || "",
        email: selectedClient.email || "",
      });
    } else {
      setFormData({
        ...formData,
        clientId,
        representative: "",
        contactDetails: "",
        email: "",
      });
    }
    setFieldErrors((prev) => ({ ...prev, clientId: "" }));
  };

  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value;
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === shipmentTypeId
    );
    const shipmentTypeName = selectedShipmentType
      ? selectedShipmentType.shipmenttype
      : "";
    const isImportType = shipmentTypeName.toLowerCase() === "import";
    const isCrossHaul =
      shipmentTypeName.toLowerCase() === "cross-haul" || shipmentTypeId === "4";

    // Check if changing to cross-haul (break bulk) (type 4) with non-zero container counts
    if (shipmentTypeId === "4") {
      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal;
      if (totalContainers > 0) {
        // Show warning modal
        setWarningModal({
          isOpen: true,
          message:
            "Before changing to Cross-haul (break bulk), please set all container counts to 0.",
          shipmentTypeId: shipmentTypeId,
          shipmentTypeName: shipmentTypeName,
          onConfirm: () => {
            // Set all container counts to 0 and proceed with shipment type change
            const updatedFormData = {
              ...formData,
              num_six_meters: 0,
              num_twelve_meters: 0,
              num_abnormal: 0,
              shipmentTypeId: String(shipmentTypeId),
              shipmentTypeName,
              vesselName: "",
              stackDate: "",
              rateWeight: "ton",
            };
            setFormData(updatedFormData);
            setIsImport(isImportType);

            // Re-initialize containers with zero counts
            setTimeout(() => {
              initializeContainers();
            }, 0);
          },
        });
        return; // Stop execution here until user responds to warning
      }
    }

    // Determine if the new shipment type should have weight fields
    const shouldHaveWeight =
      isImportType ||
      String(shipmentTypeId) === "2" ||
      String(shipmentTypeId) === "3";

    console.log(
      "BEFORE CHANGE - Current containers:",
      containers.map((c) => ({
        id: c.id,
        type: c.containerType,
        weight: c.weight,
        weightType: typeof c.weight,
      }))
    );
    console.log("BEFORE CHANGE - isImport:", isImport);
    console.log(
      "BEFORE CHANGE - formData.shipmentTypeId:",
      formData.shipmentTypeId,
      "(type: " + typeof formData.shipmentTypeId + ")"
    );
    console.log(
      "BEFORE CHANGE - Weight column should show:",
      isImport ||
        String(formData.shipmentTypeId) === "2" ||
        String(formData.shipmentTypeId) === "3"
    );

    // Update isImport state based on shipment type
    setIsImport(isImportType);

    console.log(
      `Shipment type changed to: ${shipmentTypeId} (${shipmentTypeName}), isImport set to: ${isImportType}`
    );
    console.log(
      `New shipment type should have weight fields: ${shouldHaveWeight}`
    );

    // For cross-haul (break bulk) - type 4, clear vessel name and stack date and set rateWeight to 'ton'
    if (shipmentTypeId === "4") {
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
        vesselName: "",
        stackDate: "",
        // Default unit per to 'ton' for shipment type 4 (Cross-haul break bulk)
        rateWeight: "ton",
      });
      
      // Initialize weightRows with a single blank entry for break bulk
      setWeightRows([
        {
          id: 1,
          ksmDmNo: "",
          ticketNo: "",
          receiptBookNo: "",
          weight: "",
        },
      ]);
    }
    // For Import, Export, or Cross-haul (types 1, 2, 3), set rateWeight to 'Container'
    else if (
      shipmentTypeId === "1" ||
      shipmentTypeId === "2" ||
      shipmentTypeId === "3"
    ) {
      // Check if we're switching between container-based shipment types (1, 2, 3)
      const previousShipmentType = formData.shipmentTypeId;
      const isContainerTypeSwitch = ["1", "2", "3"].includes(
        previousShipmentType
      );

      // Preserve container rates and counts when switching between container-based types
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
        // Set unit per to 'Container' for shipment types 1, 2, 3
        rateWeight: "Container",
        // Only initialize these to 0 if not already a container type
        num_six_meters: isContainerTypeSwitch ? formData.num_six_meters : 0,
        num_twelve_meters: isContainerTypeSwitch
          ? formData.num_twelve_meters
          : 0,
        num_abnormal: isContainerTypeSwitch ? formData.num_abnormal : 0,
        num_breakbulk: 0, // Always clear break bulk count when switching to container types
        rateper_6: isContainerTypeSwitch ? formData.rateper_6 : 0,
        rateper_12: isContainerTypeSwitch ? formData.rateper_12 : 0,
        rateper_abnormal: isContainerTypeSwitch ? formData.rateper_abnormal : 0,
        rateper_breakbulk: 0, // Always clear break bulk rate when switching to container types
      });

      // Only re-initialize containers if not switching between container types
      if (!isContainerTypeSwitch) {
        setTimeout(() => {
          initializeContainers();
        }, 0);
      }
      
      // Reset set rate mode when switching away from break bulk
      setIsSetRate(false);
      
      // Continue processing - don't return early so the state update completes properly
    }
    // For any other shipment type
    else {
      setFormData({
        ...formData,
        shipmentTypeId: String(shipmentTypeId), // Ensure it's stored as string
        shipmentTypeName,
      });
    }

    // Clear any field errors
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }));

    // Update container weight fields based on new shipment type
    if (containers && containers.length > 0) {
      console.log("Updating container weight fields for new shipment type");

      // Update container weight fields directly without re-initializing
      setContainers((prevContainers) =>
        prevContainers.map((container) => {
          // If the new shipment type should have weight fields
          if (shouldHaveWeight) {
            // If container already has a weight value, keep it
            // Otherwise initialize with empty string
            const weightValue =
              container.weight !== null && container.weight !== undefined
                ? container.weight
                : "";
            console.log(
              `Container ${container.id} weight updated for new shipment type:`,
              weightValue
            );
            return { ...container, weight: weightValue };
          } else {
            // For shipment types that don't need weight, set to null
            console.log(
              `Container ${container.id} weight set to null for new shipment type`
            );
            return { ...container, weight: null };
          }
        })
      );
    }

    // Check if we're switching between import (1), export (2), or cross-haul (3) types
    const isImportExportCrossHaulSwitch =
      // Current shipment type is one of import, export, or cross-haul
      (formData.shipmentTypeId === "1" ||
        formData.shipmentTypeId === "2" ||
        formData.shipmentTypeId === "3") &&
      // New shipment type is also one of import, export, or cross-haul
      (shipmentTypeId === "1" ||
        shipmentTypeId === "2" ||
        shipmentTypeId === "3");

    // Only re-initialize containers if NOT switching between import, export, and cross-haul
    // or if we're switching to/from cross-haul break bulk (type 4)
    if (
      !isImportExportCrossHaulSwitch ||
      shipmentTypeId === "4" ||
      formData.shipmentTypeId === "4"
    ) {
      console.log("Re-initializing containers for new shipment type");
      setTimeout(() => {
        // Only re-initialize if container counts have changed
        if (
          formData.num_six_meters > 0 ||
          formData.num_twelve_meters > 0 ||
          formData.num_abnormal > 0 ||
          formData.num_breakbulk > 0
        ) {
          initializeContainers();
        }

        console.log(
          "AFTER CHANGE - Containers updated with shipment type:",
          shipmentTypeId,
          "(type: " + typeof shipmentTypeId + ")"
        );
        console.log(
          "AFTER CHANGE - formData.shipmentTypeId:",
          formData.shipmentTypeId,
          "(type: " + typeof formData.shipmentTypeId + ")"
        );
        console.log(
          "AFTER CHANGE - Weight column should show:",
          isImportType ||
            String(shipmentTypeId) === "2" ||
            String(shipmentTypeId) === "3"
        );
        console.log(
          "AFTER CHANGE - Updated containers:",
          containers.map((c) => ({
            id: c.id,
            type: c.containerType,
            weight: c.weight,
            weightType: typeof c.weight,
          }))
        );
      }, 100);
    } else {
      console.log(
        "Preserving container details when switching between import, export, and cross-haul types"
      );
      console.log(
        "AFTER CHANGE - Containers preserved with shipment type:",
        shipmentTypeId
      );
    }
  };

  // Check if shipment type is Cross-haul
  const isCrossHaulShipment = () => {
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === formData.shipmentTypeId
    );
    return (
      selectedShipmentType &&
      (selectedShipmentType.shipmenttype.toLowerCase() === "cross-haul" ||
        String(formData.shipmentTypeId) === "4")
    );
  };

  // Format date from any format to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";

    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Handle MM/DD/YYYY format
    if (dateString.includes("/")) {
      const [month, day, year] = dateString.split("/");
      if (year && month && day) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    // Try to parse as Date object if not in expected format
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;  // Fixed timezone handling
      }
    } catch (e) {
      console.error("Error formatting date:", e);
    }

    return dateString; // Return original if can't parse
  };

  // Fetch rates based on pickup and dropoff locations - always update rates
  const fetchRates = async (pickupLocation, dropoffLocation = null) => {
    if (!formData.clientId || !pickupLocation) return;

    console.log(
      "Fetching rates for client:",
      formData.clientId,
      "pickup:",
      pickupLocation,
      "dropoff:",
      dropoffLocation
    );

    try {
      let destinationToUse = dropoffLocation;

      // If no dropoff provided, get the default destination for this client and pickup location
      if (!destinationToUse) {
        const destinations = await api.get(
          `/api/instructions/client/${
            formData.clientId
          }/destinations/${encodeURIComponent(pickupLocation)}`
        );
        destinationToUse = destinations.data?.[0]?.destination;

        if (!destinationToUse) {
          console.log(
            "No destination found for pickup location:",
            pickupLocation
          );
          return;
        }
      }

      console.log("Using destination:", destinationToUse);

      // Fetch rates with both start and destination using the correct endpoint
      const response = await api.get(
        `/api/instructions/client/${formData.clientId}/rates`,
        {
          params: {
            start: pickupLocation,
            destination: destinationToUse,
          },
        }
      );

      console.log("Rates API response:", response.data);

      if (response.data) {
        // Handle both array and object responses
        const rateData = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        if (rateData) {
          // Try to get rates with different possible property names
          const rate6m =
            rateData.rateper_6 ||
            rateData["6m_rate"] ||
            rateData.sixMeterRate ||
            0;
          const rate12m =
            rateData.rateper_12 ||
            rateData["12m_rate"] ||
            rateData.twelveMeterRate ||
            0;
          const abnormalRate =
            rateData.rateper_abnormal || rateData.abnormalRate || 0;
          const surcharge = rateData.surcharge || rateData.surchages || 0;

          console.log("Updating rates (always override):", {
            rate6m,
            rate12m,
            abnormalRate,
            surcharge,
          });

          // Always update rates regardless of current values
          setFormData((prev) => {
            const updatedData = {
              ...prev,
              rateper_6: rate6m,
              rateper_12: rate12m,
              rateper_abnormal: abnormalRate,
              surcharge: surcharge,
            };

            // Recalculate total cost with new rates
            const totalCost =
              (updatedData.num_six_meters || 0) * rate6m +
              (updatedData.num_twelve_meters || 0) * rate12m +
              (updatedData.num_abnormal || 0) * abnormalRate +
              (updatedData.num_breakbulk || 0) *
                (updatedData.rateper_breakbulk || 0);

            updatedData.total_cost = totalCost;

            return updatedData;
          });

          // Show user feedback that rates were updated
          setRateUpdateMessage("Rates updated based on selected route");
          setTimeout(() => setRateUpdateMessage(""), 3000);
        }
      }
    } catch (error) {
      console.error("Error fetching rates:", error);
      console.error("Error details:", error.response?.data || error.message);

      // Show error message to user
      setErrorModal({
        isOpen: true,
        message:
          "Failed to fetch rates for selected route. Please check your selection or try again.",
      });
    }
  };

  const handleDropoffChange = async (e) => {
    const dropoffLocation = e.target.value;

    // Update the dropoff location in form data
    setFormData((prev) => ({
      ...prev,
      dropoff: dropoffLocation,
    }));

    // Clear field error
    clearFieldError("dropoff");

    // Fetch new rates for the current pickup and new dropoff combination
    if (formData.pickup && dropoffLocation) {
      await fetchRates(formData.pickup, dropoffLocation);
    }
  };

  const handlePickupChange = async (e) => {
    const pickupLocation = e.target.value;

    // Update the pickup location in form data
    setFormData((prev) => ({
      ...prev,
      pickup: pickupLocation,
      dropoff: "", // Clear the dropoff when pickup changes
    }));

    // Clear field error
    clearFieldError("pickup");

    // Fetch new destinations and rates for the selected pickup location
    await Promise.all([
      fetchDestinations(pickupLocation),
      fetchRates(pickupLocation), // This will get default destination
    ]);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === "checkbox" ? checked : value;

    // Handle date inputs
    if (type === "date") {
      processedValue = formatDateForInput(value);
    }

    // Handle special field types
    if (name === "imoNo") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 15);
    } else if (name === "flagReg") {
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, "");
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear field error when user starts typing
    clearFieldError(name);
  };

  const handleNumericInputChange = (e) => {
    const { name, value } = e.target;

    if (
      name === "num_six_meters" ||
      name === "num_twelve_meters" ||
      name === "num_abnormal" ||
      name === "num_breakbulk"
    ) {
      const numValue = Number.parseInt(value);
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
      const prevValue = formData[name];
      const isIncreasing = validValue > prevValue;
      const difference = Math.abs(validValue - prevValue);

      // Update the form data
      const updatedFormData = {
        ...formData,
        [name]: validValue,
      };
      setFormData(updatedFormData);

      // Update the containers based on the count change
      let containerType;
      if (name === "num_six_meters") containerType = "6m";
      else if (name === "num_twelve_meters") containerType = "12m";
      else if (name === "num_abnormal") containerType = "Abnormal";
      else if (name === "num_breakbulk") containerType = "BreakBulk";

      if (containerType) {
        // Update containers directly
        if (isIncreasing) {
          // Add new containers
          const newContainers = [];
          const nextId =
            containers.length > 0
              ? Math.max(...containers.map((c) => c.id)) + 1
              : 1;

          for (let i = 0; i < difference; i++) {
            newContainers.push({
              id: nextId + i,
              containerKey: null,
              containerNum: "",
              weight:
                isImport ||
                formData.shipmentTypeId === "2" ||
                formData.shipmentTypeId === "3"
                  ? ""
                  : null,
              containerType: containerType,
              cargoDescription: "",
            });
          }

          setContainers([...containers, ...newContainers]);
          setIsContainerDataModified(true);
        } else {
          // Remove containers of the specified type (most recently added first)
          const containersOfType = containers.filter(
            (c) => c.containerType === containerType
          );
          const containersToRemove = containersOfType.slice(
            containersOfType.length - difference
          );
          const updatedContainers = containers.filter(
            (c) => !containersToRemove.includes(c)
          );

          setContainers(updatedContainers);
          setIsContainerDataModified(true);
        }

        // Also update preserved containers for consistency
        if (preservedContainers) {
          updatePreservedContainers(containerType, isIncreasing, difference);
        }
      }

      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0);
      const twelveRate = Number(formData.rateper_12 || 0);
      const abnormalRateNum = Number(formData.rateper_abnormal || 0);
      const breakBulkRate = Number(formData.rateper_breakbulk || 0);

      const totalCost =
        (name === "num_six_meters"
          ? validValue
          : updatedFormData.num_six_meters) *
          sixRate +
        (name === "num_twelve_meters"
          ? validValue
          : updatedFormData.num_twelve_meters) *
          twelveRate +
        (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal) *
          abnormalRateNum +
        (name === "num_breakbulk"
          ? validValue
          : updatedFormData.num_breakbulk || 0) *
          breakBulkRate;

      updatedFormData.total_cost = totalCost;

      console.log(`Container count updated - ${name}: ${validValue}`);
      setFormData(updatedFormData);
      updatePreservedContainers(name, isIncreasing, difference);
      setFieldErrors((prev) => ({ ...prev, containers: "" }));
    } else if (name === "rateWeight") {
      const updatedFormData = {
        ...formData,
        [name]: value,
      };
      updatedFormData.total_cost = 0;
      setFormData(updatedFormData);
      setFieldErrors((prev) => ({ ...prev, rateWeight: "", weight: "" }));
    } else if (name === "pickupDate") {
      setFormData({
        ...formData,
        [name]: value,
        stackDate:
          formData.stackDate && new Date(formData.stackDate) <= new Date(value)
            ? ""
            : formData.stackDate,
        lastFreeDate:
          formData.lastFreeDate &&
          new Date(formData.lastFreeDate) <= new Date(value) <= new Date(value)
            ? ""
            : formData.lastFreeDate,
      });
      setFieldErrors((prev) => ({ ...prev, pickupDate: "" }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // Update the rate in form data (keep as string during editing to allow decimals)
      const updatedFormData = {
        ...formData,
        [name]: value === "" ? "" : value,
      };

      // Recalculate total cost
      const sixRate = Number(updatedFormData.rateper_6 || 0);
      const twelveRate = Number(updatedFormData.rateper_12 || 0);
      const abnormalRateNum = Number(updatedFormData.rateper_abnormal || 0);

      updatedFormData.total_cost =
        (updatedFormData.num_six_meters || 0) * sixRate +
        (updatedFormData.num_twelve_meters || 0) * twelveRate +
        (updatedFormData.num_abnormal || 0) * abnormalRateNum;

      setFormData(updatedFormData);
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWeight(value);
      setFieldErrors((prev) => ({ ...prev, weight: "" }));
    }
  };

  const updatePreservedContainers = (
    containerType,
    isIncreasing,
    difference
  ) => {
    const containerTypeMap = {
      num_six_meters: "6m",
      num_twelve_meters: "12m",
      num_abnormal: "Abnormal",
    };
    const type = containerTypeMap[containerType];
    if (!type) return;
    if (isIncreasing) {
      const newContainers = [];
      const nextId =
        preservedContainers.length > 0
          ? Math.max(...preservedContainers.map((c) => c.id)) + 1
          : 1;
      for (let i = 0; i < difference; i++) {
        newContainers.push({
          id: nextId + i,
          containerKey: null,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: type,
          cargoDescription: "",
        });
      }
      setPreservedContainers([...preservedContainers, ...newContainers]);
    } else {
      const containersOfType = preservedContainers.filter(
        (c) => c.containerType === type
      );
      const containersToRemove = containersOfType.slice(
        containersOfType.length - difference
      );
      const updatedContainers = preservedContainers.filter(
        (c) => !containersToRemove.includes(c)
      );
      setPreservedContainers(updatedContainers);
    }
  };

  const handleContainerCountChange = (type, value) => {
    const numValue = Number.parseInt(value);
    const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
    const prevValue = formData[type];
    const isIncreasing = validValue > prevValue;
    const difference = Math.abs(validValue - prevValue);

    // Update the form data
    const updatedFormData = {
      ...formData,
      [type]: validValue,
    };

    // Calculate total cost using individual rates
    const sixRate = Number(formData.rateper_6 || 0);
    const twelveRate = Number(formData.rateper_12 || 0);
    const abnormalRateNum = Number(formData.rateper_abnormal || 0);
    const breakBulkRate = Number(formData.rateper_breakbulk || 0);

    const totalCost =
      (type === "num_six_meters"
        ? validValue
        : updatedFormData.num_six_meters) *
        sixRate +
      (type === "num_twelve_meters"
        ? validValue
        : updatedFormData.num_twelve_meters) *
        twelveRate +
      (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal) *
        abnormalRateNum;

    updatedFormData.total_cost = totalCost;

    console.log(`Container count updated - ${type}: ${validValue}`);
    setFormData(updatedFormData);
    updatePreservedContainers(type, isIncreasing, difference);
    setFieldErrors((prev) => ({ ...prev, containers: "" }));
  };

  const validateForm = () => {
    console.log("validateForm called");
    console.log("Current formData:", formData);
    // Check if shipment type is cross-haul or type 4
    const isCrossHaul = isCrossHaulShipment();
    console.log("Is cross-haul shipment:", isCrossHaul);

    const requiredFields = [
      "clientId",
      "shipmentTypeId",
      "task",
      "pickup",
      "dropoff",
      "pickupTime",
      "pickupDate",
      "lastFreeDate",
      "bookingRef",
      "clientFileRef",
      "description",
    ];

    // Add vessel name and stack date as required for import and export shipment types (1 and 2)
    console.log(
      "Checking shipment type for vessel name and stack date requirement:",
      formData.shipmentTypeId
    );
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      console.log("Adding vesselName and stackDate as required fields");
      requiredFields.push("vesselName", "stackDate");
    }

    let isValid = true;
    const errors = {};
    console.log("Validating required fields...");
    for (const field of requiredFields) {
      if (!formData[field]) {
        console.log(`Missing required field: ${field}`);
        errors[field] = `This field is required`;
        isValid = false;
      } else {
        console.log(`Field ${field} is valid:`, formData[field]);
      }
    }
    if (formData.shipmentTypeId) {
      const selectedShipmentType = shipmentTypes.find(
        (type) => type.shipkey.toString() === formData.shipmentTypeId
      );
      if (selectedShipmentType) {
        const shipmentTypeName =
          selectedShipmentType.shipmenttype.toLowerCase();
        if (shipmentTypeName !== "import" && shipmentTypeName !== "export") {
          errors.shipmentTypeId = "Please select either Import or Export";
          isValid = false;
        }
      }
    }

    // Rate validation - only require rates when container count > 0
    if (formData.num_six_meters > 0) {
      if (
        formData.rateper_6 === "" ||
        formData.rateper_6 === "0" ||
        Number(formData.rateper_6) === 0
      ) {
        errors.rateper_6 = "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_6) <= 0) {
        errors.rateper_6 = "Rate must be a positive number";
        isValid = false;
      }
    }

    if (formData.num_twelve_meters > 0) {
      if (
        formData.rateper_12 === "" ||
        formData.rateper_12 === "0" ||
        Number(formData.rateper_12) === 0
      ) {
        errors.rateper_12 = "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_12) <= 0) {
        errors.rateper_12 = "Rate must be a positive number";
        isValid = false;
      }
    }

    if (formData.num_abnormal > 0) {
      if (
        formData.rateper_abnormal === "" ||
        formData.rateper_abnormal === "0" ||
        Number(formData.rateper_abnormal) === 0
      ) {
        errors.rateper_abnormal =
          "Rate is required when containers are present";
        isValid = false;
      } else if (Number(formData.rateper_abnormal) <= 0) {
        errors.rateper_abnormal = "Rate must be a positive number";
        isValid = false;
      }
    }

    // For ton or kg, both weight and unitRate are required
    if (
      (formData.rateWeight === "ton" || formData.rateWeight === "kg") &&
      (formData.weight === "" || weight === "")
    ) {
      errors.weight = "Please add weight";
      isValid = false;
    }

    // For Set Rate mode, setRateAmount is required
    if (isSetRateMode && (!formData.setRateAmount || formData.setRateAmount === "")) {
      errors.setRateAmount = "Set rate amount is required when unit type is Set Rate";
      isValid = false;
    }

    // For ton or kg, unitRate is required (unless Set Rate is checked)
    if (
      (formData.rateWeight === "ton" || formData.rateWeight === "kg") &&
      !isSetRate &&
      (!formData.unitRate ||
        formData.unitRate === "" ||
        formData.unitRate === "0")
    ) {
      errors.unitRate = `Rate per ${formData.rateWeight} is required`;
      isValid = false;
    }

    // Validate weight if provided for import, export, or cross-haul shipments
    if (
      (isImport ||
        formData.shipmentTypeId === "2" ||
        formData.shipmentTypeId === "3") &&
      (formData.weight !== "" || weight !== "")
    ) {
      const weightValue = Number.parseFloat(formData.weight || weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        errors.weight = "Weight must be a positive number";
        isValid = false;
      }
    }

    // Validate unitRate format if provided
    if (formData.unitRate && formData.unitRate !== "") {
      const unitRateValue = Number.parseFloat(formData.unitRate);
      if (isNaN(unitRateValue) || unitRateValue <= 0) {
        errors.unitRate = `Rate per ${formData.rateWeight} must be a positive number`;
        isValid = false;
      }
    }
    const totalContainers =
      formData.num_six_meters +
      formData.num_twelve_meters +
      formData.num_abnormal;
    if (totalContainers <= 0) {
      errors.containers = "Please add at least one container";
      isValid = false;
    }
    if (
      formData.stackDate &&
      formData.pickupDate &&
      new Date(formData.stackDate) < new Date(formData.pickupDate)
    ) {
      errors.stackDate = `${
        isImport ? "ETA" : "Stack date"
      } cannot be before pickup date`;
      isValid = false;
    }
    if (
      formData.lastFreeDate &&
      new Date(formData.lastFreeDate) < new Date(today)
    ) {
      errors.lastFreeDate = "Last Free Date cannot be in the past";
      isValid = false;
    }
    if (
      formData.lastFreeDate &&
      formData.stackDate &&
      new Date(formData.lastFreeDate) < new Date(formData.stackDate)
    ) {
      errors.lastFreeDate = `Last Free Date cannot be before ${
        isImport ? "ETA" : "stack date"
      }`;
      isValid = false;
    }
    setFieldErrors(errors);
    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0];
      scrollToField(firstErrorField);
    }
    return isValid;
  };

  // Check if shipment type is Import
  const isImportShipment = () => {
    const selectedShipmentType = shipmentTypes.find(
      (type) => type.shipkey.toString() === formData.shipmentTypeId
    );
    return (
      selectedShipmentType &&
      selectedShipmentType.shipmenttype.toLowerCase() === "import"
    );
  };

  const handleBackClick = () => {
    const stateToPass = {
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    };

    console.log("Navigating back to instructions with state:", stateToPass);
    navigate("/instructions", { state: stateToPass });
  };

  const handleSubmit = async (e) => {
    console.log("handleSubmit called");
    e.preventDefault();

    // Special validation for vessel name and stack date for import and export shipment types
    // Skip vessel name for shipment type 4 (cross-haul break bulk)
    let hasSpecialValidationErrors = false;
    if (formData.shipmentTypeId === "1" || formData.shipmentTypeId === "2") {
      const errors = {};

      if (!formData.vesselName || !formData.vesselName.trim()) {
        errors.vesselName = "Vessel name is required";
        hasSpecialValidationErrors = true;
      }

      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = `${
          formData.shipmentTypeId === "1" ? "ETA" : "Stack"
        } date is required`;
        hasSpecialValidationErrors = true;
      }

      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log("Special validation failed:", errors);
        return;
      }
    } else if (formData.shipmentTypeId === "4") {
      // For shipment type 4 (cross-haul break bulk), only validate stack date
      const errors = {};
      if (!formData.stackDate || !formData.stackDate.trim()) {
        errors.stackDate = "Stack date is required";
        hasSpecialValidationErrors = true;
      }
      if (hasSpecialValidationErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        scrollToField(Object.keys(errors)[0]);
        console.log("Special validation failed:", errors);
        return;
      }
    }

    // Then validate the rest of the form
    console.log("Validating form...");
    const isValid = validateForm();
    console.log("Form validation result:", isValid);

    if (!isValid) {
      console.log("Form validation failed");
      return;
    }

    try {
      console.log("Form is valid, proceeding with submission...");
      // Calculate total cost using individual rates
      const sixRate = Number(formData.rateper_6 || 0);
      const twelveRate = Number(formData.rateper_12 || 0);
      const abnormalRateNum = Number(formData.rateper_abnormal || 0);

      const totalCost =
        formData.num_six_meters * sixRate +
        formData.num_twelve_meters * twelveRate +
        formData.num_abnormal * abnormalRateNum;

      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal;

      // IMPROVED: Create comprehensive form data with all current values
      const updatedFormData = {
        ...formData,
        // Rate fields for display
        rateper_6: sixRate.toString(),
        rateper_12: twelveRate.toString(),
        rateper_abnormal: abnormalRateNum.toString(),
        // Rate fields for database
        rateper_6: sixRate,
        rateper_12: twelveRate,
        rateper_abnormal: abnormalRateNum,
        total_cost: totalCost,
        weight:
          (isImport ||
            formData.shipmentTypeId === "2" ||
            formData.shipmentTypeId === "3") &&
          formData.rateWeight !== "Container"
            ? formData.weight || weight
            : null,
      };

      const stateToPass = {
        controllerData: updatedFormData,
        isImport: isImportShipment(),
        totalContainers: totalContainers,
        instructionId: instructionId,
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
        preservedContainers: preservedContainers,
      };

      console.log(
        "Navigating to FCcontrollerInstructionDetails with state:",
        stateToPass
      );

      navigate("/FCcontrollerInstructionDetails", { state: stateToPass });
    } catch (error) {
      console.error("Error processing form:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to process form. Please try again.",
      });
    }
  };

  const handleRetryFetch = () => {
    if (
      isLoading.clients ||
      isLoading.shipmentTypes ||
      isLoading.startingPoints ||
      isLoading.destinations
    ) {
      return;
    }
    fetchClients();
    fetchShipmentTypes();
    fetchStartingPoints();
    fetchDestinations();
    if (instructionId) {
      fetchInstructionData(instructionId);
    }
    setErrorModal({
      isOpen: false,
      message: "",
    });
  };

  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
  };

  const readOnlyStyle = {
    backgroundColor: "#f8f9fa",
    cursor: "not-allowed",
    color: "#6c757d",
    border: "1px solid #e9ecef",
  };

  // Inner tooltip component with different styling
  const InstructionErrorTooltip = ({ message }) => {
    if (!message) return null;
    return (
      <div className="controller-instructions-error-tooltip">
        {message}
        <div className="controller-instructions-tooltip-arrow"></div>
      </div>
    );
  };

  // Loading state check that includes all required data
  const isLoadingComplete =
    !isLoading.clients &&
    !isLoading.shipmentTypes &&
    !isLoading.startingPoints &&
    !isLoading.destinations &&
    !isLoading.instruction &&
    Object.keys(formData).length > 0; // Ensure formData is initialized

  // Debug log for loading states
  console.log("Loading states:", {
    clients: isLoading.clients,
    shipmentTypes: isLoading.shipmentTypes,
    startingPoints: isLoading.startingPoints,
    destinations: isLoading.destinations,
    instruction: isLoading.instruction,
    formDataKeys: Object.keys(formData),
    isLoadingComplete,
  });

  // Ensure we have all required data before rendering the form
  if (!isLoadingComplete) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading data...</p>
      </div>
    );
  }

  // Check if we have all required data
  console.log("Data availability check:", {
    clients: clients.length,
    shipmentTypes: shipmentTypes.length,
    startingPoints: startingPoints.length,
    destinations: destinations.length,
  });

  if (
    clients.length === 0 ||
    shipmentTypes.length === 0 ||
    startingPoints.length === 0
  ) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Failed to load required data. Please try again.</p>
        <button
          onClick={handleRetryFetch}
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
    );
  }

  // Log form data before render
  console.log("Rendering with formData:", formData);
  console.log(
    "Client options:",
    clients.map((c) => ({ id: c.m5clientkey, name: c.companyname }))
  );
  console.log("Current client selection:", formData.clientId);

  return (
    <div className="controller-instructions-root">
      <div className="controller-instructions-unique-wrapper">
        {errorModal.isOpen &&
          errorModal.message.includes("Failed to fetch") && (
            <ErrorModal
              isOpen={errorModal.isOpen}
              message={errorModal.message}
              onClose={() => setErrorModal({ isOpen: false, message: "" })}
              type="error"
            />
          )}
        {warningModal.isOpen && (
          <ErrorModal
            isOpen={warningModal.isOpen}
            message={warningModal.message}
            onClose={() =>
              setWarningModal((prev) => ({ ...prev, isOpen: false }))
            }
            onConfirm={warningModal.onConfirm}
            type="warning"
            showConfirmButton={true}
            confirmButtonText="Reset Counts & Continue"
            cancelButtonText="Cancel"
          />
        )}
        <div className="controller-instructions-header">
          <button
            className="controller-instructions-back-button"
            onClick={() => handleBackClick()}
          >
            Back
          </button>
        </div>
        <div
          className="controller-instructions-form-container"
          style={{ maxWidth: "1200px" }}
        >
          {isReadOnly && (
            <div
              style={{
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "20px",
                textAlign: "center",
                color: "#856404",
                fontWeight: "bold",
              }}
            >
              ⚠️ This instruction is {formData.status} and is in read-only mode
            </div>
          )}
          {showSetRateWarning && !isReadOnly && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                border: "1px solid #f5c6cb",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "20px",
                textAlign: "center",
                color: "#721c24",
                fontWeight: "bold",
              }}
            >
              ⚠️ Break Bulk Set Rate Warning: The historical rate (R{historicalSetRate?.toFixed(2)}) differs from the current client rate (R{setRateValue?.toFixed(2)}). Saving will update the historical rate to the current rate.
            </div>
          )}
          <div className="controller-instructions-form-section controller-instructions-client-info-section">
            <div className="controller-instructions-form-row">
              <div className="controller-instructions-form-field">
                <label>Client</label>
                <div
                  className="controller-instructions-select-wrapper"
                  ref={fieldRefs.clientId}
                >
                  <select
                    style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                    className={`dropdown ${
                      fieldErrors.clientId
                        ? "controller-instructions-error-field"
                        : ""
                    }`}
                    name="clientId"
                    value={formData.clientId || ""}
                    onChange={handleClientChange}
                    disabled={true}
                  >
                    <option value="" disabled>
                      Select Client
                    </option>
                    {clients.map((client) => (
                      <option
                        key={client.m5clientkey}
                        value={client.m5clientkey}
                      >
                        {client.companyname}
                      </option>
                    ))}
                  </select>
                  <InstructionErrorTooltip message={fieldErrors.clientId} />
                </div>
              </div>
              <div className="controller-instructions-form-field">
                <label>Representative</label>
                <input
                  type="text"
                  className="controller-instructions-form-input"
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  value={formData.representative || ""}
                  readOnly
                  placeholder="Autoload representative"
                  name="representative"
                  onChange={handleInputChange}
                  disabled={true}
                />
                <InstructionErrorTooltip message={fieldErrors.representative} />
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
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  disabled={isReadOnly}
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
                  style={isReadOnly ? readOnlyStyle : nonEditableStyle}
                  disabled={isReadOnly}
                />
              </div>
              <div className="controller-instructions-form-field">
                <label>Creation Date</label>
                <input
                  type="date"
                  className="controller-instructions-form-input"
                  name="createdAt"
                  value={formData.createdAt || ""}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  style={isReadOnly ? readOnlyStyle : {}}
                  ref={fieldRefs.createdAt}
                />
              </div>
            </div>
          </div>
          <div className="controller-instructions-form-section">
            {false && (
              <div
                className="controller-instructions-form-row"
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 180px", maxWidth: "220px" }}
                >
                  <label>Shipment Type</label>
                  <div
                    className="controller-instructions-select-wrapper"
                    ref={fieldRefs.shipmentTypeId}
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
                      disabled={isReadOnly}
                      style={isReadOnly ? readOnlyStyle : {}}
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
                    <InstructionErrorTooltip
                      message={fieldErrors.shipmentTypeId}
                    />
                  </div>
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Pickup Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.pickup}
                      value={formData.pickup || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.pickup}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.pickup
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="pickup"
                        value={formData.pickup || ""}
                        onChange={handlePickupChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Pickup
                        </option>
                        {startingPoints.map((point) => (
                          <option key={point.id} value={point.startingpoint}>
                            {point.startingpoint}
                          </option>
                        ))}
                      </select>
                      <InstructionErrorTooltip message={fieldErrors.pickup} />
                    </div>
                  )}
                </div>

                <div
                  className="controller-instructions-form-field"
                  style={{ flex: "1 1 220px", maxWidth: "260px" }}
                >
                  <label>Dropoff Location</label>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      ref={fieldRefs.dropoff}
                      value={formData.dropoff || ""}
                      readOnly
                      style={readOnlyStyle}
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          message:
                            "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                          action: "unlock-route",
                        })
                      }
                    />
                  ) : (
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.dropoff}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.dropoff
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="dropoff"
                        value={formData.dropoff || ""}
                        onChange={handleDropoffChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      >
                        <option value="" disabled>
                          Select Dropoff
                        </option>
                        {destinations.map((dest) => (
                          <option key={dest.id} value={dest.destination}>
                            {dest.destination}
                          </option>
                        ))}
                      </select>
                      <InstructionErrorTooltip message={fieldErrors.dropoff} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="controller-instructions-form-section">
            <div className="controller-instructions-form-row controller-instructions-trailer-container">
              <div
                className="controller-instructions-trailer-title"
                style={{ display: "none" }}
              >
                <h3>Trailer Size</h3>
              </div>
              <hr
                className="controller-instructions-divider"
                style={{ display: "none" }}
              />
              <div
                className="controller-instructions-container-section"
              >
                <div className="controller-instructions-container-group">
                  <div className="controller-instructions-container-label">
                    <span className="controller-instructions-trailer-size-label">
                      Trailer Size
                    </span>
                    <label>No. of Containers</label>
                    {fieldErrors.containers && (
                      <div className="controller-instructions-container-error-message">
                        {fieldErrors.containers}
                      </div>
                    )}
                  </div>
                  <div className="controller-instructions-container-inputs">
                    <div className="controller-instructions-container-input">
                      <label>6m</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_six_meters}
                          min="0"
                          name="num_six_meters"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_6}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_6
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_6 || ""}
                            name="rateper_6"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <InstructionErrorTooltip
                            message={fieldErrors.rateper_6}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="controller-instructions-container-input">
                      <label>12m</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_twelve_meters}
                          min="0"
                          name="num_twelve_meters"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_12}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_12
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_12 || ""}
                            name="rateper_12"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <InstructionErrorTooltip
                            message={fieldErrors.rateper_12}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="controller-instructions-container-input">
                      <label>Abnormal</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={
                            fieldErrors.containers
                              ? "controller-instructions-error-field"
                              : ""
                          }
                          value={formData.num_abnormal}
                          min="0"
                          name="num_abnormal"
                          onChange={(e) => handleNumericInputChange(e)}
                          disabled={
                            formData.rateWeight !== "Container" || isReadOnly || isSetRateMode
                          }
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <div
                          className="controller-instructions-input-wrapper controller-instructions-rate-input"
                          ref={fieldRefs.rateper_abnormal}
                        >
                          <input
                            type="text"
                            className={`controller-instructions-form-input ${
                              fieldErrors.rateper_abnormal
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            placeholder="Rate"
                            value={formData.rateper_abnormal || ""}
                            name="rateper_abnormal"
                            onChange={handleRateChange}
                            disabled={
                              formData.rateWeight !== "Container" || isReadOnly
                            }
                            style={isReadOnly ? readOnlyStyle : {}}
                          />
                          <ErrorTooltip
                            message={fieldErrors.rateper_abnormal}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hazardous and Surcharges checkboxes have been removed from this section */}
                </div>
                {/* Main form section */}
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
                    <div
                      className="controller-instructions-select-wrapper"
                      ref={fieldRefs.shipmentTypeId}
                    >
                      <select
                        className={`controller-instructions-dropdown ${
                          fieldErrors.shipmentTypeId
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
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
                      <InstructionErrorTooltip
                        message={fieldErrors.shipmentTypeId}
                      />
                    </div>
                  </div>
                  {routeEditMode === "locked" && hasRouteMismatch ? (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.pickup || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <InstructionErrorTooltip message={fieldErrors.pickup} />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field">
                        <label>Dropoff Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <input
                            type="text"
                            className="controller-instructions-dropdown"
                            value={formData.dropoff || ""}
                            readOnly
                            style={readOnlyStyle}
                            onClick={() =>
                              setConfirmationModal({
                                isOpen: true,
                                message:
                                  "The current route no longer matches any client rates. To edit it, you will need to select a new valid starting point and dropoff from the current lists. Do you want to continue?",
                                action: "unlock-route",
                              })
                            }
                          />
                          <InstructionErrorTooltip message={fieldErrors.dropoff} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="controller-instructions-form-field">
                        <label>Pickup Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.pickup}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.pickup
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="pickup"
                            value={formData.pickup || ""}
                            onChange={handlePickupChange}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          >
                            <option value="" disabled>
                              Select Pickup
                            </option>
                            {startingPoints.map((point) => (
                              <option key={point.id} value={point.startingpoint}>
                                {point.startingpoint}
                              </option>
                            ))}
                          </select>
                          <InstructionErrorTooltip message={fieldErrors.pickup} />
                        </div>
                      </div>
                      <div className="controller-instructions-form-field">
                        <label>Dropoff Location</label>
                        <div
                          className="controller-instructions-select-wrapper"
                          ref={fieldRefs.dropoff}
                        >
                          <select
                            className={`controller-instructions-dropdown ${
                              fieldErrors.dropoff
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="dropoff"
                            value={formData.dropoff || ""}
                            onChange={handleDropoffChange}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                          >
                            <option value="" disabled>
                              Select Dropoff
                            </option>
                            {destinations.map((dest) => (
                              <option key={dest.id} value={dest.destination}>
                                {dest.destination}
                              </option>
                            ))}
                          </select>
                          <InstructionErrorTooltip message={fieldErrors.dropoff} />
                        </div>
                      </div>
                    </>
                  )}
                  {/* This surchages section has been moved to be next to the checkbox */}

                  {/* Compact Rates per dropdown and input fields in one row */}
                  <div
                    className="controller-instructions-form-field"
                  >
                    <label>Unit per</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        width: "100%",
                      }}
                    >
                      {/* Unit per dropdown */}
                      <div
                        className="controller-instructions-select-wrapper"
                        style={{ minWidth: "100px", marginTop: 0 }}
                      >
                        <select
                          className="controller-instructions-dropdown"
                          name="rateWeight"
                          value={formData.rateWeight || "Container"}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            ...(isReadOnly ? readOnlyStyle : {}),
                          }}
                          ref={fieldRefs.rateWeight}
                          disabled={isReadOnly || isAddOn}
                        >
                          {/* Show kg and ton options only for Cross-haul (break bulk) - type 4 */}
                          {formData.shipmentTypeId === "4" && (
                            <>
                              <option value="kg">kg</option>
                              <option value="ton">ton</option>
                            </>
                          )}
                          {/* Show Container option only for Import, Export, and Cross-haul - types 1, 2, 3 */}
                          {(formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2" ||
                            formData.shipmentTypeId === "3" ||
                            String(formData.shipmentTypeId) === "5") && (
                            <option value="Container">Container</option>
                          )}
                        </select>
                      </div>

                      {/* Rate per unit and weight textboxes */}
                      {(formData.rateWeight === "kg" ||
                        formData.rateWeight === "m³" ||
                        formData.rateWeight === "ton") && (
                        <>
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
                                  className={`controller-instructions-form-input ${
                                    fieldErrors.unitRate
                                      ? "controller-instructions-error-field"
                                      : ""
                                  }`}
                                  name="unitRate"
                                  value={formData.unitRate || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (
                                      value === "" ||
                                      /^[0-9]*\.?[0-9]*$/.test(value)
                                    ) {
                                      handleInputChange(e);
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                                <InstructionErrorTooltip
                                  message={fieldErrors.unitRate}
                                />
                              </div>
                            </div>

                            {/* Weight Field for non-type-4 weight-based shipments */}
                            {String(formData.shipmentTypeId) !== "4" && (
                              <div
                                className="controller-instructions-form-field"
                                style={{ flex: 1, minWidth: "150px" }}
                              >
                                <label>{`Weight (${formData.rateWeight})`}</label>
                                <div
                                  className="controller-instructions-input-wrapper"
                                  ref={fieldRefs.weight}
                                  style={{ width: "100%" }}
                                >
                                  <input
                                    type="text"
                                    className={`controller-instructions-form-input ${
                                      fieldErrors.weight
                                        ? "controller-instructions-error-field"
                                        : ""
                                    }`}
                                    name="weight"
                                    value={formData.weight || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^[0-9]*\.?[0-9]*$/.test(value)
                                      ) {
                                        handleInputChange(e);
                                      }
                                    }}
                                    disabled={isReadOnly}
                                    style={isReadOnly ? readOnlyStyle : {}}
                                  />
                                  <InstructionErrorTooltip
                                    message={fieldErrors.quantity}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Set Rate checkbox and value - positioned below Unit per for shipment type 4 */}
                    {formData.shipmentTypeId === "4" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                          <input
                            type="checkbox"
                            checked={isSetRate}
                            onChange={(e) => {
                              const nextChecked = e.target.checked
                              setIsSetRate(nextChecked)
                            }}
                            disabled={isReadOnly}
                          />
                          Break Bulk Set Rate
                        </label>
                        {isSetRate && (
                          <div className="controller-instructions-input-wrapper" style={{ width: "140px" }}>
                            <input
                              type="text"
                              className="controller-instructions-form-input"
                              value={
                                // Show historical value when status is Completed
                                isReadOnly && historicalSetRate !== null 
                                  ? String(historicalSetRate)
                                  : Number.isFinite(Number(setRateValue)) 
                                    ? String(setRateValue) 
                                    : ""
                              }
                              readOnly
                              disabled
                              style={{
                                ...readOnlyStyle,
                                width: "100%",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* End of main form section */}

                {/* Hazardous / Surcharge checkboxes moved below Rate Type */}
                <div
                  className="controller-instructions-date-time-group"
                >
                  <div
                    className="controller-instructions-shipment-task-row"
                    style={{ order: -1, marginBottom: "8px" }}
                  >
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Booking Reference</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.bookingRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.bookingRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter booking ref"
                          name="bookingRef"
                          value={formData.bookingRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <InstructionErrorTooltip
                          message={fieldErrors.bookingRef}
                        />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Client File Ref</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.clientFileRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.clientFileRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter client file ref"
                          name="clientFileRef"
                          value={formData.clientFileRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <InstructionErrorTooltip
                          message={fieldErrors.clientFileRef}
                        />
                      </div>
                    </div>
                    {/* Booking / File / VAT inline with task */}
                    <div
                      className="controller-instructions-booking-inline-row"
                      style={{ display: "none" }}
                    >
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ flex: "0 1 160px" }}
                      >
                        <label>Booking Reference</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter booking ref"
                            name="bookingRef"
                            value={formData.bookingRef}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div
                        className="controller-instructions-form-field controller-instructions-small-field"
                        style={{ flex: "0 1 160px" }}
                      >
                        <label>Client File Ref</label>
                        <div className="controller-instructions-input-wrapper">
                          <input
                            type="text"
                            className="controller-instructions-form-input"
                            placeholder="Enter client file ref"
                            name="clientFileRef"
                            value={formData.clientFileRef}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KSM File Reference and Last Free Date row below Booking/Client */}
                  <div
                    className="controller-instructions-shipment-task-row"
                    style={{ marginBottom: "8px" }}
                  >
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Ksm File Reference</label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.ksmFileRef}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.ksmFileRef
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Input KSM File Reference"
                          name="ksmFileRef"
                          value={formData.ksmFileRef}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                        />
                        <InstructionErrorTooltip message={fieldErrors.ksmFileRef} />
                      </div>
                    </div>
                    <div className="controller-instructions-form-field controller-instructions-small-field">
                      <label>Last Free Date</label>
                      <div
                        className="controller-instructions-date-wrapper"
                        ref={fieldRefs.lastFreeDate}
                      >
                        <input
                          type="date"
                          className={`controller-instructions-form-input ${
                            fieldErrors.lastFreeDate
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          name="lastFreeDate"
                          value={formData.lastFreeDate}
                          onChange={handleInputChange}
                          min={today}
                          ref={lastFreeDateRef}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                          onKeyDown={(e) => e.preventDefault()} // stops typing
                        />
                        <InstructionErrorTooltip
                          message={fieldErrors.lastFreeDate}
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
                      <label>VAT</label>
                      <div className="controller-instructions-input-wrapper">
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: isReadOnly ? "not-allowed" : "pointer",
                          }}
                        >
                          <span style={{ fontSize: "12px" }}>0%</span>
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
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
                    {(isAddOn ||
                      String(formData.shipmentTypeId) === "1" ||
                      String(formData.shipmentTypeId) === "2") && (
                      <div className="controller-instructions-form-field controller-instructions-small-field">
                        <label>
                          {String(formData.shipmentTypeId) === "1"
                            ? "ETA Date"
                            : "Stack Date"}{" "}
                          {(String(formData.shipmentTypeId) === "1" ||
                            String(formData.shipmentTypeId) === "2") && (
                            <span style={{ color: "red" }}>*</span>
                          )}
                        </label>
                        <div
                          className="controller-instructions-date-wrapper"
                          ref={fieldRefs.stackDate}
                        >
                          <input
                            type="date"
                            className={`controller-instructions-form-input ${
                              fieldErrors.stackDate
                                ? "controller-instructions-error-field"
                                : ""
                            }`}
                            name="stackDate"
                            value={formData.stackDate || ""}
                            onChange={handleInputChange}
                            min={today}
                            ref={etaDateRef}
                            disabled={isReadOnly}
                            style={isReadOnly ? readOnlyStyle : {}}
                            required={
                              String(formData.shipmentTypeId) === "1" ||
                              String(formData.shipmentTypeId) === "2"
                            }
                            onKeyDown={(e) => e.preventDefault()}
                          />
                          <InstructionErrorTooltip
                            message={fieldErrors.stackDate}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {String(formData.shipmentTypeId) !== "4" && (
                    <div className="controller-instructions-form-field">
                      <label>
                        Vessel Name{" "}
                        {(formData.shipmentTypeId === "1" ||
                          formData.shipmentTypeId === "2") && (
                          <span style={{ color: "red" }}>*</span>
                        )}
                      </label>
                      <div
                        className="controller-instructions-input-wrapper"
                        ref={fieldRefs.vesselName}
                      >
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${
                            fieldErrors.vesselName
                              ? "controller-instructions-error-field"
                              : ""
                          }`}
                          placeholder="Enter vessel name"
                          name="vesselName"
                          value={formData.vesselName || ""}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          style={isReadOnly ? readOnlyStyle : {}}
                          required={
                            formData.shipmentTypeId === "1" ||
                            formData.shipmentTypeId === "2"
                          }
                        />
                        <InstructionErrorTooltip
                          message={fieldErrors.vesselName}
                        />
                      </div>
                    </div>
                  )}
                  <div className="controller-instructions-form-field">
                    <label>Description</label>
                    <div
                      className="controller-instructions-input-wrapper"
                      ref={fieldRefs.description}
                    >
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${
                          fieldErrors.description
                            ? "controller-instructions-error-field"
                            : ""
                        }`}
                        placeholder="Enter description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={isReadOnly}
                        style={isReadOnly ? readOnlyStyle : {}}
                      />
                      <InstructionErrorTooltip
                        message={fieldErrors.description}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Details Table for shipment type 4 */}
          {String(formData.shipmentTypeId) === "4" && weightRows.length > 0 && (
            <div
              className="controller-instructions-form-section"
              style={{ marginTop: "0", paddingTop: "0" }}
            >
              <div
                className="controller-instructions-form-row"
                style={{ marginTop: "0" }}
              >
                <div
                  className="controller-instructions-form-field"
                  style={{ width: "100%" }}
                >
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
                          <th style={{ border: "1px solid #dee2e6", padding: "4px" }}>
                            Actions
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
                                onChange={(e) =>
                                  updateWeightRow(row.id, "ksmDmNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.ticketNo || ""}
                                onChange={(e) =>
                                  updateWeightRow(row.id, "ticketNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.receiptBookNo || ""}
                                onChange={(e) =>
                                  updateWeightRow(row.id, "receiptBookNo", e.target.value)
                                }
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td style={{ border: "1px solid #dee2e6", padding: "2px 4px" }}>
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={row.weight || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(value)
                                  ) {
                                    updateWeightRow(row.id, "weight", value);
                                  }
                                }}
                                disabled={isReadOnly}
                                style={{ width: "100%", fontSize: "12px", height: "26px" }}
                              />
                            </td>
                            <td
                              style={{
                                border: "1px solid #dee2e6",
                                padding: "2px 4px",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestDeleteWeightRow(row)}
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    borderRadius: "4px",
                                    border: "1px solid #dc3545",
                                    backgroundColor: "#fff",
                                    color: "#dc3545",
                                    cursor: "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!isReadOnly && (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: "4px", textAlign: "left" }}
                            >
                              <button
                                type="button"
                                onClick={addWeightRow}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
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
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Container Details Table */}
          {console.log("Debug weight column visibility:", {
            isImport,
            shipmentTypeId: formData.shipmentTypeId,
            shipmentTypeIdType: typeof formData.shipmentTypeId,
            shipmentTypeName: formData.shipmentTypeName,
            stringComparison: {
              isEqual2: String(formData.shipmentTypeId) === "2",
              isEqual3: String(formData.shipmentTypeId) === "3",
              isEqual4: String(formData.shipmentTypeId) === "4",
            },
            shouldShowWeight:
              isImport ||
              String(formData.shipmentTypeId) === "2" ||
              String(formData.shipmentTypeId) === "3",
            weightColumnCondition: Boolean(
              isImport ||
                String(formData.shipmentTypeId) === "2" ||
                String(formData.shipmentTypeId) === "3"
            ),
            containers: containers.map((c) => ({
              id: c.id,
              type: c.containerType,
              weight: c.weight,
            })),
          })}
          {/* Only show container details table when shipment type is NOT cross-haul (break bulk) (type 4) */}
          {containers.length > 0 && formData.shipmentTypeId !== "4" && (
            <div
              className="controller-instructions-form-section"
              style={
                String(formData.shipmentTypeId) === "2"
                  ? { marginTop: "-40px", paddingTop: "0" }
                  : undefined
              }
            >
              <div className="controller-instructions-container-details-section">
                <h3>Container Details</h3>
                {(containerSuccessMessage || rateUpdateMessage) && (
                  <div className="controller-instructions-success-message">
                    {containerSuccessMessage || rateUpdateMessage}
                  </div>
                )}
                <div
                  className="controller-instructions-container-table-wrapper"
                  style={{
                    overflowX: "auto",
                    marginBottom: "20px",
                  }}
                >
                  <table
                    className="controller-instructions-container-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: "10px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Container Type
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Container Number
                        </th>
                        {/* Add File Reference header for export shipments */}
                        {String(formData.shipmentTypeId) === "2" && (
                          <th
                            style={{
                              padding: "12px 8px",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            File Reference
                          </th>
                        )}
                        {/* Force string comparison for shipmentTypeId */}
                        {(isImport ||
                          String(formData.shipmentTypeId) === "2" ||
                          String(formData.shipmentTypeId) === "3") && (
                          <th
                            style={{
                              padding: "12px 8px",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            Weight
                          </th>
                        )}
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Actions
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "left",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Cargo Description
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Hazardous
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          Add Surcharges
                        </th>
                        <th
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            borderBottom: "2px solid #ddd",
                          }}
                        >
                          VGM
                        </th>
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
                                className={`controller-instructions-form-input ${
                                  containerFieldErrors[
                                    `container-${container.id}`
                                  ]
                                    ? "controller-instructions-error-field"
                                    : ""
                                }`}
                                value={container.containerNum}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "containerNum",
                                    e.target.value
                                  )
                                }
                                placeholder="Up to 20 alphanumeric characters"
                                maxLength={20}
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                              {containerFieldErrors[
                                `container-${container.id}`
                              ] && (
                                <div
                                  className="controller-instructions-container-error-text"
                                  style={{
                                    color: "#e74c3c",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                    fontWeight: "500",
                                    display: "block",
                                  }}
                                >
                                  {
                                    containerFieldErrors[
                                      `container-${container.id}`
                                    ]
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Add File Reference field only for export shipments */}
                          {String(formData.shipmentTypeId) === "2" && (
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className="controller-instructions-form-input"
                                  value={container.fileRef}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "fileRef",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter file reference"
                                  maxLength={20}
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                              </div>
                            </td>
                          )}
                          {/* Force string comparison for shipmentTypeId */}
                          {(isImport ||
                            String(formData.shipmentTypeId) === "2" ||
                            String(formData.shipmentTypeId) === "3") && (
                            <td>
                              <div className="controller-instructions-input-wrapper">
                                <input
                                  type="text"
                                  className={`controller-instructions-form-input ${
                                    containerFieldErrors[
                                      `weight-${container.id}`
                                    ]
                                      ? "controller-instructions-error-field"
                                      : ""
                                  }`}
                                  value={
                                    container.weight === null ||
                                    container.weight === undefined
                                      ? ""
                                      : typeof container.weight === "number"
                                      ? container.weight.toString()
                                      : container.weight
                                  }
                                  onFocus={() => {
                                    console.log(
                                      `Weight input focus - container ${container.id}:`,
                                      {
                                        weightValue: container.weight,
                                        weightType: typeof container.weight,
                                        displayValue:
                                          container.weight === null
                                            ? ""
                                            : container.weight.toString(),
                                      }
                                    );
                                  }}
                                  onChange={(e) =>
                                    handleContainerChange(
                                      container.id,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                  disabled={isReadOnly}
                                  style={isReadOnly ? readOnlyStyle : {}}
                                />
                                {containerFieldErrors[
                                  `weight-${container.id}`
                                ] && (
                                  <div
                                    className="controller-instructions-container-error-text"
                                    style={{
                                      color: "#e74c3c",
                                      fontSize: "12px",
                                      marginTop: "4px",
                                      fontWeight: "500",
                                      display: "block",
                                    }}
                                  >
                                    {
                                      containerFieldErrors[
                                        `weight-${container.id}`
                                      ]
                                    }
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #eee",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteContainer(container)}
                                style={{
                                  padding: "2px 8px",
                                  fontSize: "11px",
                                  borderRadius: "4px",
                                  border: "1px solid #dc3545",
                                  backgroundColor: "#fff",
                                  color: "#dc3545",
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                          <td>
                            <div className="controller-instructions-input-wrapper">
                              <input
                                type="text"
                                className="controller-instructions-form-input"
                                value={container.cargoDescription}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "cargoDescription",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter cargo description"
                                disabled={isReadOnly}
                                style={isReadOnly ? readOnlyStyle : {}}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.hazardous === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "hazardous",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.addSurcharges === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "addSurcharges",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="controller-instructions-checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="controller-instructions-form-checkbox"
                                checked={container.vgm === true}
                                onChange={(e) =>
                                  handleContainerChange(
                                    container.id,
                                    "vgm",
                                    e.target.checked
                                  )
                                }
                                disabled={isReadOnly}
                                style={{
                                  transform: "scale(1.2)",
                                  cursor: isReadOnly ? "default" : "pointer"
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isContainerLoading && (
                  <div className="controller-instructions-loading-message">
                    Updating containers...
                  </div>
                )}
              </div>
            </div>
          )}
          {!isReadOnly && (
            <div
              className="controller-instructions-form-actions"
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <button
                className="controller-instructions-save-button"
                onClick={handleSaveChanges}
                style={{
                  backgroundColor: "#4a90e2",
                  color: "white",
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Save Changes
              </button>
              {(formData.status === "New" || formData.status === "In Progress") && (
                <>
                  <button
                    className="controller-instructions-delete-button"
                    onClick={handleDeleteInstruction}
                    style={{
                      backgroundColor: "#e74c3c",
                      color: "white",
                      padding: "12px 24px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                      marginRight: "10px",
                    }}
                  >
                    Delete Instruction
                  </button>
                  {!isInvoiced && (
                    <button
                      className="controller-instructions-invoice-button"
                      onClick={handleCreateInvoice}
                      style={{
                        backgroundColor: "#27ae60",
                        color: "white",
                        padding: "12px 24px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      Invoice
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {isReadOnly && (
            <div
              className="controller-instructions-form-actions"
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <div
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "4px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                This instruction is {formData.status} and cannot be edited
              </div>
            </div>
          )}
        </div>
        {/* Confirmation Modal */}
        {confirmationModal.isOpen && (
          <div
            className="controller-instructions-modal-overlay"
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
              className="controller-instructions-modal-content"
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3 style={{ marginBottom: "16px", color: "#333" }}>
                Confirm Save
              </h3>
              <p
                style={{
                  marginBottom: "24px",
                  lineHeight: "1.5",
                  color: "#666",
                }}
              >
                {confirmationModal.message}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  onClick={handleCancelAction}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    color: "#666",
                    cursor: "pointer",
                  }}
                >
                  No, Let Me Edit
                </button>
                <button
                  onClick={handleConfirmAction}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#4a90e2",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Yes, Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FCcontrollerinstructions;
