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
  requestQuote,
  submitEnquiry,
  getQuotations,
  getEnquiries,
} = require("../controllers/event.controller");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin, notGuest } = require("../middleware/roleMiddleware"); // CHANGE THIS


// ======================================================
// 🔹 STAFF / ADMIN: BOOKING MANAGEMENT (place these FIRST)
// ======================================================
router.get(
  "/bookings",
  authMiddleware,
  staffOrAdmin, // CHANGED
  getAllBookings
);

router.get(
  "/bookings/:reservationCode",
  authMiddleware,
  staffOrAdmin, // CHANGED
  getBookingByCode
);

router.put(
  "/bookings/:reservationCode",
  authMiddleware,
  staffOrAdmin, // CHANGED
  updateBookingStatus
);

router.delete(
  "/bookings/:reservationCode",
  authMiddleware,
  staffOrAdmin, // CHANGED
  cancelBooking
);


// ======================================================
// 🔹 USER ROUTES (booking and viewing their own)
// ======================================================
router.post("/book", authMiddleware, notGuest, bookEvent); // CHANGED - added notGuest
router.get("/my", authMiddleware, notGuest, getMyEventBookings); // CHANGED - added notGuest


// ======================================================
// 🔹 PUBLIC ROUTES: Quotations & Enquiries
// ======================================================

// Request a quotation for a specific event
router.post("/:eventCode/quote", requestQuote);

// Submit a general event enquiry
router.post("/enquiry", submitEnquiry);

// Admin/Staff: view all quotations
router.get(
  "/quotations",
  authMiddleware,
  staffOrAdmin, // CHANGED
  getQuotations
);

// Admin/Staff: view all enquiries
router.get(
  "/enquiries",
  authMiddleware,
  staffOrAdmin, // CHANGED
  getEnquiries
);


// ======================================================
// 🔹 PUBLIC EVENT ROUTES
// ======================================================

// Get all events
router.get("/", getEvents);

// Check event availability
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

// ⚠️ KEEP THIS LAST — prevents route conflicts
router.get("/:eventCode", getEventByCode);


// ======================================================
// 🔹 ADMIN / STAFF: EVENT MANAGEMENT
// ======================================================
router.post("/", authMiddleware, staffOrAdmin, createEvent); // CHANGED

router.put(
  "/:eventCode",
  authMiddleware,
  staffOrAdmin, // CHANGED
  updateEvent
);

router.delete(
  "/:eventCode",
  authMiddleware,
  adminOnly, // CHANGED
  deleteEvent
);

module.exports = router;