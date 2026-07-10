/**
 * Audit logging utility for tracking important actions
 */

import { pool } from "../config/database.js";

/**
 * Generic audit-trail writer for any business mutation (invoices, payments,
 * rates, instructions, credit notes, ...). Fire-and-forget: audit failures are
 * logged but never break the operation being audited.
 *
 * Reuses the existing audit_log columns: admin_id holds the acting user's id,
 * target_employee_id/name hold the affected entity's id/label, and the
 * entity_type column (migration 006) says what kind of entity it was.
 */
export const logAudit = async ({
  actionType,
  entityType = null,
  actorId = null,
  targetId = null,
  targetName = null,
  details = null,
  userAgent = null,
}) => {
  try {
    const numericTargetId = Number.isInteger(Number(targetId)) ? Number(targetId) : null;
    await pool.query(
      `INSERT INTO audit_log (
        action_type, entity_type, admin_id, target_employee_id,
        target_employee_name, timestamp, details, user_agent
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
      [actionType, entityType, actorId, numericTargetId, targetName, details, userAgent]
    );
  } catch (error) {
    console.error(`Failed to write audit log (${actionType}):`, error.message);
  }
};

/**
 * Convenience wrapper that pulls the actor and user agent off the request.
 * Usage: auditFromReq(req, { actionType: "PAYMENT_CREATED", entityType: "payment", ... })
 */
export const auditFromReq = (req, { actionType, entityType, targetId, targetName, details }) =>
  logAudit({
    actionType,
    entityType,
    actorId: req.user?.userid ?? null,
    targetId,
    targetName,
    details,
    userAgent: req.headers["user-agent"] || null,
  });

export const logPasswordChange = async (client, adminId, employeeId, employeeName, userAgent = null) => {
  try {
    const logQuery = `
      INSERT INTO audit_log (
        action_type, 
        admin_id, 
        target_employee_id, 
        target_employee_name, 
        timestamp, 
        details,
        user_agent
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `;
    
    const logValues = [
      'PASSWORD_CHANGE',
      adminId,
      employeeId,
      employeeName,
      `Admin ${adminId} changed password for employee ${employeeName} (ID: ${employeeId})`,
      userAgent
    ];
    
    await client.query(logQuery, logValues);
    console.log(`Audit log: Password change recorded for employee ${employeeId} by admin ${adminId}`);
  } catch (error) {
    console.error('Failed to log password change audit:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
};

export const logEmployeeCreation = async (client, adminId, employeeId, employeeName, userAgent = null) => {
  try {
    const logQuery = `
      INSERT INTO audit_log (
        action_type, 
        admin_id, 
        target_employee_id, 
        target_employee_name, 
        timestamp, 
        details,
        user_agent
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `;
    
    const logValues = [
      'EMPLOYEE_CREATION',
      adminId,
      employeeId,
      employeeName,
      `Admin ${adminId} created new employee ${employeeName} (ID: ${employeeId})`,
      userAgent
    ];
    
    await client.query(logQuery, logValues);
    console.log(`Audit log: Employee creation recorded for employee ${employeeId} by admin ${adminId}`);
  } catch (error) {
    console.error('Failed to log employee creation audit:', error);
  }
};
