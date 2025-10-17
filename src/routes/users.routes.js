const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Get all users (admin only)
router.get("/", authMiddleware, roleMiddleware("admin"), getAllUsers);

// Get single user (admin/staff)
router.get("/:id", authMiddleware, roleMiddleware("admin", "staff"), getUserById);

module.exports = router;
