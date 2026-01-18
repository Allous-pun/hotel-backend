const Table = require("../models/Table");
const FoodOrder = require("../models/FoodOrder");

// @desc    Get all tables
// @route   GET /api/tables
// @access  Public (for reservation system) / Private (for management)
exports.getTables = async (req, res) => {
  try {
    const {
      section,
      status,
      capacityMin,
      capacityMax,
      activeOnly = true,
      sortBy = 'tableNumber',
      sortOrder = 'asc'
    } = req.query;
    
    let query = {};
    
    // Filter by section
    if (section && section !== 'all') {
      query.section = section;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by capacity
    if (capacityMin || capacityMax) {
      query.capacity = {};
      if (capacityMin) query.capacity.$gte = Number(capacityMin);
      if (capacityMax) query.capacity.$lte = Number(capacityMax);
    }
    
    // Filter active tables
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    // Sort options
    const sortOptions = {};
    switch(sortBy) {
      case 'capacity':
        sortOptions.capacity = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'section':
        sortOptions.section = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'status':
        sortOptions.status = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.tableNumber = sortOrder === 'desc' ? -1 : 1;
    }
    
    const tables = await Table.find(query)
      .populate("currentOrder", "orderCode status totalPrice")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort(sortOptions);
    
    res.json(tables);
  } catch (error) {
    console.error("Get tables error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get table by ID
// @route   GET /api/tables/:id
// @access  Public/Private
exports.getTableById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await Table.findById(id)
      .populate("currentOrder")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    res.json(table);
  } catch (error) {
    console.error("Get table by ID error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Create table (admin only)
// @route   POST /api/tables
// @access  Admin
exports.createTable = async (req, res) => {
  try {
    const {
      tableNumber,
      name,
      section,
      location,
      capacity,
      description,
      position,
      shape,
      size
    } = req.body;
    
    // Validate required fields
    if (!tableNumber || !section || !capacity) {
      return res.status(400).json({ 
        message: "Table number, section, and capacity are required" 
      });
    }
    
    // Check if table number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(409).json({ 
        message: `Table number ${tableNumber} already exists` 
      });
    }
    
    // Create new table
    const table = new Table({
      tableNumber: Number(tableNumber),
      name: name || `Table ${tableNumber}`,
      section,
      location: location || "",
      capacity: Number(capacity),
      description: description || "",
      position: position || { x: 0, y: 0 },
      shape: shape || "round",
      size: size || "medium",
      isActive: true,
      status: "available",
      createdBy: req.user._id
    });
    
    await table.save();
    await table.populate("createdBy", "name email");
    
    res.status(201).json({
      message: "Table created successfully",
      table
    });
  } catch (error) {
    console.error("Create table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Update table (admin only)
// @route   PUT /api/tables/:id
// @access  Admin
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Check if updating table number to an existing one
    if (updates.tableNumber && updates.tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ 
        tableNumber: updates.tableNumber,
        _id: { $ne: id }
      });
      
      if (existingTable) {
        return res.status(409).json({ 
          message: `Table number ${updates.tableNumber} already exists` 
        });
      }
    }
    
    // Update table
    Object.keys(updates).forEach(key => {
      table[key] = updates[key];
    });
    
    table.updatedBy = req.user._id;
    table.updatedAt = new Date();
    
    await table.save();
    
    // Populate for response
    await table.populate([
      { path: "createdBy", select: "name email" },
      { path: "updatedBy", select: "name email" }
    ]);
    
    res.json({
      message: "Table updated successfully",
      table
    });
  } catch (error) {
    console.error("Update table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Delete table (admin only)
// @route   DELETE /api/tables/:id
// @access  Admin
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Check if table is currently occupied
    if (table.status === "occupied") {
      return res.status(400).json({ 
        message: "Cannot delete occupied table",
        details: "Please wait until the table is free"
      });
    }
    
    // Check if table has any active orders
    const activeOrders = await FoodOrder.countDocuments({
      table: id,
      status: { $nin: ["completed", "cancelled"] }
    });
    
    if (activeOrders > 0) {
      return res.status(400).json({ 
        message: "Cannot delete table with active orders",
        activeOrders
      });
    }
    
    await table.deleteOne();
    
    res.json({
      message: "Table deleted successfully",
      deletedTable: table
    });
  } catch (error) {
    console.error("Delete table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Toggle table status
// @route   PATCH /api/tables/:id/toggle-status
// @access  Admin/Staff
exports.toggleTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Validate status transition
    const validTransitions = {
      available: ["maintenance", "out_of_service"],
      occupied: ["available", "cleaning", "maintenance"],
      reserved: ["available", "occupied"],
      cleaning: ["available", "maintenance"],
      maintenance: ["available", "out_of_service"],
      out_of_service: ["available", "maintenance"]
    };
    
    if (!validTransitions[table.status]?.includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${table.status} to ${status}` 
      });
    }
    
    table.status = status;
    table.updatedBy = req.user._id;
    table.updatedAt = new Date();
    
    // Update timestamps
    if (status === "cleaning") {
      table.lastCleanedAt = new Date();
    } else if (status === "available") {
      table.lastCleanedAt = new Date();
    }
    
    await table.save();
    
    res.json({
      message: `Table status updated to ${status}`,
      table
    });
  } catch (error) {
    console.error("Toggle table status error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get available tables for reservation/order
// @route   GET /api/tables/available
// @access  Public/Private
exports.getAvailableTables = async (req, res) => {
  try {
    const { 
      capacity, 
      section, 
      time, 
      duration = 2 // hours
    } = req.query;
    
    let query = {
      status: "available",
      isActive: true
    };
    
    // Filter by section
    if (section && section !== 'all') {
      query.section = section;
    }
    
    // Filter by capacity
    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }
    
    // Get available tables
    const tables = await Table.find(query)
      .sort({ capacity: 1, tableNumber: 1 });
    
    // If time is provided, check for reservations
    let availableTables = tables;
    if (time) {
      const requestedTime = new Date(time);
      const endTime = new Date(requestedTime.getTime() + (duration * 60 * 60 * 1000));
      
      // Check which tables are reserved during this time
      // (You'll need a Reservation model for this - can be added later)
      // For now, we'll just return all available tables
    }
    
    res.json({
      count: availableTables.length,
      tables: availableTables
    });
  } catch (error) {
    console.error("Get available tables error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get table statistics
// @route   GET /api/tables/stats
// @access  Admin
exports.getTableStats = async (req, res) => {
  try {
    // Get table statistics
    const stats = await Table.aggregate([
      {
        $group: {
          _id: null,
          totalTables: { $sum: 1 },
          activeTables: { $sum: { $cond: ["$isActive", 1, 0] } },
          availableTables: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          occupiedTables: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } },
          reservedTables: { $sum: { $cond: [{ $eq: ["$status", "reserved"] }, 1, 0] } },
          maintenanceTables: { $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] } },
          avgCapacity: { $avg: "$capacity" }
        }
      },
      {
        $project: {
          _id: 0,
          totalTables: 1,
          activeTables: 1,
          inactiveTables: { $subtract: ["$totalTables", "$activeTables"] },
          availableTables: 1,
          occupiedTables: 1,
          reservedTables: 1,
          maintenanceTables: 1,
          avgCapacity: { $round: ["$avgCapacity", 1] }
        }
      }
    ]);
    
    // Get section distribution
    const sectionStats = await Table.aggregate([
      {
        $group: {
          _id: "$section",
          count: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } },
          avgCapacity: { $avg: "$capacity" }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get capacity distribution
    const capacityStats = await Table.aggregate([
      {
        $group: {
          _id: "$capacity",
          count: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      overview: stats[0] || {
        totalTables: 0,
        activeTables: 0,
        inactiveTables: 0,
        availableTables: 0,
        occupiedTables: 0,
        reservedTables: 0,
        maintenanceTables: 0,
        avgCapacity: 0
      },
      sections: sectionStats,
      capacities: capacityStats
    });
  } catch (error) {
    console.error("Get table stats error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Occupy table (when customers sit)
// @route   POST /api/tables/:id/occupy
// @access  Waiter/Staff/Admin
exports.occupyTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerCount, notes } = req.body;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Check if table is available
    if (table.status !== "available") {
      return res.status(400).json({ 
        message: `Table is currently ${table.status}`,
        currentStatus: table.status
      });
    }
    
    // Check capacity
    if (customerCount && customerCount > table.capacity) {
      return res.status(400).json({ 
        message: `Table capacity (${table.capacity}) exceeded`,
        capacity: table.capacity,
        requested: customerCount
      });
    }
    
    // Update table status
    table.status = "occupied";
    table.lastOccupiedAt = new Date();
    table.updatedBy = req.user._id;
    table.updatedAt = new Date();
    
    await table.save();
    
    res.json({
      message: `Table ${table.tableNumber} is now occupied`,
      table
    });
  } catch (error) {
    console.error("Occupy table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Clear table (after customers leave)
// @route   POST /api/tables/:id/clear
// @access  Waiter/Staff/Admin
exports.clearTable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Check if table is occupied
    if (table.status !== "occupied") {
      return res.status(400).json({ 
        message: `Table is not occupied (current status: ${table.status})` 
      });
    }
    
    // Check if there are any active orders
    const activeOrders = await FoodOrder.countDocuments({
      table: id,
      status: { $nin: ["completed", "cancelled"] }
    });
    
    if (activeOrders > 0) {
      return res.status(400).json({ 
        message: "Cannot clear table with active orders",
        activeOrders
      });
    }
    
    // Update table status
    table.status = "cleaning";
    table.currentOrder = null;
    table.lastCleanedAt = new Date();
    table.updatedBy = req.user._id;
    table.updatedAt = new Date();
    
    await table.save();
    
    res.json({
      message: `Table ${table.tableNumber} is now being cleaned`,
      table,
      nextSteps: "Table will be available after cleaning is complete"
    });
  } catch (error) {
    console.error("Clear table error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Mark table as available (after cleaning)
// @route   POST /api/tables/:id/available
// @access  Waiter/Staff/Admin
exports.markTableAvailable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Check if table is in cleaning state
    if (table.status !== "cleaning") {
      return res.status(400).json({ 
        message: `Table must be in cleaning state (current: ${table.status})` 
      });
    }
    
    // Update table status
    table.status = "available";
    table.updatedBy = req.user._id;
    table.updatedAt = new Date();
    
    await table.save();
    
    res.json({
      message: `Table ${table.tableNumber} is now available for new customers`,
      table
    });
  } catch (error) {
    console.error("Mark table available error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get table occupancy history
// @route   GET /api/tables/:id/history
// @access  Admin
exports.getTableHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    
    // Get orders for this table
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const orders = await FoodOrder.find({
      table: id,
      createdAt: { $gte: startDate }
    })
      .populate("user", "name email")
      .populate("assignedTo", "name")
      .select("orderCode status totalPrice items createdAt completedAt")
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === "completed").length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalPrice, 0),
      avgOrderValue: orders.length > 0 ? 
        orders.reduce((sum, order) => sum + order.totalPrice, 0) / orders.length : 0,
      avgOrderDuration: orders.filter(o => o.completedAt).length > 0 ?
        orders.filter(o => o.completedAt)
          .reduce((sum, order) => {
            const duration = (order.completedAt - order.createdAt) / (1000 * 60); // minutes
            return sum + duration;
          }, 0) / orders.filter(o => o.completedAt).length : 0
    };
    
    res.json({
      table: {
        tableNumber: table.tableNumber,
        name: table.name,
        section: table.section,
        capacity: table.capacity
      },
      period: `${days} days`,
      stats,
      orders: orders.slice(0, 20) // Return last 20 orders
    });
  } catch (error) {
    console.error("Get table history error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};