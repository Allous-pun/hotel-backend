const FoodOrder = require("../models/FoodOrder");
const Food = require("../models/Food");
const User = require("../models/User");
const Table = require("../models/Table");

// @desc    Create guest order (no authentication)
// @route   POST /api/foods/order/guest
// @access  Public
exports.createGuestOrder = async (req, res) => {
  try {
    const {
      items,
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests,
      notes
    } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }
    
    if (!tableId) {
      return res.status(400).json({ message: "Table ID is required" });
    }
    
    if (!customerName || !customerPhone) {
      return res.status(400).json({ 
        message: "Customer name and phone are required for guest orders" 
      });
    }
    
    // Check if table exists and is available/occupied
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    if (!table.isActive) {
      return res.status(400).json({ 
        message: "Table is not active" 
      });
    }
    
    if (table.status === "maintenance" || table.status === "out_of_service") {
      return res.status(400).json({ 
        message: `Table is currently ${table.status}` 
      });
    }
    
    // Calculate order details
    let subtotal = 0;
    const populatedItems = [];
    
    for (const item of items) {
      const food = await Food.findById(item.foodId);
      
      if (!food) {
        return res.status(404).json({ 
          message: `Food item ${item.foodId} not found` 
        });
      }
      
      if (!food.isAvailable) {
        return res.status(400).json({ 
          message: `${food.name} is currently unavailable` 
        });
      }
      
      const quantity = item.quantity || 1;
      const itemPrice = food.price;
      const itemTotal = itemPrice * quantity;
      
      subtotal += itemTotal;
      
      populatedItems.push({
        food: food._id,
        quantity,
        specialInstructions: item.specialInstructions || "",
        itemPrice,
        itemTotal
      });
    }
    
    // Calculate total
    const taxRate = 0.16; // 16% VAT
    const serviceChargeRate = 0.10; // 10% service charge
    
    const taxAmount = subtotal * taxRate;
    const serviceCharge = subtotal * serviceChargeRate;
    const totalPrice = subtotal + taxAmount + serviceCharge;
    
    // Create guest order
    const order = new FoodOrder({
      table: tableId,
      items: populatedItems,
      subtotal,
      taxAmount,
      serviceCharge,
      totalPrice,
      status: "pending",
      priority: "normal",
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      specialRequests: specialRequests || "",
      notes: notes || "",
      user: null,
      paymentStatus: "pending"
    });
    
    await order.save();
    
    // Populate for response
    await order.populate([
      { path: "table", select: "tableNumber name section capacity" },
      { path: "items.food", select: "name price images" }
    ]);
    
    res.status(201).json({
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    console.error("Create guest order error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Create order (authenticated)
// @route   POST /api/foods/order
// @access  Authenticated
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      specialRequests,
      notes
    } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }
    
    if (!tableId) {
      return res.status(400).json({ message: "Table ID is required" });
    }
    
    // Check if staff/admin is placing order for customer
    const isStaffOrderingForCustomer = ["admin", "staff", "waiter"].includes(req.user.role) && 
                                      (customerName || customerPhone);
    
    if (isStaffOrderingForCustomer) {
      // Staff placing order for customer
      if (!customerName || !customerPhone) {
        return res.status(400).json({ 
          message: "Customer name and phone are required when placing order for customer" 
        });
      }
    }
    
    // Check if table exists and is available/occupied
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    if (!table.isActive) {
      return res.status(400).json({ 
        message: "Table is not active" 
      });
    }
    
    if (table.status === "maintenance" || table.status === "out_of_service") {
      return res.status(400).json({ 
        message: `Table is currently ${table.status}` 
      });
    }
    
    // Calculate order details
    let subtotal = 0;
    const populatedItems = [];
    
    for (const item of items) {
      const food = await Food.findById(item.foodId);
      
      if (!food) {
        return res.status(404).json({ 
          message: `Food item ${item.foodId} not found` 
        });
      }
      
      if (!food.isAvailable) {
        return res.status(400).json({ 
          message: `${food.name} is currently unavailable` 
        });
      }
      
      const quantity = item.quantity || 1;
      const itemPrice = food.price;
      const itemTotal = itemPrice * quantity;
      
      subtotal += itemTotal;
      
      populatedItems.push({
        food: food._id,
        quantity,
        specialInstructions: item.specialInstructions || "",
        itemPrice,
        itemTotal
      });
    }
    
    // Calculate total
    const taxRate = 0.16;
    const serviceChargeRate = 0.10;
    
    const taxAmount = subtotal * taxRate;
    const serviceCharge = subtotal * serviceChargeRate;
    const totalPrice = subtotal + taxAmount + serviceCharge;
    
    // Create order
    const orderData = {
      table: tableId,
      items: populatedItems,
      subtotal,
      taxAmount,
      serviceCharge,
      totalPrice,
      status: "pending",
      priority: "normal",
      specialRequests: specialRequests || "",
      notes: notes || "",
      paymentStatus: "pending"
    };
    
    // Add user information
    if (req.user) {
      orderData.user = req.user._id;
      
      // If staff is placing order for customer
      if (isStaffOrderingForCustomer) {
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
        orderData.customerEmail = customerEmail;
        
        // Auto-assign to waiter if they're placing the order
        if (req.user.role === "waiter") {
          orderData.assignedTo = req.user._id;
          orderData.assignedAt = new Date();
          orderData.status = "confirmed";
        }
      }
    }
    
    const order = new FoodOrder(orderData);
    await order.save();
    
    // Populate for response
    await order.populate([
      { path: "table", select: "tableNumber name section capacity" },
      { path: "items.food", select: "name price images" },
      { path: "assignedTo", select: "name email" }
    ]);
    
    res.status(201).json({
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/foods/orders/my
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const { 
      status, 
      limit = 10, 
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    let query = { user: req.user._id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const [orders, total] = await Promise.all([
      FoodOrder.find(query)
        .populate("table", "tableNumber name section")
        .populate("items.food", "name price images")
        .populate("assignedTo", "name email")
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(Number(limit)),
      FoodOrder.countDocuments(query)
    ]);
    
    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get order by code
// @route   GET /api/foods/orders/code/:orderCode
// @access  Private
exports.getOrderByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    const order = await FoodOrder.findOne({ orderCode })
      .populate("table", "tableNumber name section capacity")
      .populate("items.food", "name price images category")
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("cancelledBy", "name email");
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check permissions
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    const isStaff = ["waiter", "staff", "admin"].includes(req.user.role);
    
    if (!isOwner && !isStaff) {
      return res.status(403).json({ 
        message: "Not authorized to view this order" 
      });
    }
    
    res.json(order);
  } catch (error) {
    console.error("Get order by code error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Rate and provide feedback for order
// @route   POST /api/foods/orders/:orderCode/rate
// @access  Private
exports.rateOrder = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { 
      foodQuality, 
      service, 
      ambiance, 
      overall, 
      feedback 
    } = req.body;
    
    const order = await FoodOrder.findOne({ orderCode });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if user owns this order
    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Not authorized to rate this order" 
      });
    }
    
    // Check if order is completed
    if (order.status !== "completed") {
      return res.status(400).json({ 
        message: "Only completed orders can be rated" 
      });
    }
    
    // Check if already rated
    if (order.rating.overall) {
      return res.status(400).json({ 
        message: "Order has already been rated" 
      });
    }
    
    // Update rating
    order.rating = {
      foodQuality: Number(foodQuality),
      service: Number(service),
      ambiance: Number(ambiance),
      overall: Number(overall)
    };
    order.feedback = feedback;
    order.ratedAt = new Date();
    
    await order.save();
    
    res.json({
      message: "Thank you for your feedback!",
      rating: order.rating,
      feedback: order.feedback
    });
  } catch (error) {
    console.error("Rate order error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Track order status (public)
// @route   GET /api/foods/orders/track/:orderCode
// @access  Public
exports.trackOrder = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    const order = await FoodOrder.findOne({ orderCode })
      .populate("table", "tableNumber name section")
      .populate("items.food", "name price")
      .populate("assignedTo", "name")
      .select("orderCode status items totalPrice createdAt estimatedReadyAt assignedTo");
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json({
      orderCode: order.orderCode,
      status: order.status,
      table: order.table ? {
        number: order.table.tableNumber,
        name: order.table.name,
        section: order.table.section
      } : null,
      items: order.items.map(item => ({
        name: item.food?.name || "Unknown",
        quantity: item.quantity,
        price: item.itemPrice
      })),
      totalPrice: order.totalPrice,
      orderTime: order.createdAt,
      estimatedReadyTime: order.estimatedReadyAt,
      assignedTo: order.assignedTo?.name || "Not assigned yet"
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get all orders (for waiters, staff, admin)
// @route   GET /api/foods/orders/all
// @access  Waiter/Staff/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      tableId,
      assignedTo,
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      page = 1
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Table filter
    if (tableId && tableId !== 'all') {
      query.table = tableId;
    }
    
    // Assigned to filter
    if (assignedTo === 'unassigned') {
      query.assignedTo = null;
    } else if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Sort options
    const sortOptions = {};
    switch(sortBy) {
      case 'totalPrice':
        sortOptions.totalPrice = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'priority':
        // Custom sort for priority
        break;
      default:
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
    }
    
    const [orders, total] = await Promise.all([
      FoodOrder.find(query)
        .populate("table", "tableNumber name section")
        .populate("user", "name email phone")
        .populate("items.food", "name price")
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      FoodOrder.countDocuments(query)
    ]);
    
    // Custom sort for priority if needed
    if (sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      orders.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        return sortOrder === 'desc' ? bPriority - aPriority : aPriority - bPriority;
      });
    }
    
    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Update order status
// @route   PUT /api/foods/orders/:orderCode/status
// @access  Waiter/Staff/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { status, notes, cancellationReason } = req.body;
    
    const order = await FoodOrder.findOne({ orderCode });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Validate status transition
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["served"],
      served: ["completed"],
      completed: [],
      cancelled: []
    };
    
    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${order.status} to ${status}` 
      });
    }
    
    // Update status
    const oldStatus = order.status;
    order.status = status;
    
    // Set timestamps based on status
    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = req.user._id;
      order.cancellationReason = cancellationReason || "No reason provided";
    } else if (status === "completed") {
      order.completedAt = new Date();
    } else if (status === "preparing") {
      // Calculate estimated ready time
      const estimatedMinutes = await calculatePreparationTime(order.items);
      order.estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60000);
    }
    
    if (notes) {
      order.notes = notes;
    }
    
    await order.save();
    
    // Populate for response
    await order.populate([
      { path: "table", select: "tableNumber name section" },
      { path: "items.food", select: "name price" },
      { path: "assignedTo", select: "name email" },
      { path: "cancelledBy", select: "name email" }
    ]);
    
    res.json({
      message: `Order status updated from ${oldStatus} to ${status}`,
      order,
      estimatedReadyTime: order.estimatedReadyAt
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Helper function to calculate preparation time
async function calculatePreparationTime(items) {
  let totalTime = 0;
  let maxTime = 0;
  
  for (const item of items) {
    const food = await Food.findById(item.food);
    if (food && food.preparationTime) {
      totalTime += food.preparationTime * item.quantity;
      maxTime = Math.max(maxTime, food.preparationTime);
    }
  }
  
  // Return the maximum preparation time or average if multiple items
  return items.length > 1 ? maxTime + (totalTime / items.length) / 2 : maxTime;
}

// @desc    Assign order to self (waiter)
// @route   POST /api/foods/orders/:orderCode/assign-self
// @access  Waiter
exports.assignOrderToSelf = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    // Check if user is a waiter
    if (req.user.role !== "waiter") {
      return res.status(403).json({ 
        message: "Only waiters can self-assign orders" 
      });
    }
    
    const order = await FoodOrder.findOne({ orderCode });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if order is already assigned
    if (order.assignedTo) {
      return res.status(400).json({ 
        message: "Order is already assigned" 
      });
    }
    
    // Check if order status allows assignment
    if (order.status !== "pending" && order.status !== "confirmed") {
      return res.status(400).json({ 
        message: `Cannot assign order with status: ${order.status}` 
      });
    }
    
    // Assign order
    order.assignedTo = req.user._id;
    order.assignedAt = new Date();
    
    // Update status to confirmed if it was pending
    if (order.status === "pending") {
      order.status = "confirmed";
    }
    
    await order.save();
    
    // Populate for response
    await order.populate([
      { path: "table", select: "tableNumber name section" },
      { path: "items.food", select: "name price" },
      { path: "assignedTo", select: "name email" }
    ]);
    
    res.json({
      message: "Order assigned to you successfully",
      order
    });
  } catch (error) {
    console.error("Assign order to self error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Assign order to waiter (admin)
// @route   POST /api/foods/orders/:orderCode/assign
// @access  Admin
exports.assignOrderToWaiter = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { waiterId } = req.body;
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Only admin can assign orders to waiters" 
      });
    }
    
    if (!waiterId) {
      return res.status(400).json({ 
        message: "Waiter ID is required" 
      });
    }
    
    const order = await FoodOrder.findOne({ orderCode });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if waiter exists and is a waiter
    const waiter = await User.findById(waiterId);
    
    if (!waiter) {
      return res.status(404).json({ message: "Waiter not found" });
    }
    
    if (waiter.role !== "waiter") {
      return res.status(400).json({ 
        message: "User is not a waiter" 
      });
    }
    
    // Check if waiter is active
    if (!waiter.isActive) {
      return res.status(400).json({ 
        message: "Waiter account is not active" 
      });
    }
    
    // Assign order
    order.assignedTo = waiterId;
    order.assignedAt = new Date();
    order.assignedBy = req.user._id;
    
    // Update status to confirmed if it was pending
    if (order.status === "pending") {
      order.status = "confirmed";
    }
    
    await order.save();
    
    // Populate for response
    await order.populate([
      { path: "table", select: "tableNumber name section" },
      { path: "items.food", select: "name price" },
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" }
    ]);
    
    res.json({
      message: `Order assigned to ${waiter.name} successfully`,
      order
    });
  } catch (error) {
    console.error("Assign order to waiter error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get waiter's assigned orders
// @route   GET /api/foods/orders/assigned/my
// @access  Waiter
exports.getMyAssignedOrders = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = { assignedTo: req.user._id };
    
    if (status && status !== 'all') {
      query.status = status;
    } else {
      // Default: show active orders only
      query.status = { $nin: ["completed", "cancelled"] };
    }
    
    const orders = await FoodOrder.find(query)
      .populate("table", "tableNumber name section")
      .populate("user", "name email phone")
      .populate("items.food", "name price")
      .sort({ priority: -1, createdAt: 1 });
    
    res.json(orders);
  } catch (error) {
    console.error("Get my assigned orders error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get available (unassigned) orders
// @route   GET /api/foods/orders/available
// @access  Waiter/Staff/Admin
exports.getAvailableOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.find({
      assignedTo: null,
      status: { $in: ["pending", "confirmed"] }
    })
      .populate("table", "tableNumber name section")
      .populate("user", "name email phone")
      .populate("items.food", "name price")
      .sort({ createdAt: 1 });
    
    res.json(orders);
  } catch (error) {
    console.error("Get available orders error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get all waiters (for admin) - WITH STATS FUNCTIONALITY
// @route   GET /api/foods/waiters
// @access  Admin
exports.getWaiters = async (req, res) => {
  try {
    const { includeInactive = false, withStats = false } = req.query;
    
    console.log("Query params:", { includeInactive, withStats }); // Debug log
    
    // Build filter
    const filter = { role: "waiter" };
    
    // Only filter by active status if not explicitly including inactive
    if (includeInactive !== "true") {
      filter.isActive = true;
    }
    
    console.log("Filter:", filter); // Debug log
    
    // Get waiters with basic info
    const waiters = await User.find(filter)
      .select("_id name email isActive createdAt updatedAt")
      .sort({ createdAt: -1 });
    
    console.log("Found waiters:", waiters.length); // Debug log
    
    // Convert to plain objects
    const waitersPlain = waiters.map(waiter => waiter.toObject());
    
    // Return simple response if stats not requested
    if (withStats !== "true") {
      console.log("Returning without stats"); // Debug log
      return res.json(waitersPlain);
    }
    
    console.log("Getting stats for waiters..."); // Debug log
    
    // Get waiter statistics if requested
    const waiterStats = await Promise.all(
      waitersPlain.map(async (waiter) => {
        try {
          const stats = await FoodOrder.aggregate([
            {
              $match: {
                assignedTo: waiter._id,
                // Last 30 days
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
              }
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                completedOrders: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                },
                avgRating: { $avg: "$rating.overall" }
              }
            }
          ]);
          
          console.log(`Stats for ${waiter.name}:`, stats); // Debug log
          
          // Add stats to waiter object
          return {
            ...waiter,
            stats: stats[0] || { 
              _id: null, 
              totalOrders: 0, 
              completedOrders: 0, 
              avgRating: null 
            }
          };
        } catch (error) {
          console.error(`Error getting stats for ${waiter.name}:`, error);
          return {
            ...waiter,
            stats: { 
              _id: null, 
              totalOrders: 0, 
              completedOrders: 0, 
              avgRating: null 
            }
          };
        }
      })
    );
    
    console.log("Final response with stats:", waiterStats.length, "waiters"); // Debug log
    res.json(waiterStats);
  } catch (error) {
    console.error("Get waiters error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/foods/orders/stats
// @access  Admin
exports.getOrderStats = async (req, res) => {
  try {
    const { period = 'today', tableId } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch(period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: today } };
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: yearAgo } };
        break;
    }
    
    let matchFilter = { ...dateFilter };
    if (tableId) {
      matchFilter.table = tableId;
    }
    
    const stats = await FoodOrder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          confirmedOrders: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
          preparingOrders: { $sum: { $cond: [{ $eq: ["$status", "preparing"] }, 1, 0] } },
          readyOrders: { $sum: { $cond: [{ $eq: ["$status", "ready"] }, 1, 0] } },
          servedOrders: { $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] } },
          completedOrders: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          avgOrderValue: { $avg: "$totalPrice" }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          pendingOrders: 1,
          confirmedOrders: 1,
          preparingOrders: 1,
          readyOrders: 1,
          servedOrders: 1,
          completedOrders: 1,
          cancelledOrders: 1,
          avgOrderValue: { $round: ["$avgOrderValue", 2] }
        }
      }
    ]);
    
    // Get popular foods
    const popularFoods = await FoodOrder.aggregate([
      { $match: matchFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.food",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.itemTotal" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "foods",
          localField: "_id",
          foreignField: "_id",
          as: "foodDetails"
        }
      },
      { $unwind: "$foodDetails" },
      {
        $project: {
          foodName: "$foodDetails.name",
          totalQuantity: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] }
        }
      }
    ]);
    
    // Get table-wise statistics if no specific table filter
    let tableStats = [];
    if (!tableId) {
      tableStats = await FoodOrder.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$table",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" }
          }
        },
        { $sort: { orderCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "tables",
            localField: "_id",
            foreignField: "_id",
            as: "tableDetails"
          }
        },
        { $unwind: "$tableDetails" },
        {
          $project: {
            tableNumber: "$tableDetails.tableNumber",
            tableName: "$tableDetails.name",
            section: "$tableDetails.section",
            orderCount: 1,
            totalRevenue: { $round: ["$totalRevenue", 2] }
          }
        }
      ]);
    }
    
    // Get rating statistics
    const ratingStats = await FoodOrder.aggregate([
      { 
        $match: { 
          ...matchFilter,
          "rating.overall": { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          avgFoodQuality: { $avg: "$rating.foodQuality" },
          avgService: { $avg: "$rating.service" },
          avgAmbiance: { $avg: "$rating.ambiance" },
          avgOverall: { $avg: "$rating.overall" }
        }
      },
      {
        $project: {
          _id: 0,
          totalRatings: 1,
          avgFoodQuality: { $round: ["$avgFoodQuality", 2] },
          avgService: { $round: ["$avgService", 2] },
          avgAmbiance: { $round: ["$avgAmbiance", 2] },
          avgOverall: { $round: ["$avgOverall", 2] }
        }
      }
    ]);
    
    res.json({
      period,
      dateRange: dateFilter.createdAt?.$gte || "all time",
      orderStats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        servedOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        avgOrderValue: 0
      },
      popularFoods,
      tableStats,
      ratingStats: ratingStats[0] || {
        totalRatings: 0,
        avgFoodQuality: 0,
        avgService: 0,
        avgAmbiance: 0,
        avgOverall: 0
      }
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get orders by table
// @route   GET /api/foods/orders/by-table/:tableId
// @access  Waiter/Staff/Admin
exports.getOrdersByTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { activeOnly = true } = req.query;
    
    let query = { table: tableId };
    
    if (activeOnly === 'true') {
      query.status = { $nin: ["completed", "cancelled"] };
    }
    
    const orders = await FoodOrder.find(query)
      .populate("user", "name email phone")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    
    // Get table info
    const table = await Table.findById(tableId).select("tableNumber name section capacity status");
    
    res.json({
      table,
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error("Get orders by table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Update order payment status
// @route   PUT /api/foods/orders/:orderCode/payment
// @access  Waiter/Staff/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { paymentStatus, paymentMethod, paymentReference } = req.body;
    
    const order = await FoodOrder.findOne({ orderCode });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Update payment info
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      
      if (paymentStatus === "paid") {
        order.paidAt = new Date();
        order.paymentMethod = paymentMethod || order.paymentMethod;
        order.paymentReference = paymentReference || order.paymentReference;
      }
    }
    
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentReference) order.paymentReference = paymentReference;
    
    await order.save();
    
    res.json({
      message: "Payment status updated successfully",
      order
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};