import { isAbnormalContainer, isTwelveMeterContainer } from "../utils.js";

export const fetchRate = async ({
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
  legDate = null,
  skipDriverUpdate = false,
}) => {
  if (shipmentType === 4) return Promise.resolve();
  if (!startingPoint || !destination) return Promise.resolve();

  const resolvedTargetLegIndex =
    targetLegIndex !== null && targetLegIndex !== undefined
      ? targetLegIndex
      : currentLagIndex;

  // baseRouteKey guards against cross-route contamination in ratesRouteKeyRef.
  // routeKey includes the date so a date change bypasses the noRatesRoutes cache.
  const baseRouteKey = `${startingPoint}-${destination}`;
  const routeKey = legDate ? `${baseRouteKey}-${legDate}` : baseRouteKey;

  const applyNoRate = () => {
    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      setFormData((prev) => ({ ...prev, driverRate: "0" }));
      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || prevDrivers.length === 0) return prevDrivers;
        return prevDrivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal: isAbnormalContainer(driver.container_type) || driver.isAbnormal,
          _rateExplicitlyZero: true,
          _rateNullInManage: true,
        }));
      });
    }
    if (
      resolvedTargetLegIndex !== null &&
      resolvedTargetLegIndex !== undefined &&
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      const updatedLegs = [...legs];
      updatedLegs[resolvedTargetLegIndex] = {
        ...updatedLegs[resolvedTargetLegIndex],
        driverRate: "0",
      };
      setLegs(updatedLegs);
    }
  };

  try {
    if (noRatesRoutes.has(routeKey)) {
      applyNoRate();
      return Promise.resolve();
    }

    // When skipDriverUpdate is true (leg-switch context) fetchRate's only job is
    // to refresh the shared rates state. Error banner ownership belongs to
    // handleDriverDateChange in that context — don't touch it here.
    if (!skipDriverUpdate) setRateError("");

    const response = await api.get("/api/driver-rates-with-subbie", {
      params: { startingpoint: startingPoint, destination, legDate },
    });

    const data = response.data;

    setNoRatesRoutes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(routeKey);
      return newSet;
    });

    const newRates = {
      six_meter: data.driver_six_meter_rate || 0,
      twelve_meter: data.driver_twelve_meter_rate || 0,
      subbie_six_meter: data.subie_six_meter_rate || 0,
      subbie_twelve_meter: data.subie_twelve_meter_rate || 0,
    };

    ratesRouteKeyRef.current = baseRouteKey;
    setRates(newRates);

    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex &&
      ratesRouteKeyRef.current === baseRouteKey
    ) {
      setFormData((prev) => ({
        ...prev,
        driverRate:
          data.driver_rate !== null && data.driver_rate !== undefined
            ? data.driver_rate.toString()
            : "0",
      }));

      // Only update individual driver rates if not explicitly skipped
      // (e.g., when switching legs, drivers are already loaded with their correct rates)
      if (!isCompleted && !skipDriverUpdate) {
        setDrivers((prevDrivers) => {
          if (!Array.isArray(prevDrivers) || prevDrivers.length === 0)
            return prevDrivers;

          return prevDrivers.map((driver) => {
            const newDriver = { ...driver };
            const isSubcontractor =
              employeeDrivers.find((d) => d.userid.toString() === driver.driverid)
                ?.roleid === 6;

            if (isTwelveMeterContainer(newDriver.container_type)) {
              const rateValue = isSubcontractor
                ? data.subie_twelve_meter_rate
                : data.driver_twelve_meter_rate;
              newDriver.driverRate = rateValue ? rateValue.toString() : "0";
              newDriver._rateNullInManage = rateValue == null;
            } else if (isAbnormalContainer(newDriver.container_type)) {
              if (!newDriver.driverRate) newDriver.driverRate = "0";
              newDriver.isAbnormal = true;
            } else {
              const rateValue = isSubcontractor
                ? data.subie_six_meter_rate
                : data.driver_six_meter_rate;
              newDriver.driverRate = rateValue ? rateValue.toString() : "0";
              newDriver._rateNullInManage = rateValue == null;
            }

            return newDriver;
          });
        });
      }
    }

    if (
      !isCompleted &&
      resolvedTargetLegIndex !== null &&
      resolvedTargetLegIndex !== undefined &&
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      const updatedLegs = [...legs];
      updatedLegs[resolvedTargetLegIndex] = {
        ...updatedLegs[resolvedTargetLegIndex],
        driverRate: data.driver_rate ? data.driver_rate.toString() : "0",
      };
      setLegs(updatedLegs);
    }

    return Promise.resolve();
  } catch (error) {
    // 404 means no rate exists for this route+date — treat as valid "no rate" scenario
    if (error.response?.status === 404) {
      if (!skipDriverUpdate) setRateError("Driver rate not available for this route");
      setNoRatesRoutes((prev) => {
        const newSet = new Set(prev);
        newSet.add(routeKey);
        return newSet;
      });
      applyNoRate();
      return Promise.resolve();
    }

    console.error(
      "Unexpected error fetching rate:",
      error.response ? error.response.data : error.message
    );
    if (!skipDriverUpdate) setRateError("Unexpected error fetching driver rate");

    setRates({ six_meter: 0, twelve_meter: 0, subbie_six_meter: 0, subbie_twelve_meter: 0 });

    if (
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      ratesRouteKeyRef.current = baseRouteKey;
      setFormData((prev) => ({ ...prev, driverRate: "0" }));
      setDrivers((prevDrivers) => {
        if (!Array.isArray(prevDrivers) || prevDrivers.length === 0) return prevDrivers;
        return prevDrivers.map((driver) => ({
          ...driver,
          driverRate: "0",
          isAbnormal: isAbnormalContainer(driver.container_type) || driver.isAbnormal,
          _rateExplicitlyZero: true,
          _rateNullInManage: true,
        }));
      });
    }

    if (
      resolvedTargetLegIndex !== null &&
      resolvedTargetLegIndex !== undefined &&
      legSwitchIdRef.current === requestId &&
      currentLegIndexRef.current === resolvedTargetLegIndex
    ) {
      const updatedLegs = [...legs];
      updatedLegs[resolvedTargetLegIndex] = {
        ...updatedLegs[resolvedTargetLegIndex],
        driverRate: "0",
      };
      setLegs(updatedLegs);
    }

    return Promise.resolve();
  }
};
