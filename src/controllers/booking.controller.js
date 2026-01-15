const Booking = require("../models/Booking");
const Room = require("../models/Room");

// Create booking (user)
exports.createBooking = async (req, res) => {
  try {
    // 🔹 Check role - waiters cannot create bookings
    if (req.user.role === "waiter") {
      return res.status(403).json({ 
        message: "Waiters cannot create room bookings",
        details: "Please use a guest, staff, or admin account to create bookings"
      });
    }
    
    const { room: roomId, checkIn, checkOut } = req.body;
    if (!roomId || !checkIn || !checkOut)
      return res.status(400).json({ message: "room, checkIn and checkOut are required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // 🛑 Check if the room is already booked for overlapping dates
    const overlappingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ["pending", "confirmed", "checked-in"] }, // block active bookings
      $or: [
        {
          checkIn: { $lt: new Date(checkOut) },
          checkOut: { $gt: new Date(checkIn) },
        },
      ],
    });

    if (overlappingBooking) {
      return res
        .status(409)
        .json({ message: "Room is not available for the selected dates" });
    }

    // ✅ Create booking if available
    const booking = await Booking.create({
      user: req.user._id,
      room: roomId,
      checkIn,
      checkOut,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    if (err.code === 11000)
      return res.status(409).json({ message: "Duplicate booking code, try again" });
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get bookings for logged-in user
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate(
      "room",
      "name type price"
    );
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: get all bookings (now includes waiters as read-only)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("room", "name type price");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get booking by bookingCode (user/staff/waiter)
exports.getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const booking = await Booking.findOne({ bookingCode: code })
      .populate("user", "name email")
      .populate("room", "name type price");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: update booking status or paymentStatus (waiter CANNOT update)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const { status, paymentStatus } = req.body;

    // 🔹 Additional check to ensure waiter cannot update
    if (req.user.role === "waiter") {
      return res.status(403).json({ 
        message: "Waiters cannot update booking status",
        details: "Only staff or admin can update bookings"
      });
    }

    const booking = await Booking.findOne({ bookingCode: code }).populate("room");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    await booking.save();

    // 🔄 Sync room status automatically
    const room = await Room.findById(booking.room._id);
    if (room) {
      if (["confirmed", "checked-in"].includes(status)) room.status = "booked";
      if (["completed", "cancelled"].includes(status)) room.status = "available";
      await room.save();
    }

    const updatedBooking = await Booking.findOne({ bookingCode: code })
      .populate("user", "name email")
      .populate("room", "name type price");

    res.json(updatedBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Staff/Admin: cancel booking (waiter CANNOT cancel)
exports.cancelBooking = async (req, res) => {
  try {
    const { code } = req.params;
    
    // 🔹 Additional check to ensure waiter cannot cancel
    if (req.user.role === "waiter") {
      return res.status(403).json({ 
        message: "Waiters cannot cancel bookings",
        details: "Only staff or admin can cancel bookings"
      });
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingCode: code },
      { status: "cancelled" },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 🔄 Make room available again
    await Room.findByIdAndUpdate(booking.room, { status: "available" });

    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};