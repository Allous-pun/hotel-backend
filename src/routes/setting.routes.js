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
  // New exports
  getAboutUs,
  updateAboutUs,
  getContactInfo,
  updateContactInfo,
  submitContactForm,
  getContactSubmissions,
  getContactSubmission,
  updateContactSubmission,
  addResponseToSubmission,
  addInternalNote,
  deleteContactSubmission,
  getRestaurantBasicInfo, // Add this new function
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

// 📘 ADMIN ROUTES (Protected)

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

// 🆕 ABOUT US ADMIN ROUTES
router.put("/about-us", authMiddleware, roleMiddleware("admin"), updateAboutUs);

// 🆕 CONTACT ADMIN ROUTES
router.put("/contact", authMiddleware, roleMiddleware("admin"), updateContactInfo);

// 🆕 CONTACT SUBMISSIONS ADMIN ROUTES
router.get("/contact-submissions", authMiddleware, roleMiddleware(["admin", "staff"]), getContactSubmissions);
router.get("/contact-submissions/:id", authMiddleware, roleMiddleware(["admin", "staff"]), getContactSubmission);
router.put("/contact-submissions/:id", authMiddleware, roleMiddleware(["admin", "staff"]), updateContactSubmission);
router.post("/contact-submissions/:id/response", authMiddleware, roleMiddleware(["admin", "staff"]), addResponseToSubmission);
router.post("/contact-submissions/:id/notes", authMiddleware, roleMiddleware(["admin", "staff"]), addInternalNote);
router.delete("/contact-submissions/:id", authMiddleware, roleMiddleware("admin"), deleteContactSubmission);

// 📘 PUBLIC ROUTES (No authentication required)

// Public Restaurant Basic Info (logo, name, etc.)
router.get("/public/restaurant-info", getRestaurantBasicInfo);

// Public About Us page
router.get("/public/about-us", getAboutUs);

// Public Contact page info
router.get("/public/contact", getContactInfo);

// Public Contact form submission
router.post("/public/contact", submitContactForm);

module.exports = router;