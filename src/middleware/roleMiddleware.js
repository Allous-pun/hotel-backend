// middleware/roleMiddleware.js - USE THIS FIXED VERSION
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Convert to array if it's not already
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Access denied",
        details: `Required roles: ${roles.join(", ")}, Your role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = roleMiddleware;