import { authFetch } from "../../../../../utils/authFetch.js";
import { finalDestination } from "../../../../../utils/assignments/finalDestination.js";

export const navigateToDocuments = ({
  instructionId,
  setHasProcessedSelectedLeg,
  isFromDocumentsPage,
  navigate,
  clientId,
  isCompleted,
  shipmentType,
}) => {
  if (instructionId) {
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }
  setHasProcessedSelectedLeg(false);
  isFromDocumentsPage.current = false;
  navigate("/Upload-Instruction-Documents", {
    state: {
      clientId,
      instructionId,
      isCompleted: isCompleted,
      shipmentType: shipmentType,
      timestamp: Date.now(),
    },
    replace: true,
  });
};

export const handleFinaliseClick = async ({
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
}) => {
  if (legs.length === 0) {
    navigateToDocuments();
    return;
  }

  const hasDrivers = legs.some((leg) => leg.drivers && leg.drivers.length > 0);
  if (!hasDrivers) {
    setShowNoDriversModal(true);
    return;
  }

  if (hasUnsavedChanges()) {
    setShowUnsavedChangesModal(true);
    return;
  }

  try {
    const response = await authFetch(
      `${API_BASE_URL}/instructions/${instructionId}/details`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch instruction details");
    }

    const instructionDetails = await response.json();
    const pickup = instructionDetails.pickup;
    // Rates without a route leave the instruction without a dropoff; the last
    // leg's destination is then where everything has to end up.
    const dropoff = finalDestination(instructionDetails.dropoff, legs);

    const missingItems = await checkContainersReachDropoff(dropoff);

    if (missingItems.length > 0) {
      if (isWeightBased) {
        setContainerValidationDetails({
          missingWeight: missingItems[0],
          totalWeight: parseFloat(instructionDetails.weight) || 0,
          weightUnit,
          dropoff,
          isWeightBased: true,
        });
      } else {
        setContainerValidationDetails({
          missingContainers: missingItems,
          dropoff,
          isWeightBased: false,
        });
      }
      setShowContainerModal(true);
      return;
    }

    navigateToDocuments();
  } catch (error) {
    console.error("Error checking destinations:", error);
    navigateToDocuments();
  }
};
