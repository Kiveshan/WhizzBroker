export const refreshLegData = async ({
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
}) => {
  if (instructionId) {
    try {
      const requestId = legSwitchIdRef.current;
      console.log("Refreshing leg data for instruction:", instructionId);

      const response = await api.get(`/legs/${instructionId}`, {
        params: { t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = response.data;
      console.log(
        "Refreshed legs data from server:",
        JSON.stringify(data, null, 2)
      );

      if (data.length > 0) {
        const fetchedLegs = data.map((leg) => {
          return {
            id: leg.legkey,
            legnumber: leg.legnumber,
            startingPoint: leg.startingpoint,
            destination: leg.destination,
            driverRate: leg.driverrate != null ? leg.driverrate.toString() : "0",
            drivers: (leg.drivers || []).map((driver) => ({
              ...driver,
              container_type: driver.container_type || "",
              dn: driver.dn || "",
              driverRate: driver.driverRate != null ? driver.driverRate.toString() : (driver.driverate != null ? driver.driverate.toString() : "0"),
              _rateNullInManage: driver._rateNullInManage,
              _rateExplicitlyZero: driver._rateExplicitlyZero,
              _debugManageRate: driver._debugManageRate,
              isAbnormal: driver.container_type === "abnormal",
            })),
          };
        });

        fetchedLegs.sort((a, b) => Number(a.legnumber) - Number(b.legnumber));

        const currentUnsavedLegs = (legsRef.current || []).filter(
          (leg) => leg.isNew || leg.id?.toString().startsWith("temp-")
        );

        const mergedLegs = [...fetchedLegs];
        currentUnsavedLegs.forEach((unsavedLeg) => {
          const existsOnServer = fetchedLegs.some(
            (fetched) => fetched.legnumber === unsavedLeg.legnumber
          );
          if (!existsOnServer) {
            mergedLegs.push(unsavedLeg);
          }
        });

        mergedLegs.sort((a, b) => Number(a.legnumber) - Number(b.legnumber));

        const legNumberCounts = mergedLegs.reduce((acc, leg) => {
          const n = Number(leg?.legnumber);
          if (!Number.isFinite(n)) return acc;
          acc[n] = (acc[n] || 0) + 1;
          return acc;
        }, {});
        const duplicateLegNumbers = Object.entries(legNumberCounts)
          .filter(([, count]) => count > 1)
          .map(([n]) => n);
        if (duplicateLegNumbers.length > 0) {
          console.warn(
            "Duplicate legnumber(s) detected after refresh:",
            duplicateLegNumbers,
            mergedLegs
          );
        }

        console.log(
          "Transformed refreshed legs data (with preserved unsaved):",
          JSON.stringify(mergedLegs, null, 2)
        );
        setLegs(mergedLegs);

        const savedLegIndexes = new Set();
        mergedLegs.forEach((leg, index) => {
          if (
            leg.id &&
            !leg.id.toString().startsWith("temp-") &&
            !leg.isNew
          ) {
            savedLegIndexes.add(index);
          }
        });
        setSavedLegs(savedLegIndexes);
        console.log("Updated savedLegs:", Array.from(savedLegIndexes));

        const activeIndex = currentLegIndexRef.current;
        if (
          activeIndex !== null &&
          activeIndex !== undefined &&
          activeIndex < mergedLegs.length
        ) {
          const currentLeg = mergedLegs[activeIndex];

          if (
            legSwitchIdRef.current === requestId &&
            currentLegIndexRef.current === activeIndex
          ) {
            setFormData({
              startingPoint: currentLeg.startingPoint || "",
              driverRate: currentLeg.driverRate,
              destination: currentLeg.destination || "",
            });

            if (currentLeg.drivers && currentLeg.drivers.length > 0) {
              console.log(
                "Setting drivers for refreshed leg:",
                currentLeg.drivers
              );
              setDrivers(currentLeg.drivers);
              debugDriverData(currentLeg.drivers);
            } else {
              setDrivers([]);
            }
          }
        }

        console.log("Leg data refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing leg data:", error);
    }
  }
};

export const fetchLegsForInstruction = async ({
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
}) => {
  try {
    console.log(`Fetching legs for instruction ID: ${instructionId}`);
    const response = await api.get(`/legs/${instructionId}`);
    const data = response.data;
    console.log("Legs data from server:", JSON.stringify(data, null, 2));

    const containerResponse = await api.get(
      `/containers/instruction/${instructionId}`
    );
    const containerData = containerResponse.data;
    console.log(
      "Container data from server:",
      JSON.stringify(containerData, null, 2)
    );

    setInstructionContainers(containerData);

    const containerMap = {};
    containerData.forEach((container) => {
      containerMap[container.containernum.toString()] = {
        type: container.container_type || "",
        weight: container.weight,
        dropoff: container.dropoff,
      };
    });
    setContainerDetailsMap(containerMap);

    setContainerOptions(containerData.map((c) => c.containernum.toString()));

    const containerTypeMap = {};
    containerData.forEach((container) => {
      if (container.containernum && container.container_type) {
        containerTypeMap[container.containernum] = container.container_type;
      }
    });
    console.log("Container type map:", containerTypeMap);

    if (data.length > 0) {
      const fetchedLegs = data.map((leg) => {
        if (leg.drivers) {
          console.log(
            `Leg ${leg.legkey} has ${leg.drivers.length} drivers:`,
            JSON.stringify(leg.drivers, null, 2)
          );
        } else {
          console.log(`Leg ${leg.legkey} has no drivers`);
        }

        const normalizedDrivers = (leg.drivers || []).map((driver) => {
          let containerType = driver.container_type || "";
          if (
            !containerType &&
            driver.containernumber &&
            containerTypeMap[driver.containernumber]
          ) {
            containerType = containerTypeMap[driver.containernumber];
            console.log(
              `Found container type ${containerType} for container ${driver.containernumber} from map`
            );
          }

          const normalizedDriver = {
            id: driver.id || Date.now() + Math.random(),
            driverid: driver.driverid ? driver.driverid.toString() : "",
            truckregnumber: driver.truckregnumber || "",
            containernumber:
              driver.containernumber !== null
                ? driver.containernumber.toString()
                : "",
            container_type: containerType,
            dn: driver.dn || "",
            date: driver.date || "",
            driver_name: driver.driver_name || "",
            driver_surname: driver.driver_surname || "",
            driverRate: driver.driverRate != null ? driver.driverRate.toString() : "0",
            _rateNullInManage: driver._rateNullInManage,
            _rateExplicitlyZero: driver._rateExplicitlyZero,
            _debugManageRate: driver._debugManageRate,
            isAbnormal: containerType === "abnormal",
            full_name:
              driver.full_name ||
              (driver.driver_name && driver.driver_surname
                ? `${driver.driver_name} ${driver.driver_surname}`
                : driver.driverid
                ? `Driver ID: ${driver.driverid}`
                : "Unknown Driver"),
          };

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
          console.log(`Container Type: ${normalizedDriver.container_type}`);
          console.log(`Driver Rate: ${normalizedDriver.driverRate}`);

          return normalizedDriver;
        });

        return {
          id: leg.legkey,
          legnumber: leg.legnumber,
          startingPoint: leg.startingpoint,
          destination: leg.destination,
          driverRate: leg.driverrate != null ? leg.driverrate.toString() : "0",
          drivers: normalizedDrivers,
        };
      });

      fetchedLegs.sort((a, b) => Number(a.legnumber) - Number(b.legnumber));

      console.log("Transformed legs data:", JSON.stringify(fetchedLegs, null, 2));
      setLegs(fetchedLegs);

      const savedLegIndexes = new Set();
      fetchedLegs.forEach((leg, index) => {
        if (leg.id && !leg.id.toString().startsWith("temp-") && !leg.isNew) {
          savedLegIndexes.add(index);
        }
      });
      setSavedLegs(savedLegIndexes);
      console.log("Initialized savedLegs:", Array.from(savedLegIndexes));

      const allDrivers = fetchedLegs.flatMap((leg) => leg.drivers || []);
      setExistingDrivers(allDrivers);
      console.log("All existing drivers:", JSON.stringify(allDrivers, null, 2));

      if (
        fetchedLegs.length > 0 &&
        currentLagIndex === null &&
        selectedLegIndex === undefined
      ) {
        setCurrentLagIndex(0);
        setFormData({
          startingPoint: fetchedLegs[0].startingPoint || "",
          driverRate: fetchedLegs[0].driverRate,
          destination: fetchedLegs[0].destination || "",
        });

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
