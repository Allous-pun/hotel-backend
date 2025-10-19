const Event = require("../models/Event");
const EventBooking = require("../models/EventBooking");

// List all events
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ name: { $ne: "General Enquiries" } }) // 🚫 exclude dummy event
      .sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("❌ getEvents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single event by eventCode
exports.getEventByCode = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const event = await Event.findOne({
      eventCode,
      name: { $ne: "General Enquiries" }, // 🚫 exclude dummy event
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("❌ getEventByCode error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create event (admin/staff)
exports.createEvent = async (req, res) => {
  try {
    // Prevent creation of "General Enquiries" manually
    if (req.body.name === "General Enquiries")
      return res
        .status(400)
        .json({ message: '"General Enquiries" event cannot be created manually.' });

    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (err) {
    console.error("❌ createEvent error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Update event info (admin/staff)
exports.updateEvent = async (req, res) => {
  try {
    const { eventCode } = req.params;

    // Prevent editing the dummy General Enquiries event
    const event = await Event.findOneAndUpdate(
      { eventCode, name: { $ne: "General Enquiries" } },
      req.body,
      { new: true }
    );

    if (!event)
      return res.status(404).json({ message: "Event not found or not editable" });

    res.json(event);
  } catch (err) {
    console.error("❌ updateEvent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete event (admin)
exports.deleteEvent = async (req, res) => {
  try {
    const { eventCode } = req.params;

    const event = await Event.findOne({ eventCode });
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.name === "General Enquiries") {
      return res
        .status(400)
        .json({ message: '"General Enquiries" event cannot be deleted.' });
    }

    await Event.deleteOne({ eventCode });
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("❌ deleteEvent error:", err);
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
    const { eventId, guestsCount, startDate, endDate, notes } = req.body;

    if (!eventId || !startDate || !endDate || !guestsCount)
      return res
        .status(400)
        .json({ message: "eventId, startDate, endDate, and guestsCount are required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 🔒 Prevent double booking
    const overlappingBooking = await EventBooking.findOne({
      event: eventId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
      $or: [
        { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } },
      ],
    });

    if (overlappingBooking)
      return res.status(400).json({ message: "Event is not available for the selected dates" });

    // 🔹 Automatically calculate total price
    const dayCount =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const totalPrice = Math.round(dayCount * event.pricePerDay);

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

// Submit a quotation request for an event
exports.requestQuote = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const { fullName, email, phone, expectedGuests, message } = req.body;

    const event = await Event.findOne({ eventCode });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const quote = { fullName, email, phone, expectedGuests, message };
    event.quotations.push(quote);
    await event.save();

    res.status(201).json({ message: "Quotation request submitted", quote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Submit a general event enquiry
exports.submitEnquiry = async (req, res) => {
  try {
    const { fullName, email, phone, eventType, preferredDate, expectedGuests, additionalDetails } =
      req.body;

    const enquiry = {
      fullName,
      email,
      phone,
      eventType,
      preferredDate,
      expectedGuests,
      additionalDetails,
    };

    // store under a dummy "General Enquiries" event or globally if needed
    let event = await Event.findOne({ name: "General Enquiries" });
    if (!event) {
      event = await Event.create({
        name: "General Enquiries",
        description: "Container for general event enquiries",
        location: "N/A",
        date: new Date(),
        capacity: 0,
        pricePerDay: 0,
      });
    }

    event.enquiries.push(enquiry);
    await event.save();

    res.status(201).json({ message: "Enquiry submitted successfully", enquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/Staff: view all quotations
exports.getQuotations = async (req, res) => {
  try {
    const events = await Event.find(
      { "quotations.0": { $exists: true } },
      { name: 1, eventCode: 1, quotations: 1 }
    );

    if (!events.length)
      return res.status(404).json({ message: "No quotations found" });

    // Flatten for easier admin display
    const allQuotes = events.flatMap(event =>
      event.quotations.map(q => ({
        eventName: event.name,
        eventCode: event.eventCode,
        ...q.toObject()
      }))
    );

    res.json({
      totalEvents: events.length,
      totalQuotations: allQuotes.length,
      quotations: allQuotes,
    });
  } catch (err) {const Event = require("../models/Event");
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
    const { eventId, guestsCount, startDate, endDate, notes } = req.body;

    if (!eventId || !startDate || !endDate || !guestsCount)
      return res
        .status(400)
        .json({ message: "eventId, startDate, endDate, and guestsCount are required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // 🔒 Prevent double booking
    const overlappingBooking = await EventBooking.findOne({
      event: eventId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
      $or: [
        { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } },
      ],
    });

    if (overlappingBooking)
      return res.status(400).json({ message: "Event is not available for the selected dates" });

    // 🔹 Automatically calculate total price
    const dayCount =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const totalPrice = Math.round(dayCount * event.pricePerDay);

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

// Submit a quotation request for an event
exports.requestQuote = async (req, res) => {
  try {
    const { eventCode } = req.params;
    const { fullName, email, phone, expectedGuests, message } = req.body;

    const event = await Event.findOne({ eventCode });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const quote = { fullName, email, phone, expectedGuests, message };
    event.quotations.push(quote);
    await event.save();

    res.status(201).json({ message: "Quotation request submitted", quote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Submit a general event enquiry
exports.submitEnquiry = async (req, res) => {
  try {
    const { fullName, email, phone, eventType, preferredDate, expectedGuests, additionalDetails } =
      req.body;

    const enquiry = {
      fullName,
      email,
      phone,
      eventType,
      preferredDate,
      expectedGuests,
      additionalDetails,
    };

    // store under a dummy "General Enquiries" event or globally if needed
    let event = await Event.findOne({ name: "General Enquiries" });
    if (!event) {
      event = await Event.create({
        name: "General Enquiries",
        description: "Container for general event enquiries",
        location: "N/A",
        date: new Date(),
        capacity: 0,
        pricePerDay: 0,
      });
    }

    event.enquiries.push(enquiry);
    await event.save();

    res.status(201).json({ message: "Enquiry submitted successfully", enquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/Staff: view all quotations
exports.getQuotations = async (req, res) => {
  try {
    const events = await Event.find(
      { "quotations.0": { $exists: true } },
      { name: 1, eventCode: 1, quotations: 1 }
    );

    if (!events.length)
      return res.status(404).json({ message: "No quotations found" });

    // Flatten for easier admin display
    const allQuotes = events.flatMap(event =>
      event.quotations.map(q => ({
        eventName: event.name,
        eventCode: event.eventCode,
        ...q.toObject()
      }))
    );

    res.json({
      totalEvents: events.length,
      totalQuotations: allQuotes.length,
      quotations: allQuotes,
    });
  } catch (err) {
    console.error("❌ getQuotations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/Staff: view all enquiries
exports.getEnquiries = async (req, res) => {
  try {
    const events = await Event.find(
      { "enquiries.0": { $exists: true } },
      { name: 1, eventCode: 1, enquiries: 1 }
    );

    if (!events.length)
      return res.status(404).json({ message: "No enquiries found" });

    // Flatten for easier admin display
    const allEnquiries = events.flatMap(event =>
      event.enquiries.map(e => ({
        eventName: event.name,
        eventCode: event.eventCode,
        ...e.toObject()
      }))
    );

    res.json({
      totalEvents: events.length,
      totalEnquiries: allEnquiries.length,
      enquiries: allEnquiries,
    });
  } catch (err) {
    console.error("❌ getEnquiries error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
    console.error("❌ getQuotations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/Staff: view all enquiries
exports.getEnquiries = async (req, res) => {
  try {
    const events = await Event.find(
      { "enquiries.0": { $exists: true } },
      { name: 1, eventCode: 1, enquiries: 1 }
    );

    if (!events.length)
      return res.status(404).json({ message: "No enquiries found" });

    // Flatten for easier admin display
    const allEnquiries = events.flatMap(event =>
      event.enquiries.map(e => ({
        eventName: event.name,
        eventCode: event.eventCode,
        ...e.toObject()
      }))
    );

    res.json({
      totalEvents: events.length,
      totalEnquiries: allEnquiries.length,
      enquiries: allEnquiries,
    });
  } catch (err) {
    console.error("❌ getEnquiries error:", err);
    res.status(500).json({ message: "Server error" });
  }
};