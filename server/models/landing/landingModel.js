import { pool } from "../../config/database.js";

export const getInstructionStatusCounts = async () => {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT 
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END)::int AS new_count,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)::int AS in_progress_count,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END)::int AS completed_count
      FROM public.m1_controller
    `;
    const result = await client.query(sql);
    const row = result.rows[0] || { total: 0, new_count: 0, in_progress_count: 0, completed_count: 0 };
    return {
      total: row.total || 0,
      new: row.new_count || 0,
      in_progress: row.in_progress_count || 0,
      completed: row.completed_count || 0,
    };
  } finally {
    client.release();
  }
};
