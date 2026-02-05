const NotificationService = require("../services/notificationService");

/**
 * Middleware to send notification for order events
 */
exports.notifyOrderCreated = async (order, user = null) => {
  try {
    const template = NotificationService.createTemplate("order_placed", {
      orderCode: order.orderCode,
      tableNumber: order.table?.tableNumber || order.table
    });

    // Notify admin and waiters about new order
    await NotificationService.sendNotificationToRole(
      ["admin", "waiter"],
      "order_placed",
      template.title,
      template.message,
      {
        orderCode: order.orderCode,
        orderId: order._id,
        tableId: order.table,
        status: order.status,
        totalPrice: order.totalPrice,
        itemsCount: order.items?.length || 0
      },
      user?._id
    );

    // If user is logged in, notify them too
    if (user) {
      await NotificationService.sendNotification(
        user._id,
        "order_placed",
        "Your Order is Confirmed",
        `Your order ${order.orderCode} has been placed successfully.`,
        {
          orderCode: order.orderCode,
          orderId: order._id,
          table: order.table,
          status: order.status,
          totalPrice: order.totalPrice
        }
      );
    }
  } catch (error) {
    console.error("Error sending order created notification:", error);
  }
};

/**
 * Middleware to send notification for order status changes
 */
exports.notifyOrderStatusChanged = async (order, oldStatus, newStatus, changedBy = null) => {
  try {
    const template = NotificationService.createTemplate("order_status_changed", {
      orderCode: order.orderCode,
      status: newStatus
    });

    // Notify assigned waiter if exists
    if (order.assignedTo) {
      await NotificationService.sendNotification(
        order.assignedTo,
        "order_status_changed",
        template.title,
        template.message,
        {
          orderCode: order.orderCode,
          orderId: order._id,
          oldStatus,
          newStatus,
          changedBy: changedBy?._id,
          tableId: order.table
        },
        changedBy?._id
      );
    }

    // Notify user who placed the order
    if (order.user) {
      const userMessages = {
        "preparing": "Your order is now being prepared",
        "ready": "Your order is ready for pickup",
        "served": "Your order has been served",
        "completed": "Your order has been completed"
      };

      await NotificationService.sendNotification(
        order.user,
        "order_status_changed",
        userMessages[newStatus] || "Order Status Updated",
        `Order ${order.orderCode} is now ${newStatus}.`,
        {
          orderCode: order.orderCode,
          orderId: order._id,
          status: newStatus
        }
      );
    }

    // Notify admin for significant status changes
    if (["cancelled", "ready", "served"].includes(newStatus)) {
      await NotificationService.sendNotificationToRole(
        ["admin"],
        "order_status_changed",
        template.title,
        template.message,
        {
          orderCode: order.orderCode,
          orderId: order._id,
          oldStatus,
          newStatus,
          changedBy: changedBy?._id
        },
        changedBy?._id
      );
    }
  } catch (error) {
    console.error("Error sending order status change notification:", error);
  }
};

/**
 * Middleware to send notification for order assignment
 */
exports.notifyOrderAssigned = async (order, waiterId, assignedBy = null) => {
  try {
    const template = NotificationService.createTemplate("order_assigned", {
      orderCode: order.orderCode
    });

    // Notify the assigned waiter
    await NotificationService.sendNotification(
      waiterId,
      "order_assigned",
      template.title,
      template.message,
      {
        orderCode: order.orderCode,
        orderId: order._id,
        tableId: order.table,
        assignedBy: assignedBy?._id,
        priority: order.priority
      },
      assignedBy?._id
    );

    // Notify admin about the assignment
    await NotificationService.sendNotificationToRole(
      ["admin"],
      "order_assigned",
      `Order ${order.orderCode} Assigned`,
      `Order ${order.orderCode} has been assigned to a waiter.`,
      {
        orderCode: order.orderCode,
        orderId: order._id,
        waiterId,
        assignedBy: assignedBy?._id
      },
      assignedBy?._id
    );
  } catch (error) {
    console.error("Error sending order assignment notification:", error);
  }
};

/**
 * Middleware to send notification for booking events
 */
exports.notifyBookingCreated = async (booking, user = null) => {
  try {
    const template = NotificationService.createTemplate("booking_created", {
      bookingCode: booking.bookingCode,
      roomNumber: booking.room?.roomNumber || booking.room
    });

    // Notify admin about new booking
    await NotificationService.sendNotificationToRole(
      ["admin"],
      "booking_created",
      template.title,
      template.message,
      {
        bookingCode: booking.bookingCode,
        bookingId: booking._id,
        roomId: booking.room,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: booking.totalAmount
      },
      user?._id
    );

    // Notify user
    if (user) {
      await NotificationService.sendNotification(
        user._id,
        "booking_created",
        "Booking Confirmed",
        `Your booking ${booking.bookingCode} has been received.`,
        {
          bookingCode: booking.bookingCode,
          bookingId: booking._id,
          room: booking.room,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status
        }
      );
    }
  } catch (error) {
    console.error("Error sending booking created notification:", error);
  }
};

/**
 * Middleware to send notification for room events
 */
exports.notifyRoomStatusChanged = async (room, oldStatus, newStatus, changedBy = null) => {
  try {
    const template = NotificationService.createTemplate("room_status_changed", {
      roomNumber: room.roomNumber,
      status: newStatus
    });

    // Notify admin and housekeeping staff
    await NotificationService.sendNotificationToRole(
      ["admin", "staff"],
      "room_status_changed",
      template.title,
      template.message,
      {
        roomId: room._id,
        roomNumber: room.roomNumber,
        oldStatus,
        newStatus,
        changedBy: changedBy?._id
      },
      changedBy?._id
    );
  } catch (error) {
    console.error("Error sending room status change notification:", error);
  }
};

/**
 * Middleware to send notification for staff events
 */
exports.notifyStaffCreated = async (staff, createdBy = null) => {
  try {
    const template = NotificationService.createTemplate("staff_created", {
      staffName: staff.name
    });

    // Notify admin
    await NotificationService.sendNotificationToRole(
      ["admin"],
      "staff_created",
      template.title,
      template.message,
      {
        staffId: staff._id,
        staffName: staff.name,
        role: staff.role,
        email: staff.email
      },
      createdBy?._id
    );

    // Notify the new staff member
    await NotificationService.sendNotification(
      staff._id,
      "staff_created",
      "Welcome to the Team!",
      `Your staff account has been created. Your role is ${staff.role}.`,
      {
        userId: staff._id,
        role: staff.role,
        createdBy: createdBy?._id
      },
      createdBy?._id
    );
  } catch (error) {
    console.error("Error sending staff created notification:", error);
  }
};

/**
 * Middleware to send notification for table events
 */
exports.notifyTableOccupied = async (table, order = null, occupiedBy = null) => {
  try {
    const template = NotificationService.createTemplate("table_occupied", {
      tableNumber: table.tableNumber
    });

    // Notify waiters and admin
    await NotificationService.sendNotificationToRole(
      ["waiter", "admin"],
      "table_occupied",
      template.title,
      template.message,
      {
        tableId: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        orderId: order?._id,
        orderCode: order?.orderCode,
        occupiedBy: occupiedBy?._id
      },
      occupiedBy?._id
    );
  } catch (error) {
    console.error("Error sending table occupied notification:", error);
  }
};

/**
 * Middleware to send notification for food menu events
 */
exports.notifyFoodItemUpdated = async (food, action, updatedBy = null) => {
  try {
    const actions = {
      "created": {
        type: "food_item_created",
        title: "New Menu Item Added",
        message: `${food.name} has been added to the menu.`
      },
      "updated": {
        type: "food_item_updated",
        title: "Menu Item Updated",
        message: `${food.name} has been updated.`
      },
      "deleted": {
        type: "food_item_deleted",
        title: "Menu Item Removed",
        message: `${food.name} has been removed from the menu.`
      }
    };

    const notificationData = actions[action];
    if (!notificationData) return;

    // Notify admin
    await NotificationService.sendNotificationToRole(
      ["admin"],
      notificationData.type,
      notificationData.title,
      notificationData.message,
      {
        foodId: food._id,
        foodName: food.name,
        category: food.category,
        price: food.price,
        action,
        updatedBy: updatedBy?._id
      },
      updatedBy?._id
    );
  } catch (error) {
    console.error("Error sending food item update notification:", error);
  }
};

/**
 * Middleware to send notification for event bookings
 */
exports.notifyEventBooking = async (event, booking, user = null) => {
  try {
    const template = NotificationService.createTemplate("event_booking", {
      eventName: event.name
    });

    // Notify admin
    await NotificationService.sendNotificationToRole(
      ["admin"],
      "event_booking",
      template.title,
      template.message,
      {
        eventId: event._id,
        eventName: event.name,
        bookingId: booking._id,
        bookingDate: booking.date,
        guests: booking.guests,
        user: user?._id
      },
      user?._id
    );

    // Notify user
    if (user) {
      await NotificationService.sendNotification(
        user._id,
        "event_booking",
        "Event Booking Request Sent",
        `Your booking request for ${event.name} has been received.`,
        {
          eventId: event._id,
          eventName: event.name,
          bookingId: booking._id,
          date: booking.date,
          guests: booking.guests
        }
      );
    }
  } catch (error) {
    console.error("Error sending event booking notification:", error);
  }
};

/**
 * Global notification sender for generic events
 */
exports.sendNotification = async (options) => {
  try {
    const {
      recipients,
      type,
      title,
      message,
      data,
      sender
    } = options;

    return await NotificationService.sendNotification(
      recipients,
      type,
      title,
      message,
      data,
      sender
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};