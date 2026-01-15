const express = require("express");
const router = express.Router();
const {
  getFoods,
  createFood,
  createFoodOrder,
  getMyOrders,
  updateFood,
  deleteFood,
  getAllOrders,
  updateOrderStatusByCode,
  getOrderByCode,
  getOrdersByTable,
  assignOrderToSelf,
  getMyAssignedOrders,
  getAvailableOrders,
  getTableStatus,
  checkTableClearance,
  clearTable,
  occupyTable,
  getWaiters,              // NEW
  assignOrderToWaiter      // NEW
} = require("../controllers/food.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, staffOrAdmin, waiterOrAbove } = require("../middleware/roleMiddleware");

// Public: get all food items
router.get("/", getFoods);

// Admin/Staff: add food item
router.post("/", authMiddleware, staffOrAdmin, createFood);

// Admin/Staff: update food item
router.put("/:id", authMiddleware, staffOrAdmin, updateFood);

// Admin: delete food item
router.delete("/:id", authMiddleware, adminOnly, deleteFood);

// User: place food order (with table info)
router.post("/order", authMiddleware, createFoodOrder);

// User: get their orders
router.get("/orders/my", authMiddleware, getMyOrders);

// Waiter: get my assigned orders
router.get("/orders/my-assigned", authMiddleware, waiterOrAbove, getMyAssignedOrders);

// Waiter/Admin: get available (unassigned) orders
router.get("/orders/available", authMiddleware, waiterOrAbove, getAvailableOrders);

// Waiter: assign order to self
router.post("/orders/:orderCode/assign-self", authMiddleware, waiterOrAbove, assignOrderToSelf);

// Admin: get all waiters
router.get("/waiters", authMiddleware, adminOnly, getWaiters);

// Admin: assign order to specific waiter
router.post("/orders/:orderCode/assign-waiter", authMiddleware, adminOnly, assignOrderToWaiter);

// Waiter/Staff/Admin: get all orders
router.get("/orders", authMiddleware, waiterOrAbove, getAllOrders);

// Waiter/Staff/Admin: get orders grouped by table
router.get("/orders/by-table", authMiddleware, waiterOrAbove, getOrdersByTable);

// Waiter/Staff/Admin: update order status by orderCode
router.put("/orders/code/:orderCode", authMiddleware, waiterOrAbove, updateOrderStatusByCode);

// Waiter/Staff/Admin: get single order by orderCode
router.get("/orders/code/:orderCode", authMiddleware, waiterOrAbove, getOrderByCode);

// 🔹 Table management routes
router.get("/tables/status", authMiddleware, waiterOrAbove, getTableStatus);
router.get("/tables/:tableNumber/check-clear", authMiddleware, waiterOrAbove, checkTableClearance);
router.get("/tables/:tableNumber/:tableSection/check-clear", authMiddleware, waiterOrAbove, checkTableClearance);
router.post("/tables/:tableNumber/clear", authMiddleware, waiterOrAbove, clearTable);
router.post("/tables/:tableNumber/:tableSection/clear", authMiddleware, waiterOrAbove, clearTable);
router.post("/tables/occupy", authMiddleware, waiterOrAbove, occupyTable);

module.exports = router;