const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const Category = require("../models/Category");

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private
router.post(
  "/",
  protect,
  [
    body("name").trim().notEmpty().withMessage("Category name is required"),
    body("type")
      .isIn(["income", "expense"])
      .withMessage("Type must be income or expense"),
    body("icon").optional().trim(),
    body("color").optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, icon, color } = req.body;
      const userId = req.user._id;

      // Check if category already exists for this user
      const existingCategory = await Category.findOne({
        userId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
        type,
        isDeleted: false
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists"
        });
      }

      const category = await Category.create({
        userId,
        name,
        type,
        icon,
        color
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message
      });
    }
  }
);

// @route   GET /api/categories
// @desc    Get all categories for logged-in user
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const categories = await Category.find({
      userId: req.user._id,
      isDeleted: false
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid category ID"),
    body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty"),
    body("type")
      .optional()
      .isIn(["income", "expense"])
      .withMessage("Type must be income or expense"),
    body("icon").optional().trim(),
    body("color").optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await Category.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      if (req.body.name) category.name = req.body.name;
      if (req.body.type) category.type = req.body.type;
      if (req.body.icon) category.icon = req.body.icon;
      if (req.body.color) category.color = req.body.color;

      await category.save();

      res.json({
        success: true,
        message: "Category updated successfully",
        data: category
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/categories/:id
// @desc    Soft delete a category
// @access  Private
router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await Category.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      await category.softDelete();

      res.json({
        success: true,
        message: "Category deleted successfully"
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete category",
        error: error.message
      });
    }
  }
);

module.exports = router;
