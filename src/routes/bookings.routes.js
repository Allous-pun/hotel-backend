const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingByCode,
  updateBookingStatus,
  cancelBooking,
} = require("../controllers/booking.controller");

const authMiddleware = require("../middleware/authMiddleware");
const { staffOrAdmin, waiterOrAbove } = require("../middleware/roleMiddleware");

// User: create new booking (all authenticated users except waiters)
router.post("/", authMiddleware, createBooking);

// User: get their bookings (all authenticated users)
router.get("/my", authMiddleware, getMyBookings);

// Waiter/Staff/Admin: get all bookings (waiter is read-only)
router.get("/", authMiddleware, waiterOrAbove, getAllBookings);

// Waiter/Staff/Admin: get booking by bookingCode (waiter is read-only)
router.get("/:code", authMiddleware, waiterOrAbove, getBookingByCode);

// Staff/Admin: update booking status (waiter CANNOT update)
router.put("/:code", authMiddleware, staffOrAdmin, updateBookingStatus);

// Staff/Admin: cancel booking (waiter CANNOT cancel)
router.delete("/:code", authMiddleware, staffOrAdmin, cancelBooking);

module.exports = router;