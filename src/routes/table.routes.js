const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { 
  adminOnly, 
  staffOrAdmin, 
  waiterOrAbove 
} = require("../middleware/roleMiddleware");

const tableController = require("../controllers/table.controller");

// Public: get all tables (for reservation system)
router.get("/", tableController.getTables);

// Public: get available tables
router.get("/available", tableController.getAvailableTables);

// Public: get table by ID
router.get("/:id", tableController.getTableById);

// Admin: create table
router.post("/", authMiddleware, adminOnly, tableController.createTable);

// Admin: update table
router.put("/:id", authMiddleware, adminOnly, tableController.updateTable);

// Admin: delete table
router.delete("/:id", authMiddleware, adminOnly, tableController.deleteTable);

// Admin: get table statistics
router.get("/stats/overview", authMiddleware, adminOnly, tableController.getTableStats);

// Waiter/Staff/Admin: toggle table status
router.patch("/:id/toggle-status", authMiddleware, waiterOrAbove, tableController.toggleTableStatus);

// Waiter/Staff/Admin: occupy table
router.post("/:id/occupy", authMiddleware, waiterOrAbove, tableController.occupyTable);

// Waiter/Staff/Admin: clear table
router.post("/:id/clear", authMiddleware, waiterOrAbove, tableController.clearTable);

// Waiter/Staff/Admin: mark table as available
router.post("/:id/available", authMiddleware, waiterOrAbove, tableController.markTableAvailable);

// Admin: get table history
router.get("/:id/history", authMiddleware, adminOnly, tableController.getTableHistory);

module.exports = router;