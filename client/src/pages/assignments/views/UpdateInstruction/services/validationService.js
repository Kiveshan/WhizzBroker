export const checkContainersReachDropoff = async ({
  legs,
  normalizeString,
  dropoff,
  isWeightBased,
  api,
  instructionId,
  weightUnit,
  instructionContainers,
}) => {
  const assignedItems = new Set();
  const itemsReachingDropoff = new Set();
  let totalWeightAssigned = 0;
  let totalWeightReachingDropoff = 0;

  const normalizedDropoff = normalizeString(dropoff);

  legs.forEach((leg) => {
    const normalizedLegDestination = normalizeString(leg.destination);

    if (leg.drivers && leg.drivers.length > 0) {
      leg.drivers.forEach((driver) => {
        if (driver.containernumber) {
          if (isWeightBased) {
            const weight = parseFloat(driver.containernumber) || 0;
            totalWeightAssigned += weight;

            if (normalizedLegDestination === normalizedDropoff) {
              totalWeightReachingDropoff += weight;
            }
          } else {
            assignedItems.add(driver.containernumber);

            if (normalizedLegDestination === normalizedDropoff) {
              itemsReachingDropoff.add(driver.containernumber);
            }
          }
        }
      });
    }
  });

  if (isWeightBased) {
    try {
      const response = await api.get(`/instructions/${instructionId}/details`);
      const totalInstructionWeight = parseFloat(response.data.weight) || 0;

      console.log("Weight check:", {
        totalInstructionWeight,
        totalWeightAssigned,
        totalWeightReachingDropoff,
        weightUnit,
      });
      const missingWeight = totalInstructionWeight - totalWeightReachingDropoff;
      return missingWeight > 0 ? [missingWeight] : [];
    } catch (error) {
      console.error("Error checking weight:", error);
      return [];
    }
  } else {
    const allInstructionContainers = instructionContainers.map((c) =>
      c.containernum.toString()
    );

    const assignedButNotReaching = Array.from(assignedItems).filter(
      (container) => !itemsReachingDropoff.has(container)
    );

    const notAssigned = allInstructionContainers.filter(
      (container) => !assignedItems.has(container)
    );

    const missingContainers = [...assignedButNotReaching, ...notAssigned];

    console.log("Containers check:", {
      allContainers: allInstructionContainers,
      assignedContainers: Array.from(assignedItems),
      containersReachingDropoff: Array.from(itemsReachingDropoff),
      assignedButNotReaching,
      notAssigned,
      missingContainers,
    });

    return missingContainers;
  }
};

export const hasContainerReachedDropoff = ({
  containerNumber,
  legs,
  instructionContainers,
  normalizeString,
}) => {
  if (!containerNumber) return false;

  try {
    const dropoff = legs.find((leg) => {
      return (
        leg.drivers &&
        leg.drivers.some(
          (driver) =>
            driver.containernumber === containerNumber &&
            normalizeString(leg.destination) ===
              normalizeString(
                instructionContainers.find(
                  (c) => c.containernum.toString() === containerNumber
                )?.dropoff
              )
        )
      );
    });

    return !!dropoff;
  } catch (error) {
    console.error("Error checking if container reached dropoff:", error);
    return false;
  }
};

export const hasUnsavedChanges = ({
  currentLagIndex,
  legs,
  savedLegs,
  editedFields,
  drivers,
}) => {
  if (currentLagIndex === null) return false;

  const currentLeg = legs[currentLagIndex];
  if (
    savedLegs.has(currentLagIndex) &&
    !currentLeg.id?.toString().startsWith("temp-") &&
    !currentLeg.isNew
  ) {
    if (
      editedFields.startingPoint ||
      editedFields.destination ||
      editedFields.driverRate
    ) {
      return true;
    }
    if (Object.keys(editedFields.drivers).length > 0) {
      return true;
    }

    return false;
  }
  if (currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-")) {
    return true;
  }
  if (drivers.some((driver) => !driver.id || driver.id.toString().startsWith("temp-"))) {
    return true;
  }

  return true;
};
