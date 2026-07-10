import { pool, query } from "../../config/database.js";

const getAllDrivers = async () => {
  const queryText = `
    SELECT userid, name, surname 
    FROM m5_employee 
    WHERE roleid = 5 
    ORDER BY name, surname
  `;

  const result = await query(queryText);
  return result.rows;
};

export { getAllDrivers };
