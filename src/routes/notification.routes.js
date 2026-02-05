const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  adminOnly,
  staffOrAdmin,
  waiterOrAbove
} = require("../middleware/roleMiddleware");

// Import controller
const notificationController = require("../controllers/notification.controller");

// ==================== NOTIFICATION ROUTES ====================

// Get all notifications for authenticated user
router.get("/", authMiddleware, notificationController.getNotifications);

// Get unread notification count
router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);

// Get notification by ID
router.get("/:id", authMiddleware, notificationController.getNotificationById);

// Get notifications by type
router.get("/type/:type", authMiddleware, notificationController.getNotificationsByType);

// Mark notification as read
router.put("/:id/read", authMiddleware, notificationController.markAsRead);

// Mark multiple notifications as read
router.put("/read-multiple", authMiddleware, notificationController.markMultipleAsRead);

// Mark all notifications as read
router.put("/read-all", authMiddleware, notificationController.markAllAsRead);

// Delete notification
router.delete("/:id", authMiddleware, notificationController.deleteNotification);

// Clear all notifications (except urgent)
router.delete("/clear-all", authMiddleware, notificationController.clearAllNotifications);

// ==================== ADMIN NOTIFICATION ROUTES ====================

// Admin: Get all notifications in system
router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { limit = 50, skip = 0, type, priority } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (priority) query.priority = priority;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate("sender", "name email role")
      .populate("recipients", "name email role")
      .lean();

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Error getting all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message
    });
  }
});

// Admin: Send broadcast notification
router.post("/admin/broadcast", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, message, recipients, type = "system_alert", priority = "normal", data = {} } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }
    
    let targetRecipients = [];
    
    if (recipients === 'all') {
      // Get all active users
      const User = require("../models/User");
      const users = await User.find({ isActive: true }).select("_id");
      targetRecipients = users.map(user => user._id);
    } else if (Array.isArray(recipients)) {
      targetRecipients = recipients;
    } else {
      return res.status(400).json({
        success: false,
        message: "Recipients must be 'all' or an array of user IDs"
      });
    }
    
    const NotificationService = require("../services/notificationService");
    const notification = await NotificationService.sendNotification(
      targetRecipients,
      type,
      title,
      message,
      data,
      req.user._id
    );
    
    res.status(201).json({
      success: true,
      message: `Notification sent to ${targetRecipients.length} recipients`,
      notification
    });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    res.status(500).json({
      success: false,
      message: "Error sending notification",
      error: error.message
    });
  }
});

// Admin: Get notification statistics
router.get("/admin/stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    const [
      totalNotifications,
      notificationsByType,
      notificationsByPriority,
      notificationsByDay,
      topRecipients
    ] = await Promise.all([
      // Total notifications
      Notification.countDocuments(dateFilter),
      
      // Notifications by type
      Notification.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Notifications by priority
      Notification.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      
      // Notifications by day (last 7 days)
      Notification.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top recipients
      Notification.aggregate([
        { $match: dateFilter },
        { $unwind: "$recipients" },
        {
          $group: {
            _id: "$recipients",
            count: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [
                  { $eq: [{ $size: { $ifNull: ["$readBy", []] } }, 0] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        total: totalNotifications,
        byType: notificationsByType,
        byPriority: notificationsByPriority,
        byDay: notificationsByDay,
        topRecipients
      }
    });
  } catch (error) {
    console.error("Error getting notification stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification statistics",
      error: error.message
    });
  }
});

module.exports = router;