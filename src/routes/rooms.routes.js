const express = require("express");
const router = express.Router();
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/room.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin } = require("../middleware/roleMiddleware"); // CHANGE THIS
const Booking = require("../models/Booking");

// Public: get all rooms
router.get("/", getRooms);

// Public: get single room by roomId
router.get("/:roomId", getRoomById);

// 🔹 Check room availability (public or logged-in)
router.get("/:roomId/availability", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut)
      return res.status(400).json({ message: "checkIn and checkOut are required" });

    const overlappingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ["pending", "confirmed", "checked-in"] },
      $or: [
        {
          checkIn: { $lt: new Date(checkOut) },
          checkOut: { $gt: new Date(checkIn) },
        },
      ],
    });

    res.json({ available: !overlappingBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin/Staff: create room
router.post("/", authMiddleware, staffOrAdmin, createRoom); // CHANGED

// Admin/Staff: update room
router.put("/:roomId", authMiddleware, staffOrAdmin, updateRoom); // CHANGED

// Admin: delete room
router.delete("/:roomId", authMiddleware, adminOnly, deleteRoom); // CHANGED

module.exports = router;