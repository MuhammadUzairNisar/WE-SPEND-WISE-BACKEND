const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const UserWallet = require("../models/UserWallet");
const Category = require("../models/Category");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

// Helper to get model from table name
const getModel = (tableName) => {
  switch (tableName) {
    case "wallets":
      return UserWallet;
    case "categories":
      return Category;
    case "incomes":
      return Income;
    case "expenses":
      return Expense;
    default:
      return null;
  }
};

// @route   POST /api/sync/push
// @desc    Batch sync local changes to cloud
// @access  Private
router.post("/push", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { operations } = req.body;
    const userId = req.user._id;
    const results = [];

    for (const op of operations) {
      const { operation, tableName, recordId, data } = op;
      const Model = getModel(tableName);

      if (!Model) {
        results.push({ recordId, success: false, message: `Invalid table name: ${tableName}` });
        continue;
      }

      try {
        let result;
        if (operation === "CREATE") {
          const newData = { ...data, userId };
          delete newData._id;
          delete newData.id;
          delete newData.remoteId;

          // Special logic for Income/Expense creation
          if (tableName === "incomes" || tableName === "expenses") {
            const wallet = await UserWallet.findOne({ _id: newData.walletId, userId, isDeleted: false }).session(session);
            if (!wallet) {
              results.push({ recordId, success: false, message: "Wallet not found" });
              continue;
            }

            // Create income/expense
            result = await Model.create([newData], { session });
            result = result[0];

            // Update wallet and create transaction only for spontaneous income/expense
            if ((tableName === "incomes" && !newData.isFixedIncome) ||
              (tableName === "expenses" && !newData.isFixedExpense)) {

              const amount = newData.amount;
              const type = tableName === "incomes" ? "income" : "expense";

              await Transaction.create([{
                userId,
                walletId: newData.walletId,
                title: `${type === "income" ? "Income" : "Expense"}: ${newData.name}`,
                description: newData.description || `Spontaneous ${type} for ${newData.name}`,
                amount,
                transactionType: type,
                transactionDate: newData.entryDate || new Date(),
                categoryId: newData.categoryId || null
              }], { session });

              if (type === "income") {
                wallet.currentAmount += amount;
              } else {
                wallet.currentAmount -= amount;
              }
              await wallet.save({ session });
            }
          } else {
            result = await Model.create([newData], { session });
            result = result[0];
          }

          results.push({ recordId, success: true, remoteId: result._id });
        } else if (operation === "UPDATE") {
          const remoteId = data.remoteId || data._id;
          if (!remoteId) {
            results.push({ recordId, success: false, message: "Missing remoteId for update" });
            continue;
          }

          const updateData = { ...data };
          delete updateData._id;
          delete updateData.userId;
          delete updateData.remoteId;

          // Note: UPDATE logic here doesn't adjust wallet balance if amount changes.
          // This is a simplification. In a production app, we should handle amount changes.
          result = await Model.findOneAndUpdate(
            { _id: remoteId, userId },
            { $set: updateData },
            { new: true, session }
          );

          if (!result) {
            results.push({ recordId, success: false, message: "Record not found for update" });
          } else {
            results.push({ recordId, success: true, remoteId: result._id });
          }
        } else if (operation === "DELETE") {
          const remoteId = data.remoteId || data._id;
          if (!remoteId) {
            results.push({ recordId, success: false, message: "Missing remoteId for delete" });
            continue;
          }

          result = await Model.findOneAndUpdate(
            { _id: remoteId, userId },
            { $set: { isDeleted: true, deletedAt: new Date() } },
            { session }
          );

          if (!result) {
            results.push({ recordId, success: false, message: "Record not found for delete" });
          } else {
            results.push({ recordId, success: true });
          }
        }
      } catch (err) {
        results.push({ recordId, success: false, message: err.message });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/sync/pull
// @desc    Pull updates from cloud since timestamp
// @access  Private
router.get("/pull", protect, async (req, res) => {
  try {
    const { since } = req.query;
    const userId = req.user._id;
    
    // On first sync (no 'since' param), use a very old date to get all data
    // On subsequent syncs, get data updated after the last sync timestamp
    const lastSyncDate = since ? new Date(since) : new Date(0);

    const query = {
      userId,
      // Use $gte to include data from exactly the lastSyncDate (handles edge cases)
      updatedAt: { $gte: lastSyncDate }
    };

    const [wallets, categories, incomes, expenses, transactions] = await Promise.all([
      UserWallet.find(query),
      Category.find(query),
      Income.find(query),
      Expense.find(query),
      Transaction.find(query)
        .populate('categoryId', 'name icon color')
        .sort({ transactionDate: -1 })
    ]);

    res.json({
      success: true,
      data: {
        wallets,
        categories,
        incomes,
        expenses,
        transactions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
