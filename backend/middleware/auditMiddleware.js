/**
 * Audit Logging Middleware
 * Tracks all critical operations for compliance and debugging
 */

const db = require('../models/db');

/**
 * Log audit trail entry
 * @param {number} userId - ID of user performing action
 * @param {string} action - Type of action (CREATE, UPDATE, DELETE, VIEW, etc.)
 * @param {string} entityType - Type of entity (Entry, Grade, User, etc.)
 * @param {number} entityId - ID of entity affected
 * @param {object} details - Additional details about the action
 */
exports.logAudit = async (userId, action, entityType, entityId, details = {}) => {
  try {
    const timestamp = new Date();
    const detailsJson = JSON.stringify(details);

    await db.promise().query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, detailsJson, timestamp]
    );

    console.log(`📋 Audit: ${action} ${entityType} #${entityId} by user #${userId}`);
  } catch (error) {
    console.error('❌ Error logging audit trail:', error);
    // Don't throw - continue operation even if audit fails
  }
};

/**
 * Middleware to attach audit logging to requests
 */
exports.auditMiddleware = (req, res, next) => {
  // Attach audit function to request object for use in controllers
  req.audit = exports.logAudit;
  next();
};

/**
 * Get audit logs for an entity
 */
exports.getAuditLogs = async (entityType, entityId) => {
  try {
    const [logs] = await db.promise().query(
      `SELECT al.*, u.username, u.email 
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = ? AND al.entity_id = ?
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [entityType, entityId]
    );
    return logs;
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return [];
  }
};
