# Income Management - Complete Guide

A comprehensive guide to implementing and using the Income Management system in the We Spend Wise application.

## Table of Contents

1. [Overview](#overview)
2. [Concepts](#concepts)
3. [Data Model](#data-model)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)
7. [Cron Job Implementation](#cron-job-implementation)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The Income Management system allows users to track recurring income sources and automatically log them as transactions. This system:

- Helps users track their regular income sources
- Sends reminders when income is due
- Automatically creates transaction records
- Updates wallet balances automatically

## Concepts

### Income Source

An income source represents a recurring stream of income that a user receives on a regular basis. Examples include:

- Monthly salary
- Quarterly bonuses
- Yearly dividends
- Freelance payments

### Cycle Types

#### Monthly

Income received every month on the same day.
**Example:** Salary on the 5th of every month

#### Quarterly

Income received every 3 months on the same day.
**Example:** Quarterly bonus on the 1st of Jan, Apr, Jul, Oct

#### Yearly

Income received every year on the same day.
**Example:** Annual dividend on the 15th of December

### Cycle Date

The day of the month when the income is received (1-31).

**Important Notes:**

- For monthly cycles, the day repeats every month
- For quarterly cycles, it occurs on that day every 3 months
- For yearly cycles, it occurs on that day once per year
- Use day 31 carefully as not all months have 31 days

### Relaxation Date

The next date when the user will be prompted to confirm if they received the income. This is automatically calculated based on the cycle type and cycle date.

## Data Model

```javascript
Income Schema:
{
  _id: ObjectId,              // Unique identifier
  userId: ObjectId,           // Owner of the income source
  walletId: ObjectId,         // Associated wallet
  name: String,               // Income name (max 100 chars)
  description: String,        // Optional description (max 500 chars)
  amount: Number,             // Income amount (≥ 0)
  cycleDate: Number,          // Day of month (1-31)
  cycleType: String,          // 'monthly' | 'quarterly' | 'yearly'
  relaxationDate: Date,       // Next prompt date
  isDeleted: Boolean,         // Soft delete flag
  deletedAt: Date,           // Deletion timestamp
  createdAt: Date,           // Creation timestamp
  updatedAt: Date            // Last update timestamp
}
```

## API Endpoints

### Create Income Source

**Endpoint:** `POST /api/incomes`

**Request:**

```json
{
  "walletId": "64a1b2c3d4e5f6789012345",
  "name": "Salary from Biafotech",
  "description": "Monthly salary payment",
  "amount": 30000,
  "cycleDate": 5,
  "cycleType": "monthly"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Income source created successfully",
  "data": {
    /* income object */
  }
}
```

### Get All Income Sources

**Endpoint:** `GET /api/incomes`

**Response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    /* array of income objects */
  ]
}
```

### Get Single Income Source

**Endpoint:** `GET /api/incomes/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    /* income object */
  }
}
```

### Update Income Source

**Endpoint:** `PUT /api/incomes/:id`

**Request:**

```json
{
  "amount": 35000,
  "cycleDate": 7
}
```

**Response:**

```json
{
  "success": true,
  "message": "Income source updated successfully",
  "data": {
    /* updated income object */
  }
}
```

### Delete Income Source

**Endpoint:** `DELETE /api/incomes/:id`

**Response:**

```json
{
  "success": true,
  "message": "Income source deleted successfully"
}
```

## Usage Examples

### Example 1: Monthly Salary

**Scenario:** User receives a monthly salary of 50,000 PKR on the 5th of every month.

**Request:**

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Monthly Salary",
    "description": "Primary job salary",
    "amount": 50000,
    "cycleDate": 5,
    "cycleType": "monthly"
  }'
```

### Example 2: Quarterly Bonus

**Scenario:** User receives a quarterly bonus of 100,000 PKR on the 1st of every quarter.

**Request:**

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Quarterly Performance Bonus",
    "description": "Bonus based on performance",
    "amount": 100000,
    "cycleDate": 1,
    "cycleType": "quarterly"
  }'
```

### Example 3: Yearly Dividend

**Scenario:** User receives an annual dividend of 500,000 PKR on the 31st of December.

**Request:**

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Annual Stock Dividend",
    "description": "Yearly dividend payout",
    "amount": 500000,
    "cycleDate": 31,
    "cycleType": "yearly"
  }'
```

## Integration Guide

### Step 1: Create Income Source

1. User selects or creates a wallet
2. User provides income details (name, amount, cycle date, cycle type)
3. System creates income source and associates it with the wallet
4. System stores relaxation date for initial cycle

### Step 2: Cron Job Processing

1. Cron job runs daily at 9:00 AM
2. Checks for income sources with matching cycle dates
3. Finds income sources where `relaxationDate` is today or in the past
4. Sends notification to user asking if they received the income

### Step 3: User Confirmation

1. User receives notification
2. User confirms if they received the income
3. If confirmed:
   - Create transaction record
   - Update wallet balance (increase)
   - Update income source relaxation date
   - Send success notification
4. If not confirmed:
   - Do nothing or reschedule for tomorrow

### Step 4: Transaction Creation

The system automatically creates a transaction with:

- Title: "Added Income for {name} on {formatted_date}"
- Amount: Same as income source amount
- Type: "income"
- Date: Current date
- Wallet: Associated wallet ID

### Step 5: Wallet Balance Update

The wallet's `currentAmount` is automatically increased by the income amount.

## Cron Job Implementation

### Setup Cron Job

Install required package:

```bash
npm install node-cron
```

### Create Cron Job File

Create `utils/cronJobs.js`:

```javascript
const cron = require("node-cron");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");
const UserWallet = require("../models/UserWallet");

// Run every day at 9:00 AM
const checkIncomeSources = cron.schedule("0 9 * * *", async () => {
  console.log("Checking income sources...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all active income sources that need processing
  const incomeSources = await Income.find({
    isDeleted: false,
    $or: [
      { relaxationDate: { $lte: today } },
      {
        $expr: {
          $and: [
            { relaxationDate: null },
            {
              $or: [
                { $eq: ["$cycleType", "monthly"] },
                { $eq: ["$cycleType", "quarterly"] },
                { $eq: ["$cycleType", "yearly"] }
              ]
            }
          ]
        }
      }
    ]
  }).populate("walletId userId");

  for (const income of incomeSources) {
    try {
      // Check if it's the right day for the cycle
      const shouldProcess = shouldProcessIncome(income, today);

      if (shouldProcess) {
        // Send notification to user
        console.log(`Sending notification for income: ${income.name}`);

        // TODO: Implement notification sending logic
        // This will trigger user confirmation

        // Once confirmed (in callback), process the income
        // processIncomeSource(income);
      }
    } catch (error) {
      console.error(`Error processing income ${income._id}:`, error);
    }
  }
});

function shouldProcessIncome(income, today) {
  // Check if it's the right day for the cycle
  const dayOfMonth = today.getDate();

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
    // For yearly, just check if it's been a year since last processing
    return true;
  }

  return true; // For monthly
}

// This function is called when user confirms
async function processIncomeSource(income) {
  try {
    // Create transaction
    const transaction = await Transaction.create({
      walletId: income.walletId._id,
      userId: income.userId._id,
      title: `Added Income for ${income.name} on ${formatDate(new Date())}`,
      description: income.description,
      amount: income.amount,
      transactionType: "income",
      transactionDate: new Date()
    });

    // Update wallet balance
    await UserWallet.findByIdAndUpdate(income.walletId._id, {
      $inc: { currentAmount: income.amount }
    });

    // Update relaxation date
    await income.updateRelaxationDate();

    console.log(`Processed income transaction: ${transaction._id}`);
  } catch (error) {
    console.error("Error processing income:", error);
    throw error;
  }
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// Start the cron job
checkIncomeSources.start();
console.log("Income cron job started");

module.exports = { processIncomeSource };
```

### Add to server.js

```javascript
// Import cron jobs
if (process.env.NODE_ENV !== "test") {
  require("./utils/cronJobs");
}
```

## Best Practices

### 1. Cycle Date Selection

- Use days 1-28 for monthly cycles (safe for all months)
- Use day 31 carefully (may not work for all months)
- For quarterly, use first or last day of quarter
- For yearly, use specific memorable dates

### 2. Naming Conventions

Use descriptive names:

- ✅ "Salary from Company ABC"
- ✅ "Monthly Freelance Work"
- ❌ "Income 1"
- ❌ "Money"

### 3. Amount Accuracy

- Use exact amounts when known
- Round to nearest appropriate value
- Consider tax implications if needed

### 4. Wallet Selection

- Choose the wallet that receives the income
- Consider creating a dedicated income wallet
- Use default wallet for primary income

### 5. Soft Delete

- Always use soft delete for data integrity
- Keep historical records for reporting
- Allow recovery if needed

## Troubleshooting

### Issue: Income not triggering

**Possible Causes:**

1. Cron job not running
2. Wrong cycle date
3. Relaxation date not set

**Solutions:**

1. Check if cron job is started
2. Verify cycle date matches current date
3. Check if relaxationDate is set correctly

### Issue: Wallet balance not updating

**Possible Causes:**

1. Transaction not created
2. Wallet update failed
3. Race condition

**Solutions:**

1. Use transaction/atomic operations
2. Check error logs
3. Implement proper error handling

### Issue: Duplicate transactions

**Possible Causes:**

1. Multiple confirmations
2. Cron job running multiple times

**Solutions:**

1. Implement idempotency checks
2. Verify cron job runs once
3. Add unique constraints

## Related Documentation

- [Income API Reference](./INCOME_API_REFERENCE.md)
- [Expense API Reference](../expense/EXPENSE_API_REFERENCE.md)
- [Transaction API Reference](../transaction/TRANSACTION_API_REFERENCE.md)
