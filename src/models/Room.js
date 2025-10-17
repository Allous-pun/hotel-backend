const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    amenities: [String],
    images: [String],
    status: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
