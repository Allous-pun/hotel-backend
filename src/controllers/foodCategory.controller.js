const FoodCategory = require("../models/FoodCategory");

// @desc    Get all categories (public)
// @route   GET /api/foods/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const { activeOnly = true } = req.query;
    
    let query = {};
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const categories = await FoodCategory.find(query)
      .populate("createdBy", "name email")
      .sort({ sortOrder: 1, name: 1 });
    
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Create category (admin only)
// @route   POST /api/foods/categories
// @access  Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image, sortOrder } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }
    
    // Check if category already exists
    const existingCategory = await FoodCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingCategory) {
      return res.status(409).json({ 
        message: "Category with this name already exists" 
      });
    }
    
    // Create new category
    const category = new FoodCategory({
      name,
      description: description || "",
      image: image || "",
      sortOrder: sortOrder || 0,
      createdBy: req.user._id,
      isActive: true
    });
    
    await category.save();
    await category.populate("createdBy", "name email");
    
    res.status(201).json({
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Update category (admin only)
// @route   PUT /api/foods/categories/:id
// @access  Admin
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const category = await FoodCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== category.name) {
      const existingCategory = await FoodCategory.findOne({ 
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (existingCategory) {
        return res.status(409).json({ 
          message: "Category with this name already exists" 
        });
      }
    }
    
    // Update category
    Object.keys(updates).forEach(key => {
      category[key] = updates[key];
    });
    
    await category.save();
    await category.populate("createdBy", "name email");
    
    res.json({
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Delete category (admin only)
// @route   DELETE /api/foods/categories/:id
// @access  Admin
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await FoodCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Check if category has associated foods
    const Food = require("../models/Food");
    const foodsCount = await Food.countDocuments({ category: id });
    
    if (foodsCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with associated food items",
        foodsCount
      });
    }
    
    await category.deleteOne();
    
    res.json({
      message: "Category deleted successfully",
      deletedCategory: category
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Toggle category status (admin only)
// @route   PATCH /api/foods/categories/:id/toggle
// @access  Admin
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await FoodCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.json({
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      category
    });
  } catch (error) {
    console.error("Toggle category error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};