import { pool } from "../../config/database.js";

export const getInstructionStatusCounts = async () => {
  const client = await pool.connect();
  try {
    // Group-aware: every instruction belongs to an instruction_group (single-child
    // groups included, per the saveInstruction invariant), but instruction_group.status
    // only flips at finalise time (children can be 'In Progress' while the group
    // row itself still says 'New'), so it can't be trusted directly here. Instead
    // roll each group's children up into one status: Completed only once every
    // child is Completed, In Progress if any child has moved past New, else New.
    // COALESCE guards against any legacy row that somehow has no group yet, so it
    // still counts as its own singleton rather than merging into one NULL bucket.
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN group_status = 'New' THEN 1 ELSE 0 END)::int AS new_count,
        SUM(CASE WHEN group_status = 'In Progress' THEN 1 ELSE 0 END)::int AS in_progress_count,
        SUM(CASE WHEN group_status = 'Completed' THEN 1 ELSE 0 END)::int AS completed_count
      FROM (
        SELECT
          COALESCE(instruction_group_id, -m1key) AS group_id,
          CASE
            WHEN bool_and(status = 'Completed') THEN 'Completed'
            WHEN bool_or(status <> 'New') THEN 'In Progress'
            ELSE 'New'
          END AS group_status
        FROM public.m1_controller
        GROUP BY COALESCE(instruction_group_id, -m1key)
      ) groups
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
