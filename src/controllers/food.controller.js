const Food = require("../models/Food");
const FoodCategory = require("../models/FoodCategory");
const FoodOrder = require("../models/FoodOrder");

// @desc    Get all food items (public with filters)
// @route   GET /api/foods
// @access  Public
exports.getFoods = async (req, res) => {
  try {
    const { 
      category, 
      availableOnly = true, 
      vegetarian, 
      vegan, 
      spicy,
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by availability
    if (availableOnly === 'true') {
      query.isAvailable = true;
    }
    
    // Filter by dietary preferences
    if (vegetarian === 'true') {
      query.isVegetarian = true;
    }
    
    if (vegan === 'true') {
      query.isVegan = true;
    }
    
    if (spicy === 'true') {
      query.isSpicy = true;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    switch(sortBy) {
      case 'name':
        sortOptions.name = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'price':
        sortOptions.price = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions.sortOrder = 1;
        sortOptions.name = 1;
    }
    
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const [foods, total] = await Promise.all([
      Food.find(query)
        .populate("category", "name description")
        .populate("createdBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Food.countDocuments(query)
    ]);
    
    res.json({
      foods,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Get foods error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get single food item
// @route   GET /api/foods/:id
// @access  Public
exports.getFoodById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const food = await Food.findById(id)
      .populate("category", "name description")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    
    if (!food) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    res.json(food);
  } catch (error) {
    console.error("Get food by ID error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Create food item (admin only)
// @route   POST /api/foods
// @access  Admin
exports.createFood = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      images,
      ingredients,
      preparationTime,
      isVegetarian,
      isVegan,
      isSpicy,
      spiceLevel,
      calories,
      tags,
      sortOrder
    } = req.body;
    
    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({ 
        message: "Name, price, and category are required" 
      });
    }
    
    // Validate category exists
    const categoryExists = await FoodCategory.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" });
    }
    
    // Check for duplicate food name
    const existingFood = await Food.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      category 
    });
    
    if (existingFood) {
      return res.status(409).json({ 
        message: "Food with this name already exists in this category" 
      });
    }
    
    // Create new food
    const food = new Food({
      name,
      description: description || "",
      price: Number(price),
      originalPrice: req.body.originalPrice || Number(price),
      category,
      images: images || [],
      ingredients: ingredients || [],
      preparationTime: preparationTime || 15,
      isAvailable: true,
      isVegetarian: isVegetarian || false,
      isVegan: isVegan || false,
      isSpicy: isSpicy || false,
      spiceLevel: spiceLevel || 0,
      calories: calories || null,
      tags: tags || [],
      sortOrder: sortOrder || 0,
      createdBy: req.user._id
    });
    
    await food.save();
    await food.populate("category", "name description");
    await food.populate("createdBy", "name email");
    
    res.status(201).json({
      message: "Food item created successfully",
      food
    });
  } catch (error) {
    console.error("Create food error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Update food item (admin only)
// @route   PUT /api/foods/:id
// @access  Admin
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const food = await Food.findById(id);
    
    if (!food) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    // Validate category if being updated
    if (updates.category && updates.category !== food.category.toString()) {
      const categoryExists = await FoodCategory.findById(updates.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
    }
    
    // Check for duplicate name if name/category is being updated
    if ((updates.name && updates.name !== food.name) || 
        (updates.category && updates.category !== food.category.toString())) {
      const query = {
        name: { $regex: new RegExp(`^${updates.name || food.name}$`, 'i') },
        category: updates.category || food.category,
        _id: { $ne: id }
      };
      
      const existingFood = await Food.findOne(query);
      
      if (existingFood) {
        return res.status(409).json({ 
          message: "Food with this name already exists in this category" 
        });
      }
    }
    
    // Update food
    Object.keys(updates).forEach(key => {
      food[key] = updates[key];
    });
    
    food.updatedBy = req.user._id;
    food.updatedAt = new Date();
    
    await food.save();
    await food.populate("category", "name description");
    await food.populate("createdBy", "name email");
    await food.populate("updatedBy", "name email");
    
    res.json({
      message: "Food item updated successfully",
      food
    });
  } catch (error) {
    console.error("Update food error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Delete food item (admin only)
// @route   DELETE /api/foods/:id
// @access  Admin
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    
    const food = await Food.findById(id);
    
    if (!food) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    // Check if food is in any active orders
    const activeOrders = await FoodOrder.countDocuments({
      "items.food": id,
      status: { $nin: ["completed", "cancelled"] }
    });
    
    if (activeOrders > 0) {
      return res.status(400).json({ 
        message: "Cannot delete food item with active orders",
        activeOrders
      });
    }
    
    await food.deleteOne();
    
    res.json({
      message: "Food item deleted successfully",
      deletedFood: food
    });
  } catch (error) {
    console.error("Delete food error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Toggle food availability (admin only)
// @route   PATCH /api/foods/:id/toggle-availability
// @access  Admin
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const food = await Food.findById(id);
    
    if (!food) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    food.isAvailable = !food.isAvailable;
    food.updatedBy = req.user._id;
    food.updatedAt = new Date();
    
    await food.save();
    
    res.json({
      message: `Food item ${food.isAvailable ? 'activated' : 'deactivated'} successfully`,
      food
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Get food statistics (admin only)
// @route   GET /api/foods/stats
// @access  Admin
exports.getFoodStats = async (req, res) => {
  try {
    const stats = await Food.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          availableItems: { 
            $sum: { $cond: ["$isAvailable", 1, 0] }
          },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          vegetarianCount: { 
            $sum: { $cond: ["$isVegetarian", 1, 0] }
          },
          veganCount: { 
            $sum: { $cond: ["$isVegan", 1, 0] }
          },
          spicyCount: { 
            $sum: { $cond: ["$isSpicy", 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          availableItems: 1,
          unavailableItems: { $subtract: ["$totalItems", "$availableItems"] },
          avgPrice: { $round: ["$avgPrice", 2] },
          minPrice: 1,
          maxPrice: 1,
          vegetarianCount: 1,
          veganCount: 1,
          spicyCount: 1
        }
      }
    ]);
    
    // Get category distribution
    const categoryStats = await Food.aggregate([
      {
        $lookup: {
          from: "foodcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo.name",
          count: { $sum: 1 },
          available: { 
            $sum: { $cond: ["$isAvailable", 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      overview: stats[0] || {},
      categories: categoryStats
    });
  } catch (error) {
    console.error("Get food stats error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};