// src/controllers/auth.controller.js
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");

// 🔹 Register a new user (guest, staff, or admin via secretKey)
exports.register = async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Determine role based on secretKey
    let role = "guest"; // default
    const key = secretKey?.trim(); // remove whitespace
    if (key === process.env.ADMIN_SECRET_KEY) role = "admin";
    else if (key === process.env.STAFF_SECRET_KEY) role = "staff";

    const user = await User.create({
      name,
      email,
      password, // hashed automatically via pre-save hook in User model
      role,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // visible for testing/admin creation only
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // returned for auth testing
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Get logged-in user profile
exports.getProfile = async (req, res) => {
  try {
    const user = req.user; // set by authMiddleware
    if (!user) return res.status(404).json({ message: "User not found" });

    // You can hide role from regular guests here if needed
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
