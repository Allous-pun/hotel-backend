const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");

const eventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, unique: true },
    name: { type: String, required: true },
    description: String,
    location: String,
    date: { type: Date, required: true },
    capacity: Number,
    images: [String], // ✅ Array of image URLs or file paths
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Generate a unique event code before saving
eventSchema.pre("save", function (next) {
  if (!this.eventCode) {
    this.eventCode = generateCode("EV");
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
