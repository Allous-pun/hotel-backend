const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateSettings,
  updateRestaurantInfo,
  updateOperatingHours,
  updateNotifications,
  updateSecurity,
  updateSystemPreferences,
  updatePassword,
} = require("../controllers/setting.controller");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// 🧠 Validate imports
if (
  !getSettings ||
  !updateSettings ||
  !updateRestaurantInfo ||
  !updateOperatingHours ||
  !updateNotifications ||
  !updateSecurity ||
  !updateSystemPreferences ||
  !updatePassword
) {
  console.error("❌ Missing or mismatched controller functions in setting.controller.js");
  process.exit(1);
}

// 📘 Routes
// View current settings (Staff/Admin)
router.get("/", authMiddleware, getSettings);

// Admin-only updates
router.put("/", authMiddleware, roleMiddleware("admin"), updateSettings);
router.put("/info", authMiddleware, roleMiddleware("admin"), updateRestaurantInfo);
router.put("/hours", authMiddleware, roleMiddleware("admin"), updateOperatingHours);
router.put("/notifications", authMiddleware, roleMiddleware("admin"), updateNotifications);
router.put("/security", authMiddleware, roleMiddleware("admin"), updateSecurity);
router.put("/system", authMiddleware, roleMiddleware("admin"), updateSystemPreferences);
router.put("/password", authMiddleware, roleMiddleware("admin"), updatePassword);

module.exports = router;
