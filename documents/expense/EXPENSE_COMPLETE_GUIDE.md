# Expense Management - Complete Guide

A comprehensive guide to implementing and using the Expense Management system in the We Spend Wise application.

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

The Expense Management system allows users to track recurring expenses and automatically log them as transactions. This system:

- Helps users track their regular expenses
- Sends reminders when payments are due
- Automatically creates transaction records
- Updates wallet balances automatically

## Concepts

### Expense Source

An expense source represents a recurring expense that a user pays on a regular basis. Examples include:

- Monthly rent
- Car EMI
- Utility bills
- Insurance premiums
- Subscriptions

### Cycle Types

#### Monthly

Expense occurs every month on the same day.
**Example:** Rent on the 1st of every month

#### Quarterly

Expense occurs every 3 months on the same day.
**Example:** Insurance payment on the 15th of Jan, Apr, Jul, Oct

#### Yearly

Expense occurs every year on the same day.
**Example:** Annual subscription on the 1st of January

### Cycle Date

The day of the month when the expense is due (1-31).

**Important Notes:**

- For monthly cycles, the day repeats every month
- For quarterly cycles, it occurs on that day every 3 months
- For yearly cycles, it occurs on that day once per year
- Use day 31 carefully as not all months have 31 days

### Relaxation Date

The next date when the user will be prompted to confirm if they made the expense. This is automatically calculated based on the cycle type and cycle date.

## Data Model

```javascript
Expense Schema:
{
  _id: ObjectId,              // Unique identifier
  userId: ObjectId,           // Owner of the expense source
  walletId: ObjectId,         // Associated wallet
  name: String,               // Expense name (max 100 chars)
  description: String,        // Optional description (max 500 chars)
  amount: Number,             // Expense amount (≥ 0)
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

### Create Expense Source

**Endpoint:** `POST /api/expenses`

**Request:**

```json
{
  "walletId": "64a1b2c3d4e5f6789012345",
  "name": "Monthly Rent",
  "description": "Apartment rent payment",
  "amount": 20000,
  "cycleDate": 1,
  "cycleType": "monthly"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Expense source created successfully",
  "data": {
    /* expense object */
  }
}
```

### Get All Expense Sources

**Endpoint:** `GET /api/expenses`

**Response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    /* array of expense objects */
  ]
}
```

### Get Single Expense Source

**Endpoint:** `GET /api/expenses/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    /* expense object */
  }
}
```

### Update Expense Source

**Endpoint:** `PUT /api/expenses/:id`

**Request:**

```json
{
  "amount": 22000,
  "cycleDate": 2
}
```

**Response:**

```json
{
  "success": true,
  "message": "Expense source updated successfully",
  "data": {
    /* updated expense object */
  }
}
```

### Delete Expense Source

**Endpoint:** `DELETE /api/expenses/:id`

**Response:**

```json
{
  "success": true,
  "message": "Expense source deleted successfully"
}
```

## Usage Examples

### Example 1: Monthly Rent

**Scenario:** User pays monthly rent of 20,000 PKR on the 1st of every month.

**Request:**

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Monthly Rent",
    "description": "Apartment rent payment",
    "amount": 20000,
    "cycleDate": 1,
    "cycleType": "monthly"
  }'
```

### Example 2: Car EMI

**Scenario:** User pays car EMI of 15,000 PKR on the 15th of every month.

**Request:**

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Car EMI",
    "description": "Monthly car loan payment",
    "amount": 15000,
    "cycleDate": 15,
    "cycleType": "monthly"
  }'
```

### Example 3: Yearly Insurance

**Scenario:** User pays annual car insurance of 35,000 PKR on the 15th of December.

**Request:**

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Car Insurance",
    "description": "Annual car insurance premium",
    "amount": 35000,
    "cycleDate": 15,
    "cycleType": "yearly"
  }'
```

## Integration Guide

### Step 1: Create Expense Source

1. User selects or creates a wallet
2. User provides expense details (name, amount, cycle date, cycle type)
3. System creates expense source and associates it with the wallet
4. System stores relaxation date for initial cycle

### Step 2: Cron Job Processing

1. Cron job runs daily at 9:00 AM
2. Checks for expense sources with matching cycle dates
3. Finds expense sources where `relaxationDate` is today or in the past
4. Sends notification to user asking if they made the expense

### Step 3: User Confirmation

1. User receives notification
2. User confirms if they made the expense
3. If confirmed:
   - Create transaction record
   - Update wallet balance (decrease)
   - Update expense source relaxation date
   - Send success notification
4. If not confirmed:
   - Do nothing or reschedule for tomorrow

### Step 4: Transaction Creation

The system automatically creates a transaction with:

- Title: "Added Expense for {name} on {formatted_date}"
- Amount: Same as expense source amount
- Type: "expense"
- Date: Current date
- Wallet: Associated wallet ID

### Step 5: Wallet Balance Update

The wallet's `currentAmount` is automatically decreased by the expense amount.

## Cron Job Implementation

### Setup Cron Job

The expense cron job works similarly to the income cron job. See [Income Complete Guide](../income/INCOME_COMPLETE_GUIDE.md#cron-job-implementation) for implementation details.

### Process Expense Source Function

```javascript
async function processExpenseSource(expense) {
  try {
    // Check if wallet has sufficient balance
    const wallet = await UserWallet.findById(expense.walletId._id);

    if (wallet.currentAmount < expense.amount) {
      console.log(
        `Insufficient balance in wallet for expense: ${expense.name}`
      );
      // TODO: Send insufficient balance notification
      return;
    }

    // Create transaction
    const transaction = await Transaction.create({
      walletId: expense.walletId._id,
      userId: expense.userId._id,
      title: `Added Expense for ${expense.name} on ${formatDate(new Date())}`,
      description: expense.description,
      amount: expense.amount,
      transactionType: "expense",
      transactionDate: new Date()
    });

    // Update wallet balance (deduct)
    await UserWallet.findByIdAndUpdate(expense.walletId._id, {
      $inc: { currentAmount: -expense.amount }
    });

    // Update relaxation date
    await expense.updateRelaxationDate();

    console.log(`Processed expense transaction: ${transaction._id}`);
  } catch (error) {
    console.error("Error processing expense:", error);
    throw error;
  }
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

- ✅ "Monthly Rent"
- ✅ "Car EMI - HBL Bank"
- ❌ "Expense 1"
- ❌ "Bills"

### 3. Amount Accuracy

- Use exact amounts when known
- Round to nearest appropriate value
- Consider recurring discounts or promotions

### 4. Wallet Selection

- Choose the wallet from which expenses are paid
- Consider maintaining separate wallets for expenses
- Use default wallet for regular expenses

### 5. Balance Verification

Always check wallet balance before processing expenses:

- Prevent overdrafts
- Notify user of insufficient funds
- Suggest alternative wallets if available

### 6. Soft Delete

- Always use soft delete for data integrity
- Keep historical records for reporting
- Allow recovery if needed

## Troubleshooting

### Issue: Expense not triggering

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
3. Insufficient balance check passed but update failed

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

### Issue: Insufficient balance

**Possible Causes:**

1. Wallet balance too low
2. Multiple expenses on same date
3. Income not yet added

**Solutions:**

1. Implement balance checking before expense
2. Notify user of insufficient funds
3. Suggest payment deferral or alternative payment method

## Common Expense Categories

### Monthly Expenses

- Rent/Mortgage
- Utilities (electricity, gas, water)
- Car EMI
- Phone/Internet bills
- Insurance premiums
- Subscriptions

### Quarterly Expenses

- Home maintenance
- Professional services
- Insurance payments
- Tax installments

### Yearly Expenses

- Insurance renewals
- License renewals
- Annual subscriptions
- Tax payments
- Professional memberships

## Related Documentation

- [Expense API Reference](./EXPENSE_API_REFERENCE.md)
- [Income API Reference](../income/INCOME_API_REFERENCE.md)
- [Transaction API Reference](../transaction/TRANSACTION_API_REFERENCE.md)
