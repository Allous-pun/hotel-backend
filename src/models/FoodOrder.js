const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");

const foodOrderSchema = new mongoose.Schema(
  {
    orderCode: { 
      type: String, 
      unique: true 
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    items: [
      {
        food: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Food" 
        },
        quantity: { 
          type: Number, 
          required: true 
        },
        specialInstructions: String,
      },
    ],
    totalPrice: Number,
    
    // 🔹 Table information (mandatory)
    tableNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    tableSection: {
      type: String,
      default: "Main Hall",
      enum: ["Main Hall", "Terrace", "Private Room", "Bar Area", "Garden"],
    },
    
    // 🔹 NEW: Table status tracking
    tableStatus: {
      type: String,
      default: "occupied", // occupied, clearing, free
      enum: ["occupied", "clearing", "free"],
    },
    tableClearedAt: {
      type: Date,
      default: null,
    },
    
    // 🔹 Assignment tracking
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    
    // 🔹 NEW: Track who assigned the order (admin)
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    
    // Order status
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "completed", "cancelled"],
      default: "pending",
    },
    
    priority: {
      type: String,
      default: "normal",
      enum: ["low", "normal", "high", "urgent"],
    },
    
    notes: String,
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔹 Generate order code before saving
foodOrderSchema.pre("save", function (next) {
  if (!this.orderCode) {
    this.orderCode = generateCode("ORD");
  }
  next();
});

// 🔹 Indexes for faster queries
foodOrderSchema.index({ tableNumber: 1, status: 1 });
foodOrderSchema.index({ assignedTo: 1, status: 1 });
foodOrderSchema.index({ createdAt: -1 });
foodOrderSchema.index({ tableStatus: 1, tableNumber: 1 });

module.exports = mongoose.model("FoodOrder", foodOrderSchema);