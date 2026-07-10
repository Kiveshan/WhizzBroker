import { pool } from "../../config/database.js";

const getAllCompanyOwnedTrucks = async () => {
  const query = `
    SELECT 
      m5truckskey AS truckid, 
      truckregnum 
    FROM m5_trucks
    WHERE is_subcontractor IS DISTINCT FROM TRUE
    ORDER BY truckregnum;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getExpensesByTruckId = async (truckId) => {
const queryText = `
  SELECT 
    e.*, 
    t.truckregnum,
    COALESCE(
      CASE 
        WHEN e.documentfrom = 'Controller' THEN 
          (SELECT CONCAT(name, ' ', surname) FROM m5_employee WHERE roleid = 2 AND status = true LIMIT 1)
        WHEN e.documentfrom = 'Manager' THEN 
          (SELECT CONCAT(name, ' ', surname) FROM m5_employee WHERE userid = e.driverid AND roleid = 1 AND status = true)
        WHEN e.documentfrom = 'Driver' AND e.driverid IS NOT NULL THEN 
          CONCAT(emp.name, ' ', emp.surname)
        ELSE NULL
      END,
      e.documentfrom
    ) AS documentfrom_display
  FROM expenses_m2 e
  JOIN m5_trucks t ON e.truckid = t.m5truckskey
  LEFT JOIN m5_employee emp ON e.driverid = emp.userid AND e.documentfrom = 'Driver'
  WHERE e.truckid = $1
    AND (e.type ILIKE 'fuel' OR e.type ILIKE 'diesel' OR e.type ILIKE 'petrol')
  ORDER BY e.slipuploaddate DESC
`;
  const result = await pool.query(queryText, [truckId]);
  return result.rows;
};

const getAllExpenses = async () => {
  const queryText = `
    SELECT e.*, t.truckregnum, CONCAT(emp.name, ' ', surname) as driver_name
    FROM expenses_m2 e
    LEFT JOIN m5_trucks t ON e.truckid = t.m5truckskey
    LEFT JOIN m5_employee emp ON e.driverid = emp.userid
    ORDER BY e.slipuploaddate DESC
  `;
  const result = await pool.query(queryText);
  return result.rows;
};

export {
  //getTrucksWithFuelExpenses
  getAllCompanyOwnedTrucks,
  getExpensesByTruckId,
  getAllExpenses,
};
