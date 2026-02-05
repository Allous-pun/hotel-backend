const Notification = require("../models/Notification");
const User = require("../models/User");

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Notification>} Created notification
   */
  static async createNotification(notificationData) {
    try {
      // Validate required fields
      if (!notificationData.recipients || !notificationData.type || 
          !notificationData.title || !notificationData.message) {
        throw new Error("Missing required notification fields");
      }

      // Create the notification
      const notification = new Notification({
        ...notificationData,
        delivered: false
      });

      await notification.save();
      
      // Emit real-time event (if WebSocket is configured)
      this.emitRealTimeNotification(notification);
      
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Send notification to specific user(s)
   * @param {string|Array} userIds - User ID or array of user IDs
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   * @param {string} senderId - Sender user ID
   * @returns {Promise<Notification>} Created notification
   */
  static async sendNotification(userIds, type, title, message, data = {}, senderId = null) {
    try {
      // Convert single user ID to array
      const recipients = Array.isArray(userIds) ? userIds : [userIds];
      
      // Validate users exist
      const users = await User.find({ _id: { $in: recipients } }).select("_id");
      if (users.length !== recipients.length) {
        console.warn("Some users not found for notification");
      }

      const notification = await this.createNotification({
        recipients,
        sender: senderId,
        type,
        title,
        message,
        data,
        priority: this.getPriorityForType(type)
      });

      console.log(`Notification sent: ${type} to ${recipients.length} user(s)`);
      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Send notification to users by role
   * @param {string|Array} roles - Role or array of roles
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   * @param {string} senderId - Sender user ID
   * @returns {Promise<Notification>} Created notification
   */
  static async sendNotificationToRole(roles, type, title, message, data = {}, senderId = null) {
    try {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      
      // Find users with specified roles
      const users = await User.find({ 
        role: { $in: roleArray },
        isActive: true 
      }).select("_id");
      
      if (users.length === 0) {
        console.warn(`No active users found with roles: ${roleArray.join(", ")}`);
        return null;
      }

      const userIds = users.map(user => user._id);
      return await this.sendNotification(userIds, type, title, message, data, senderId);
    } catch (error) {
      console.error("Error sending notification to role:", error);
      throw error;
    }
  }

  /**
   * Get priority level for notification type
   * @param {string} type - Notification type
   * @returns {string} Priority level
   */
  static getPriorityForType(type) {
    const priorityMap = {
      // Urgent notifications
      "system_alert": "urgent",
      "security": "urgent",
      "order_cancelled": "high",
      "booking_cancelled": "high",
      
      // High priority
      "order_placed": "high",
      "order_assigned": "high",
      "booking_confirmed": "high",
      "room_maintenance": "high",
      "table_occupied": "high",
      
      // Normal priority
      "order_status_changed": "normal",
      "order_rated": "normal",
      "booking_created": "normal",
      "booking_checked_in": "normal",
      "food_item_created": "normal",
      "staff_created": "normal",
      "event_booking": "normal",
      
      // Low priority
      "enquiry_received": "low",
      "feedback_received": "low",
      "user_registered": "low"
    };

    return priorityMap[type] || "normal";
  }

  /**
   * Create notification template
   * @param {string} type - Notification type
   * @param {Object} context - Context data for template
   * @returns {Object} Notification template with title and message
   */
  static createTemplate(type, context = {}) {
    const templates = {
      // Order templates
      "order_placed": {
        title: "New Order Placed",
        message: `Order ${context.orderCode || ''} has been placed for Table ${context.tableNumber || ''}.`
      },
      "order_status_changed": {
        title: "Order Status Updated",
        message: `Order ${context.orderCode || ''} is now ${context.status || ''}.`
      },
      "order_assigned": {
        title: "Order Assigned",
        message: `Order ${context.orderCode || ''} has been assigned to you.`
      },
      "order_cancelled": {
        title: "Order Cancelled",
        message: `Order ${context.orderCode || ''} has been cancelled. ${context.reason ? `Reason: ${context.reason}` : ''}`
      },
      "order_rated": {
        title: "Order Rated",
        message: `Order ${context.orderCode || ''} has been rated ${context.rating || ''} stars.`
      },
      
      // Booking templates
      "booking_created": {
        title: "New Booking",
        message: `Booking ${context.bookingCode || ''} for Room ${context.roomNumber || ''} has been created.`
      },
      "booking_confirmed": {
        title: "Booking Confirmed",
        message: `Booking ${context.bookingCode || ''} has been confirmed.`
      },
      "booking_assigned": {
        title: "Booking Assigned",
        message: `Booking ${context.bookingCode || ''} has been assigned to you.`
      },
      
      // Room templates
      "room_status_changed": {
        title: "Room Status Changed",
        message: `Room ${context.roomNumber || ''} is now ${context.status || ''}.`
      },
      
      // Table templates
      "table_occupied": {
        title: "Table Occupied",
        message: `Table ${context.tableNumber || ''} is now occupied.`
      },
      
      // Staff templates
      "staff_created": {
        title: "New Staff Member",
        message: `${context.staffName || 'A new staff member'} has been added.`
      },
      
      // Event templates
      "event_booking": {
        title: "Event Booking Request",
        message: `New booking request for ${context.eventName || 'an event'}.`
      }
    };

    return templates[type] || {
      title: "Notification",
      message: "You have a new notification."
    };
  }

  /**
   * Emit real-time notification via WebSocket
   * @param {Notification} notification - Notification object
   */
  static emitRealTimeNotification(notification) {
    // This would integrate with your WebSocket server
    // For now, we'll log it
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[WebSocket] Emitting notification: ${notification.type}`);
    }
    
    // In a real implementation:
    // if (global.io) {
    //   notification.recipients.forEach(userId => {
    //     global.io.to(`user_${userId}`).emit('notification', notification);
    //   });
    // }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  static async getUserNotifications(userId, options = {}) {
    const { 
      limit = 50, 
      skip = 0, 
      unreadOnly = false,
      type = null,
      priority = null
    } = options;

    const query = {
      recipients: userId
    };

    if (unreadOnly) {
      query["readBy.user"] = { $ne: userId };
    }

    if (type) {
      query.type = type;
    }

    if (priority) {
      query.priority = priority;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name email role")
      .populate("recipients", "name email role")
      .lean();

    // Mark which notifications are read by this user
    notifications.forEach(notification => {
      notification.isRead = notification.readBy.some(entry => 
        entry.user && entry.user.toString() === userId.toString()
      );
      notification.readBy = undefined; // Remove readBy array from response
    });

    return notifications;
  }

  /**
   * Mark notifications as read
   * @param {string} userId - User ID
   * @param {string|Array} notificationIds - Notification ID(s)
   * @returns {Promise<Object>} Update result
   */
  static async markAsRead(userId, notificationIds) {
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    
    const notifications = await Notification.find({
      _id: { $in: ids },
      recipients: userId
    });

    const updatePromises = notifications.map(notification => 
      notification.markAsRead(userId)
    );

    return Promise.all(updatePromises);
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async markAllAsRead(userId) {
    const notifications = await Notification.find({
      recipients: userId,
      "readBy.user": { $ne: userId }
    });

    const updatePromises = notifications.map(notification => 
      notification.markAsRead(userId)
    );

    return Promise.all(updatePromises);
  }

  /**
   * Get notification statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification statistics
   */
  static async getUserNotificationStats(userId) {
    const [
      totalCount,
      unreadCount,
      highPriorityCount,
      todayCount
    ] = await Promise.all([
      // Total notifications
      Notification.countDocuments({ recipients: userId }),
      
      // Unread notifications
      Notification.countDocuments({ 
        recipients: userId,
        "readBy.user": { $ne: userId }
      }),
      
      // High priority notifications
      Notification.countDocuments({ 
        recipients: userId,
        priority: { $in: ["high", "urgent"] },
        "readBy.user": { $ne: userId }
      }),
      
      // Today's notifications
      Notification.countDocuments({
        recipients: userId,
        createdAt: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);

    return {
      total: totalCount,
      unread: unreadCount,
      highPriority: highPriorityCount,
      today: todayCount
    };
  }

  /**
   * Clean up old notifications
   * @returns {Promise<Object>} Cleanup result
   */
  static async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      priority: { $ne: "urgent" }
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result;
  }
}

module.exports = NotificationService;