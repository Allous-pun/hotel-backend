const Food = require("../models/Food");
const FoodOrder = require("../models/FoodOrder");

// List food items
exports.getFoods = async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create food item (admin/staff)
exports.createFood = async (req, res) => {
  try {
    const food = await Food.create(req.body);
    res.status(201).json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a food order (user) - UPDATED with table info
exports.createFoodOrder = async (req, res) => {
  try {
    const { items, totalPrice, tableNumber, tableSection } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }
    
    // 🔹 Table info is now mandatory
    if (!tableNumber) {
      return res.status(400).json({ message: "Table number is required" });
    }
    
    // Validate table number is a positive integer
    const tableNum = parseInt(tableNumber);
    if (isNaN(tableNum) || tableNum <= 0) {
      return res.status(400).json({ message: "Valid table number is required" });
    }

    // 🔹 Check role restrictions
    if (req.user.role === "staff" || req.user.role === "admin") {
      return res.status(403).json({ 
        message: "Staff and admin cannot place food orders",
        details: "Please use a guest or waiter account to place orders"
      });
    }
    
    const order = await FoodOrder.create({
      user: req.user._id,
      items,
      totalPrice,
      tableNumber: tableNum,
      tableSection: tableSection || "Main Hall", // Default section
      assignedTo: null, // Will be assigned when a waiter picks it up
    });

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        _id: order._id,
        orderCode: order.orderCode,
        tableNumber: order.tableNumber,
        tableSection: order.tableSection,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate order code, try again" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update food item
exports.updateFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete food item
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json({ message: "Food deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders for logged-in user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.find({ user: req.user._id })
      .populate("items.food", "name price")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders (staff/admin) - UPDATED with table grouping
exports.getAllOrders = async (req, res) => {
  try {
    const { status, tableNumber, assignedTo, sortBy = "tableNumber" } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by table number
    if (tableNumber) {
      query.tableNumber = parseInt(tableNumber);
    }
    
    // Filter by assigned waiter
    if (assignedTo === 'unassigned') {
      query.assignedTo = null;
    } else if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }
    
    let sortOption = {};
    switch(sortBy) {
      case 'tableNumber':
        sortOption = { tableNumber: 1, createdAt: -1 };
        break;
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      case 'status':
        sortOption = { status: 1, createdAt: -1 };
        break;
      default:
        sortOption = { tableNumber: 1, createdAt: -1 };
    }
    
    const orders = await FoodOrder.find(query)
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role")
      .sort(sortOption);

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Get orders grouped by table
exports.getOrdersByTable = async (req, res) => {
  try {
    const orders = await FoodOrder.find({
      status: { $in: ['pending', 'preparing', 'ready'] } // Active orders only
    })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role")
      .sort({ tableNumber: 1, createdAt: -1 });
    
    // Group orders by table
    const groupedOrders = {};
    orders.forEach(order => {
      const tableKey = `Table ${order.tableNumber} - ${order.tableSection}`;
      if (!groupedOrders[tableKey]) {
        groupedOrders[tableKey] = {
          tableNumber: order.tableNumber,
          tableSection: order.tableSection,
          orders: []
        };
      }
      groupedOrders[tableKey].orders.push(order);
    });
    
    // Convert to array format
    const result = Object.values(groupedOrders);
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Update order status by orderCode - UPDATED with assignment logic
exports.updateOrderStatusByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { status, assignedTo } = req.body;

    const order = await FoodOrder.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If assigning order to waiter
    if (assignedTo && assignedTo !== order.assignedTo?.toString()) {
      // Check if assignedTo is a valid waiter or staff
      const assignedUser = await require("../models/User").findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: "Assigned user not found" });
      }
      if (!["waiter", "staff", "admin"].includes(assignedUser.role)) {
        return res.status(400).json({ 
          message: "Can only assign orders to waiters or staff" 
        });
      }
      order.assignedTo = assignedTo;
      order.assignedAt = new Date();
    }
    
    // Update status
    if (status) {
      order.status = status;
      if (status === "completed" || status === "cancelled") {
        order.completedAt = new Date();
      }
    }
    
    await order.save();

    const updatedOrder = await FoodOrder.findOne({ orderCode })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role");

    res.json({
      message: "Order updated successfully",
      order: updatedOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Get single order by orderCode
exports.getOrderByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;

    const order = await FoodOrder.findOne({ orderCode })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Assign order to current waiter (self-assignment)
exports.assignOrderToSelf = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    const order = await FoodOrder.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    // Check if order is already assigned
    if (order.assignedTo) {
      return res.status(400).json({ 
        message: "Order is already assigned",
        assignedTo: order.assignedTo
      });
    }
    
    // Assign to current user
    order.assignedTo = req.user._id;
    order.assignedAt = new Date();
    order.status = "preparing"; // Auto-update status
    
    await order.save();
    
    const updatedOrder = await FoodOrder.findOne({ orderCode })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role");
    
    res.json({
      message: "Order assigned to you successfully",
      order: updatedOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Get orders assigned to current waiter
exports.getMyAssignedOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.find({ 
      assignedTo: req.user._id,
      status: { $in: ['preparing', 'ready'] } // Active assigned orders
    })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .sort({ tableNumber: 1, priority: -1, createdAt: 1 });
    
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Get available (unassigned) orders
exports.getAvailableOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.find({ 
      assignedTo: null,
      status: 'pending'
    })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .sort({ tableNumber: 1, createdAt: 1 });
    
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Get table status (which tables are occupied/free)
exports.getTableStatus = async (req, res) => {
  try {
    const { section } = req.query;
    
    // Find all tables with active orders (not completed/cancelled)
    const activeOrders = await FoodOrder.find({
      status: { $nin: ["completed", "cancelled"] }
    }).select("tableNumber tableSection tableStatus assignedTo status");
    
    // Group by table to determine overall table status
    const tableStatus = {};
    
    activeOrders.forEach(order => {
      const tableKey = `${order.tableSection}-${order.tableNumber}`;
      
      if (!tableStatus[tableKey]) {
        tableStatus[tableKey] = {
          tableNumber: order.tableNumber,
          tableSection: order.tableSection,
          status: order.tableStatus,
          orderCount: 0,
          activeOrders: [],
          lastOrderTime: order.createdAt
        };
      }
      
      tableStatus[tableKey].orderCount++;
      tableStatus[tableKey].activeOrders.push({
        orderCode: order.orderCode,
        status: order.status,
        assignedTo: order.assignedTo
      });
      
      // Update last order time if this is more recent
      if (order.createdAt > tableStatus[tableKey].lastOrderTime) {
        tableStatus[tableKey].lastOrderTime = order.createdAt;
      }
    });
    
    // Convert to array and filter by section if provided
    let result = Object.values(tableStatus);
    
    if (section) {
      result = result.filter(table => table.tableSection === section);
    }
    
    // Sort by table number
    result.sort((a, b) => a.tableNumber - b.tableNumber);
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Check if table can be cleared (all orders served/completed)
exports.checkTableClearance = async (req, res) => {
  try {
    const { tableNumber, tableSection } = req.params;
    
    // Find all orders for this table that are not completed/cancelled
    const activeOrders = await FoodOrder.find({
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      status: { $nin: ["completed", "cancelled"] }
    });
    
    const canClear = activeOrders.length === 0;
    const message = canClear 
      ? "Table is ready to be cleared" 
      : `Table has ${activeOrders.length} active order(s)`;
    
    res.json({
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      canClear,
      activeOrderCount: activeOrders.length,
      activeOrders: activeOrders.map(order => ({
        orderCode: order.orderCode,
        status: order.status,
        createdAt: order.createdAt
      })),
      message
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Clear table (mark as free)
exports.clearTable = async (req, res) => {
  try {
    const { tableNumber, tableSection } = req.params;
    
    // First check if table can be cleared
    const activeOrders = await FoodOrder.find({
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      status: { $nin: ["completed", "cancelled"] }
    });
    
    if (activeOrders.length > 0) {
      return res.status(400).json({
        message: "Cannot clear table with active orders",
        activeOrderCount: activeOrders.length,
        activeOrders: activeOrders.map(order => ({
          orderCode: order.orderCode,
          status: order.status
        }))
      });
    }
    
    // Update all orders for this table to mark table as free
    await FoodOrder.updateMany(
      {
        tableNumber: parseInt(tableNumber),
        tableSection: tableSection || "Main Hall"
      },
      {
        tableStatus: "free",
        tableClearedAt: new Date()
      }
    );
    
    res.json({
      message: "Table cleared successfully",
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      clearedAt: new Date(),
      nextSteps: "Table is now ready for new guests"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Mark table as occupied (when new guests sit)
exports.occupyTable = async (req, res) => {
  try {
    const { tableNumber, tableSection } = req.body;
    
    if (!tableNumber) {
      return res.status(400).json({ message: "Table number is required" });
    }
    
    // Check if table is already occupied with active orders
    const activeOrders = await FoodOrder.find({
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      tableStatus: "occupied",
      status: { $nin: ["completed", "cancelled"] }
    });
    
    if (activeOrders.length > 0) {
      return res.status(409).json({
        message: "Table is already occupied",
        currentOrders: activeOrders.length,
        lastOrder: activeOrders[0]?.createdAt
      });
    }
    
    // Update any existing orders to mark table as occupied
    await FoodOrder.updateMany(
      {
        tableNumber: parseInt(tableNumber),
        tableSection: tableSection || "Main Hall"
      },
      {
        tableStatus: "occupied",
        tableClearedAt: null
      }
    );
    
    res.json({
      message: "Table marked as occupied",
      tableNumber: parseInt(tableNumber),
      tableSection: tableSection || "Main Hall",
      occupiedAt: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 NEW: Auto-check table clearance when order is completed
// This should be called when an order status changes to "completed" or "served"
exports.updateOrderStatusByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { status, assignedTo } = req.body;

    const order = await FoodOrder.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // If assigning order to waiter
    if (assignedTo && assignedTo !== order.assignedTo?.toString()) {
      const assignedUser = await require("../models/User").findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: "Assigned user not found" });
      }
      if (!["waiter", "staff", "admin"].includes(assignedUser.role)) {
        return res.status(400).json({ 
          message: "Can only assign orders to waiters or staff" 
        });
      }
      order.assignedTo = assignedTo;
      order.assignedAt = new Date();
    }
    
    // Update status
    const oldStatus = order.status;
    if (status) {
      order.status = status;
      if (status === "completed" || status === "cancelled") {
        order.completedAt = new Date();
      }
    }
    
    await order.save();

    // 🔹 AUTO-CHECK: If order is completed/served, check if table can be cleared
    if ((status === "completed" || status === "served") && oldStatus !== status) {
      // Check if all orders for this table are completed/served
      const tableActiveOrders = await FoodOrder.find({
        tableNumber: order.tableNumber,
        tableSection: order.tableSection,
        status: { $nin: ["completed", "cancelled"] }
      });
      
      if (tableActiveOrders.length === 0) {
        // All orders for this table are done, mark table as "clearing"
        await FoodOrder.updateMany(
          {
            tableNumber: order.tableNumber,
            tableSection: order.tableSection
          },
          {
            tableStatus: "clearing"
          }
        );
      }
    }

    const updatedOrder = await FoodOrder.findOne({ orderCode })
      .populate("user", "name email")
      .populate("items.food", "name price")
      .populate("assignedTo", "name email role");

    res.json({
      message: "Order updated successfully",
      order: updatedOrder,
      tableCheck: tableActiveOrders?.length === 0 ? "Table ready for clearing" : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};