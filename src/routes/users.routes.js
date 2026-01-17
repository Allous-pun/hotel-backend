const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin } = require("../middleware/roleMiddleware");

// Admin only
router.get("/", authMiddleware, adminOnly, getAllUsers);
router.post("/", authMiddleware, adminOnly, createUser);
router.delete("/:id", authMiddleware, adminOnly, deleteUser);

// Admin / Staff
router.get("/:id", authMiddleware, staffOrAdmin, getUserById);

// Admin update (PUT + PATCH)
router.put("/:id", authMiddleware, adminOnly, updateUser);
router.patch("/:id", authMiddleware, adminOnly, updateUser);

module.exports = router;
