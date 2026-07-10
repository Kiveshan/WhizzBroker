import { isAbnormalContainer } from "../utils.js";

export const handleAddLeg = ({
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
}) => {
  if (isCompleted) return;

  if (currentLagIndex !== null) {
    const currentLeg = legs[currentLagIndex];

    const isRouteOnlyLeg =
      currentLeg &&
      (!drivers || drivers.length === 0) &&
      formData.startingPoint &&
      formData.destination;

    if (hasUnsavedChanges() && !isRouteOnlyLeg) {
      setShowUnsavedChangesModal(true);
      return;
    }
  }

  if (currentLagIndex !== null && currentLagIndex < legs.length) {
    console.log("Saving current leg data before adding new leg");
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      startingPoint: formData.startingPoint,
      destination: formData.destination,
      driverRate: formData.driverRate,
      drivers: JSON.parse(JSON.stringify(drivers)),
    };
    setLegs(updatedLegs);
  }

  if (instructionId) {
    console.log(`Clearing localStorage for instruction_${instructionId}_state`);
    localStorage.removeItem(`instruction_${instructionId}_state`);
  }

  const newLegIndex = (legsRef.current || legs).length;
  setLegs((prevLegs) => {
    const maxLegNumber = prevLegs.reduce((max, leg) => {
      const n = Number(leg?.legnumber);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);

    const newLeg = {
      id: `temp-${Date.now()}`,
      legnumber: maxLegNumber + 1,
      startingPoint: "",
      driverRate: "",
      destination: "",
      drivers: [],
      isNew: true,
    };

    setTimeout(() => {
      setCurrentLagIndex(newLegIndex);
      currentLegIndexRef.current = newLegIndex;
    }, 0);

    console.log(
      `Adding new leg. prevLegs.length=${prevLegs.length}, maxLegNumber=${maxLegNumber}, newLegNumber=${maxLegNumber + 1}`
    );

    return [...prevLegs, newLeg];
  });

  setFormData({
    startingPoint: "",
    driverRate: "",
    destination: "",
  });

  setDrivers([]);

  setEditedFields({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {},
  });
  console.log(`Navigating to new leg at index: ${newLegIndex}`);

  setSavedLegs((prevSavedLegs) => {
    const newSavedLegs = new Set(prevSavedLegs);
    newSavedLegs.delete(newLegIndex);
    return newSavedLegs;
  });

  setHasUnsavedNewLeg(true);
  setSavedMessage(
    "New leg added. Remember to click Save after entering details."
  );
  setTimeout(() => setSavedMessage(""), 6000);
};

export const handleSelectLeg = ({
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
}) => {
  console.log(`Selecting leg at index ${index}`);
  if (currentLagIndex === index) {
    console.log("Already on this leg, skipping switch");
    return;
  }

  if (currentLagIndex !== null && !isCompleted) {
    const updatedLegs = [...legs];
    updatedLegs[currentLagIndex] = {
      ...updatedLegs[currentLagIndex],
      startingPoint: formData.startingPoint,
      destination: formData.destination,
      driverRate: formData.driverRate,
      drivers: JSON.parse(JSON.stringify(drivers)),
    };
    console.log(
      `Saving leg ${currentLagIndex} data before switching:`,
      updatedLegs[currentLagIndex]
    );
    setLegs(updatedLegs);
  }

  legSwitchIdRef.current += 1;
  const requestId = legSwitchIdRef.current;
  currentLegIndexRef.current = index;
  setCurrentLagIndex(index);

  const selectedLeg = legs[index];

  setFormData({
    startingPoint: selectedLeg.startingPoint || "",
    driverRate: selectedLeg.driverRate ?? "",
    destination: selectedLeg.destination || "",
  });

  ratesRouteKeyRef.current = null;

  setDrivers([]);
  if (selectedLeg.drivers && selectedLeg.drivers.length > 0) {
    const normalizedDrivers = JSON.parse(JSON.stringify(selectedLeg.drivers)).map(
      (driver) => ({
        id: driver.id || Date.now() + Math.random(),
        driverid: driver.driverid ? driver.driverid.toString() : "",
        truckregnumber: driver.truckregnumber || "",
        containernumber:
          driver.containernumber !== null
            ? driver.containernumber.toString()
            : "",
        container_type: driver.container_type || "",
        dn: driver.dn || "",
        driverRate: driver.driverRate ?? driver.driverate ?? "",
        _rateNullInManage: driver._rateNullInManage,
        _rateExplicitlyZero: driver._rateExplicitlyZero,
        _debugManageRate: driver._debugManageRate,
        date: driver.date || "",
        driver_name: driver.driver_name || "",
        driver_surname: driver.driver_surname || "",
        isAbnormal: isAbnormalContainer(driver.container_type) || driver.isAbnormal,
        full_name:
          driver.full_name ||
          (driver.driver_name && driver.driver_surname
            ? `${driver.driver_name} ${driver.driver_surname}`
            : driver.driverid
            ? `Driver ID: ${driver.driverid}`
            : "Unknown Driver"),
      })
    );
    if (legSwitchIdRef.current === requestId) {
      setDrivers(normalizedDrivers);
      debugDriverData(normalizedDrivers);
    }
  } else {
    setDrivers([]);
  }

  setEditedFields({
    startingPoint: false,
    destination: false,
    driverRate: false,
    drivers: {},
  });

  if (!isCompleted && selectedLeg.startingPoint && selectedLeg.destination) {
    // Use the first driver's date so the shared rates state reflects the
    // historical rate period for this leg, not always today's rate.
    const firstDriverDate =
      selectedLeg.drivers?.find((d) => d.date)?.date || null;

    // Use date-aware cache key for consistency with ratesService.js
    const baseRouteKey = `${selectedLeg.startingPoint}-${selectedLeg.destination}`;
    const routeKey = firstDriverDate
      ? `${baseRouteKey}-${firstDriverDate}`
      : baseRouteKey;

    // Evict this route from the no-rates cache so we always hit the server
    // when entering a leg — a business manager may have added a rate since
    // the 404 was cached.
    if (noRatesRoutes.has(routeKey) || noRatesRoutes.has(baseRouteKey)) {
      setNoRatesRoutes((prev) => {
        const next = new Set(prev);
        next.delete(routeKey);
        next.delete(baseRouteKey);
        return next;
      });
    }

    fetchRate(selectedLeg.startingPoint, selectedLeg.destination, index, requestId, firstDriverDate, true);
  }
};
