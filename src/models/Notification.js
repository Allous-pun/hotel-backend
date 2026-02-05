const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Target user(s)
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    
    // Sender information
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    // Notification type categorization
    type: {
      type: String,
      required: true,
      enum: [
        // Order related
        "order_placed",
        "order_status_changed",
        "order_assigned",
        "order_cancelled",
        "order_rated",
        "order_payment_updated",
        
        // Booking related
        "booking_created",
        "booking_confirmed",
        "booking_cancelled",
        "booking_checked_in",
        "booking_checked_out",
        "booking_assigned",
        
        // Room related
        "room_created",
        "room_updated",
        "room_status_changed",
        "room_maintenance",
        
        // Table related
        "table_occupied",
        "table_cleared",
        "table_maintenance",
        
        // Food related
        "food_item_created",
        "food_item_updated",
        "food_item_deleted",
        "food_category_updated",
        
        // Staff related
        "staff_created",
        "staff_updated",
        "staff_deleted",
        "staff_assigned",
        
        // Event related
        "event_created",
        "event_updated",
        "event_deleted",
        "event_booking",
        
        // System
        "system_alert",
        "maintenance",
        "security",
        
        // Customer service
        "enquiry_received",
        "quote_requested",
        "feedback_received",
        
        // User account
        "user_registered",
        "login_attempt",
        "password_changed"
      ]
    },
    
    // Priority levels
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },
    
    // Notification content
    title: {
      type: String,
      required: true,
      trim: true
    },
    
    message: {
      type: String,
      required: true,
      trim: true
    },
    
    // Additional data for context
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Read status tracking
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Expiration for temporary notifications
    expiresAt: {
      type: Date
    },
    
    // Delivery status
    delivered: {
      type: Boolean,
      default: false
    },
    
    // Action options
    actions: [
      {
        label: String,
        url: String,
        method: String,
        color: String
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for optimized queries
notificationSchema.index({ recipients: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ "data.orderCode": 1 });
notificationSchema.index({ "data.bookingCode": 1 });
notificationSchema.index({ "data.tableId": 1 });

// Virtual field to check if notification is read by specific user
notificationSchema.virtual("isRead").get(function() {
  return this.readBy.length > 0;
});

// Method to mark as read by user
notificationSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(entry => 
    entry.user && entry.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

// Method to check if specific user has read
notificationSchema.methods.hasRead = function(userId) {
  return this.readBy.some(entry => 
    entry.user && entry.user.toString() === userId.toString()
  );
};

// Pre-save middleware to set default expiration (30 days)
notificationSchema.pre("save", function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);