const mongoose = require("mongoose");

const foodCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, 
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Index for faster queries
foodCategorySchema.index({ isActive: 1, sortOrder: 1 });
// REMOVED: foodCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("FoodCategory", foodCategorySchema);