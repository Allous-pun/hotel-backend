const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");
const Event = require("./Event");

const eventBookingSchema = new mongoose.Schema(
  {
    reservationCode: { type: String, unique: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    guestsCount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalPrice: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// 🎫 Auto-generate reservation code + calculate total price
eventBookingSchema.pre("save", async function (next) {
  if (!this.reservationCode) {
    this.reservationCode = generateCode("EVR");
  }

  // 💰 Auto-calculate total price
  if (this.isModified("startDate") || this.isModified("endDate") || this.isModified("event")) {
    const event = await Event.findById(this.event);
    if (event && this.startDate && this.endDate) {
      const days =
        Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) || 1;
      const baseRate = event.capacity ? event.capacity * 500 : 2000; // Example pricing logic
      this.totalPrice = baseRate * days;
    }
  }

  next();
});

module.exports = mongoose.model("EventBooking", eventBookingSchema);
