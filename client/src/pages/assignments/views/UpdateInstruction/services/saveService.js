import { authFetch } from "../../../../../utils/authFetch.js";

// Helper to fetch rate for a specific driver date
const fetchRateForDriverDate = async (api, startingpoint, destination, date, isSubcontractor, containerType) => {
  if (!startingpoint || !destination || !date) return null;
  try {
    const response = await api.get("/api/driver-rates-with-subbie", {
      params: { startingpoint, destination, legDate: date },
    });
    const data = response.data;
    if (containerType === "12m") {
      return isSubcontractor ? data.subie_twelve_meter_rate : data.driver_twelve_meter_rate;
    }
    return isSubcontractor ? data.subie_six_meter_rate : data.driver_six_meter_rate;
  } catch (error) {
    if (error.response?.status === 404) {
      return 0;
    }
    console.error("Error fetching rate for driver date:", error);
    return null;
  }
};

export const handleSave = async ({
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
}) => {
  // Prevent concurrent saves
  if (isSavingRef.current) return;

  const legIndexToSave =
    currentLegIndexRef.current !== null &&
    currentLegIndexRef.current !== undefined
      ? currentLegIndexRef.current
      : currentLagIndex;

  if (legIndexToSave === null || legIndexToSave === undefined) {
    return;
  }

  if (isCompleted || saving || isSavingRef.current) return;

  if (legIndexToSave === null || legIndexToSave === undefined) {
    setSavedMessage("Please select a leg first");
    setTimeout(() => setSavedMessage(""), 3000);
    return;
  }

  if (!instructionId) {
    setSavedMessage("Missing instruction ID");
    setTimeout(() => setSavedMessage(""), 5000);
    return;
  }
  if (instructionId) {
    try {
      const instructionResponse = await authFetch(
        `${API_BASE_URL}/instructions/${instructionId}`
      );
      if (instructionResponse.ok) {
        const instructionData = await instructionResponse.json();

        if (instructionData.status === "New") {
          const updateStatusResponse = await authFetch(
            `${API_BASE_URL}/instructions/${instructionId}/status`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "In Progress" }),
            }
          );

          if (updateStatusResponse.ok) {
            console.log(
              `Updated instruction ${instructionId} status from New to In Progress`
            );
            setInstructionStatus("In Progress");
          }
        }
      }
    } catch (statusError) {
      console.error("Error updating instruction status:", statusError);
    }
  }
  // Validate required fields
  if (!formData.startingPoint || !formData.destination) {
    setSavedMessage("Starting point and destination are required");
    setTimeout(() => setSavedMessage(""), 3000);
    return;
  }

  // Validate driver fields
  if (!validateDriverFields()) {
    return;
  }

  try {
    setSaving(true);
    isSavingRef.current = true;
    const updatedLegs = [...legs];
    const cleanDrivers = dedupeDrivers(drivers);

    if (!isWeightBased && instructionContainers && instructionContainers.length > 0) {
      const uniqueContainersInLeg = new Set(
        cleanDrivers
          .filter((d) => d.containernumber)
          .map((d) => d.containernumber.toString())
      );

      if (uniqueContainersInLeg.size > instructionContainers.length) {
        setSavedMessage(
          `Leg has ${uniqueContainersInLeg.size} container assignments but the instruction only has ${instructionContainers.length} containers.`
        );
        setTimeout(() => setSavedMessage(""), 6000);
        setSaving(false);
        return;
      }
    }

    updatedLegs[legIndexToSave] = {
      ...updatedLegs[legIndexToSave],
      ...formData,
      drivers: [...cleanDrivers],
    };
    setLegs(updatedLegs);

    const currentLeg = updatedLegs[legIndexToSave];
    const isNewLeg = currentLeg.isNew || currentLeg.id?.toString().startsWith("temp-");

    const computedLegNumber = (() => {
      if (!isNewLeg) {
        return currentLeg.legnumber || legIndexToSave + 1;
      }

      const existingMax = updatedLegs
        .filter((_, idx) => idx !== legIndexToSave)
        .reduce((max, leg) => {
          const n = Number(leg?.legnumber);
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 0);

      const desired = Number(currentLeg?.legnumber);
      if (Number.isFinite(desired) && desired > existingMax) {
        return desired;
      }

      return existingMax + 1;
    })();

    updatedLegs[legIndexToSave] = {
      ...updatedLegs[legIndexToSave],
      legnumber: computedLegNumber,
    };
    setLegs(updatedLegs);

    // Process drivers: fetch date-aware rates for drivers with date but no rate set
    const startingpoint = currentLeg.startingPoint || formData.startingPoint;
    const destination = currentLeg.destination || formData.destination;

    const driversWithRates = await Promise.all(
      cleanDrivers.map(async (driver) => {
        let driverRateToSave = driver.driverRate || "0";

        if (shipmentType !== 4 && (!driver.driverRate || driver.driverRate === "") && !driver._rateNullInManage && !driver._rateExplicitlyZero) {
          const isSubcontractor =
            employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
              ?.roleid === 6;

          // If driver has a date, fetch the rate effective on that date
          if (driver.date && startingpoint && destination) {
            const dateAwareRate = await fetchRateForDriverDate(
              api,
              startingpoint,
              destination,
              driver.date,
              isSubcontractor,
              driver.container_type
            );
            if (dateAwareRate !== null) {
              driverRateToSave = dateAwareRate.toString();
            } else if (driver.container_type === "abnormal") {
              driverRateToSave = "0";
            } else if (driver.container_type === "12m") {
              driverRateToSave = isSubcontractor
                ? rates.subbie_twelve_meter.toString()
                : rates.twelve_meter.toString();
            } else {
              driverRateToSave = isSubcontractor
                ? rates.subbie_six_meter.toString()
                : rates.six_meter.toString();
            }
          } else {
            // No date available - fall back to shared rates snapshot
            if (driver.container_type === "12m") {
              driverRateToSave = isSubcontractor
                ? rates.subbie_twelve_meter.toString()
                : rates.twelve_meter.toString();
            } else if (driver.container_type === "abnormal") {
              driverRateToSave = "0";
            } else {
              driverRateToSave = isSubcontractor
                ? rates.subbie_six_meter.toString()
                : rates.six_meter.toString();
            }
          }
        }

        console.log(
          `Driver ${driver.driverid} with container type ${driver.container_type} has rate: ${driverRateToSave}`
        );

        return {
          id: driver.id,
          driverid: driver.driverid || null,
          truckregnumber: driver.truckregnumber || null,
          containernumber: isWeightBased ? null : (driver.containernumber || null),
          vgm: isWeightBased ? (parseFloat(driver.containernumber) || null) : null,
          container_type: driver.container_type || null,
          dn: driver.dn || null,
          driverRate: driverRateToSave,
          date: driver.date || null,
        };
      })
    );

    const legData = {
      legkey:
        !isNewLeg && currentLeg.id && !isNaN(Number.parseInt(currentLeg.id))
          ? currentLeg.id
          : null,
      legnumber: computedLegNumber,
      startingpoint,
      destination,
      driverrate: calculateLegDriverRate(cleanDrivers, rates, shipmentType),
      m1key: instructionId,
      drivers: driversWithRates,
    };

    console.log(
      `${isNewLeg ? "Saving new" : "Updating"} leg data:`,
      JSON.stringify(legData, null, 2)
    );

    const response = await authFetch(`${API_BASE_URL}/legs/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(legData),
    });

    const responseText = await response.text();
    console.log("Server response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to save leg data");
    }

    console.log("Leg saved successfully:", result);

    if (result.legId && isNewLeg) {
      updatedLegs[legIndexToSave] = {
        ...updatedLegs[legIndexToSave],
        id: result.legId,
        isNew: false,
      };
      setLegs(updatedLegs);
      console.log(`New leg saved to database with ID: ${result.legId}`);
    }

    const hasRemainingUnsavedLeg = updatedLegs.some(
      (leg) => leg.isNew || leg.id?.toString().startsWith("temp-")
    );
    setHasUnsavedNewLeg(hasRemainingUnsavedLeg);
    console.log(`Has unsaved new leg after save: ${hasRemainingUnsavedLeg}`);

    setSavedLegs((prev) => {
      const newSet = new Set(prev);
      newSet.add(legIndexToSave);
      return newSet;
    });

    setEditedFields({
      startingPoint: false,
      destination: false,
      driverRate: false,
      drivers: {},
    });

    const updatedDrivers = drivers.map((driver) => ({
      ...driver,
      id: driver.id.toString().startsWith("temp-")
        ? result.driverIds?.[driver.id] || driver.id
        : driver.id,
    }));
    setDrivers(updatedDrivers);

    await refreshLegData();

    const successMessage = isNewLeg
      ? "New leg saved to database!"
      : "Leg updated successfully!";
    setSavedMessage(successMessage);
    setTimeout(() => setSavedMessage(""), 5000);
  } catch (error) {
    console.error("Error saving leg:", error);
    setSavedMessage("Error saving leg: " + error.message);
    setTimeout(() => setSavedMessage(""), 5000);
  } finally {
    setSaving(false);
    isSavingRef.current = false;
  }
};
