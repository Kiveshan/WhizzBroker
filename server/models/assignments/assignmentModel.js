import { pool } from "../../config/database.js";
import { getRateForLegDate } from "../manage/driverRatesModel.js";

export const getDrivers = async () => {
  const query = "SELECT * FROM m5_driver_rate";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getStartingPoints = async () => {
  const query =
    "SELECT DISTINCT startingpoint FROM m5_driver_rate ORDER BY startingpoint";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.startingpoint);
  } catch (error) {
    throw error;
  }
};

export const getDestinations = async () => {
  const query =
    "SELECT DISTINCT destination FROM m5_driver_rate ORDER BY destination";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.destination);
  } catch (error) {
    throw error;
  }
};

export const updateInstructionStatus = async (instructionId, status) => {
  const query = `UPDATE m1_controller SET status = $1 WHERE m1key = $2`;
  try {
    await pool.query(query, [status, instructionId]);
  } catch (error) {
    throw error;
  }
};

export const getDriversSub = async () => {
  const query =
    "SELECT userid, name, surname, roleid, status, driverstatus FROM m5_employee WHERE roleid IN (5, 6) AND status = true ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getDriverRatesWithSubbie = async (startingpoint, destination, legDate = null) => {
  // If legDate provided, use effective date-based rate lookup
  if (legDate) {
    try {
      console.log(`[getDriverRatesWithSubbie] Fetching rate for ${startingpoint} -> ${destination} on ${legDate}`);
      const rateResult = await getRateForLegDate(startingpoint, destination, legDate, false, '6m');
      console.log(`[getDriverRatesWithSubbie] Result:`, rateResult);
      if (rateResult.success) {
        const row = rateResult.data;
        return {
          m5ratekey: row.m5ratekey,
          startingpoint,
          destination,
          driver_six_meter_rate: row.driver_six_meter_rate,
          driver_twelve_meter_rate: row.driver_twelve_meter_rate,
          subie_six_meter_rate: row.subie_six_meter_rate,
          subie_twelve_meter_rate: row.subie_twelve_meter_rate,
          effective_from: row.effective_from,
          effective_to: row.effective_to,
          driver_rate: row.driver_six_meter_rate,
        };
      }
      console.log(`[getDriverRatesWithSubbie] No rate found for date ${legDate}, returning null`);
      return null;
    } catch (error) {
      console.error('[getDriverRatesWithSubbie] Error fetching rates with effective dates:', error);
      // Fall through to default behavior
    }
  }
  
  // Default: fetch current rate (for backwards compatibility)
  const query = `
    SELECT 
      m5ratekey, 
      startingpoint, 
      destination, 
      driver_six_meter_rate, 
      driver_twelve_meter_rate,
      subie_six_meter_rate,
      subie_twelve_meter_rate,
      effective_from,
      effective_to
    FROM 
      m5_driver_rate 
    WHERE 
      startingpoint = $1 AND destination = $2
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY effective_from DESC
    LIMIT 1`;
  try {
    const result = await pool.query(query, [startingpoint, destination]);
    if (result.rows.length > 0) {
      const rateData = result.rows[0];
      rateData.driver_rate = rateData.driver_six_meter_rate;
      return rateData;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getControllers = async () => {
  const query =
    "SELECT userid, name, surname FROM m5_employee WHERE roleid = 2 ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getManagers = async () => {
  const query =
    "SELECT userid, name, surname FROM usertable WHERE roleid = 1 ORDER BY name, surname";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getInstructionById = async (instructionId) => {
  const query = `SELECT m1key, status FROM m1_controller WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getShipmentTypeByInstructionId = async (instructionId) => {
  const query = `SELECT shipment_type FROM m1_controller WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0].shipment_type : null;
  } catch (error) {
    throw error;
  }
};

export const getInstructions = async () => {
  const query =
    "SELECT m1key, shipment_type, status, fileref FROM m1_controller ORDER BY m1key DESC";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getTruckRegNums = async () => {
  const query = "SELECT truckregnum FROM m5_trucks WHERE status = true ORDER BY truckregnum";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.truckregnum);
  } catch (error) {
    throw error;
  }
};

export const getTrucks = async () => {
  const query =
    "SELECT m5truckskey as truckid, truckregnum as registration FROM m5_trucks WHERE status = true ORDER BY truckregnum";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getClientInstructions = async () => {
  const query = `
    SELECT 
      c.m5clientkey, 
      c.client AS companyname, 
      c.representative, 
      c.email,
      COUNT(CASE WHEN m.status = 'New' THEN 1 ELSE NULL END) AS new_count,
      COUNT(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE NULL END) AS in_progress_count
    FROM 
      m5_client c
    LEFT JOIN 
      m1_controller m ON c.m5clientkey = m.client
    GROUP BY 
      c.m5clientkey, c.client, c.representative, c.email
    ORDER BY 
      c.client`;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getClientInstructionsDetails = async (clientId) => {
  const query = `
    SELECT 
      m1.m1key, 
      s.shipkey AS shippy, 
      m1.status, 
      m1.fileref
    FROM 
      public.m1_controller m1
    JOIN 
      public.shipment s ON m1.shipment_type = s.shipkey
    WHERE 
      m1.client = $1`;
  try {
    const result = await pool.query(query, [clientId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getContainerDetails = async (containerNum) => {
  const query =
    "SELECT containerkey, containernum, weight, container_type FROM container WHERE containernum = $1";
  try {
    const result = await pool.query(query, [containerNum]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverRates = async (
  startingpoint,
  destination,
  containerType,
  legDate = null
) => {
  // If legDate provided, use effective date-based rate lookup
  if (legDate) {
    try {
      const isSubcontractor = false; // This function is for drivers, not subbies
      const rateResult = await getRateForLegDate(startingpoint, destination, legDate, isSubcontractor, containerType);
      
      if (rateResult.success) {
        return {
          ...rateResult.data,
          applicable_rate: rateResult.data.applicable_rate
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching driver rates with effective dates:', error);
      // Fall through to default behavior
    }
  }
  
  // Default: fetch current rate (for backwards compatibility)
  const query = `
    SELECT 
      m5ratekey, 
      startingpoint, 
      destination, 
      driver_rate,
      driver_six_meter_rate, 
      driver_twelve_meter_rate,
      effective_from,
      effective_to
    FROM 
      m5_driver_rate 
    WHERE 
      startingpoint = $1 AND destination = $2
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY effective_from DESC
    LIMIT 1`;
  try {
    const result = await pool.query(query, [startingpoint, destination]);
    if (result.rows.length > 0) {
      const rateData = result.rows[0];
      let applicableRate = rateData.driver_rate;
      if (containerType === "6m") {
        applicableRate = rateData.driver_six_meter_rate;
      } else if (containerType === "12m") {
        applicableRate = rateData.driver_twelve_meter_rate;
      }
      return { ...rateData, applicable_rate: applicableRate };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getContainerNumbers = async () => {
  const query =
    "SELECT containernum, container_type FROM container ORDER BY containernum";
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getContainerTypes = async () => {
  const query =
    "SELECT DISTINCT container_type FROM container WHERE container_type IS NOT NULL ORDER BY container_type";
  try {
    const result = await pool.query(query);
    return result.rows.map((row) => row.container_type);
  } catch (error) {
    throw error;
  }
};
export const saveLeg = async ({
  legkey,
  legnumber,
  startingpoint,
  destination,
  driverrate,
  m1key,
  drivers,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const isNewLeg = !legkey || legkey === null;

    if (!isNewLeg) {
      await client.query(
        `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2 AND legkey != $3`,
        [m1key, legnumber, legkey]
      );
      await client.query(
        `UPDATE legs_m2 SET startingpoint = $1, destination = $2, driverrate = $3 WHERE legkey = $4`,
        [startingpoint, destination, driverrate, legkey]
      );
    } else {
      await client.query(
        `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2`,
        [m1key, legnumber]
      );
    }

    let legId = legkey;
    if (isNewLeg || (drivers && drivers.length > 0)) {
      if (isNewLeg && (!drivers || drivers.length === 0)) {
        const insertResult = await client.query(
          `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key) VALUES ($1, $2, $3, $4, $5) RETURNING legkey`,
          [legnumber, startingpoint, destination, driverrate, m1key]
        );
        legId = insertResult.rows[0].legkey;
      }

      if (drivers && drivers.length > 0) {
        for (const [index, driver] of drivers.entries()) {
          if (
            !driver.driverid &&
            !driver.truckregnumber &&
            !driver.containernumber &&
            !driver.vgm &&
            !driver.date
          )
            continue;

          const driverId = driver.driverid
            ? Number.parseInt(driver.driverid)
            : null;
          const truckRegNumber = driver.truckregnumber || null;
          
          // UPDATED: Handle both container number and weight (vgm)
          let containerNumber = null;
          let vgmValue = null;
          
          if (driver.containernumber) {
            containerNumber = driver.containernumber.toString();
          }
          
          if (driver.vgm !== null && driver.vgm !== undefined) {
            vgmValue = parseFloat(driver.vgm);
          }

          const date = driver.date ? new Date(driver.date) : null;
          const driverSpecificRate = driver.driverRate || driverrate;
          const dn = driver.dn || null;

          if (!isNewLeg && legId && index === 0) {
            await client.query(
              `UPDATE legs_m2 SET
                driverid = $1,
                truckregnumber = $2,
                containernumber = $3,
                vgm = $4,
                date = $5,
                driverrate = $6,
                dn = $7
              WHERE legkey = $8`,
              [
                driverId,
                truckRegNumber,
                containerNumber,
                vgmValue,
                date,
                driverSpecificRate,
                dn,
                legId,
              ]
            );
          } else {
            const insertResult = await client.query(
              `INSERT INTO legs_m2 (
                legnumber,
                startingpoint,
                destination,
                driverrate,
                m1key,
                driverid,
                truckregnumber,
                containernumber,
                vgm,
                date,
                dn
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING legkey`,
              [
                legnumber,
                startingpoint,
                destination,
                driverSpecificRate,
                m1key,
                driverId,
                truckRegNumber,
                containerNumber,
                vgmValue,
                date,
                dn,
              ]
            );
            if (isNewLeg && index === 0) legId = insertResult.rows[0].legkey;
          }
        }
      }
    } else if (!isNewLeg && (!drivers || drivers.length === 0)) {
      // Existing leg saved with no drivers: clear any persisted driver assignment data
      await client.query(
        `UPDATE legs_m2 SET
          driverid = NULL,
          truckregnumber = NULL,
          containernumber = NULL,
          vgm = NULL,
          date = NULL,
          dn = NULL,
          driverrate = $1
        WHERE legkey = $2`,
        [driverrate, legkey]
      );
    }
    // Recompute invoice date based on earliest date for legnumber = 1 and update invoice if exists
    const legDateQuery = `
      SELECT MIN(l.date) AS first_leg_date
      FROM public.legs_m2 l
      WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
    `;
    const legDateResult = await client.query(legDateQuery, [m1key]);
    const firstLegDate =
      legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
        ? new Date(legDateResult.rows[0].first_leg_date)
        : new Date();
    await client.query(
      `UPDATE public.invoice SET date = $2 WHERE m1key = $1`,
      [m1key, firstLegDate]
    );

    await client.query("COMMIT");
    return { legId, isUpdate: !isNewLeg };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
// export const saveLeg = async ({
//   legkey,
//   legnumber,
//   startingpoint,
//   destination,
//   driverrate,
//   m1key,
//   drivers,
// }) => {
//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const isNewLeg = !legkey || legkey === null;

//     if (!isNewLeg) {
//       await client.query(
//         `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2 AND legkey != $3`,
//         [m1key, legnumber, legkey]
//       );
//       await client.query(
//         `UPDATE legs_m2 SET startingpoint = $1, destination = $2, driverrate = $3 WHERE legkey = $4`,
//         [startingpoint, destination, driverrate, legkey]
//       );
//     } else {
//       await client.query(
//         `DELETE FROM legs_m2 WHERE m1key = $1 AND legnumber = $2`,
//         [m1key, legnumber]
//       );
//     }

//     let legId = legkey;
//     if (isNewLeg || (drivers && drivers.length > 0)) {
//       if (isNewLeg && (!drivers || drivers.length === 0)) {
//         const insertResult = await client.query(
//           `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key) VALUES ($1, $2, $3, $4, $5) RETURNING legkey`,
//           [legnumber, startingpoint, destination, driverrate, m1key]
//         );
//         legId = insertResult.rows[0].legkey;
//       }
//       if (drivers && drivers.length > 0) {
//         for (const [index, driver] of drivers.entries()) {
//           if (
//             !driver.driverid &&
//             !driver.truckregnumber &&
//             !driver.containernumber &&
//             !driver.date
//           )
//             continue;
//           const driverId = driver.driverid
//             ? Number.parseInt(driver.driverid)
//             : null;
//           const truckRegNumber = driver.truckregnumber || null;
//           let containerNumber = driver.containernumber
//             ? driver.containernumber.toString()
//             : null;
//           const date = driver.date ? new Date(driver.date) : null;
//           const driverSpecificRate = driver.driverRate || driverrate;
//           if (!isNewLeg && legId && index === 0) {
//             await client.query(
//               `UPDATE legs_m2 SET driverid = $1, truckregnumber = $2, containernumber = $3, date = $4, driverrate = $5 WHERE legkey = $6`,
//               [
//                 driverId,
//                 truckRegNumber,
//                 containerNumber,
//                 date,
//                 driverSpecificRate,
//                 legId,
//               ]
//             );
//           } else {
//             const insertResult = await client.query(
//               `INSERT INTO legs_m2 (legnumber, startingpoint, destination, driverrate, m1key, driverid, truckregnumber, containernumber, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING legkey`,
//               [
//                 legnumber,
//                 startingpoint,
//                 destination,
//                 driverSpecificRate,
//                 m1key,
//                 driverId,
//                 truckRegNumber,
//                 containerNumber,
//                 date,
//               ]
//             );
//             if (isNewLeg && index === 0) legId = insertResult.rows[0].legkey;
//           }
//         }
//       }
//     }
//     await client.query("COMMIT");
//     return { legId, isUpdate: !isNewLeg };
//   } catch (error) {
//     await client.query("ROLLBACK");
//     throw error;
//   } finally {
//     client.release();
//   }
// };

export const getLegsByInstructionId = async (instructionId) => {
  const query = `
    SELECT 
      l.legkey,
      l.legnumber,
      l.startingpoint,
      l.destination,
      l.driverrate,
      l.driverid,
      l.truckregnumber,
      l.containernumber,
      l.vgm,
      l.date,
      l.dn,
      e.name AS driver_name,
      e.surname AS driver_surname,
      e.roleid,
      c.container_type,
      -- Get the applicable manage rate based on driver role and container type
      CASE 
        WHEN e.roleid = 6 AND LOWER(TRIM(COALESCE(c.container_type, '6m'))) = '12m' THEN dr.subie_twelve_meter_rate
        WHEN e.roleid = 6 THEN dr.subie_six_meter_rate
        WHEN LOWER(TRIM(COALESCE(c.container_type, '6m'))) = '12m' THEN dr.driver_twelve_meter_rate
        ELSE dr.driver_six_meter_rate
      END as applicable_manage_rate
    FROM 
      legs_m2 l
    LEFT JOIN 
      m5_employee e ON l.driverid = e.userid
    LEFT JOIN
      container c ON l.containernumber = c.containernum AND l.m1key = c.m1key
    LEFT JOIN LATERAL (
      -- Get the most recent rate for this route that's effective today
      SELECT DISTINCT ON (startingpoint, destination)
        driver_six_meter_rate,
        driver_twelve_meter_rate,
        subie_six_meter_rate,
        subie_twelve_meter_rate
      FROM m5_driver_rate
      WHERE LOWER(TRIM(COALESCE(startingpoint, ''))) = LOWER(TRIM(COALESCE(l.startingpoint, '')))
        AND LOWER(TRIM(COALESCE(destination, ''))) = LOWER(TRIM(COALESCE(l.destination, '')))
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY startingpoint, destination, effective_from DESC, m5ratekey DESC
      LIMIT 1
    ) dr ON true
    WHERE 
      l.m1key = $1
    ORDER BY 
      l.legnumber, l.legkey`;

  try {
    const result = await pool.query(query, [instructionId]);
    const legMap = new Map();

    for (const row of result.rows) {
      const legnumber = row.legnumber;
      if (!legMap.has(legnumber)) {
        legMap.set(legnumber, {
          legkey: row.legkey,
          legnumber: row.legnumber,
          startingpoint: row.startingpoint,
          destination: row.destination,
          driverrate: row.driverrate,
          drivers: [],
        });
      }

      const leg = legMap.get(legnumber);
      leg.drivers.push({
        id: row.legkey,
        driverid: row.driverid ? row.driverid.toString() : "",
        truckregnumber: row.truckregnumber || "",
        // UPDATED: Use vgm for weight-based, containernumber for container-based
        containernumber: row.vgm 
          ? row.vgm.toString() 
          : (row.containernumber ? row.containernumber.toString() : ""),
        container_type: row.container_type || "",
        dn: row.dn || "",
        driverRate: row.driverrate ? row.driverrate.toString() : "0",
        _rateNullInManage: row.applicable_manage_rate === null,
        _debugManageRate: row.applicable_manage_rate,
        date: row.date || null,
        driver_name: row.driver_name || "",
        driver_surname: row.driver_surname || "",
        full_name:
          row.driver_name && row.driver_surname
            ? `${row.driver_name} ${row.driver_surname}`
            : row.driverid
            ? `Driver ID: ${row.driverid}`
            : "Unknown Driver",
      });
    }

    const legs = Array.from(legMap.values());
    legs.forEach(
      (leg) =>
        (leg.drivers = leg.drivers.filter(
          (driver) =>
            driver.driverid ||
            driver.truckregnumber ||
            driver.containernumber ||
            driver.date
        ))
    );

    return legs;
  } catch (error) {
    throw error;
  }
};
export const deleteLeg = async (legId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const legInfo = await client.query(
      `SELECT legkey, legnumber, m1key FROM legs_m2 WHERE legkey = $1`,
      [legId]
    );
    if (legInfo.rows.length === 0)
      throw new Error(`Leg with ID ${legId} not found`);
    const { legnumber, m1key } = legInfo.rows[0];
    console.log(
      `Deleting leg ${legId} (leg number ${legnumber}) from instruction ${m1key}`
    );
    // CRITICAL FIX: Delete ALL rows with this legnumber and m1key, not just one row
    // A leg can have multiple drivers, each stored as separate rows with the same legnumber
    const result = await client.query(
      `DELETE FROM legs_m2 WHERE legnumber = $1 AND m1key = $2`,
      [legnumber, m1key]
    );
    console.log(
      `Deleted ${result.rowCount} rows for leg number ${legnumber} from instruction ${m1key}`
    );
    const legDateQuery = `
      SELECT MIN(l.date) AS first_leg_date
      FROM public.legs_m2 l
      WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
    `;
    const legDateResult = await client.query(legDateQuery, [m1key]);
    const firstLegDate =
      legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
        ? new Date(legDateResult.rows[0].first_leg_date)
        : new Date();
    await client.query(
      `UPDATE public.invoice SET date = $2 WHERE m1key = $1`,
      [m1key, firstLegDate]
    );
    await client.query("COMMIT");
    return { deletedLegId: legId, deletedRows: result.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const updateLegNumber = async (legId, legnumber) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const info = await client.query(
      `SELECT m1key, legnumber FROM legs_m2 WHERE legkey = $1`,
      [legId]
    );
    if (info.rows.length === 0) {
      throw new Error(`Leg with ID ${legId} not found`);
    }

    const m1key = info.rows[0].m1key;
    const previousLegNumber = info.rows[0].legnumber;

    // A leg can have multiple rows (one per driver). Persisting a renumber must update
    // all rows for this instruction + previous legnumber.
    const result = await client.query(
      `UPDATE legs_m2
       SET legnumber = $1
       WHERE m1key = $2 AND legnumber = $3
       RETURNING legkey`,
      [legnumber, m1key, previousLegNumber]
    );
    if (result.rows.length === 0) {
      throw new Error(
        `Leg renumber failed for legId=${legId} (m1key=${m1key}, prevLegNumber=${previousLegNumber})`
      );
    }
    if (m1key) {
      const legDateQuery = `
        SELECT MIN(l.date) AS first_leg_date
        FROM public.legs_m2 l
        WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
      `;
      const legDateResult = await client.query(legDateQuery, [m1key]);
      const firstLegDate =
        legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
          ? new Date(legDateResult.rows[0].first_leg_date)
          : new Date();
      await client.query(
        `UPDATE public.invoice SET date = $2 WHERE m1key = $1`,
        [m1key, firstLegDate]
      );
    }
    await client.query("COMMIT");
    return { updatedLegId: result.rows[0].legkey, legnumber };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const getContainersByInstructionId = async (instructionId) => {
  const query = `SELECT * FROM container WHERE m1key = $1`;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Helper to refresh driverrate on legs for a single instruction based on
// the latest m5_driver_rate values, using roleid (5 = driver, 6 = subbie)
// and container_type (6m/12m). Only applies to In Progress instructions.
export const refreshInstructionLegRates = async (instructionId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const refreshQuery = `
      WITH target_instruction AS (
        SELECT m1key
        FROM m1_controller
        WHERE m1key = $1 AND LOWER(COALESCE(status, '')) = 'in progress'
      )
      UPDATE public.legs_m2 l
      SET driverrate = CASE
        -- Driver 6m: any non-subbie employee (roleid != 6) and 6m container
        WHEN COALESCE(e.roleid, 5) <> 6
         AND LOWER(COALESCE(c.container_type, '')) = '6m'
          THEN dr.driver_six_meter_rate
        -- Driver 12m: any non-subbie employee (roleid != 6) and 12m container
        WHEN COALESCE(e.roleid, 5) <> 6
         AND LOWER(COALESCE(c.container_type, '')) = '12m'
          THEN dr.driver_twelve_meter_rate
        -- Subbie 6m: subcontractor (roleid = 6) and 6m container
        WHEN e.roleid = 6 AND LOWER(COALESCE(c.container_type, '')) = '6m'
          THEN dr.subie_six_meter_rate
        -- Subbie 12m: subcontractor (roleid = 6) and 12m container
        WHEN e.roleid = 6 AND LOWER(COALESCE(c.container_type, '')) = '12m'
          THEN dr.subie_twelve_meter_rate
        ELSE l.driverrate
      END
      FROM target_instruction ti
      JOIN public.m1_controller m ON m.m1key = ti.m1key
      JOIN public.container c ON c.m1key = m.m1key
      JOIN public.m5_employee e ON TRUE
      JOIN public.m5_driver_rate dr ON TRUE
      WHERE l.m1key = ti.m1key
        AND c.containernum = l.containernumber
        AND e.userid = l.driverid
        AND LOWER(TRIM(COALESCE(dr.startingpoint, ''))) = LOWER(TRIM(COALESCE(l.startingpoint, '')))
        AND LOWER(TRIM(COALESCE(dr.destination, ''))) = LOWER(TRIM(COALESCE(l.destination, '')));
    `;

    await client.query(refreshQuery, [instructionId]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const completeInstruction = async (instructionId, status) => {
  try {
    // Hard block: an add-on instruction (shipment type 5) cannot be marked
    // Completed unless it is linked to an existing add-on invoice.
    if (status === "Completed") {
      const checkResult = await pool.query(
        `SELECT shipment_type, addon_id FROM m1_controller WHERE m1key = $1`,
        [instructionId]
      );
      if (checkResult.rows.length === 0) {
        throw new Error(`Instruction with ID ${instructionId} not found`);
      }
      const { shipment_type, addon_id } = checkResult.rows[0];
      if (
        String(shipment_type) === "5" &&
        (addon_id === null || addon_id === undefined)
      ) {
        const err = new Error(
          "This add-on instruction must be linked to an add-on invoice before it can be completed."
        );
        err.code = "ADDON_LINK_REQUIRED";
        throw err;
      }
    }

    const query = `UPDATE m1_controller SET status = $1 WHERE m1key = $2`;
    await pool.query(query, [status, instructionId]);
  } catch (error) {
    throw error;
  }
};

// export const getInstructionDetails = async (instructionId) => {
//   const query = `SELECT m1key, client, pickup, dropoff, status FROM m1_controller WHERE m1key = $1`;
//   try {
//     const result = await pool.query(query, [instructionId]);
//     return result.rows.length > 0 ? result.rows[0] : null;
//   } catch (error) {
//     throw error;
//   }
// };
// Add this new function to your database service
export const getInstructionDetails = async (instructionId) => {
  const query = `
    SELECT 
      m1key, 
      client, 
      pickup, 
      dropoff, 
      status, 
      rateweight,
      weight
    FROM m1_controller 
    WHERE m1key = $1
  `;
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverById = async (driverId) => {
  const query = `SELECT userid, name, surname FROM m5_employee WHERE userid = $1`;
  try {
    const result = await pool.query(query, [driverId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw error;
  }
};

export const getDriverInstructions = async (driverId) => {
  const query = `
    SELECT 
      m1.m1key, 
      m1.pickupdate,
      COUNT(l.legkey) as leg_count
    FROM 
      public.m1_controller m1
    JOIN 
      public.legs_m2 l ON m1.m1key = l.m1key
    WHERE 
      l.driverid = $1
    GROUP BY 
      m1.m1key, m1.pickupdate
    ORDER BY 
      m1.pickupdate DESC`;
  try {
    const result = await pool.query(query, [driverId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getLegDetailsByInstructionAndDriver = async (
  instructionId,
  driverId
) => {
  const query = `
    SELECT 
      l.legkey,
      l.legnumber,
      l.startingpoint,
      l.destination,
      l.date,
      l.driverrate,
      l.legstatus
    FROM 
      public.legs_m2 l
    WHERE 
      l.m1key = $1 AND l.driverid = $2
    ORDER BY 
      l.legnumber`;
  try {
    const result = await pool.query(query, [instructionId, driverId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getCompletedDriverLegs = async (driverId, instructionId) => {
  const client = await pool.connect();
  try {
    let query;
    let params;
    if (instructionId) {
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND l.m1key = $2::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber`;
      params = [driverId, instructionId];
    } else {
      query = `
        SELECT
          l.legkey,
          l.legnumber,
          l.startingpoint,
          l.destination,
          l.date,
          l.driverrate,
          l.truckregnumber,
          l.containernumber,
          l.legstatus,
          l.m1key
        FROM
          public.legs_m2 l
        JOIN
          public.m1_controller m ON l.m1key = m.m1key
        WHERE
          l.driverid = $1::integer
          AND m.status = 'Completed'
        ORDER BY l.date DESC, l.legnumber`;
      params = [driverId];
    }
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getDriverLegs = async (driverId, instructionId) => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        l.legkey,
        l.legnumber,
        l.startingpoint,
        l.destination,
        l.date,
        l.driverrate,
        l.truckregnumber,
        l.containernumber,
        l.legstatus
      FROM 
        public.legs_m2 l
      WHERE 
        l.driverid = $1::integer`;
    const queryParams = [driverId];
    if (instructionId) {
      query += ` AND l.m1key = $2::integer`;
      queryParams.push(instructionId);
    }
    query += ` ORDER BY l.date DESC, l.legnumber`;
    const result = await client.query(query, queryParams);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getDocuments = async (instructionId) => {
  const query = "SELECT * FROM documents WHERE m1key = $1";
  try {
    const result = await pool.query(query, [instructionId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const generateInvoice = async (instructionId) => {
  const client = await pool.connect();
  try {
    // Check if a record already exists for this instructionId
    const existingInvoiceResult = await client.query(
      "SELECT ikey FROM invoice WHERE m1key = $1",
      [instructionId]
    );

    // If a record exists, return early without creating a new invoice
    if (existingInvoiceResult.rows.length > 0) {
      return {
        success: true,
        message: `Invoice already exists for instruction ID ${instructionId}`,
        existingInvoiceId: existingInvoiceResult.rows[0].ikey,
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    const monthName = monthNames[currentMonth - 1];

    const instructionResult = await client.query(
      "SELECT client, m1key FROM m1_controller WHERE m1key = $1",
      [instructionId]
    );

    if (instructionResult.rows.length === 0)
      throw new Error(`Instruction with ID ${instructionId} not found`);

    const { client: clientId, m1key } = instructionResult.rows[0];

    const sequenceResult = await client.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_num FROM 'INV-\\d+-0*(\\d+)') AS INTEGER)), 0) + 1 AS next_invoice_num FROM invoice WHERE invoice_num LIKE $1",
      [`INV-${currentYear}-%`]
    );
    const nextInvoiceNum = sequenceResult.rows[0].next_invoice_num;

    const invoiceNum = `INV-${currentYear}-${nextInvoiceNum}`;
    const groupId = `${clientId}-${monthName}${currentYear}`;

    // Determine invoice date based on earliest date for legnumber = 1
    const legDateQuery = `
      SELECT MIN(l.date) AS first_leg_date
      FROM public.legs_m2 l
      WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
    `;
    const legDateResult = await client.query(legDateQuery, [m1key]);
    const firstLegDate =
      legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
        ? new Date(legDateResult.rows[0].first_leg_date)
        : null;
    const invoiceDate = firstLegDate || currentDate;

    const insertResult = await client.query(
      "INSERT INTO invoice (clientid, m1key, invoice_num, groupid, date) VALUES ($1, $2, $3, $4, $5) RETURNING ikey",
      [clientId, m1key, invoiceNum, groupId, invoiceDate]
    );

    return {
      success: true,
      invoiceId: insertResult.rows[0].ikey,
      invoiceNum,
      groupId,
      date: invoiceDate,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const fixInvoiceSequence = async () => {
  const client = await pool.connect();
  try {
    const currentSeqResult = await client.query(
      "SELECT nextval(pg_get_serial_sequence('public.invoice', 'ikey'));"
    );
    const maxKeyResult = await client.query(
      "SELECT MAX(ikey) FROM public.invoice;"
    );
    const maxKey = maxKeyResult.rows[0].max || 0;
    const resetResult = await client.query(
      "SELECT SETVAL('public.invoice_ikey_seq', (SELECT COALESCE(MAX(ikey), 0) FROM public.invoice)+1);"
    );
    return {
      success: true,
      message: "Invoice sequence has been successfully reset.",
      oldValue: currentSeqResult.rows[0].nextval,
      newValue: resetResult.rows[0].setval,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

// ─── Instruction group assignments ────────────────────────────────────────────
// In WhizzBroker an assignment is "one subcontractor takes these containers off
// this instruction" — one leg per subbie load, so a child instruction can carry
// several legs. The group is finalised once every container is on a leg,
// producing one combined invoice.

/**
 * Returns a group with every child instruction shaped for the assignment screen:
 * instruction info, containers (each carrying the legkey that claimed it),
 * the assignments made so far, uploaded documents, and completion flags.
 */
export const getGroupForAssignment = async (groupId) => {
  const groupResult = await pool.query(
    `SELECT g.group_key, g.client, g.status, g.created_at, g.group_ref,
            c.client AS client_name
     FROM public.instruction_group g
     LEFT JOIN public.m5_client c ON g.client = c.m5clientkey
     WHERE g.group_key = $1`,
    [groupId]
  );
  if (groupResult.rows.length === 0) return null;

  const childRows = await pool.query(
    `SELECT m.m1key, m."ksmFileRef", m."clientFileRef", m.booking_ref,
            m.shipment_type, s.shipmenttype, m.pickup, m.dropoff,
            m.vessel_name, m.stackdate, m."lastFreeDate", m.status,
            m.num_six_meters, m.num_twelve_meters, m.num_abnormal,
            m.total_cost, m.vat, m.rateweight
     FROM public.m1_controller m
     LEFT JOIN public.shipment s ON m.shipment_type = s.shipkey
     WHERE m.instruction_group_id = $1
     ORDER BY m.m1key`,
    [groupId]
  );

  const instructions = [];
  for (const row of childRows.rows) {
    // Cross-haul break bulk (shipment_type 4) is weight-based — its "container
    // details" are KSM DN/ticket/receipt weight entries rather than containers.
    const isBreakBulk = String(row.shipment_type) === "4";

    const containers = isBreakBulk
      ? { rows: [] }
      : await pool.query(
          `SELECT containerkey, containernum, container_type, weight,
                  cargo_description, legkey
           FROM public.container WHERE m1key = $1 ORDER BY containerkey`,
          [row.m1key]
        );

    const weightRows = isBreakBulk
      ? await pool.query(
          `SELECT weight_pk, ksm_dm_no, ticket_no, receipt_book_no, weight
           FROM public.m1_controller_weight WHERE m1_key = $1 ORDER BY weight_pk`,
          [row.m1key]
        )
      : { rows: [] };

    // Every assignment leg for this instruction. An instruction now carries one
    // leg per subcontractor load rather than a single leg for the whole thing,
    // so this is a list; each leg names the containers it took.
    const legResult = await pool.query(
      `SELECT l.legkey, l.legnumber, l.driverid, l.driverrate,
              l.startingpoint, l.destination, l.date,
              e.name AS driver_name, e.surname AS driver_surname
       FROM public.legs_m2 l
       LEFT JOIN public.m5_employee e ON e.userid = l.driverid
       WHERE l.m1key = $1
       ORDER BY l.legnumber, l.legkey`,
      [row.m1key]
    );

    const containersByLeg = new Map();
    for (const c of containers.rows) {
      if (!c.legkey) continue;
      if (!containersByLeg.has(c.legkey)) containersByLeg.set(c.legkey, []);
      containersByLeg.get(c.legkey).push(c);
    }

    const docsResult = await pool.query(
      `SELECT document_id, name, type, upload_date, s3key
       FROM public.documents WHERE m1key = $1 ORDER BY document_id`,
      [row.m1key]
    );

    const assignments = legResult.rows.map((leg) => ({
      legkey: leg.legkey,
      legnumber: leg.legnumber,
      subbieId: leg.driverid,
      subbieName: leg.driver_name
        ? `${leg.driver_name} ${leg.driver_surname || ""}`.trim()
        : null,
      driverrate: leg.driverrate,
      startingpoint: leg.startingpoint,
      destination: leg.destination,
      legDate: leg.date,
      containers: (containersByLeg.get(leg.legkey) || []).map((c) => ({
        containerkey: c.containerkey,
        containernum: c.containernum,
        container_type: c.container_type,
      })),
    }));

    // "Assigned" means a rated leg exists and no container is still loose.
    // Stated this way it matches finaliseInstructionGroup's gate exactly, and
    // covers break bulk (no containers to allocate) without a special case.
    const ratedLegs = legResult.rows.filter(
      (l) => l.driverid && Number(l.driverrate) > 0
    );
    const unassignedContainers = containers.rows.filter((c) => !c.legkey);
    const hasAssignment =
      ratedLegs.length > 0 && unassignedContainers.length === 0;
    const hasDocuments = docsResult.rows.length > 0;

    instructions.push({
      ...row,
      containers: containers.rows,
      weightRows: weightRows.rows,
      assignments,
      documents: docsResult.rows.map((d) => ({
        id: d.document_id,
        name: d.name,
        type: d.type,
      })),
      containerCount: containers.rows.length,
      unassignedContainerCount: unassignedContainers.length,
      hasAssignment,
      hasDocuments,
      complete: hasAssignment && hasDocuments,
    });
  }

  return { ...groupResult.rows[0], instructions };
};

/**
 * Picks which rate column applies to a child instruction: the container type
 * the instruction mostly carries. Mirrors calculateLegDriverRate in the legacy
 * assignment UI so grouped and ungrouped instructions rate the same way.
 * Returns "12m", "6m" or "abnormal".
 *
 * Only used for break bulk now, which has no container rows to inspect — a
 * container assignment rates off the containers actually being taken instead
 * (see containerTypeForSelection).
 */
const dominantContainerType = ({ num_six_meters, num_twelve_meters, num_abnormal }) => {
  const six = Number(num_six_meters) || 0;
  const twelve = Number(num_twelve_meters) || 0;
  const abnormal = Number(num_abnormal) || 0;

  if (twelve >= six && twelve >= abnormal && twelve > 0) return "12m";
  if (abnormal > six && abnormal > twelve) return "abnormal";
  return "6m";
};

/**
 * The rate column for a specific set of containers. A subcontractor now takes a
 * subset of an instruction's containers, so the instruction's overall 6m/12m
 * counts are the wrong basis — a subbie taking only the 6m containers off a
 * 12m-heavy instruction must be paid the 6m rate. Counts the selection itself.
 */
const containerTypeForSelection = (rows) => {
  let six = 0;
  let twelve = 0;
  let abnormal = 0;
  for (const { container_type } of rows) {
    const t = String(container_type || "").trim().toLowerCase();
    if (t === "12m") twelve += 1;
    else if (t === "abnormal") abnormal += 1;
    else six += 1;
  }
  if (twelve >= six && twelve >= abnormal && twelve > 0) return "12m";
  if (abnormal > six && abnormal > twelve) return "abnormal";
  return "6m";
};

/**
 * Creates one assignment: a subcontractor takes a named set of an instruction's
 * containers. Each call adds a leg, so an instruction ends up with as many legs
 * as it has subcontractor loads. Containers claimed here are marked
 * container.legkey and are no longer offered for assignment.
 *
 * containerKeys may be empty only for break bulk (shipment_type 4), which has
 * no container rows — there the leg covers the whole instruction as before.
 *
 * The rate is flat per leg: one route rate regardless of how many containers
 * the subbie takes. Which rate column applies is decided by the containers in
 * this selection, not the instruction's overall counts.
 *
 * The route is passed in, NOT taken from m1_controller.pickup/dropoff. Those
 * columns describe the shipment and come from a different vocabulary than
 * m5_driver_rate.startingpoint/destination (which hold whole trip descriptions
 * like "Yard To Reid Innovation Mobeni To Terminal"). The two sets do not
 * overlap at all, so rating off pickup/dropoff always missed and silently left
 * the subbie on driverrate = 0. The controller picks the route from the same
 * /starting-points + /destinations lists the legacy assignment screen uses.
 *
 * Throws RATE_UNRESOLVED when the route + date has no usable subbie rate, so a
 * bad route surfaces at assignment time instead of becoming an unpaid leg, and
 * CONTAINERS_TAKEN when another controller claimed a container first.
 */
export const createAssignment = async ({
  m1key,
  subbieId,
  containerKeys = [],
  startingpoint,
  destination,
  legDate,
}) => {
  if (!startingpoint || !destination) {
    const err = new Error("A route (starting point and destination) is required to rate the assignment");
    err.code = "ROUTE_REQUIRED";
    throw err;
  }

  const instrResult = await pool.query(
    `SELECT shipment_type, num_six_meters, num_twelve_meters, num_abnormal
     FROM public.m1_controller WHERE m1key = $1`,
    [m1key]
  );
  if (instrResult.rows.length === 0) {
    throw new Error(`Instruction ${m1key} not found`);
  }
  const instruction = instrResult.rows[0];
  const isBreakBulk = String(instruction.shipment_type) === "4";

  // An instruction with no container rows is assigned as a whole — break bulk,
  // and the odd container instruction captured without any containers, which
  // would otherwise be impossible to assign at all.
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS n FROM public.container WHERE m1key = $1`,
    [m1key]
  );
  const wholeInstruction = isBreakBulk || countResult.rows[0].n === 0;

  const keys = (containerKeys || []).map(Number).filter((k) => Number.isInteger(k));
  if (!wholeInstruction && keys.length === 0) {
    const err = new Error("Select at least one container for this subcontractor");
    err.code = "CONTAINERS_REQUIRED";
    throw err;
  }

  // Rate off what is actually being taken. Read the selection up front so an
  // unresolvable rate fails before anything is written.
  let containerType;
  if (keys.length === 0) {
    containerType = dominantContainerType(instruction);
  } else {
    const selected = await pool.query(
      `SELECT containerkey, container_type, legkey
       FROM public.container
       WHERE containerkey = ANY($1::int[]) AND m1key = $2`,
      [keys, m1key]
    );
    if (selected.rows.length !== keys.length) {
      const err = new Error("Some of the selected containers do not belong to this instruction");
      err.code = "CONTAINERS_INVALID";
      throw err;
    }
    const alreadyTaken = selected.rows.filter((c) => c.legkey);
    if (alreadyTaken.length > 0) {
      const err = new Error(
        `${alreadyTaken.length} of the selected containers are already assigned to another subcontractor. Reload and try again.`
      );
      err.code = "CONTAINERS_TAKEN";
      throw err;
    }
    containerType = containerTypeForSelection(selected.rows);
  }

  const effectiveDate = legDate || new Date().toISOString().split("T")[0];

  if (containerType === "abnormal") {
    const err = new Error(
      "Abnormal containers have no route-based subcontractor rate. Rate this instruction outside the group flow."
    );
    err.code = "RATE_UNRESOLVED";
    throw err;
  }

  // isSubcontractor = true: these assignments are always subbies, so this reads
  // subie_six_meter_rate / subie_twelve_meter_rate.
  const rate = await getRateForLegDate(startingpoint, destination, effectiveDate, true, containerType);

  if (!rate.success) {
    const err = new Error(
      `No rate for "${startingpoint}" → "${destination}" effective ${effectiveDate}. Check the route or add a rate period.`
    );
    err.code = "RATE_UNRESOLVED";
    throw err;
  }

  const driverrate = Number(rate.data.applicable_rate) || 0;
  if (driverrate <= 0) {
    const err = new Error(
      `"${startingpoint}" → "${destination}" has no ${containerType} subcontractor rate for ${effectiveDate}. The subcontractor would be paid R0.`
    );
    err.code = "RATE_UNRESOLVED";
    throw err;
  }
  const m5ratekey = rate.data.m5ratekey;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const seqResult = await client.query(
      `SELECT COALESCE(MAX(legnumber), 0) + 1 AS next
       FROM public.legs_m2 WHERE m1key = $1`,
      [m1key]
    );
    const legnumber = seqResult.rows[0].next;

    const insertResult = await client.query(
      `INSERT INTO public.legs_m2
         (legnumber, startingpoint, destination, driverrate, m1key,
          driverid, m5ratekey, date, legstatus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Assigned')
       RETURNING legkey`,
      [legnumber, startingpoint, destination, driverrate, m1key, subbieId, m5ratekey, effectiveDate]
    );
    const legkey = insertResult.rows[0].legkey;

    if (keys.length > 0) {
      // legkey IS NULL in the WHERE is the concurrency guard: if another
      // controller claimed one of these containers between the check above and
      // here, fewer rows update and the whole assignment rolls back.
      const claimed = await client.query(
        `UPDATE public.container SET legkey = $1
         WHERE containerkey = ANY($2::int[]) AND m1key = $3 AND legkey IS NULL`,
        [legkey, keys, m1key]
      );
      if (claimed.rowCount !== keys.length) {
        const err = new Error(
          "Some of the selected containers were assigned by someone else. Reload and try again."
        );
        err.code = "CONTAINERS_TAKEN";
        throw err;
      }
    }

    // Move the instruction into "In Progress" once it has an assignment.
    await client.query(
      `UPDATE public.m1_controller SET status = 'In Progress'
       WHERE m1key = $1 AND LOWER(COALESCE(status, '')) = 'new'`,
      [m1key]
    );

    await client.query("COMMIT");
    return {
      legkey,
      legnumber,
      driverrate,
      containerType,
      containerKeys: keys,
      legDate: effectiveDate,
      startingpoint,
      destination,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Removes one assignment leg. container.legkey is ON DELETE SET NULL, so the
 * containers it held are released back into the unassigned pool automatically.
 */
export const deleteAssignment = async (legkey) => {
  const result = await pool.query(
    `DELETE FROM public.legs_m2 WHERE legkey = $1 RETURNING legkey, m1key`,
    [legkey]
  );
  if (result.rows.length === 0) {
    const err = new Error(`Assignment ${legkey} not found`);
    err.code = "NOT_FOUND";
    throw err;
  }
  return { success: true, ...result.rows[0] };
};

/**
 * Finalises a whole group: requires every child to have at least one rated
 * assignment leg, every container to be on one, and at least one document, then
 * marks every child and the group Completed and creates the single combined
 * invoice row for the group.
 */
export const finaliseInstructionGroup = async (groupId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      `SELECT group_key, client, status FROM public.instruction_group WHERE group_key = $1`,
      [groupId]
    );
    if (groupResult.rows.length === 0) {
      throw new Error(`Instruction group ${groupId} not found`);
    }
    const clientId = groupResult.rows[0].client;

    const children = await client.query(
      `SELECT m1key, shipment_type FROM public.m1_controller
       WHERE instruction_group_id = $1`,
      [groupId]
    );
    if (children.rows.length === 0) {
      throw new Error("This group has no instructions to finalise");
    }

    // Every container must be on an assignment leg, and every child must have a
    // document. Break bulk has no containers, so it still qualifies on having at
    // least one leg.
    const incomplete = [];
    const unassigned = [];
    // A leg that exists but is unrated would silently pay the subcontractor R0 —
    // the subbie statement generator sums legs_m2.driverrate and skips subbies
    // whose total is 0, so this must never reach a finalised group.
    const unrated = [];
    for (const { m1key, shipment_type } of children.rows) {
      const isBreakBulk = String(shipment_type) === "4";
      const legs = await client.query(
        `SELECT driverrate FROM public.legs_m2
         WHERE m1key = $1 AND driverid IS NOT NULL`,
        [m1key]
      );
      const doc = await client.query(
        `SELECT 1 FROM public.documents WHERE m1key = $1 LIMIT 1`,
        [m1key]
      );

      if (legs.rows.length === 0 || doc.rows.length === 0) {
        incomplete.push(m1key);
        continue;
      }
      if (legs.rows.some((l) => !(Number(l.driverrate) > 0))) {
        unrated.push(m1key);
        continue;
      }
      if (!isBreakBulk) {
        const open = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.container
           WHERE m1key = $1 AND legkey IS NULL`,
          [m1key]
        );
        if (open.rows[0].n > 0) {
          unassigned.push(`${m1key} (${open.rows[0].n} container${open.rows[0].n === 1 ? "" : "s"})`);
        }
      }
    }
    if (incomplete.length > 0) {
      const err = new Error(
        `Every instruction needs at least one subcontractor assignment and one document before finalising. Incomplete: ${incomplete.join(", ")}`
      );
      err.code = "GROUP_INCOMPLETE";
      throw err;
    }
    if (unassigned.length > 0) {
      const err = new Error(
        `Every container must be assigned to a subcontractor before finalising. Still unassigned: ${unassigned.join(", ")}`
      );
      err.code = "GROUP_INCOMPLETE";
      throw err;
    }
    if (unrated.length > 0) {
      const err = new Error(
        `These instructions have no subcontractor rate and would pay R0 — re-save the assignment with a valid route: ${unrated.join(", ")}`
      );
      err.code = "GROUP_INCOMPLETE";
      throw err;
    }

    // One combined invoice per group (skip if it already exists).
    const existing = await client.query(
      `SELECT ikey FROM public.invoice WHERE instruction_group_id = $1 AND m1key IS NULL`,
      [groupId]
    );
    let invoice = existing.rows[0] || null;

    if (!invoice) {
      const now = new Date();
      const year = now.getFullYear();
      const monthNames = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
      ];
      const monthName = monthNames[now.getMonth()];

      const seqResult = await client.query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_num FROM 'INV-\\d+-0*(\\d+)') AS INTEGER)), 0) + 1 AS next FROM public.invoice WHERE invoice_num LIKE $1",
        [`INV-${year}-%`]
      );
      const invoiceNum = `INV-${year}-${seqResult.rows[0].next}`;
      const monthlyGroupId = `${clientId}-${monthName}${year}`;

      // Invoice date = earliest assignment-leg date across the group's children.
      const dateResult = await client.query(
        `SELECT MIN(l.date) AS first_date
         FROM public.legs_m2 l
         JOIN public.m1_controller m ON m.m1key = l.m1key
         WHERE m.instruction_group_id = $1 AND l.date IS NOT NULL`,
        [groupId]
      );
      const invoiceDate = dateResult.rows[0].first_date || now;

      const insertInvoice = await client.query(
        `INSERT INTO public.invoice (clientid, instruction_group_id, invoice_num, groupid, date)
         VALUES ($1, $2, $3, $4, $5) RETURNING ikey, invoice_num`,
        [clientId, groupId, invoiceNum, monthlyGroupId, invoiceDate]
      );
      invoice = insertInvoice.rows[0];
    }

    // Mark children and the group Completed.
    await client.query(
      `UPDATE public.m1_controller SET status = 'Completed' WHERE instruction_group_id = $1`,
      [groupId]
    );
    await client.query(
      `UPDATE public.instruction_group SET status = 'Completed' WHERE group_key = $1`,
      [groupId]
    );

    await client.query("COMMIT");
    return {
      success: true,
      groupId,
      invoiceId: invoice.ikey,
      invoiceNum: invoice.invoice_num,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
