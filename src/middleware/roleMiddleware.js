// src/middleware/roleMiddleware.js

// Original middleware - keeps the same logic
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

// Conceptual helpers using the original roleMiddleware function:

// adminOnly - Strict admin access
const adminOnly = roleMiddleware("admin");

// staffOrAdmin - For management tasks
const staffOrAdmin = roleMiddleware(["staff", "admin"]);

// waiterOrAbove - Waiter, staff, or admin
const waiterOrAbove = roleMiddleware(["waiter", "staff", "admin"]);

// notGuest - Any authenticated user except guest
const notGuest = roleMiddleware(["waiter", "staff", "admin"]);

module.exports = {
  roleMiddleware,  // Original flexible middleware
  adminOnly,       // Strict admin access
  staffOrAdmin,    // Staff or admin  
  waiterOrAbove,   // Waiter, staff, or admin
  notGuest         // Any authenticated non-guest (same as waiterOrAbove)
};