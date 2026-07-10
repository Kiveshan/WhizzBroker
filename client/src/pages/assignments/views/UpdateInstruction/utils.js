export const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '').trim();
};

export const dedupeDrivers = (drivers) => {
  if (!Array.isArray(drivers) || drivers.length === 0) return drivers || [];

  const seen = new Set();
  const result = [];

  for (const d of drivers) {
    const key = [
      d.driverid || "",
      d.truckregnumber || "",
      d.containernumber || "",
      d.date || "",
      d.dn || "",
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }

  return result;
};

export const debugDriverData = (drivers) => {
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
    console.log(`  Container Type: ${driver.container_type}`);
    console.log(`  Date: ${driver.date} (${typeof driver.date})`);
    console.log(`  Full Name: ${driver.full_name}`);
    console.log(`  Driver Rate: ${driver.driverRate}`);
  });
};

export const calculateLegDriverRate = (drivers, rates, shipmentType) => {
  if (!drivers || drivers.length === 0) {
    return 0;
  }

  if (shipmentType === 4) {
    const first = drivers.find(
      (d) => d.driverRate !== undefined && d.driverRate !== null && d.driverRate !== ""
    );
    return first ? Number.parseFloat(first.driverRate) || 0 : 0;
  }

  let sixMeterCount = 0;
  let twelveMeterCount = 0;
  let abnormalCount = 0;

  drivers.forEach((driver) => {
    if (isTwelveMeterContainer(driver.container_type)) {
      twelveMeterCount++;
    } else if (isAbnormalContainer(driver.container_type)) {
      abnormalCount++;
    } else {
      sixMeterCount++;
    }
  });

  let dominantType;
  if (twelveMeterCount >= sixMeterCount && twelveMeterCount >= abnormalCount) {
    dominantType = "12m";
  } else if (sixMeterCount >= twelveMeterCount && sixMeterCount >= abnormalCount) {
    dominantType = "6m";
  } else {
    dominantType = "abnormal";
  }

  // Use the actual stored driverRate from the representative driver of the dominant type.
  // This reflects the per-driver date-aware rate rather than the shared rates snapshot.
  const representative = drivers.find((d) =>
    dominantType === "12m"
      ? isTwelveMeterContainer(d.container_type)
      : dominantType === "abnormal"
      ? isAbnormalContainer(d.container_type)
      : !isTwelveMeterContainer(d.container_type) && !isAbnormalContainer(d.container_type)
  );

  if (representative?.driverRate !== undefined && representative?.driverRate !== "") {
    return Number.parseFloat(representative.driverRate) || 0;
  }

  // Fallback to shared rates if driver rate not yet set on the driver object
  if (dominantType === "12m") return Number.parseFloat(rates.twelve_meter) || 0;
  if (dominantType === "abnormal") {
    const abnormalDriver = drivers.find((d) => isAbnormalContainer(d.container_type));
    return abnormalDriver ? Number.parseFloat(abnormalDriver.driverRate) || 0 : 0;
  }
  return Number.parseFloat(rates.six_meter) || 0;
};

export const isAbnormalContainer = (containerType) => {
  return containerType?.toLowerCase() === "abnormal";
};

export const isTwelveMeterContainer = (containerType) => {
  return containerType?.toLowerCase() === "12m";
};
