const mongoose = require("mongoose");
const generateCode = require("../utils/generateCode");

const foodOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      unique: true // Keep this, REMOVE the schema.index below
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
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
          required: true,
          min: 1
        },
        specialInstructions: String,
        itemPrice: {
          type: Number,
          required: true
        },
        itemTotal: {
          type: Number,
          required: true
        }
      }
    ],
    subtotal: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    serviceCharge: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true
    },
    
    // Assignment tracking
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    assignedAt: Date,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    // Order status
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"],
      default: "pending"
    },
    priority: {
      type: String,
      default: "normal",
      enum: ["low", "normal", "high", "urgent"]
    },
    
    // Payment information
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile", "online"],
      default: "cash"
    },
    paymentReference: String,
    paidAt: Date,
    
    // Customer information (for guest orders)
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    
    // Ratings and feedback
    rating: {
      foodQuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      service: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      ambiance: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      overall: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    },
    feedback: String,
    ratedAt: Date,
    
    // Notes and special requests
    notes: String,
    specialRequests: String,
    
    // Timestamps
    estimatedReadyAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancellationReason: String
  },
  { timestamps: true }
);

// Generate order code before saving
foodOrderSchema.pre("save", function (next) {
  if (!this.orderCode) {
    this.orderCode = generateCode("ORD");
  }
  next();
});

// Middleware to update table status when order is created/updated
foodOrderSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      // When creating new order, update table status to occupied
      const Table = mongoose.model("Table");
      await Table.findByIdAndUpdate(this.table, {
        status: "occupied",
        currentOrder: this._id,
        lastOccupiedAt: new Date()
      });
    } else if (this.isModified("status")) {
      const Table = mongoose.model("Table");
      
      if (this.status === "completed" || this.status === "cancelled") {
        // Check if this is the only active order for this table
        const activeOrders = await mongoose.model("FoodOrder").countDocuments({
          table: this.table,
          status: { $nin: ["completed", "cancelled"] }
        });
        
        if (activeOrders === 0) {
          // No more active orders, mark table for cleaning
          await Table.findByIdAndUpdate(this.table, {
            status: "cleaning",
            currentOrder: null
          });
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for faster queries
// REMOVED: foodOrderSchema.index({ orderCode: 1 }); // Duplicate with unique: true above
foodOrderSchema.index({ user: 1, createdAt: -1 });
foodOrderSchema.index({ table: 1, status: 1 });
foodOrderSchema.index({ assignedTo: 1, status: 1 });
foodOrderSchema.index({ status: 1, createdAt: -1 });
foodOrderSchema.index({ createdAt: -1 });
foodOrderSchema.index({ "rating.overall": 1 });
foodOrderSchema.index({ paymentStatus: 1 });

// Virtual for order duration
foodOrderSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return Math.round((this.completedAt - this.createdAt) / (1000 * 60)); // minutes
  }
  return null;
});

// Virtual for table information
foodOrderSchema.virtual('tableInfo', {
  ref: 'Table',
  localField: 'table',
  foreignField: '_id',
  justOne: true
});

foodOrderSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

foodOrderSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("FoodOrder", foodOrderSchema);