const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");

// --- Sub-schemas ---
const quotationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    expectedGuests: Number,
    message: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    eventType: String,
    preferredDate: Date,
    expectedGuests: Number,
    additionalDetails: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// --- Main Event Schema ---
const eventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, unique: true },
    name: { type: String, required: true },
    description: String,
    location: String,
    date: { type: Date, required: true },
    capacity: Number,
    pricePerDay: { type: Number, required: true }, // ✅ New field
    images: [String],
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // ✅ Embedded arrays
    quotations: [quotationSchema],
    enquiries: [enquirySchema],
  },
  { timestamps: true }
);

// Generate a unique event code
eventSchema.pre("save", function (next) {
  if (!this.eventCode) {
    this.eventCode = generateCode("EV");
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
