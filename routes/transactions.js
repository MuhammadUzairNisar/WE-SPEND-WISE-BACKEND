const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const UserWallet = require("../models/UserWallet");
const uploadTransaction = require("../middleware/uploadTransaction");

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

// @route   POST /api/transactions
// @desc    Create new transaction with optional file
// @access  Private
router.post(
  "/",
  protect,
  uploadTransaction.single("file"),
  [
    body("walletId").isMongoId().withMessage("Invalid wallet ID"),
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Transaction title is required"),
    body("description").optional().trim(),
    body("amount")
      .isFloat({ min: 0 })
      .withMessage("Amount must be a positive number"),
    body("transactionType")
      .isIn(["income", "expense"])
      .withMessage("Transaction type must be income or expense"),
    body("transactionDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid transaction date")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const {
        walletId,
        title,
        description,
        amount,
        transactionType,
        transactionDate
      } = req.body;

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

      // Prepare transaction data
      const transactionData = {
        userId,
        walletId,
        title,
        description: description || null,
        amount,
        transactionType,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date()
      };

      // Add file path if uploaded
      if (req.file) {
        transactionData.file = `/uploads/transactions/${req.file.filename}`;
      }

      // Create transaction
      const transaction = await Transaction.create(transactionData);

      // Update wallet balance
      if (transactionType === "income") {
        await UserWallet.findByIdAndUpdate(walletId, {
          $inc: { currentAmount: amount }
        });
      } else if (transactionType === "expense") {
        // Check sufficient balance for expense
        if (wallet.currentAmount < amount) {
          // Rollback transaction creation
          await Transaction.findByIdAndDelete(transaction._id);
          return res.status(400).json({
            success: false,
            message: "Insufficient balance in wallet"
          });
        }
        await UserWallet.findByIdAndUpdate(walletId, {
          $inc: { currentAmount: -amount }
        });
      }

      res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: transaction
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create transaction",
        error: error.message
      });
    }
  }
);

// @route   GET /api/transactions
// @desc    Get all transactions for logged-in user
// @access  Private
router.get(
  "/",
  protect,
  [
    query("walletId").optional().isMongoId().withMessage("Invalid wallet ID"),
    query("transactionType")
      .optional()
      .isIn(["income", "expense"])
      .withMessage("Transaction type must be income or expense"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { walletId, transactionType, startDate, endDate } = req.query;

      // Build query
      const query = {
        userId,
        isDeleted: false
      };

      if (walletId) {
        // Verify wallet belongs to user
        const wallet = await UserWallet.findOne({
          _id: walletId,
          userId,
          isDeleted: false
        });

        if (!wallet) {
          return res.status(404).json({
            success: false,
            message: "Wallet not found or does not belong to you"
          });
        }
        query.walletId = walletId;
      }

      if (transactionType) {
        query.transactionType = transactionType;
      }

      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) query.transactionDate.$gte = new Date(startDate);
        if (endDate) query.transactionDate.$lte = new Date(endDate);
      }

      const transactions = await Transaction.find(query)
        .populate("walletId", "name currentAmount")
        .sort({ transactionDate: -1 })
        .limit(100); // Limit to prevent overwhelming responses

      // Calculate summary statistics
      const summary = {
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0
      };

      transactions.forEach((transaction) => {
        if (transaction.transactionType === "income") {
          summary.totalIncome += transaction.amount;
        } else {
          summary.totalExpense += transaction.amount;
        }
      });

      summary.netAmount = summary.totalIncome - summary.totalExpense;

      res.json({
        success: true,
        count: transactions.length,
        summary,
        data: transactions
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
        error: error.message
      });
    }
  }
);

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid transaction ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      }).populate("walletId", "name currentAmount");

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found"
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction",
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/transactions/:id
// @desc    Soft delete transaction
// @access  Private
router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Invalid transaction ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found"
        });
      }

      await transaction.softDelete();

      res.json({
        success: true,
        message: "Transaction deleted successfully"
      });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete transaction",
        error: error.message
      });
    }
  }
);

module.exports = router;
