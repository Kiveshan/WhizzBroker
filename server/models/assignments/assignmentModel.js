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
