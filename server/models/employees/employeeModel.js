import { pool } from "../../config/database.js";

const getEmployeeById = async (id) => {
  let client;
  try {
    client = await pool.connect();

    const queryText = `
      SELECT 
        e.userid, 
        e.name, 
        e.surname, 
        e.cellnum, 
        e.base_salary,
        r.rolename
      FROM 
        public.m5_employee e
      JOIN 
        public.roles r ON e.roleid = r.roleid
      WHERE 
        e.userid = $1
    `;

    const result = await client.query(queryText, [id]);

    if (result.rows.length === 0) {
      return { success: false, message: "Employee not found" };
    }

    return { success: true, data: result.rows[0] };
  } finally {
    if (client) client.release();
  }
};

export { getEmployeeById };
