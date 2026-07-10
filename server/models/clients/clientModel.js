import { pool } from "../../config/database.js";

const getAllClients = async () => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT m5clientkey, client AS companyname, representative, cellnum, email
      FROM public.m5_client
      ORDER BY companyname
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { getAllClients };
