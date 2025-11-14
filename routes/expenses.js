const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const Expense = require("../models/Expense");
const UserWallet = require("../models/UserWallet");
const Transaction = require("../models/Transaction");

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

// @route   POST /api/expenses
// @desc    Create new expense source
// @access  Private
router.post(
  "/",
  protect,
  [
    body("walletId").isMongoId().withMessage("Invalid wallet ID"),
    body("name").trim().notEmpty().withMessage("Expense name is required"),
    body("description").optional().trim(),
    body("amount")
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("isFixedExpense").optional().isBoolean().withMessage("isFixedExpense must be a boolean"),
    body("cycleDate")
      .if((value, { req }) => req.body.isFixedExpense !== false)
      .isInt({ min: 1, max: 31 })
      .withMessage("Cycle date must be between 1 and 31"),
    body("cycleType")
      .if((value, { req }) => req.body.isFixedExpense !== false)
      .isIn(["monthly", "quarterly", "yearly"])
      .withMessage("Cycle type must be monthly, quarterly, or yearly"),
    body("entryDate")
      .if((value, { req }) => req.body.isFixedExpense === false)
      .optional()
      .isISO8601()
      .withMessage("Entry date must be a valid date")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { walletId, name, description, amount, isFixedExpense, cycleDate, cycleType, entryDate } =
        req.body;

      // Verify wallet exists and belongs to user
      const wallet = await UserWallet.findOne({
        _id: walletId,
        userId: userId,
        isDeleted: false
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found or does not belong to you"
        });
      }

      // Create expense source
      const expenseData = {
        userId,
        walletId,
        name,
        description,
        amount,
        isFixedExpense: isFixedExpense !== undefined ? isFixedExpense : true
      };

      if (expenseData.isFixedExpense) {
        expenseData.cycleDate = cycleDate;
        expenseData.cycleType = cycleType;
      } else {
        expenseData.entryDate = entryDate || new Date();
      }

      const expense = await Expense.create(expenseData);

      // If spontaneous expense, create transaction immediately
      if (!expenseData.isFixedExpense) {
        // Check wallet balance
        if (wallet.balance < amount) {
          await Expense.findByIdAndDelete(expense._id);
          return res.status(400).json({
            success: false,
            message: "Insufficient wallet balance"
          });
        }

        const transaction = await Transaction.create({
          userId,
          walletId,
          title: `Expense: ${name}`,
          description: description || `Spontaneous expense for ${name}`,
          amount,
          transactionType: "expense",
          transactionDate: expenseData.entryDate
        });

        // Update wallet balance
        wallet.balance -= amount;
        await wallet.save();
      }

      res.status(201).json({
        success: true,
        message: "Expense source created successfully",
        data: expense
      });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create expense source",
        error: error.message
      });
    }
  }
);

// @route   GET /api/expenses
// @desc    Get all expense sources for logged-in user
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const expenses = await Expense.find({
      userId: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense sources",
      error: error.message
    });
  }
});

// @route   GET /api/expenses/transactions
// @desc    Get all expense transactions for logged-in user
// @access  Private
router.get("/transactions", protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      transactionType: "expense",
      isDeleted: false
    })
      .populate("walletId", "name walletType")
      .sort({ transactionDate: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error("Get expense transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense transactions",
      error: error.message
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense source by ID
// @access  Private
router.get(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid expense ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const expense = await Expense.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense source not found"
        });
      }

      res.json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error("Get expense error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch expense source",
        error: error.message
      });
    }
  }
);

// @route   PUT /api/expenses/:id
// @desc    Update expense source
// @access  Private
router.put(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid expense ID"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Expense name cannot be empty"),
    body("description").optional().trim(),
    body("amount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("isFixedExpense").optional().isBoolean().withMessage("isFixedExpense must be a boolean"),
    body("cycleDate")
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage("Cycle date must be between 1 and 31"),
    body("cycleType")
      .optional()
      .isIn(["monthly", "quarterly", "yearly"])
      .withMessage("Cycle type must be monthly, quarterly, or yearly"),
    body("entryDate")
      .optional()
      .isISO8601()
      .withMessage("Entry date must be a valid date")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const expense = await Expense.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense source not found"
        });
      }

      // Update expense
      const allowedUpdates = [
        "name",
        "description",
        "amount",
        "isFixedExpense",
        "cycleDate",
        "cycleType",
        "entryDate"
      ];
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          expense[field] = req.body[field];
        }
      });

      await expense.save();

      res.json({
        success: true,
        message: "Expense source updated successfully",
        data: expense
      });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update expense source",
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/expenses/:id
// @desc    Soft delete expense source
// @access  Private
router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid expense ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const expense = await Expense.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense source not found"
        });
      }

      await expense.softDelete();

      res.json({
        success: true,
        message: "Expense source deleted successfully"
      });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete expense source",
        error: error.message
      });
    }
  }
);

module.exports = router;
