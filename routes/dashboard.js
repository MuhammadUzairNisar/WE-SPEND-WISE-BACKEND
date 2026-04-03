const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const Transaction = require("../models/Transaction");

// @route   GET /api/dashboard/stats
// @desc    Get total income/expense up to the end of today (server-local)
// @access  Private
router.get("/stats", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Server-local: today start (00:00:00) and tomorrow start
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const matchStage = {
      userId,
      isDeleted: false,
      transactionDate: { $lt: tomorrowStart },
    };

    const aggregation = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$transactionType",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    aggregation.forEach((row) => {
      if (row._id === "income") totalIncome = row.total;
      if (row._id === "expense") totalExpense = row.total;
    });

    const netAmount = totalIncome - totalExpense;

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netAmount,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
});

module.exports = router;

