// src/controllers/user.controller.js
const User = require("../models/User");

exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;

    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// 🔹 Get single user by id (admin/staff)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 ADMIN: Create waiter or staff user
exports.createUser = async (req, res) => {
  try {
    // Check if user is admin (middleware handles this, but double-check)
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can create staff/waiter accounts" });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    // Validate role - admin can only create waiter or staff (not guest or admin via this route)
    if (!["waiter", "staff"].includes(role)) {
      return res.status(400).json({ 
        message: "Admin can only create waiter or staff accounts via this endpoint. Use /api/auth/register for guests." 
      });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: `${role} account created successfully`,
      // Note: We don't return token here - user will log in separately via /api/auth/login
      instructions: "User can now log in using their email and password at /api/auth/login"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 ADMIN: Update user (PUT / PATCH)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can update users" });
    }

    // Prevent admin updating self status/role
    if (id === req.user._id.toString()) {
      if (updates.isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }
      if (updates.role && updates.role !== "admin") {
        return res.status(400).json({ message: "Cannot change your own role" });
      }
    }

    // Prevent assigning admin role
    if (updates.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts can only be created via /api/auth/create-admin",
      });
    }

    // Allowed fields
    const allowedFields = ["name", "email", "role", "isActive"];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      message: "User updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 ADMIN: Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deleting yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    // Prevent deleting admin users
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    }

    await User.findByIdAndDelete(id);

    res.json({
      message: "User deleted successfully",
      deletedUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};