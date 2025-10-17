const express = require("express");
const router = express.Router();
const {
  getEvents,
  getEventByCode,
  createEvent,
  updateEvent,
  deleteEvent,
  bookEvent,
  getMyEventBookings,
  getAllBookings,
  getBookingByCode,
  updateBookingStatus,
  cancelBooking,
} = require("../controllers/event.controller");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// --- 🔹 Public routes ---
router.get("/", getEvents); // List all events

// 🔹 Check event availability (public)
router.get("/:eventId/availability", async (req, res) => {
  const Event = require("../models/Event");
  const EventBooking = require("../models/EventBooking");

  try {
    const { eventId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const overlappingBooking = await EventBooking.findOne({
      event: eventId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        {
          startDate: { $lt: new Date(endDate) },
          endDate: { $gt: new Date(startDate) },
        },
      ],
    });

    res.json({ available: !overlappingBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single event by eventCode
router.get("/:eventCode", getEventByCode);

// --- 🔹 User routes ---
router.post("/book", authMiddleware, bookEvent); // Book an event
router.get("/my", authMiddleware, getMyEventBookings); // Get logged-in user's event bookings

// --- 🔹 Staff/Admin booking management ---
router.get(
  "/bookings",
  authMiddleware,
  roleMiddleware("staff", "admin"),
  getAllBookings
);

router.get(
  "/bookings/:reservationCode",
  authMiddleware,
  roleMiddleware("staff", "admin"),
  getBookingByCode
);

router.put(
  "/bookings/:reservationCode",
  authMiddleware,
  roleMiddleware("staff", "admin"),
  updateBookingStatus
);

router.delete(
  "/bookings/:reservationCode",
  authMiddleware,
  roleMiddleware("staff", "admin"),
  cancelBooking
);

// --- 🔹 Admin/Staff event management ---
router.post("/", authMiddleware, roleMiddleware("admin", "staff"), createEvent);
router.put(
  "/:eventCode",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  updateEvent
);
router.delete(
  "/:eventCode",
  authMiddleware,
  roleMiddleware("admin"),
  deleteEvent
);

module.exports = router;
