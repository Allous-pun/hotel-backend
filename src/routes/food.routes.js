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
  updateOrderStatusByCode, // 🔹 renamed
  getOrderByCode          // 🔹 added
} = require("../controllers/food.controller");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Public: get all food items
router.get("/", getFoods);

// Admin/Staff: add food item
router.post("/", authMiddleware, roleMiddleware("admin", "staff"), createFood);

// Admin/Staff: update food item
router.put("/:id", authMiddleware, roleMiddleware("admin", "staff"), updateFood);

// Admin: delete food item
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteFood);

// User: place food order
router.post("/order", authMiddleware, createFoodOrder);

// User: get their orders
router.get("/orders/my", authMiddleware, getMyOrders);

// Staff/Admin: get all orders
router.get("/orders", authMiddleware, roleMiddleware("staff", "admin"), getAllOrders);

// Staff/Admin: update order status by orderCode
router.put("/orders/code/:orderCode", authMiddleware, roleMiddleware("staff", "admin"), updateOrderStatusByCode);

// Staff/Admin: get single order by orderCode
router.get("/orders/code/:orderCode", authMiddleware, roleMiddleware("staff", "admin"), getOrderByCode);

module.exports = router;
