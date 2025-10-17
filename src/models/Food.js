const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: String,
    price: { type: Number, required: true },
    description: String,
    image: String,
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Food", foodSchema);
