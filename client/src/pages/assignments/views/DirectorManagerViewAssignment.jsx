"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaTruckFast } from "react-icons/fa6";
import "../css/UpdateInstruction.css";
import api from "../../../api"; // Import the Axios instance

const modalAnimation = `
 @keyframes fadeIn {
   from { opacity: 0; }
   to { opacity: 1; }
 }
 
 @keyframes scaleIn {
   from { transform: scale(0.95); opacity: 0; }
   to { transform: scale(1); opacity: 1; }
 }
 
 .animate-fadeIn {
   animation: fadeIn 0.2s ease-out forwards;
 }
 
 .animate-scaleIn {
   animation: scaleIn 0.3s ease-out forwards;
 }
 
 .modal-wrapper {
   position: fixed;
   top: 0;
   left: 0;
   right: 0;
   bottom: 0;
   display: flex;
   align-items: center;
   justify-content: center;
   z-index: 50;
 }
 
 .modal-backdrop {
   position: fixed;
   top: 0;
   left: 0;
   right: 0;
   bottom: 0;
   background: linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%);
   z-index: 40;
 }
 
 .modal-container {
   background: white;
   border-radius: 12px;
   width: 400px;
   max-width: 90vw;
   box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
   z-index: 50;
   overflow: hidden;
 }
 
 .modal-header {
   padding: 20px 24px 0;
 }
 
 .modal-title {
   font-size: 18px;
   font-weight: 600;
   color: #111827;
   margin-bottom: 8px;
 }
 
 .modal-description {
   font-size: 14px;
   color: #6B7280;
   margin-bottom: 16px;
 }
 
 .modal-body {
   padding: 0 24px 16px;
 }
 
 .modal-item {
   display: flex;
   align-items: center;
   padding: 8px 0;
 }
 
 .modal-checkbox {
   width: 18px;
   height: 18px;
   border-radius: 4px;
   border: 2px solid #D1D5DB;
   margin-right: 12px;
   display: flex;
   align-items: center;
   justify-content: center;
 }
 
 .modal-checkbox.checked {
   background-color: #4F46E5;
   border-color: #4F46E5;
 }
 
 .modal-checkbox-icon {
   color: white;
   width: 12px;
   height: 12px;
 }
 
 .modal-item-text {
   font-size: 14px;
   color: #374151;
 }
 
 .modal-footer {
   padding: 16px 24px 20px;
   display: flex;
   justify-content: flex-end;
   gap: 12px;
 }
 
 .modal-btn {
   padding: 8px 16px;
   border-radius: 6px;
   font-weight: 500;
   font-size: 14px;
   transition: all 0.2s;
 }
 
 .modal-btn-secondary {
   background-color: #F3F4F6;
   color: #374151;
 }
 
 .modal-btn-secondary:hover {
   background-color: #E5E7EB;
 }
 
 .modal-btn-primary {
   background-color: #4F46E5;
   color: white;
 }
 
 .modal-btn-primary:hover {
   background-color: #4338CA;
 }

.toast-popup {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4F46E5;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: toastFadeIn 0.3s ease-out forwards, toastFadeOut 0.3s ease-in forwards 0.7s;
}

@keyframes toastFadeIn {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes toastFadeOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, -20px); }
}
`;

// Add this debug function at the top of the component
const debugDriverData = (drivers) => {
  if (!drivers || drivers.length === 0) {
    console.log("No drivers to debug");
    return;
  }

  console.log("Debugging driver data:");
  drivers.forEach((driver, index) => {
    console.log(`Driver ${index}:`);
    console.log(`  ID: ${driver.id} (${typeof driver.id})`);
    console.log(`  Driver ID: ${driver.driverid} (${typeof driver.driverid})`);
    console.log(
      `  Truck Reg: ${driver.truckregnumber} (${typeof driver.truckregnumber})`
    );
    console.log(
      `  Container: ${
        driver.containernumber
      } (${typeof driver.containernumber})`
    );
    console.log(`  Date: ${driver.date} (${typeof driver.date})`);
    console.log(`  Full Name: ${driver.full_name}`);
  });
};

function DirectorManagerViewAssignment() {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId || null;
  const selectedLegIndex = location.state?.selectedLegIndex;

  const isFromDocumentsPage = useRef(selectedLegIndex !== undefined);

  const [drivers, setDrivers] = useState([]);
  const [legs, setLegs] = useState([]);
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
  const [existingDrivers, setExistingDrivers] = useState([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [shipmentType, setShipmentType] = useState(null);
  const [instructionContainers, setInstructionContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isControllerRole, setIsControllerRole] = useState(false);
  const [rateWeight, setRateWeight] = useState(null);
const [isWeightBased, setIsWeightBased] = useState(false);
const [weightUnit, setWeightUnit] = useState('kg');

  // Replace the useEffect that fetches legs with this updated version
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchStartingPoints();
        await fetchDestinations();
        await fetchDrivers();
        await fetchTruckRegNums();
        await fetchShipmentType();
        await checkIfWeightBased();

        // If we have an instructionId, fetch containers for this instruction
        if (instructionId) {
          await fetchContainersForInstruction(instructionId);
          await fetchLegsForInstruction(instructionId);
          setInitialDataLoaded(true);
        } else {
          // Fallback to all containers if no specific instruction
          await fetchAllContainers();
          setInitialDataLoaded(true);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Failed to load data. Please try again.");
        setInitialDataLoaded(true); // Set to true even on error to prevent infinite loading
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Reset the navigation state when component mounts
    return () => {
      isFromDocumentsPage.current = false;
    };
  }, [instructionId]);

  useEffect(() => {
    const checkUserRole = () => {
      // Try to get role from localStorage
      let userRoleId = null;

      // Method 1: Try to get from "user" object
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          userRoleId = parsedUserData.roleid;
          console.log("Found role in user object:", userRoleId);
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }

      // Method 2: Try direct roleId keys if method 1 failed
      if (!userRoleId) {
        userRoleId =
          localStorage.getItem("roleId") || localStorage.getItem("userRoleId");
        console.log("Direct role ID from localStorage:", userRoleId);
      }

      // Convert to number if it's a string
      userRoleId = Number(userRoleId);

      // Check if user is a controller (roleid = 2)
      const isController = userRoleId === 2;
      console.log("User is controller:", isController);
      setIsControllerRole(isController);
    };

    checkUserRole();
  }, []);

  // Add a useEffect to log driver data whenever it changes
  useEffect(() => {
    if (drivers && drivers.length > 0) {
      console.log("Current drivers state:", JSON.stringify(drivers, null, 2));

      // Check if all fields are properly populated in the form
      drivers.forEach((driver, index) => {
        console.log(`Driver ${index} form field values:`);
        console.log(`  Driver ID: ${driver.driverid || "empty"}`);
        console.log(`  Truck Reg: ${driver.truckregnumber || "empty"}`);
        console.log(`  Container: ${driver.containernumber || "empty"}`);
        console.log(`  Date: ${driver.date || "empty"}`);
      });
    }
  }, [drivers]);

  useEffect(() => {
    // Only run this effect once when the component mounts with a selectedLegIndex
    if (
      initialDataLoaded &&
      selectedLegIndex !== undefined &&
      legs.length > 0
    ) {
      console.log(
        `Selecting leg at index ${selectedLegIndex} after navigation`
      );

      // Make sure the selectedLegIndex is valid
      if (selectedLegIndex < legs.length) {
        // Force a clean state before selecting the leg
        setCurrentLagIndex(null);
        setDrivers([]);

        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          handleSelectLeg(selectedLegIndex);
        }, 0);
      } else {
        console.error(
          `Selected leg index ${selectedLegIndex} is out of bounds (max: ${
            legs.length - 1
          })`
        );
      }
    }
  }, [initialDataLoaded, legs.length, selectedLegIndex]);

  // Replace the fetchLegsForInstruction function with this updated version
  const fetchLegsForInstruction = async (instructionId) => {
    try {
      console.log(`Fetching legs for instruction ID: ${instructionId}`);
      const response = await api.get(`/legs/${instructionId}`);
      console.log(
        "Legs data from server:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.length > 0) {
        // Transform the data to match our state structure
        const fetchedLegs = response.data.map((leg) => {
          // Check if leg has drivers and log them
          if (leg.drivers) {
            console.log(
              `Leg ${leg.legkey} has ${leg.drivers.length} drivers:`,
              JSON.stringify(leg.drivers, null, 2)
            );
          } else {
            console.log(`Leg ${leg.legkey} has no drivers`);
          }

          // Ensure drivers array has all fields properly formatted as strings
          const normalizedDrivers = (leg.drivers || []).map((driver) => {
            // Create a properly formatted driver object with all fields as strings
            const normalizedDriver = {
              id: driver.id || Date.now() + Math.random(),
              driverid: driver.driverid ? driver.driverid.toString() : "",
              truckregnumber: driver.truckregnumber || "",
              containernumber:
                driver.containernumber !== null
                  ? driver.containernumber.toString()
                  : "",
              container_type: driver.container_type || "",
              driverRate: driver.driverRate || driver.driverate || "",
              date: driver.date || "",
              driver_name: driver.driver_name || "",
              driver_surname: driver.driver_surname || "",
              full_name:
                driver.full_name ||
                (driver.driver_name && driver.driver_surname
                  ? `${driver.driver_name} ${driver.driver_surname}`
                  : driver.driverid
                  ? `Driver ID: ${driver.driverid}`
                  : "Unknown Driver"),
            };

            // Log the normalized driver data for debugging
            console.log(
              `Normalized driver:`,
              JSON.stringify(normalizedDriver, null, 2)
            );
            console.log(
              `Driver ID type: ${typeof normalizedDriver.driverid}, value: ${
                normalizedDriver.driverid
              }`
            );
            console.log(
              `Truck Reg type: ${typeof normalizedDriver.truckregnumber}, value: ${
                normalizedDriver.truckregnumber
              }`
            );
            console.log(
              `Container Number type: ${typeof normalizedDriver.containernumber}, value: ${
                normalizedDriver.containernumber
              }`
            );

            return normalizedDriver;
          });

          return {
            id: leg.legkey,
            legnumber: leg.legnumber,
            startingPoint: leg.startingpoint,
            destination: leg.destination,
            driverRate: leg.driverrate ? leg.driverrate.toString() : "",
            drivers: normalizedDrivers,
          };
        });

        console.log(
          "Transformed legs data:",
          JSON.stringify(fetchedLegs, null, 2)
        );
        setLegs(fetchedLegs);

        // Store existing drivers for display
        const allDrivers = fetchedLegs.flatMap((leg) => leg.drivers || []);
        setExistingDrivers(allDrivers);
        console.log(
          "All existing drivers:",
          JSON.stringify(allDrivers, null, 2)
        );

        // If we have legs but no current leg selected, select the first one
        // Only do this if we don't have a selectedLegIndex from navigation
        if (
          fetchedLegs.length > 0 &&
          currentLagIndex === null &&
          selectedLegIndex === undefined
        ) {
          setCurrentLagIndex(0);
          setFormData({
            startingPoint: fetchedLegs[0].startingPoint || "",
            driverRate: fetchedLegs[0].driverRate || "",
            destination: fetchedLegs[0].destination || "",
          });

          // If this leg has drivers, set them
          if (fetchedLegs[0].drivers && fetchedLegs[0].drivers.length > 0) {
            console.log(
              "Setting drivers for first leg:",
              JSON.stringify(fetchedLegs[0].drivers, null, 2)
            );
            setDrivers(fetchedLegs[0].drivers);
            debugDriverData(fetchedLegs[0].drivers);
          } else {
            console.log("No drivers for first leg, setting empty array");
            setDrivers([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching legs:", error);
    }
  };
  const checkIfWeightBased = async () => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/instructions/${instructionId}/details`);
    const rateWeightValue = response.data.rateweight;

    console.log('Rate weight value:', rateWeightValue);
    setRateWeight(rateWeightValue);

    const isWeight = rateWeightValue && rateWeightValue.toLowerCase() !== 'container';
    setIsWeightBased(isWeight);

    // Determine weight unit from rateweight value
    if (isWeight) {
      const unit = rateWeightValue.toLowerCase().includes('ton') ? 'ton' : 'kg';
      setWeightUnit(unit);
      console.log(`Weight-based instruction detected. Unit: ${unit}`);
    }
  } catch (error) {
    console.error('Error checking rate weight:', error);
  }
};

  const fetchContainersForInstruction = async (instructionId) => {
    try {
      const response = await api.get(
        `/containers/instruction/${instructionId}`
      );
      console.log("Containers for instruction:", response.data);

      // Store the full container data
      setInstructionContainers(response.data);

      // Extract just the container numbers for the dropdown
      setContainerOptions(
        response.data.map((container) => container.containernum.toString())
      );
    } catch (error) {
      console.error("Error fetching containers for instruction:", error);
      // Fallback to all containers
      fetchAllContainers();
    }
  };

  const fetchAllContainers = async () => {
    try {
      const response = await api.get("/containers/numbers");
      console.log("All container numbers:", response.data);
      setContainerOptions(response.data);
    } catch (error) {
      console.error("Error fetching container numbers:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await api.get("/employees/driverssub");
      console.log("Drivers from backend:", response.data);
      setEmployeeDrivers(response.data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchTruckRegNums = async () => {
    try {
      const response = await api.get("/trucks/regnums");
      console.log("Truck registration numbers from backend:", response.data);
      setTruckRegOptions(response.data);
    } catch (error) {
      console.error("Error fetching truck registration numbers:", error);
    }
  };

  const fetchStartingPoints = async () => {
    try {
      const response = await api.get("/starting-points");
      console.log("Starting points from backend:", response.data);
      setStartingPoints(response.data);
    } catch (error) {
      console.error("Error fetching starting points:", error);
    }
  };

  const fetchDestinations = async () => {
    try {
      const response = await api.get("/destinations");
      console.log("Destinations from backend:", response.data);
      setDestinations(response.data);
    } catch (error) {
      console.error("Error fetching destinations:", error);
    }
  };

  const fetchShipmentType = async () => {
    if (instructionId) {
      try {
        const response = await api.get(
          `/instructions/${instructionId}/shipment-type`
        );
        setShipmentType(response.data.shipment_type);
        console.log("Shipment type:", response.data.shipment_type);
      } catch (error) {
        console.error("Error fetching shipment type:", error);
      }
    }
  };

  // Replace the handleSelectLeg function with this updated version
  const handleSelectLeg = (index) => {
    // Load the selected leg data
    const selectedLeg = legs[index];
    setFormData({
      startingPoint: selectedLeg.startingPoint || "",
      driverRate: selectedLeg.driverRate || "",
      destination: selectedLeg.destination || "",
    });

    // Load drivers for this leg if any
    console.log("Selected leg:", JSON.stringify(selectedLeg, null, 2));
    console.log(
      "Selected leg drivers:",
      JSON.stringify(selectedLeg.drivers, null, 2)
    );

    // Ensure we're setting the drivers state correctly
    if (selectedLeg.drivers && selectedLeg.drivers.length > 0) {
      console.log(
        "Setting drivers for selected leg:",
        JSON.stringify(selectedLeg.drivers, null, 2)
      );

      // Make sure all driver entries have string values for their properties
      const normalizedDrivers = selectedLeg.drivers.map((driver) => {
        // Ensure all fields are properly formatted
        return {
          id: driver.id || Date.now() + Math.random(),
          driverid: driver.driverid ? driver.driverid.toString() : "",
          truckregnumber: driver.truckregnumber || "",
          containernumber:
            driver.containernumber !== null
              ? driver.containernumber.toString()
              : "",
          container_type: driver.container_type || "",
          driverRate: driver.driverRate || driver.driverate || "",
          date: driver.date || "",
          driver_name: driver.driver_name || "",
          driver_surname: driver.driver_surname || "",
          full_name:
            driver.full_name ||
            (driver.driver_name && driver.driver_surname
              ? `${driver.driver_name} ${driver.driver_surname}`
              : driver.driverid
              ? `Driver ID: ${driver.driverid}`
              : "Unknown Driver"),
        };
      });

      console.log(
        "Normalized drivers:",
        JSON.stringify(normalizedDrivers, null, 2)
      );
      setDrivers(normalizedDrivers);
      debugDriverData(normalizedDrivers);
    } else {
      console.log("No drivers for selected leg, setting empty array");
      setDrivers([]);
    }

    setCurrentLagIndex(index);
  };

  // Replace the handleBackClick function with this updated version
  const handleBackClick = () => {
    // Always navigate back to CompanyInstructions with the preserved state
    navigate("/CompanyInstructions", {
      state: {
        clientId,
        clientName: location.state?.clientName,
        selectedMonth: location.state?.selectedMonth,
        selectedYear: location.state?.selectedYear,
        activeFilter: location.state?.activeFilter,
      },
      replace: true,
    });
  };

  const handleViewDocuments = () => {
    // Navigate to the director documents view
    navigate("/DirectorDocs", {
      state: {
        clientId,
        instructionId,
        shipmentType: shipmentType,
      },
      replace: true,
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "white",
        paddingBottom: "200px",
      }}
    >
      <style>{modalAnimation}</style>
      <div>
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <br />
      {/* Leg Buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          marginLeft: "15px",
        }}
      >
{legs.map((leg, index) => (
  <button
    key={leg.id || index}
    style={{
      padding: "0.5rem 1rem",
      borderRadius: "0.375rem",
      backgroundColor:
        currentLagIndex === index ? "#22c55e" : "#e5e7eb",
      color: currentLagIndex === index ? "white" : "#1f2937",
      border: "none",
      cursor: "pointer",
      marginBottom: "15px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.25rem",
    }}
    onClick={() => handleSelectLeg(index)}
  >
    <span>Leg {index + 1}</span>
    {leg.drivers && leg.drivers.length > 0 && (
      <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center" }}>
        ({leg.drivers.length}
        <FaTruckFast className="driver-icon" style={{ marginLeft: "0.25rem" }} />)
      </span>
    )}
  </button>
))}
      </div>

      {legs.length > 0 && (
        <div className="finalise-btn">
          <button className="finalise-btn2" onClick={handleViewDocuments}>
            Documents
          </button>
        </div>
      )}

      {/* Main Form */}
      <div style={{ padding: "0 1rem" }}>
        <div
          style={{
            backgroundColor: "#eff6ff",
            padding: "1.5rem",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <div style={{ flex: "1", minWidth: "100px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Starting Point
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    backgroundColor: "#f3f4f6",
                  }}
                  value={formData.startingPoint}
                  readOnly
                />
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "100px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Destination
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    backgroundColor: "#f3f4f6",
                  }}
                  value={formData.destination}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Driver Entries - Always show this section if we're on a leg */}
        {currentLagIndex !== null && (
          <div
            style={{
              backgroundColor: "#eff6ff",
              padding: "1.5rem",
              borderRadius: "0.375rem",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "500",
                marginBottom: "1rem",
              }}
            >
              Driver Information
            </h3>

            {drivers && drivers.length > 0 ? (
              <>
                {drivers.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      backgroundColor: "white",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        margin: "0 -0.5rem",
                      }}
                    >
                      {/* All fields in a single row with equal width */}
                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Driver
                        </label>
                        <input
                          type="text"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: "#f3f4f6",
                          }}
                          value={entry.full_name || "None"}
                          readOnly
                        />
                      </div>

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Truck Reg Number
                        </label>
                        <input
                          type="text"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: "#f3f4f6",
                          }}
                          value={entry.truckregnumber || "None"}
                          readOnly
                        />
                      </div>

<div
  style={{
    width: "16.666%",
    padding: "0 0.5rem",
    marginBottom: "0.75rem",
  }}
>
  <label
    style={{
      display: "block",
      color: "#374151",
      fontWeight: "500",
      marginBottom: "0.25rem",
    }}
  >
    {isWeightBased ? `Weight (${weightUnit})` : "Container Number"}
  </label>
  <input
    type="text"
    style={{
      width: "100%",
      padding: "0.5rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.375rem",
      backgroundColor: "#f3f4f6",
    }}
    value={entry.containernumber || "None"}
    readOnly
  />
</div>

<div
  style={{
    width: "16.666%",
    padding: "0 0.5rem",
    marginBottom: "0.75rem",
  }}
>
  <label
    style={{
      display: "block",
      color: "#374151",
      fontWeight: "500",
      marginBottom: "0.25rem",
    }}
  >
    Type
  </label>
  <input
    type="text"
    style={{
      width: "100%",
      padding: "0.5rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.375rem",
      backgroundColor: "#f3f4f6",
    }}
    value={isWeightBased ? weightUnit : (entry.container_type || "None")}
    readOnly
  />
</div>

                      {!isControllerRole && (
                        <div
                          style={{
                            width: "16.666%",
                            padding: "0 0.5rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <label
                            style={{
                              display: "block",
                              color: "#374151",
                              fontWeight: "500",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {(() => {
                              const driver = employeeDrivers.find(
                                (d) => d.userid.toString() === entry.driverid
                              );
                              console.log(
                                `Driver ${entry.driverid} role:`,
                                driver?.roleid
                              );
                              return driver?.roleid === 6
                                ? "Subbie Rate"
                                : "Driver Rate";
                            })()}
                          </label>
                          <input
                            type="text"
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "1px solid #d1d5db",
                              borderRadius: "0.375rem",
                              backgroundColor: "#f3f4f6",
                            }}
                            value={entry.driverRate || "None"}
                            readOnly
                          />
                        </div>
                      )}

                      <div
                        style={{
                          width: "16.666%",
                          padding: "0 0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            color: "#374151",
                            fontWeight: "500",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Date
                        </label>
                        <input
                          type="text"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.375rem",
                            backgroundColor: "#f3f4f6",
                          }}
                          value={
                            entry.date
                              ? typeof entry.date === "string"
                                ? entry.date.split("T")[0]
                                : new Date(entry.date)
                                    .toISOString()
                                    .split("T")[0]
                              : "None"
                          }
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: "1rem 0",
                }}
              >
                No driver information available for this leg.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default DirectorManagerViewAssignment;
