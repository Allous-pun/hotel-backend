const Setting = require("../models/Setting");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// 🟩 Get all settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    res.status(200).json(settings);
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟩 Create or update all settings (Admin)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    const updatedData = { ...req.body, lastUpdatedBy: req.user?._id };

    if (!settings) {
      settings = await Setting.create(updatedData);
    } else {
      Object.assign(settings, updatedData);
      await settings.save();
    }

    res.status(200).json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (err) {
    console.error("❌ Error updating settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟦 Update Restaurant Info
exports.updateRestaurantInfo = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.restaurantInfo = { ...settings.restaurantInfo, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Restaurant information updated successfully",
      restaurantInfo: settings.restaurantInfo,
    });
  } catch (err) {
    console.error("❌ Error updating restaurant info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟧 Update Operating Hours
exports.updateOperatingHours = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.operatingHours = { ...settings.operatingHours, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Operating hours updated successfully",
      operatingHours: settings.operatingHours,
    });
  } catch (err) {
    console.error("❌ Error updating operating hours:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟨 Update Notification Preferences
exports.updateNotifications = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // Merge both preferences and deliveryMethod
    if (req.body.preferences)
      settings.notifications.preferences = {
        ...settings.notifications.preferences,
        ...req.body.preferences,
      };
    if (req.body.deliveryMethod)
      settings.notifications.deliveryMethod = {
        ...settings.notifications.deliveryMethod,
        ...req.body.deliveryMethod,
      };

    settings.notifications.enabled =
      req.body.enabled ?? settings.notifications.enabled;

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Notification settings updated successfully",
      notifications: settings.notifications,
    });
  } catch (err) {
    console.error("❌ Error updating notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟥 Update Security Settings (2FA or password policy)
exports.updateSecurity = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    // ✅ Safely merge nested structure
    if (req.body.twoFactorAuth !== undefined)
      settings.security.twoFactorAuth = req.body.twoFactorAuth;

    if (req.body.passwordPolicy) {
      settings.security.passwordPolicy = {
        ...settings.security.passwordPolicy,
        ...req.body.passwordPolicy,
      };
    }

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "Security settings updated successfully",
      security: settings.security,
    });
  } catch (err) {
    console.error("❌ Error updating security settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟪 Update System Preferences (maintenance mode, etc.)
exports.updateSystemPreferences = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });

    settings.system = { ...settings.system, ...req.body };
    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      message: "System preferences updated successfully",
      system: settings.system,
    });
  } catch (err) {
    console.error("❌ Error updating system preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔐 Change Admin Password (with validation)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Error updating password:", err);
    res.status(500).json({ message: "Server error" });
  }
};
