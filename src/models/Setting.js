const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    // 🏨 Hotel / Restaurant Information
    restaurantInfo: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      address: { type: String },
      description: { type: String },
      logo: { type: String },
    },

    // 🕒 Operating Hours for Each Service
    operatingHours: {
      restaurantService: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "22:00" },
      },
      roomService: {
        open: { type: String, default: "00:00" },
        close: { type: String, default: "23:59" },
      },
      eventBookings: {
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" },
      },
    },

    // 🔔 Notification Settings (In-App Dashboard)
    notifications: {
      enabled: { type: Boolean, default: true }, // master toggle
      preferences: {
        newBookings: { type: Boolean, default: true },
        foodOrders: { type: Boolean, default: true },
        eventInquiries: { type: Boolean, default: true },
        paymentConfirmations: { type: Boolean, default: true },
        dailyReports: { type: Boolean, default: true },
      },
      // internal dashboard only (no external push yet)
      deliveryMethod: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false }, // reserved for future
        sms: { type: Boolean, default: false }, // reserved for future
      },
    },

    // 🔐 Security & Access Controls
    security: {
      twoFactorAuth: { type: Boolean, default: false },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireNumber: { type: Boolean, default: true },
        requireUppercase: { type: Boolean, default: false },
        requireSpecialChar: { type: Boolean, default: false },
      },
    },

    // ⚙️ System Preferences
    system: {
      maintenanceMode: { type: Boolean, default: false },
      allowSelfRegistration: { type: Boolean, default: true },
      bookingAutoConfirm: { type: Boolean, default: false },
    },

    // 📋 Audit Trail
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
