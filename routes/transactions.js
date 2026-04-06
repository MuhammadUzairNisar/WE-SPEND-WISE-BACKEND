const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
      .withMessage("Invalid transaction date"),
    body("categoryId").optional().isMongoId().withMessage("Invalid category ID")
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
        transactionDate,
        categoryId
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
          : new Date(),
        categoryId: categoryId || null
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
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("categoryId").optional().isMongoId().withMessage("Invalid category ID")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { walletId, transactionType, categoryId, startDate, endDate } = req.query;

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

      if (categoryId) {
        query.categoryId = categoryId;
      }

      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) query.transactionDate.$gte = new Date(startDate);
        if (endDate) query.transactionDate.$lte = new Date(endDate);
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalDocs = await Transaction.countDocuments(query);
      const transactions = await Transaction.find(query)
        .populate("walletId", "name currentAmount")
        .populate("categoryId", "name icon color")
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit);

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

      const totalPages = Math.ceil(totalDocs / limit);
      const hasNextPage = page < totalPages;

      res.json({
        success: true,
        count: transactions.length,
        pagination: {
          totalDocs,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage
        },
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

// @route   GET /api/transactions/report
// @desc    Get aggregated report data for income & expense
// @access  Private
router.get(
  "/report",
  protect,
  [
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("categoryId").optional().isMongoId().withMessage("Invalid category ID")
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { startDate, endDate, categoryId } = req.query;

      // Build match stage
      const matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false
      };

      if (startDate || endDate) {
        matchStage.transactionDate = {};
        if (startDate) matchStage.transactionDate.$gte = new Date(startDate);
        if (endDate) matchStage.transactionDate.$lte = new Date(endDate);
      }

      if (categoryId) {
        matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
      }

      // --- Summary aggregation ---
      const summaryAgg = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$transactionType",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ]);

      const summary = {
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        incomeCount: 0,
        expenseCount: 0,
        transactionCount: 0
      };

      summaryAgg.forEach((item) => {
        if (item._id === "income") {
          summary.totalIncome = item.total;
          summary.incomeCount = item.count;
        } else if (item._id === "expense") {
          summary.totalExpense = item.total;
          summary.expenseCount = item.count;
        }
      });

      summary.netAmount = summary.totalIncome - summary.totalExpense;
      summary.transactionCount = summary.incomeCount + summary.expenseCount;

      // --- Category breakdown aggregation ---
      const categoryAgg = await Transaction.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              transactionType: "$transactionType",
              categoryId: "$categoryId",
              categoryName: { $ifNull: ["$category.name", "Other"] },
              categoryColor: { $ifNull: ["$category.color", null] },
              categoryIcon: { $ifNull: ["$category.icon", null] }
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]);

      const categoryBreakdown = { income: [], expense: [] };
      categoryAgg.forEach((item) => {
        const entry = {
          categoryId: item._id.categoryId,
          categoryName: item._id.categoryName,
          categoryColor: item._id.categoryColor,
          categoryIcon: item._id.categoryIcon,
          total: item.total,
          count: item.count
        };
        if (item._id.transactionType === "income") {
          categoryBreakdown.income.push(entry);
        } else {
          categoryBreakdown.expense.push(entry);
        }
      });

      // --- Daily trend aggregation ---
      const dailyAgg = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" }
              },
              transactionType: "$transactionType"
            },
            total: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]);

      // Pivot daily data into { date, income, expense }
      const dailyMap = {};
      dailyAgg.forEach((item) => {
        const dateStr = item._id.date;
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
        }
        dailyMap[dateStr][item._id.transactionType] = item.total;
      });

      const dailyTrend = Object.values(dailyMap).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // --- Top transactions per category (highest single transaction) ---
      const topTxAgg = await Transaction.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $sort: { amount: -1 } },
        {
          $group: {
            _id: {
              transactionType: "$transactionType",
              categoryName: { $ifNull: ["$category.name", "Other"] }
            },
            topTransaction: { $first: "$$ROOT" }
          }
        }
      ]);

      const topTransactions = { income: [], expense: [] };
      topTxAgg.forEach((item) => {
        const tx = item.topTransaction;
        const entry = {
          id: tx._id,
          title: tx.title,
          amount: tx.amount,
          transactionDate: tx.transactionDate,
          categoryName: item._id.categoryName,
          categoryColor: tx.category ? tx.category.color : null,
          categoryIcon: tx.category ? tx.category.icon : null
        };
        if (item._id.transactionType === "income") {
          topTransactions.income.push(entry);
        } else {
          topTransactions.expense.push(entry);
        }
      });

      // Sort top transactions by amount descending
      topTransactions.income.sort((a, b) => b.amount - a.amount);
      topTransactions.expense.sort((a, b) => b.amount - a.amount);

      res.json({
        success: true,
        data: {
          summary,
          categoryBreakdown,
          dailyTrend,
          topTransactions
        }
      });
    } catch (error) {
      console.error("Get report error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate report",
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
      })
        .populate("walletId", "name currentAmount")
        .populate("categoryId", "name icon color");

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
