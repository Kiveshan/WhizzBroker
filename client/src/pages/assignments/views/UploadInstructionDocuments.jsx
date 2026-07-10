"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/UploadInstructionDocuments.css";
import api from "../../../api"; // Import the Axios instance
// Removed invoice preview from this page; handled in UpdateInstruction.jsx

const UploadInstructionDocuments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.state?.clientId;
  const instructionId = location.state?.instructionId;
  const allowFinish = location.state?.allowFinish ?? true;
  const [isCompleted, setIsCompleted] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState("");
  // const [docType, setDocType] = useState("Instruction Document");
  const [docType, setDocType] = useState("Delivery Note");
  const [legNumber, setLegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [legs, setLegs] = useState([]);
  const [currentLeg, setCurrentLeg] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(isCompleted);
  const [shipmentType, setShipmentType] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [containerCount, setContainerCount] = useState(0);
  const [rateWeight, setRateWeight] = useState(null);
  const [weightUnit, setWeightUnit] = useState("kg");
  const [containersReachedCount, setContainersReachedCount] = useState(0);
  const [isDocumentPage, setIsDocumentPage] = useState(true);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const isWeightBasedInstruction = () => {
    return rateWeight && rateWeight.toLowerCase() !== "container";
  };
  // NEW: Check if shipment type is 3
  const isShipmentType3 = () => {
    return shipmentType === 3;
  };

  // NEW: Get available document types based on shipment type
  const getAvailableDocumentTypes = () => {
    const types = ["Instruction Document", "Delivery Note"];
    if (showEmptyTurningDepotOption()) {
      types.push("Empty Turning Depot Document");
    }
    return types;
  };

  // Add state for modals
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [documentToRemove, setDocumentToRemove] = useState({
    index: null,
    name: "",
  });
  // Summary overlay state moved to UpdateInstruction page

  useEffect(() => {
    if (instructionId) {
      fetchLegs();
      fetchDocuments();
      fetchInstructionStatus();
      fetchContainers();
      fetchInstructionRateWeightAndUnit();

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

  // const fetchContainers = async () => {
  //   try {
  //     const response = await api.get(
  //       `/containers/instruction/${instructionId}`
  //     );
  //     console.log("Containers for instruction:", response.data);
  //     setContainerCount(response.data.length);
  //   } catch (error) {
  //     console.error("Error fetching containers:", error);
  //     setContainerCount(0);
  //   }
  // };
  const fetchContainers = async () => {
    try {
      const response = await api.get(
        `/containers/instruction/${instructionId}`
      );
      console.log("Containers for instruction:", response.data);
      setContainerCount(response.data.length);

      const reachedCount = await countContainersReachingDestination();
      setContainersReachedCount(reachedCount);
    } catch (error) {
      console.error("Error fetching containers:", error);
      setContainerCount(0);
      setContainersReachedCount(0);
    }
  };

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

  // Update the fetchInstructionStatus function to check location state first
  const fetchInstructionStatus = async () => {
    // First check if isCompleted was passed in the location state
    if (location.state?.isCompleted !== undefined) {
      setIsCompleted(location.state.isCompleted);
      return;
    }

    // fetch from API
    try {
      const response = await api.get(`/instructions/${instructionId}`);
      setIsCompleted(
        response.data.status === "Completed" || response.data.is_completed
      );
    } catch (error) {
      console.error("Error fetching instruction:", error);
    }
  };

  const fetchLegs = async () => {
    try {
      const response = await api.get(`/legs/${instructionId}`);
      setLegs(response.data);

      // Set the first leg as current if available
      if (response.data.length > 0 && !currentLeg) {
        setCurrentLeg(response.data[0].legnumber);
        setLegNumber(response.data[0].legnumber);
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

    console.log(
      `Navigating to leg index ${legIndex} (leg number ${legNumber})`
    );

    // Navigate with the leg index
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: legIndex, // This should be 0 for Leg 1
        isCompleted: isCompleted,
        shipmentType: shipmentType,
      },
      replace: true,
    });

    setIsDocumentPage(false);
  };

const validateDocumentUpload = (files) => {
  // Check if files and document name are provided
  if (!files || files.length === 0 || !docName) {
    setSubmitMessage("Error: Please select at least one file and enter a document name");
    return false;
  }

  // Validate file types and sizes
  const allowedFileTypes = /\.(jpg|jpeg|png|pdf)$/i;
  const maxSize = 100 * 1024 * 1024; // 10MB in bytes
  for (const file of files) {
    if (!allowedFileTypes.test(file.name)) {
      setSubmitMessage("Error: Only JPG, PNG, and PDF files are allowed");
      return false;
    }
    if (file.size > maxSize) {
      setSubmitMessage(`Error: File ${file.name} exceeds 10MB limit`);
      return false;
    }
  }

  // Count current documents
  const instructionDocs = documents.filter((doc) => doc.type === "Instruction Document").length;
  const deliveryNotes = documents.filter((doc) => doc.type === "Delivery Note").length;
  const emptyTurningDocs = documents.filter((doc) => doc.type === "Empty Turning Depot Document").length;

  // Calculate remaining allowed uploads for each type
  const remainingInstructionDocs = 1 - instructionDocs;
  const remainingDeliveryNotes = isWeightBasedInstruction() ? Infinity : containersReachedCount - deliveryNotes;
  const remainingEmptyTurningDocs = showEmptyTurningDepotOption() ? 1 - emptyTurningDocs : 0;

  // Count files of the selected document type in the batch
  const filesForCurrentType = files.length;

  // For Instruction Document type
  if (docType === "Instruction Document") {
    if (filesForCurrentType > remainingInstructionDocs) {
      setSubmitMessage(`Error: Only ${remainingInstructionDocs} more Instruction Document(s) can be uploaded`);
      return false;
    }
    // No leg number needed for instruction document
    return true;
  }

  // For Delivery Note type
  if (docType === "Delivery Note") {
    if (filesForCurrentType > remainingDeliveryNotes) {
      setSubmitMessage(`Error: Only ${remainingDeliveryNotes} more Delivery Note(s) can be uploaded`);
      return false;
    }
    return true;
  }

  // For Empty Turning Depot Document
  if (docType === "Empty Turning Depot Document") {
    if (!legNumber) {
      setSubmitMessage("Error: Please select a leg number for the Empty Turning Depot Document");
      return false;
    }
    if (!legs.some((leg) => leg.legnumber.toString() === legNumber.toString())) {
      setSubmitMessage(`Error: Leg ${legNumber} does not exist`);
      return false;
    }
    if (filesForCurrentType > remainingEmptyTurningDocs) {
      setSubmitMessage(`Error: Only ${remainingEmptyTurningDocs} more Empty Turning Depot Document(s) can be uploaded`);
      return false;
    }
    return true;
  }

  setSubmitMessage("Error: Invalid document type");
  return false;
};

const handleFileChange = (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const filesArray = Array.from(e.target.files);
    setSelectedFile(filesArray);
    const firstImageFile = filesArray.find((file) => file.type.startsWith("image/"));
    if (firstImageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(firstImageFile);
    } else {
      setFilePreview(null);
    }
  } else {
    setSelectedFile([]);
    setFilePreview(null);
  }
};

  const handleRemove = async (index) => {
    const docToRemove = documents[index];
    setDocumentToRemove({ index, name: docToRemove.name });
    setShowRemoveConfirmModal(true);
  };

  const confirmRemove = async () => {
    try {
      const index = documentToRemove.index;
      const docToRemove = documents[index];

      if (docToRemove.id) {
        await api.delete(`/documents/${docToRemove.id}`);
      }

      const newDocs = [...documents];
      newDocs.splice(index, 1);
      setDocuments(newDocs);
      setShowRemoveConfirmModal(false);
    } catch (error) {
      console.error("Error removing document:", error);
      setShowRemoveConfirmModal(false);
    }
  };

const handleUpload = async (e) => {
  e.preventDefault();

  // Reset message and set submitting state
  setSubmitMessage("");
  setIsSubmitting(true);
  setUploadProgress(0);

  // Validate the document upload
  if (!validateDocumentUpload(selectedFile)) {
    setIsSubmitting(false);
    return;
  }

  let progressInterval;
  try {
    // Simulate upload progress
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.min(5, 100 / selectedFile.length);
        if (progress >= 90) {
          clearInterval(interval);
        } else {
          setUploadProgress(progress);
        }
      }, 200);
      return interval;
    };

    progressInterval = simulateProgress();

    const newDocuments = [];
    for (let i = 0; i < selectedFile.length; i++) {
      const file = selectedFile[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", `${docName}${selectedFile.length > 1 ? `_${i + 1}` : ""}`);
      formData.append("type", docType);
      formData.append("instructionId", instructionId);

      // Only append leg number for delivery notes and depot documents
      if (docType !== "Instruction Document") {
        formData.append("legNumber", legNumber);
      } else {
        formData.append("legNumber", "1");
      }

      console.log("Sending document upload request with data:", {
        name: `${docName}${selectedFile.length > 1 ? `_${i + 1}` : ""}`,
        type: docType,
        instructionId,
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
      });

      // Send data to server
      const response = await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Create new document object
      const newDocument = {
        id: response.data.id,
        name: `${docName}${selectedFile.length > 1 ? `_${i + 1}` : ""}`,
        type: docType,
        date: new Date().toLocaleDateString("en-GB"),
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
        url: response.data.url,
      };

      newDocuments.push(newDocument);
    }

    clearInterval(progressInterval);
    setUploadProgress(100);
    console.log("All uploads successful");

    // Add new documents to the list
    setDocuments([...documents, ...newDocuments]);

    // Reset form
    setDocName("");
    setSelectedFile([]);
    setFilePreview(null);
    setDocType(isShipmentType3() ? "Delivery Note" : "Instruction Document");
    if (document.getElementById("fileInput")) {
      document.getElementById("fileInput").value = "";
    }

    setSubmitMessage("Documents uploaded successfully!");

    // Refresh documents list
    await fetchDocuments();
  } catch (error) {
    console.error("Error uploading documents:", error);
    setSubmitMessage(`Error: ${error.message}`);
    clearInterval(progressInterval);
    setUploadProgress(0);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleCancel = () => {
    setDocName("");
    setSelectedFile(null);
    setFilePreview(null);
    if (document.getElementById("fileInput")) {
      document.getElementById("fileInput").value = "";
    }
  };

  const handleBackClick = () => {
    // Force a clean navigation
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: 0,
        timestamp: Date.now(), // Add a timestamp to force React to see this as new state
      },
      replace: true,
    });
  };

  // Modified to show confirmation modal instead of directly completing
  const handleFinish = () => {
    //     // Check if we have all required documents
    // // Check if we have all required documents
    const instructionDocs = documents.filter(
      (doc) => doc.type === "Instruction Document"
    );
    const deliveryNotes = documents.filter(
      (doc) => doc.type === "Delivery Note"
    );

    // NEW: For shipment type 3, only require delivery notes
    // For other shipment types, require instruction document
    if (instructionDocs.length !== 1) {
      setSubmitMessage("Error: Exactly 1 Instruction Document is required");
      return;
    }

    if (
      !isWeightBasedInstruction() &&
      deliveryNotes.length !== containersReachedCount
    ) {
      setSubmitMessage(
        `Error: Exactly ${containersReachedCount} Delivery Notes are required (one per container)`
      );
      return;
    }

    // Show confirmation modal
    setShowFinishConfirmModal(true);
  };

  // New function to actually complete the instruction after confirmation
  const completeInstruction = async () => {
    try {
      // First complete the instruction
      await api.put(`/instructions/${instructionId}/complete`, {
        status: "Completed",
      });

      console.log("Instruction marked as completed, now generating invoice...");

      // Then generate the invoice
      const invoiceResponse = await api.post(
        `/generate-invoice/${instructionId}`
      );

      console.log("Invoice generated successfully:", invoiceResponse.data);

      setShowSuccessPopup(true);

      setTimeout(() => {
        setShowSuccessPopup(false);
        navigate("/instructions", {
          state: { clientId },
          replace: true,
        });
      }, 2000);
    } catch (error) {
      console.error("Error completing instruction:", error);
      setSubmitMessage(
        `Error: ${error.response?.data?.message || error.message}`
      );
    } finally {
      // Close the confirmation modal
      setShowFinishConfirmModal(false);
    }
  };

  // Check if we can finish the instruction
  const canFinish = () => {
    const instructionDocs = documents.filter(
      (doc) => doc.type === "Instruction Document"
    );
    const deliveryNotes = documents.filter(
      (doc) => doc.type === "Delivery Note"
    );
    const emptyTurningDocs = documents.filter(
      (doc) => doc.type === "Empty Turning Depot Document"
    );

    // Basic requirements for other shipment types
    const basicRequirements =
      instructionDocs.length === 1 &&
      (isWeightBasedInstruction() ||
        deliveryNotes.length === containersReachedCount);
    if (showEmptyTurningDepotOption()) {
      return basicRequirements && emptyTurningDocs.length === 1;
    }
    return basicRequirements;
  };

  // Determine if we should show the Empty Turning Depot Document option
  const showEmptyTurningDepotOption = () => {
    console.log(
      "Checking if we should show Empty Turning Depot Document option. Shipment type:",
      shipmentType
    );
    return shipmentType === 1;
  };
  //   const countContainersReachingDestination = async () => {
  //   try {
  //     // Get instruction details to get the dropoff location
  //     const instructionResponse = await api.get(`/instructions/${instructionId}/details`);
  //     const dropoff = instructionResponse.data.dropoff;

  //     // Get all legs for this instruction
  //     const legsResponse = await api.get(`/legs/${instructionId}`);
  //     const legsData = legsResponse.data;

  //     // Get all containers for this instruction
  //     const containersResponse = await api.get(`/containers/instruction/${instructionId}`);
  //     const instructionContainers = containersResponse.data;

  //     // Track which containers reach the final destination
  //     const containersReachingDropoff = new Set();

  //     legsData.forEach((leg) => {
  //       if (leg.destination === dropoff && leg.drivers && leg.drivers.length > 0) {
  //         leg.drivers.forEach((driver) => {
  //           if (driver.containernumber) {
  //             containersReachingDropoff.add(driver.containernumber.toString());
  //           }
  //         });
  //       }
  //     });

  //     console.log("Containers reaching final destination:", Array.from(containersReachingDropoff));
  //     console.log("Total instruction containers:", instructionContainers.length);
  //     console.log("Containers reached count:", containersReachingDropoff.size);

  //     return containersReachingDropoff.size;
  //   } catch (error) {
  //     console.error("Error counting containers reaching destination:", error);
  //     return 0;
  //   }
  // };
  const countContainersReachingDestination = async () => {
    try {
      // Get instruction details to get the dropoff location
      const instructionResponse = await api.get(
        `/instructions/${instructionId}/details`
      );
      const dropoff = instructionResponse.data.dropoff;

      // Normalize dropoff by converting to lowercase and removing spaces
      const normalizedDropoff = dropoff?.toLowerCase().replace(/\s/g, "");

      // Get all legs for this instruction
      const legsResponse = await api.get(`/legs/${instructionId}`);
      const legsData = legsResponse.data;

      // Get all containers for this instruction
      const containersResponse = await api.get(
        `/containers/instruction/${instructionId}`
      );
      const instructionContainers = containersResponse.data;

      // Track which containers reach the final destination
      const containersReachingDropoff = new Set();

      legsData.forEach((leg) => {
        // Normalize leg destination by converting to lowercase and removing spaces
        const normalizedLegDestination = leg.destination
          ?.toLowerCase()
          .replace(/\s/g, "");
        if (
          normalizedLegDestination === normalizedDropoff &&
          leg.drivers &&
          leg.drivers.length > 0
        ) {
          leg.drivers.forEach((driver) => {
            if (driver.containernumber) {
              containersReachingDropoff.add(driver.containernumber.toString());
            }
          });
        }
      });

      console.log(
        "Containers reaching final destination:",
        Array.from(containersReachingDropoff)
      );
      console.log(
        "Total instruction containers:",
        instructionContainers.length
      );
      console.log("Containers reached count:", containersReachingDropoff.size);

      return containersReachingDropoff.size;
    } catch (error) {
      console.error("Error counting containers reaching destination:", error);
      return 0;
    }
  };
  const fetchInstructionRateWeightAndUnit = async () => {
    if (!instructionId) return;
    try {
      const response = await api.get(`/instructions/${instructionId}/details`);
      const rateWeightValue = response.data.rateweight;
      setRateWeight(rateWeightValue);
      const isWeight =
        rateWeightValue && rateWeightValue.toLowerCase() !== "container";
      if (isWeight) {
        const unit = rateWeightValue.toLowerCase().includes("ton")
          ? "ton"
          : "kg";
        setWeightUnit(unit);
      }
    } catch (error) {
      console.error("Error fetching rate weight:", error);
    }
  };
  return (
    <div className="instruction-container">
      <div>
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <div className="steps">
        {legs.map((leg) => (
          <button
            key={leg.legkey}
            className={`step-btn ${
              currentLeg === leg.legnumber && !isDocumentPage ? "active" : ""
            }`}
            onClick={() => handleLegClick(leg.legnumber)}
          >
            Leg {leg.legnumber}
          </button>
        ))}
        <button
          className="step-btn document-btn active"
          onClick={() => setIsDocumentPage(true)}
        >
          Document
        </button>
      </div>

      {!isCompleted ? (
        <div className="upload-card">
          <h3 className="document-title">
            Documentation for Instruction Completion
          </h3>

          <div
            className="upload-box"
            onClick={() => document.getElementById("fileInput").click()}
          >
            <div className="upload-content">
              <p>
                {selectedFile && selectedFile.length > 0
                  ? `${selectedFile.length} file(s) selected: ${selectedFile.map((f) => f.name).join(", ")}`
                  : "Drop files here"}
              </p>
              <p>
                Supported formats: PNG, JPG, PDF OR{" "}
                <span className="browse-link">Browse files</span>
              </p>
              <input
                type="file"
                id="fileInput"
                style={{ display: "none" }}
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
                multiple
              />
            </div>

            {filePreview && (
              <div className="file-preview">
                <img
                  src={filePreview || "/placeholder.svg"}
                  alt="File Preview"
                />
              </div>
            )}
            {selectedFile && selectedFile.length > 0 && selectedFile.some((file) => file.type === "application/pdf") && (
              <div className="file-preview">
                <p>PDF document(s) included in selection</p>
              </div>
            )}
          </div>

          <div className="form">
            <input
              type="text"
              placeholder="Comment"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />

            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="dropdown"
            >
              {getAvailableDocumentTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {submitMessage && (
              <div
                className={`submit-message ${
                  submitMessage.includes("Error") ? "error" : "success"
                }`}
              >
                {submitMessage}
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  Upload Progress: {uploadProgress}%
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="view-only-section">
          <h3 className="document-title">Documentation for Instruction</h3>
        </div>
      )}

      <div className="document-table-container">
        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <table className="document-table">
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
                      {!isCompleted && (
                        <button
                          onClick={() => handleRemove(index)}
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
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

      <div className="requirements-section">
        <h4>Document Requirements:</h4>
        <ul>
          <li
            style={{
              color:
                documents.filter((doc) => doc.type === "Instruction Document").length === 1
                  ? "green"
                  : "red",
            }}
          >
            Instruction Document:{" "}
            {documents.filter((doc) => doc.type === "Instruction Document").length}
            /1
          </li>

          <li
            style={{
              color:
                isWeightBasedInstruction() ||
                documents.filter((doc) => doc.type === "Delivery Note").length === containersReachedCount
                  ? "green"
                  : "red",
            }}
          >
            {isWeightBasedInstruction()
              ? `Delivery Notes: ${
                  documents.filter((doc) => doc.type === "Delivery Note").length
                }`
              : `Delivery Notes: ${
                  documents.filter((doc) => doc.type === "Delivery Note").length
                }/${containersReachedCount}`}
          </li>
          {showEmptyTurningDepotOption() && !isShipmentType3() && (
            <li
              style={{
                color:
                  documents.filter((doc) => doc.type === "Empty Turning Depot Document").length === 1
                    ? "green"
                    : "red",
              }}
            >
              Empty Turning Depot Document:{" "}
              {documents.filter((doc) => doc.type === "Empty Turning Depot Document").length}
              /1
            </li>
          )}
        </ul>
      </div>

      {allowFinish && (
        <div className="action-buttons">
          <button
            className="finish-btn"
            onClick={handleFinish}
            disabled={!canFinish() || isCompleted}
            style={{
              opacity: canFinish() && !isCompleted ? 1 : 0.5,
              cursor: canFinish() && !isCompleted ? "pointer" : "not-allowed",
            }}
          >
            Finish Instruction
          </button>
        </div>
      )}

      {/* Confirmation Modal - only when finishing is allowed */}
      {allowFinish && showFinishConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description">
                Are you sure you wish to complete instruction? Once completed, edit functionality will be unavailable.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowFinishConfirmModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={completeInstruction}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="toast-popup">Instruction complete!</div>
      )}

      {/* Remove Document Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description">
                Are you sure you want to remove this file?
              </p>
            </div>
            <div className="modal-body">
              <div className="p-2 text-center">
                <span className="text-gray-700">
                  File: <strong>{documentToRemove.name}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowRemoveConfirmModal(false)}
              >
                No
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={confirmRemove}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadInstructionDocuments;
