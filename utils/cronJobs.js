const cron = require("node-cron");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");
const UserWallet = require("../models/UserWallet");

/**
 * Format date for transaction titles
 */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/**
 * Check if income source should be processed today
 */
function shouldProcessIncome(income, today) {
  const dayOfMonth = today.getDate();

  // Check if it's the correct day of the month
  if (income.cycleDate !== dayOfMonth) {
    return false;
  }

  // Additional checks for quarterly and yearly
  if (income.cycleType === "quarterly") {
    const month = today.getMonth();
    const validMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    return validMonths.includes(month);
  }

  if (income.cycleType === "yearly") {
    // For yearly, only process if relaxationDate has passed
    return income.relaxationDate === null || income.relaxationDate <= today;
  }

  return true; // For monthly
}

/**
 * Check if expense source should be processed today
 */
function shouldProcessExpense(expense, today) {
  const dayOfMonth = today.getDate();

  // Check if it's the correct day of the month
  if (expense.cycleDate !== dayOfMonth) {
    return false;
  }

  // Additional checks for quarterly and yearly
  if (expense.cycleType === "quarterly") {
    const month = today.getMonth();
    const validMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    return validMonths.includes(month);
  }

  if (expense.cycleType === "yearly") {
    // For yearly, only process if relaxationDate has passed
    return expense.relaxationDate === null || expense.relaxationDate <= today;
  }

  return true; // For monthly
}

/**
 * Process income source and create transaction
 */
async function processIncomeSource(income) {
  try {
    // Create transaction
    const transaction = await Transaction.create({
      walletId: income.walletId._id,
      userId: income.userId._id,
      title: `Added Income for ${income.name} on ${formatDate(new Date())}`,
      description: income.description || null,
      amount: income.amount,
      transactionType: "income",
      transactionDate: new Date()
    });

    // Update wallet balance (increase)
    await UserWallet.findByIdAndUpdate(income.walletId._id, {
      $inc: { currentAmount: income.amount }
    });

    // Update relaxation date for next cycle
    await income.updateRelaxationDate();

    console.log(
      `✅ Processed income: ${income.name} - Amount: ${income.amount} - Transaction: ${transaction._id}`
    );
    return transaction;
  } catch (error) {
    console.error("❌ Error processing income:", error);
    throw error;
  }
}

/**
 * Process expense source and create transaction
 */
async function processExpenseSource(expense) {
  try {
    // Check if wallet has sufficient balance
    const wallet = await UserWallet.findById(expense.walletId._id);

    if (!wallet) {
      console.error(`❌ Wallet not found for expense: ${expense.name}`);
      return null;
    }

    if (wallet.currentAmount < expense.amount) {
      console.log(
        `⚠️  Insufficient balance in wallet for expense: ${expense.name}. Current: ${wallet.currentAmount}, Required: ${expense.amount}`
      );
      // TODO: Send insufficient balance notification
      return null;
    }

    // Create transaction
    const transaction = await Transaction.create({
      walletId: expense.walletId._id,
      userId: expense.userId._id,
      title: `Added Expense for ${expense.name} on ${formatDate(new Date())}`,
      description: expense.description || null,
      amount: expense.amount,
      transactionType: "expense",
      transactionDate: new Date()
    });

    // Update wallet balance (deduct)
    await UserWallet.findByIdAndUpdate(expense.walletId._id, {
      $inc: { currentAmount: -expense.amount }
    });

    // Update relaxation date for next cycle
    await expense.updateRelaxationDate();

    console.log(
      `✅ Processed expense: ${expense.name} - Amount: ${expense.amount} - Transaction: ${transaction._id}`
    );
    return transaction;
  } catch (error) {
    console.error("❌ Error processing expense:", error);
    throw error;
  }
}

/**
 * Cron job to check and process income sources
 * Runs every day at 9:00 AM
 */
const checkIncomeSources = cron.schedule("0 9 * * *", async () => {
  console.log("\n📊 [Income Cron] Checking income sources...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find all active income sources that need processing
    const incomeSources = await Income.find({
      isDeleted: false
    }).populate("walletId userId");

    let processedCount = 0;
    let skippedCount = 0;

    for (const income of incomeSources) {
      try {
        // Check if this income should be processed today
        const shouldProcess = shouldProcessIncome(income, today);

        if (shouldProcess) {
          await processIncomeSource(income);
          processedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing income ${income._id} (${income.name}):`,
          error
        );
      }
    }

    console.log(
      `📊 [Income Cron] Completed. Processed: ${processedCount}, Skipped: ${skippedCount}, Total: ${incomeSources.length}`
    );
  } catch (error) {
    console.error("❌ [Income Cron] Error checking income sources:", error);
  }
});

/**
 * Cron job to check and process expense sources
 * Runs every day at 9:00 AM
 */
const checkExpenseSources = cron.schedule("0 9 * * *", async () => {
  console.log("\n💰 [Expense Cron] Checking expense sources...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find all active expense sources that need processing
    const expenseSources = await Expense.find({
      isDeleted: false
    }).populate("walletId userId");

    let processedCount = 0;
    let skippedCount = 0;
    let insufficientFundsCount = 0;

    for (const expense of expenseSources) {
      try {
        // Check if this expense should be processed today
        const shouldProcess = shouldProcessExpense(expense, today);

        if (shouldProcess) {
          const result = await processExpenseSource(expense);
          if (result) {
            processedCount++;
          } else {
            insufficientFundsCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing expense ${expense._id} (${expense.name}):`,
          error
        );
      }
    }

    console.log(
      `💰 [Expense Cron] Completed. Processed: ${processedCount}, Insufficient Funds: ${insufficientFundsCount}, Skipped: ${skippedCount}, Total: ${expenseSources.length}`
    );
  } catch (error) {
    console.error("❌ [Expense Cron] Error checking expense sources:", error);
  }
});

// Start the cron jobs
function startCronJobs() {
  if (process.env.NODE_ENV === "test") {
    console.log("⏸️  Cron jobs disabled in test environment");
    return;
  }

  console.log("\n⏰ Starting Cron Jobs...");
  
  checkIncomeSources.start();
  console.log("✅ Income cron job started (runs daily at 9:00 AM)");

  checkExpenseSources.start();
  console.log("✅ Expense cron job started (runs daily at 9:00 AM)");
  
  console.log("🔄 Cron jobs are now active and running in the background\n");
}

// Auto-start cron jobs when module is loaded
startCronJobs();

module.exports = {
  processIncomeSource,
  processExpenseSource,
  startCronJobs
};

