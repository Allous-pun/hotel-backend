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
  getRestaurantBasicInfo,
} = require("../controllers/setting.controller");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin } = require("../middleware/roleMiddleware");

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

// 📘 SETTINGS ACCESS (Following your requirements)

// View current settings (Staff read-only, Admin full)
// According to your table: staff = 👁 read-only, waiter = ❌ none, admin = 🛠 full
router.get("/", authMiddleware, staffOrAdmin, getSettings);

// Admin-only updates (waiter = ❌ none, staff = 👁 read-only, admin = 🛠 full)
router.put("/", authMiddleware, adminOnly, updateSettings);
router.put("/info", authMiddleware, adminOnly, updateRestaurantInfo);
router.put("/hours", authMiddleware, adminOnly, updateOperatingHours);
router.put("/notifications", authMiddleware, adminOnly, updateNotifications);
router.put("/security", authMiddleware, adminOnly, updateSecurity);
router.put("/system", authMiddleware, adminOnly, updateSystemPreferences);
router.put("/password", authMiddleware, adminOnly, updatePassword);

// 🆕 ABOUT US ADMIN ROUTES (Admin only - waiter = ❌ none, staff = 👁 read-only)
router.put("/about-us", authMiddleware, adminOnly, updateAboutUs);

// 🆕 CONTACT ADMIN ROUTES (Admin only - waiter = ❌ none, staff = 👁 read-only)
router.put("/contact", authMiddleware, adminOnly, updateContactInfo);

// 🆕 CONTACT SUBMISSIONS ADMIN ROUTES
// Staff can view and manage submissions (read/write for their area)
// Admin has full access
router.get("/contact-submissions", authMiddleware, staffOrAdmin, getContactSubmissions);
router.get("/contact-submissions/:id", authMiddleware, staffOrAdmin, getContactSubmission);
router.put("/contact-submissions/:id", authMiddleware, staffOrAdmin, updateContactSubmission);
router.post("/contact-submissions/:id/response", authMiddleware, staffOrAdmin, addResponseToSubmission);
router.post("/contact-submissions/:id/notes", authMiddleware, staffOrAdmin, addInternalNote);
router.delete("/contact-submissions/:id", authMiddleware, adminOnly, deleteContactSubmission);

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