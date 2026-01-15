const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getProfile,
  createStaffUser,  // Make sure this is imported
  createAdminUser   // Make sure this is imported
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", authMiddleware, getProfile);

// Admin-only routes for creating users
router.post("/create-staff", authMiddleware, adminOnly, createStaffUser);
router.post("/create-admin", authMiddleware, adminOnly, createAdminUser);

module.exports = router;