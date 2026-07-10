import { pool, query } from "../../config/database.js";

const getClientInstructions = async (clientId, { year, month, type }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        m1.m1key, 
        m1."ksmFileRef" as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1."clientFileRef" as file_no, 
        m1.status,
        m1.created_at as pickupdate,
        m1.total_cost AS base_total_cost,
        COALESCE(m1.vat, 0) AS vat_percentage,
        (COALESCE(m1.total_cost, 0) * (1 + COALESCE(m1.vat, 0)::numeric / 100)) AS total_cost,
        i.ikey,
        i.invoice_num,
        i.date as invoice_date,
        i.groupid as invoice_group_id,
        st.statement_key as statement_id
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      INNER JOIN
        public.invoice i ON m1.m1key = i.m1key
      LEFT JOIN LATERAL (
        SELECT statement_key
        FROM public.statements st
        WHERE st.clientid = m1.client
        ORDER BY st.generation_date DESC
        LIMIT 1
      ) st ON TRUE
      WHERE 
        m1.client = $1
        AND m1.status = 'Completed'
    `;

    const queryParams = [clientId];
    let paramIndex = 2;

    // Add type filter if provided and not "All"
    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Handle date filtering - with separate conditions for year and month
    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM m1.created_at) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    }

    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM m1.created_at) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    // Order by created_at descending (newest first)
    queryText += ` ORDER BY m1.created_at DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);

    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

export { getClientInstructions };
