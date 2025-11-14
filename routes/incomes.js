const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const Income = require("../models/Income");
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

// @route   POST /api/incomes
// @desc    Create new income source
// @access  Private
router.post(
  "/",
  protect,
  [
    body("walletId").isMongoId().withMessage("Invalid wallet ID"),
    body("name").trim().notEmpty().withMessage("Income name is required"),
    body("description").optional().trim(),
    body("amount")
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("isFixedIncome").optional().isBoolean().withMessage("isFixedIncome must be a boolean"),
    body("cycleDate")
      .if((value, { req }) => req.body.isFixedIncome !== false)
      .isInt({ min: 1, max: 31 })
      .withMessage("Cycle date must be between 1 and 31"),
    body("cycleType")
      .if((value, { req }) => req.body.isFixedIncome !== false)
      .isIn(["monthly", "quarterly", "yearly"])
      .withMessage("Cycle type must be monthly, quarterly, or yearly"),
    body("entryDate")
      .if((value, { req }) => req.body.isFixedIncome === false)
      .optional()
      .isISO8601()
      .withMessage("Entry date must be a valid date")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { walletId, name, description, amount, isFixedIncome, cycleDate, cycleType, entryDate } =
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

      // Create income source
      const incomeData = {
        userId,
        walletId,
        name,
        description,
        amount,
        isFixedIncome: isFixedIncome !== undefined ? isFixedIncome : true
      };

      if (incomeData.isFixedIncome) {
        incomeData.cycleDate = cycleDate;
        incomeData.cycleType = cycleType;
      } else {
        incomeData.entryDate = entryDate || new Date();
      }

      const income = await Income.create(incomeData);

      // If spontaneous income, create transaction immediately
      if (!incomeData.isFixedIncome) {
        const transaction = await Transaction.create({
          userId,
          walletId,
          title: `Income: ${name}`,
          description: description || `Spontaneous income from ${name}`,
          amount,
          transactionType: "income",
          transactionDate: incomeData.entryDate
        });

        // Update wallet balance
        wallet.balance += amount;
        await wallet.save();
      }

      res.status(201).json({
        success: true,
        message: "Income source created successfully",
        data: income
      });
    } catch (error) {
      console.error("Create income error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create income source",
        error: error.message
      });
    }
  }
);

// @route   GET /api/incomes
// @desc    Get all income sources for logged-in user
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const incomes = await Income.find({
      userId: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incomes.length,
      data: incomes
    });
  } catch (error) {
    console.error("Get incomes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch income sources",
      error: error.message
    });
  }
});

// @route   GET /api/incomes/transactions
// @desc    Get all income transactions for logged-in user
// @access  Private
router.get("/transactions", protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      transactionType: "income",
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
    console.error("Get income transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch income transactions",
      error: error.message
    });
  }
});

// @route   GET /api/incomes/:id
// @desc    Get single income source by ID
// @access  Private
router.get(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid income ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const income = await Income.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!income) {
        return res.status(404).json({
          success: false,
          message: "Income source not found"
        });
      }

      res.json({
        success: true,
        data: income
      });
    } catch (error) {
      console.error("Get income error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch income source",
        error: error.message
      });
    }
  }
);

// @route   PUT /api/incomes/:id
// @desc    Update income source
// @access  Private
router.put(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Invalid income ID"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Income name cannot be empty"),
    body("description").optional().trim(),
    body("amount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("isFixedIncome").optional().isBoolean().withMessage("isFixedIncome must be a boolean"),
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
      const income = await Income.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!income) {
        return res.status(404).json({
          success: false,
          message: "Income source not found"
        });
      }

      // Update income
      const allowedUpdates = [
        "name",
        "description",
        "amount",
        "isFixedIncome",
        "cycleDate",
        "cycleType",
        "entryDate"
      ];
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          income[field] = req.body[field];
        }
      });

      await income.save();

      res.json({
        success: true,
        message: "Income source updated successfully",
        data: income
      });
    } catch (error) {
      console.error("Update income error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update income source",
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/incomes/:id
// @desc    Soft delete income source
// @access  Private
router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid income ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const income = await Income.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!income) {
        return res.status(404).json({
          success: false,
          message: "Income source not found"
        });
      }

      await income.softDelete();

      res.json({
        success: true,
        message: "Income source deleted successfully"
      });
    } catch (error) {
      console.error("Delete income error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete income source",
        error: error.message
      });
    }
  }
);

module.exports = router;
