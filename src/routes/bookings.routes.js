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
const roleMiddleware = require("../middleware/roleMiddleware");

// User: create new booking
router.post("/", authMiddleware, createBooking);

// User: get their bookings
router.get("/my", authMiddleware, getMyBookings);

// Staff/Admin: get all bookings
router.get("/", authMiddleware, roleMiddleware("staff", "admin"), getAllBookings);

// Staff/Admin: get booking by bookingCode
router.get("/:code", authMiddleware, roleMiddleware("staff", "admin"), getBookingByCode);

// Staff/Admin: update booking status
router.put("/:code", authMiddleware, roleMiddleware("staff", "admin"), updateBookingStatus);

// Staff/Admin: cancel booking
router.delete("/:code", authMiddleware, roleMiddleware("staff", "admin"), cancelBooking);

module.exports = router;
