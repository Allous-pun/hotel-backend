const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");
const Room = require("./Room");

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked-in", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// 🔢 Auto-generate booking code
bookingSchema.pre("save", async function (next) {
  if (!this.bookingCode) {
    this.bookingCode = generateCode("RM");
  }

  // 💰 Auto-calculate total price based on room rate × number of days
  if (this.isModified("checkIn") || this.isModified("checkOut") || this.isModified("room")) {
    const room = await Room.findById(this.room);
    if (room && this.checkIn && this.checkOut) {
      const days =
        Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24)) || 1;
      this.totalPrice = room.price * days;
    }
  }

  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
