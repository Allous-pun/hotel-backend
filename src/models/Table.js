const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: true,
      unique: true, // Keep this, REMOVE the schema.index below
      min: 1
    },
    name: {
      type: String,
      trim: true
    },
    section: {
      type: String,
      required: true,
      enum: ["Main Hall", "Terrace", "Private Room", "Bar Area", "Garden", "VIP"]
    },
    location: {
      type: String,
      default: "",
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      default: 4
    },
    description: {
      type: String,
      default: ""
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    shape: {
      type: String,
      enum: ["round", "square", "rectangle", "oval"],
      default: "round"
    },
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "cleaning", "maintenance", "out_of_service"],
      default: "available"
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodOrder",
      default: null
    },
    lastOccupiedAt: {
      type: Date,
      default: null
    },
    lastCleanedAt: {
      type: Date,
      default: null
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

// Indexes
// REMOVED: tableSchema.index({ tableNumber: 1 }); // Duplicate with unique: true above
tableSchema.index({ section: 1, status: 1 });
tableSchema.index({ status: 1 });
tableSchema.index({ isActive: 1 });
tableSchema.index({ "position.x": 1, "position.y": 1 });

module.exports = mongoose.model("Table", tableSchema);