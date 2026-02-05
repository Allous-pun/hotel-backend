const NotificationService = require("../services/notificationService");
const Notification = require("../models/Notification");

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      limit = 20, 
      skip = 0, 
      unreadOnly,
      type,
      priority 
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true',
      type: type || null,
      priority: priority || null
    };

    const notifications = await NotificationService.getUserNotifications(userId, options);
    
    const stats = await NotificationService.getUserNotificationStats(userId);

    res.status(200).json({
      success: true,
      count: notifications.length,
      stats,
      notifications
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message
    });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const stats = await NotificationService.getUserNotificationStats(userId);

    res.status(200).json({
      success: true,
      unreadCount: stats.unread,
      highPriorityCount: stats.highPriority
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unread count",
      error: error.message
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    await NotificationService.markAsRead(userId, notificationId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message
    });
  }
};

/**
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/notifications/read-multiple
 * @access  Private
 */
exports.markMultipleAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "Notification IDs array is required"
      });
    }

    await NotificationService.markAsRead(userId, notificationIds);

    res.status(200).json({
      success: true,
      message: `${notificationIds.length} notifications marked as read`
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
      error: error.message
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await NotificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
      error: error.message
    });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    // Check if notification belongs to user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipients: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message
    });
  }
};

/**
 * @desc    Get notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
exports.getNotificationById = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipients: userId
    })
    .populate("sender", "name email role")
    .populate("recipients", "name email role");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Check if user has read this notification
    const isRead = notification.hasRead(userId);

    res.status(200).json({
      success: true,
      notification: {
        ...notification.toObject(),
        isRead
      }
    });
  } catch (error) {
    console.error("Error getting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification",
      error: error.message
    });
  }
};

/**
 * @desc    Get notifications by type
 * @route   GET /api/notifications/type/:type
 * @access  Private
 */
exports.getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const notifications = await Notification.find({
      recipients: userId,
      type: type
    })
    .sort({ createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .populate("sender", "name email role")
    .lean();

    // Mark which notifications are read by this user
    notifications.forEach(notification => {
      notification.isRead = notification.readBy.some(entry => 
        entry.user && entry.user.toString() === userId.toString()
      );
      notification.readBy = undefined;
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Error getting notifications by type:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message
    });
  }
};

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/notifications/clear-all
 * @access  Private
 */
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      recipients: userId,
      priority: { $ne: "urgent" } // Don't delete urgent notifications
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications cleared`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing notifications",
      error: error.message
    });
  }
};