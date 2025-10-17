const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");

const foodOrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        food: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
        quantity: { type: Number, required: true },
      },
    ],
    totalPrice: Number,
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

foodOrderSchema.pre("save", function (next) {
  if (!this.orderCode) {
    this.orderCode = generateCode("FD");
  }
  next();
});

module.exports = mongoose.model("FoodOrder", foodOrderSchema);
