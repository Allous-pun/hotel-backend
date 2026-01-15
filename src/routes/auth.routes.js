const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getProfile,
  createStaffUser,
  createAdminUser 
} = require("../controllers/auth.controller"); 
const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/roleMiddleware"); 

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, getProfile);

router.post("/create-staff", authMiddleware, adminOnly, createStaffUser);
router.post("/create-admin", authMiddleware, adminOnly, createAdminUser);

module.exports = router;