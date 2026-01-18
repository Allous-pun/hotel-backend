const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { 
  adminOnly, 
  staffOrAdmin, 
  waiterOrAbove 
} = require("../middleware/roleMiddleware");

// Import controllers
const foodController = require("../controllers/food.controller");
const foodCategoryController = require("../controllers/foodCategory.controller");
const foodOrderController = require("../controllers/foodOrder.controller");

// ==================== FOOD CATEGORY ROUTES ====================

// Public: get all categories
router.get("/categories", foodCategoryController.getCategories);

// Admin: create category
router.post("/categories", authMiddleware, adminOnly, foodCategoryController.createCategory);

// Admin: update category
router.put("/categories/:id", authMiddleware, adminOnly, foodCategoryController.updateCategory);

// Admin: delete category
router.delete("/categories/:id", authMiddleware, adminOnly, foodCategoryController.deleteCategory);

// Admin: toggle category status
router.patch("/categories/:id/toggle", authMiddleware, adminOnly, foodCategoryController.toggleCategoryStatus);

// ==================== FOOD ITEM ROUTES ====================

// Public: get all food items with filters
router.get("/", foodController.getFoods);

// Public: get single food item
router.get("/:id", foodController.getFoodById);

// Admin: create food item
router.post("/", authMiddleware, adminOnly, foodController.createFood);

// Admin: update food item
router.put("/:id", authMiddleware, adminOnly, foodController.updateFood);

// Admin: delete food item
router.delete("/:id", authMiddleware, adminOnly, foodController.deleteFood);

// Admin: toggle food availability
router.patch("/:id/toggle-availability", authMiddleware, adminOnly, foodController.toggleAvailability);

// Admin: get food statistics
router.get("/stats/overview", authMiddleware, adminOnly, foodController.getFoodStats);

// ==================== ORDER ROUTES ====================

// Public: place guest order
router.post("/order/guest", foodOrderController.createGuestOrder);

// Authenticated: place order
router.post("/order", authMiddleware, foodOrderController.createOrder);

// Public: track order status
router.get("/orders/track/:orderCode", foodOrderController.trackOrder);

// Authenticated: get my orders
router.get("/orders/my", authMiddleware, foodOrderController.getMyOrders);

// Authenticated: rate order
router.post("/orders/:orderCode/rate", authMiddleware, foodOrderController.rateOrder);

// Waiter/Staff/Admin: get all orders
router.get("/orders/all", authMiddleware, waiterOrAbove, foodOrderController.getAllOrders);

// Waiter/Staff/Admin: get order by code
router.get("/orders/code/:orderCode", authMiddleware, waiterOrAbove, foodOrderController.getOrderByCode);

// Waiter/Staff/Admin: get orders by table
router.get("/orders/by-table/:tableId", authMiddleware, waiterOrAbove, foodOrderController.getOrdersByTable);

// Waiter/Staff/Admin: update order status
router.put("/orders/:orderCode/status", authMiddleware, waiterOrAbove, foodOrderController.updateOrderStatus);

// Waiter/Staff/Admin: update order payment status
router.put("/orders/:orderCode/payment", authMiddleware, waiterOrAbove, foodOrderController.updatePaymentStatus);

// Waiter: assign order to self
router.post("/orders/:orderCode/assign-self", authMiddleware, waiterOrAbove, foodOrderController.assignOrderToSelf);

// Admin: assign order to waiter
router.post("/orders/:orderCode/assign", authMiddleware, adminOnly, foodOrderController.assignOrderToWaiter);

// Waiter: get my assigned orders
router.get("/orders/assigned/my", authMiddleware, waiterOrAbove, foodOrderController.getMyAssignedOrders);

// Waiter/Staff/Admin: get available orders
router.get("/orders/available", authMiddleware, waiterOrAbove, foodOrderController.getAvailableOrders);

// Admin: get all waiters
router.get("/waiters/list", authMiddleware, adminOnly, foodOrderController.getWaiters);

// Admin: get order statistics
router.get("/orders/stats", authMiddleware, adminOnly, foodOrderController.getOrderStats);

module.exports = router;