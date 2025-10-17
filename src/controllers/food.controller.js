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

// Create a food order (user)
exports.createFoodOrder = async (req, res) => {
  try {
    const { items, totalPrice } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Order items are required" });

    const order = await FoodOrder.create({
      user: req.user._id,
      items,
      totalPrice,
    });

    res.status(201).json(order);
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
    const orders = await FoodOrder.find({ user: req.user._id }).populate("items.food", "name price");
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders (staff/admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.find()
      .populate("user", "name email")
      .populate("items.food", "name price");
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔹 Update order status by orderCode
exports.updateOrderStatusByCode = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { status } = req.body;

    const order = await FoodOrder.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status || order.status;
    await order.save();

    const updatedOrder = await FoodOrder.findOne({ orderCode })
      .populate("user", "name email")
      .populate("items.food", "name price");

    res.json(updatedOrder);
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
      .populate("items.food", "name price");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

