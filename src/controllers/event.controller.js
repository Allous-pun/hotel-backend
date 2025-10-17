const Event = require("../models/Event");
const EventBooking = require("../models/EventBooking");

// List all events
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single event by eventCode
exports.getEventByCode = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const event = await Event.findOne({ eventCode });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create event (admin/staff)
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update event info (admin/staff)
exports.updateEvent = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const event = await Event.findOneAndUpdate({ eventCode }, req.body, { new: true });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete event (admin)
exports.deleteEvent = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const event = await Event.findOneAndDelete({ eventCode });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Check event availability
exports.checkEventAvailability = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate)
      return res.status(400).json({ message: "startDate and endDate are required" });

    const overlappingBooking = await EventBooking.findOne({
      event: eventId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
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
};

// Book an event (user)
exports.bookEvent = async (req, res) => {
  try {
    const { eventId, guestsCount, startDate, endDate, notes, totalPrice } = req.body;

    if (!eventId || !startDate || !endDate || !guestsCount)
      return res
        .status(400)
        .json({ message: "eventId, startDate, endDate, and guestsCount are required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 🔒 Prevent double booking (check overlapping dates)
    const overlappingBooking = await EventBooking.findOne({
      event: eventId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
      $or: [
        {
          startDate: { $lt: new Date(endDate) },
          endDate: { $gt: new Date(startDate) },
        },
      ],
    });

    if (overlappingBooking)
      return res.status(400).json({ message: "Event is not available for the selected dates" });

    const booking = await EventBooking.create({
      event: eventId,
      user: req.user._id,
      guestsCount,
      startDate,
      endDate,
      notes,
      totalPrice,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    if (err.code === 11000)
      return res.status(409).json({ message: "Duplicate reservation code" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get bookings for logged-in user
exports.getMyEventBookings = async (req, res) => {
  try {
    const bookings = await EventBooking.find({ user: req.user._id })
      .populate("event", "name date location");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await EventBooking.find()
      .populate("user", "name email")
      .populate("event", "name date location");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: get single booking by reservationCode
exports.getBookingByCode = async (req, res) => {
  try {
    const { reservationCode } = req.params;
    const booking = await EventBooking.findOne({ reservationCode })
      .populate("user", "name email")
      .populate("event", "name date location");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { reservationCode } = req.params;
    const { status, paymentStatus } = req.body;

    const booking = await EventBooking.findOne({ reservationCode });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();

    const updatedBooking = await EventBooking.findOne({ reservationCode })
      .populate("user", "name email")
      .populate("event", "name date location");

    res.json(updatedBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { reservationCode } = req.params;
    const booking = await EventBooking.findOneAndUpdate(
      { reservationCode },
      { status: "cancelled" },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
