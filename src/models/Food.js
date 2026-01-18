const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodCategory",
      required: true
    },
    images: [{
      type: String,
      default: []
    }],
    ingredients: [{
      type: String,
      default: []
    }],
    preparationTime: {
      type: Number, // in minutes
      default: 15
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isVegetarian: {
      type: Boolean,
      default: false
    },
    isVegan: {
      type: Boolean,
      default: false
    },
    isSpicy: {
      type: Boolean,
      default: false
    },
    spiceLevel: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    calories: {
      type: Number,
      min: 0
    },
    tags: [{
      type: String,
      default: []
    }],
    sortOrder: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
foodSchema.index({ category: 1, isAvailable: 1 });
foodSchema.index({ isAvailable: 1, sortOrder: 1 });
foodSchema.index({ price: 1 });
foodSchema.index({ tags: 1 });
foodSchema.index({ createdAt: -1 });

// Virtual for discount percentage
foodSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

foodSchema.set('toJSON', { virtuals: true });
foodSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Food", foodSchema);