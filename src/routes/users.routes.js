const express = require("express");
const router = express.Router();
const { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} = require("../controllers/user.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin } = require("../middleware/roleMiddleware");

// Get all users (admin only)
router.get("/", authMiddleware, adminOnly, getAllUsers);

// Get single user (admin/staff)
router.get("/:id", authMiddleware, staffOrAdmin, getUserById);

// Create waiter/staff user (admin only)
router.post("/", authMiddleware, adminOnly, createUser);

// Update user (admin only)
router.put("/:id", authMiddleware, adminOnly, updateUser);

// Delete user (admin only)
router.delete("/:id", authMiddleware, adminOnly, deleteUser);

module.exports = router;