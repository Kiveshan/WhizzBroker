"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/UploadInstructionDocuments.css";
import api from "../../../api"; // Import the Axios instance

const DirectorDocs = () => {
  // Update the modal animation for a smoother appearance
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

  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [legs, setLegs] = useState([]);
  const [currentLeg, setCurrentLeg] = useState(null);
  const [shipmentType, setShipmentType] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [containerCount, setContainerCount] = useState(0);
  const [containersReachedCount, setContainersReachedCount] = useState(0);
  const [isWeightBased, setIsWeightBased] = useState(false);
const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    
    if (instructionId) {
      fetchLegs();
      fetchDocuments();
      checkIfWeightBased();
      fetchContainers();

      // Check if shipmentType was passed in location state
      if (location.state?.shipmentType !== undefined) {
        console.log(
          "Using shipmentType from location state:",
          location.state.shipmentType
        );
        const shipmentTypeValue = Number(location.state.shipmentType);
        setShipmentType(shipmentTypeValue);
        setDebugInfo((prev) => ({
          ...prev,
          shipmentTypeFromState: location.state.shipmentType,
          shipmentTypeValueFromState: shipmentTypeValue,
        }));
      } else {
        // Otherwise fetch it
        fetchShipmentType();
      }
    }
  }, [instructionId]);
const fetchContainers = async () => {
  try {
    if (!isWeightBased) {
      // Only fetch if NOT weight-based
      const response = await api.get(`/containers/instruction/${instructionId}`)
      console.log("Containers for instruction:", response.data)
      setContainerCount(response.data.length)
      
      // Fetch the reached count
      const reachedCount = await countContainersReachingDestination();
      setContainersReachedCount(reachedCount);
      console.log("Containers reached final destination count:", reachedCount);
    } else {
      setContainerCount(0)
      setContainersReachedCount(0)
      console.log("Weight-based instruction: Skipping container count fetch.")
    }
  } catch (error) {
    console.error("Error fetching containers:", error)
    setContainerCount(0)
    setContainersReachedCount(0)
  }
}
  const fetchShipmentType = async () => {
    try {
      console.log("Fetching shipment type for instruction ID:", instructionId);
      const response = await api.get(
        `/instructions/${instructionId}/shipment-type`
      );
      console.log("Shipment type API response:", response.data);

      // Ensure shipment_type is treated as a number
      const shipmentTypeValue = Number(response.data.shipment_type);
      console.log("Setting shipment type to:", shipmentTypeValue);

      setShipmentType(shipmentTypeValue);
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeFromAPI: response.data.shipment_type,
        shipmentTypeValueFromAPI: shipmentTypeValue,
      }));
    } catch (error) {
      console.error("Error fetching shipment type:", error);
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeError: error.message,
      }));
    }
  };
  const checkIfWeightBased = async () => {
  if (!instructionId) return;

  try {
    const response = await api.get(`/instructions/${instructionId}/details`);
    const rateWeightValue = response.data.rateweight;

    console.log('Rate weight value:', rateWeightValue);
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
const countContainersReachingDestination = async () => {
  try {
    // Get instruction details to get the dropoff location
    const instructionResponse = await api.get(`/instructions/${instructionId}/details`);
    const dropoff = instructionResponse.data.dropoff;
    
    // Normalize dropoff by converting to lowercase and removing spaces
    const normalizedDropoff = dropoff?.toLowerCase().replace(/\s/g, '');
    
    // Get all legs for this instruction
    const legsResponse = await api.get(`/legs/${instructionId}`);
    const legsData = legsResponse.data;
    
    // Track which containers reach the final destination
    const containersReachingDropoff = new Set();
    
    legsData.forEach((leg) => {
      // Normalize leg destination by converting to lowercase and removing spaces
      const normalizedLegDestination = leg.destination?.toLowerCase().replace(/\s/g, '');
      if (normalizedLegDestination === normalizedDropoff && leg.drivers && leg.drivers.length > 0) {
        leg.drivers.forEach((driver) => {
          if (driver.containernumber) {
            containersReachingDropoff.add(driver.containernumber.toString());
          }
        });
      }
    });
    
    console.log("Containers reaching final destination:", Array.from(containersReachingDropoff));
    return containersReachingDropoff.size;
  } catch (error) {
    console.error("Error counting containers reaching destination:", error);
    return 0;
  }
};
  const fetchLegs = async () => {
    try {
      const response = await api.get(`/legs/${instructionId}`);
      setLegs(response.data);

      // Set the first leg as current if available
      if (response.data.length > 0 && !currentLeg) {
        setCurrentLeg(response.data[0].legnumber);
      }
    } catch (error) {
      console.error("Error fetching legs:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log("Fetching documents for instruction ID:", instructionId);
      const response = await api.get(`/documents/${instructionId}`);
      console.log("Fetched documents:", response.data);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLegClick = (legNumber) => {
    // Find the index of the leg with this number
    const legIndex = legs.findIndex((leg) => leg.legnumber === legNumber);

    if (legIndex === -1) {
      console.error(`Could not find leg with number ${legNumber}`);
      return;
    }

    console.log(`Navigating to leg index ${legIndex}`);

    // Force a clean navigation by using a unique timestamp in the state
    navigate("/DirectorManagerViewAssignment", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: legIndex,
        timestamp: Date.now(), // Add a timestamp to force React to see this as new state
      },
      replace: true,
    });
  };

  const handleBackClick = () => {
    // Force a clean navigation
    navigate("/DirectorManagerViewAssignment", {
      state: {
        clientId,
        instructionId,
        timestamp: Date.now(), // Add a timestamp to force React to see this as new state
      },
      replace: true,
    });
  };

  // Determine if we should show the Empty Turning Depot Document option
// const showAdditionalDocumentOptions = () => {
//   console.log(
//     "Checking if we should show additional document options. Shipment type:",
//     shipmentType
//   );
//   return shipmentType !== 3;
// };

  return (
    <div className="instruction-container">
      <style>{modalAnimation}</style>
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <div className="steps">
        {legs.map((leg) => (
          <button
            key={leg.legkey}
            className={`step-btn ${
              currentLeg === leg.legnumber ? "bg-green-500 text-black" : ""
            }`}
            onClick={() => handleLegClick(leg.legnumber)}
          >
            Leg {leg.legnumber}
          </button>
        ))}
        <button className="step-btn document-btn">Document</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <table className="document-table" style={{ textAlign: "center" }}>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5">No documents found</td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr key={index}>
                    <td>{doc.name}</td>
                    <td>{doc.type}</td>
                    <td>{doc.date}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => doc.url && window.open(doc.url)}
                        disabled={!doc.url}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Document requirements status */}
<div
  style={{
    margin: "20px 0",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
  }}
>
  <h4 style={{ marginTop: 0 }}>Document Requirements:</h4>
<ul style={{ paddingLeft: "20px" }}>
  <li
    style={{
      color:
        documents.filter((doc) => doc.type === "Instruction Document")
          .length === 1
          ? "green"
          : "red",
    }}
  >
    Instruction Document:{" "}
    {
      documents.filter((doc) => doc.type === "Instruction Document").length
    }
    /1
  </li>
  {shipmentType === 1 && (
    <li
      style={{
        color:
          documents.filter(
            (doc) => doc.type === "Empty Turning Depot Document"
          ).length === 1
            ? "green"
            : "red",
      }}
    >
      Empty Turning Depot Document:{" "}
      {
        documents.filter(
          (doc) => doc.type === "Empty Turning Depot Document"
        ).length
      }
      /1
    </li>
  )}
  <li
    style={{
      color: isWeightBased
        ? documents.filter((doc) => doc.type === "Delivery Note").length > 0
          ? "green"
          : "red"
        : documents.filter((doc) => doc.type === "Delivery Note").length ===
          containersReachedCount
        ? "green"
        : "red",
    }}
  >
    {isWeightBased
      ? `Delivery Notes: ${
          documents.filter((doc) => doc.type === "Delivery Note").length
        }`
      : `Delivery Notes: ${
          documents.filter((doc) => doc.type === "Delivery Note").length
        }/${containersReachedCount}`}
  </li>
</ul>
</div>
    </div>
  );
};

export default DirectorDocs;
