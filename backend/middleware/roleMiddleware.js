/**
 * Role-Based Authorization Middleware
 * Ensures users can only access resources matching their role
 */

module.exports = (allowedRoles) => {
  // Handle both string and array inputs
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user found in request' });
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      console.warn(`⚠️ Authorization failed: User role '${req.user.role}' not in allowed roles [${roles.join(', ')}]`);
      return res.status(403).json({
        message: `Forbidden: Your role '${req.user.role}' does not have access to this resource`,
        allowedRoles: roles
      });
    }

    next();
  };
};
