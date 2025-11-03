# Income & Expense Implementation Guide

Quick implementation guide for the complete Income, Expense, and Transaction management system.

## Overview

This implementation guide provides step-by-step instructions for setting up and using the Income, Expense, and Transaction management features.

## System Architecture

```
User creates Income/Expense Sources
           ↓
    Sources stored in DB
           ↓
    Cron job runs daily at 9 AM
           ↓
    Checks for matching cycle dates
           ↓
    Sends notification to user
           ↓
    User confirms receipt/payment
           ↓
    Transaction created automatically
           ↓
    Wallet balance updated
           ↓
    Relaxation date set for next cycle
```

## Quick Start

### 1. Install Dependencies

```bash
npm install node-cron
```

### 2. Test API Endpoints

#### Create Income Source

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "YOUR_WALLET_ID",
    "name": "Monthly Salary",
    "description": "Primary job salary",
    "amount": 50000,
    "cycleDate": 5,
    "cycleType": "monthly"
  }'
```

#### Create Expense Source

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "YOUR_WALLET_ID",
    "name": "Monthly Rent",
    "description": "Apartment rent payment",
    "amount": 20000,
    "cycleDate": 1,
    "cycleType": "monthly"
  }'
```

#### Create Transaction with File

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "walletId=YOUR_WALLET_ID" \
  -F "title=Manual Income Entry" \
  -F "description=Bonus payment" \
  -F "amount=10000" \
  -F "transactionType=income" \
  -F "file=@receipt.pdf"
```

#### Get All Transactions

```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Transactions by Type

```bash
# Get income only
curl -X GET "http://localhost:5000/api/transactions?transactionType=income" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get expenses only
curl -X GET "http://localhost:5000/api/transactions?transactionType=expense" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Transactions by Date Range

```bash
curl -X GET "http://localhost:5000/api/transactions?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Models

### Income Source

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  walletId: ObjectId,
  name: String,              // "Monthly Salary"
  description: String,       // "Primary job salary"
  amount: Number,            // 50000
  cycleDate: Number,         // 5 (day of month)
  cycleType: String,         // "monthly", "quarterly", "yearly"
  relaxationDate: Date,      // Next prompt date
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Expense Source

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  walletId: ObjectId,
  name: String,              // "Monthly Rent"
  description: String,       // "Apartment rent payment"
  amount: Number,            // 20000
  cycleDate: Number,         // 1 (day of month)
  cycleType: String,         // "monthly", "quarterly", "yearly"
  relaxationDate: Date,      // Next prompt date
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction

```javascript
{
  _id: ObjectId,
  walletId: ObjectId,
  userId: ObjectId,
  title: String,             // "Added Income for Monthly Salary on 5 January, 2024"
  description: String,       // Optional
  file: String,              // Optional file URL (PDF, JPG, PNG only)
  amount: Number,            // 50000
  transactionType: String,   // "income" or "expense"
  transactionDate: Date,     // Date of transaction
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**File Types Allowed:**

- PDF (`.pdf`)
- JPG/JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)

## Cycle Types & Dates

### Monthly

Occurs every month on the same day.

**Examples:**

- Day 5: Income on 5th of every month
- Day 1: Rent on 1st of every month

**Best Practice:** Use days 1-28 for monthly cycles to avoid month-end issues.

### Quarterly

Occurs every 3 months on the same day in specific months.

**Months:** January (0), April (3), July (6), October (9)

**Examples:**

- Day 1, Quarterly: On Jan 1, Apr 1, Jul 1, Oct 1
- Day 15, Quarterly: On Jan 15, Apr 15, Jul 15, Oct 15

### Yearly

Occurs once per year on the same day.

**Examples:**

- Day 31, Yearly: Year-end bonus
- Day 15, Yearly: Annual insurance renewal

## Transaction Titles

### Income Titles

Format: `Added Income for {name} on {formatted_date}`

**Examples:**

- `Added Income for Monthly Salary on 5 January, 2024`
- `Added Income for Quarterly Bonus on 1 April, 2024`
- `Added Income for Freelance Work on 10 January, 2024`

### Expense Titles

Format: `Added Expense for {name} on {formatted_date}`

**Examples:**

- `Added Expense for Monthly Rent on 1 January, 2024`
- `Added Expense for Car EMI on 15 January, 2024`
- `Added Expense for Car Insurance on 15 December, 2024`

## API Endpoints Reference

### Income Endpoints

| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/api/incomes`     | Create income source     |
| GET    | `/api/incomes`     | Get all income sources   |
| GET    | `/api/incomes/:id` | Get single income source |
| PUT    | `/api/incomes/:id` | Update income source     |
| DELETE | `/api/incomes/:id` | Delete income source     |

### Expense Endpoints

| Method | Endpoint            | Description               |
| ------ | ------------------- | ------------------------- |
| POST   | `/api/expenses`     | Create expense source     |
| GET    | `/api/expenses`     | Get all expense sources   |
| GET    | `/api/expenses/:id` | Get single expense source |
| PUT    | `/api/expenses/:id` | Update expense source     |
| DELETE | `/api/expenses/:id` | Delete expense source     |

### Transaction Endpoints

| Method | Endpoint                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| POST   | `/api/transactions`     | Create transaction with file        |
| GET    | `/api/transactions`     | Get all transactions (with filters) |
| GET    | `/api/transactions/:id` | Get single transaction              |
| DELETE | `/api/transactions/:id` | Delete transaction                  |

### Transaction Query Parameters

| Parameter       | Type         | Description           |
| --------------- | ------------ | --------------------- |
| walletId        | String       | Filter by wallet      |
| transactionType | String       | "income" or "expense" |
| startDate       | String (ISO) | Filter from date      |
| endDate         | String (ISO) | Filter until date     |

## Cron Job Setup

### Install node-cron

```bash
npm install node-cron
```

### Create Cron Job File

Create `utils/cronJobs.js`:

```javascript
const cron = require("node-cron");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
// ... other imports

// Run every day at 9:00 AM
const checkIncomeSources = cron.schedule("0 9 * * *", async () => {
  // Implementation details in complete guides
});

checkIncomeSources.start();
```

### Add to server.js

```javascript
// Import cron jobs
if (process.env.NODE_ENV !== "test") {
  require("./utils/cronJobs");
}
```

## Common Use Cases

### Use Case 1: Monthly Salary

**Income Source:**

```json
{
  "walletId": "wallet_id",
  "name": "Monthly Salary",
  "description": "Primary job salary",
  "amount": 50000,
  "cycleDate": 5,
  "cycleType": "monthly"
}
```

**Behavior:**

- Reminder on 5th of every month at 9 AM
- Creates transaction when confirmed
- Increases wallet balance by 50,000

### Use Case 2: Car EMI

**Expense Source:**

```json
{
  "walletId": "wallet_id",
  "name": "Car EMI",
  "description": "Monthly car loan payment",
  "amount": 15000,
  "cycleDate": 15,
  "cycleType": "monthly"
}
```

**Behavior:**

- Reminder on 15th of every month at 9 AM
- Checks if wallet has sufficient balance
- Creates transaction when confirmed
- Decreases wallet balance by 15,000

### Use Case 3: Quarterly Insurance

**Expense Source:**

```json
{
  "walletId": "wallet_id",
  "name": "Car Insurance",
  "description": "Quarterly insurance premium",
  "amount": 35000,
  "cycleDate": 15,
  "cycleType": "quarterly"
}
```

**Behavior:**

- Reminder on Jan 15, Apr 15, Jul 15, Oct 15 at 9 AM
- Creates transaction when confirmed
- Decreases wallet balance by 35,000

## Response Examples

### Successful Income Creation

```json
{
  "success": true,
  "message": "Income source created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Monthly Salary",
    "description": "Primary job salary",
    "amount": 50000,
    "cycleDate": 5,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Get Transactions with Summary

```json
{
  "success": true,
  "count": 10,
  "summary": {
    "totalIncome": 100000,
    "totalExpense": 75000,
    "netAmount": 25000
  },
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012348",
      "walletId": {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Main Wallet",
        "currentAmount": 25000
      },
      "userId": "64a1b2c3d4e5f6789012345",
      "title": "Added Income for Monthly Salary on 5 January, 2024",
      "amount": 50000,
      "transactionType": "income",
      "transactionDate": "2024-01-05T09:00:00.000Z",
      "isDeleted": false
    }
  ]
}
```

## Error Handling

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Income name is required",
      "param": "name",
      "location": "body"
    }
  ]
}
```

### Wallet Not Found

```json
{
  "success": false,
  "message": "Wallet not found or does not belong to you"
}
```

### Resource Not Found

```json
{
  "success": false,
  "message": "Income source not found"
}
```

## Best Practices

1. **Use Days 1-28** for monthly cycles to avoid month-end issues
2. **Descriptive Names** - Use clear, specific names for sources
3. **Verify Wallet** - Always ensure wallet belongs to user
4. **Balance Check** - Check wallet balance before processing expenses
5. **Soft Delete** - Use soft delete for data integrity
6. **Date Formatting** - Use ISO 8601 format for dates
7. **Query Limits** - Limit results to prevent overwhelming responses

## Testing Checklist

- [ ] Create income source
- [ ] Create expense source
- [ ] Get all income sources
- [ ] Get all expense sources
- [ ] Update income source
- [ ] Update expense source
- [ ] Delete income source
- [ ] Delete expense source
- [ ] Get all transactions
- [ ] Get transactions by type
- [ ] Get transactions by date range
- [ ] Get transactions by wallet
- [ ] Delete transaction
- [ ] Verify wallet balance updates
- [ ] Test cron job triggers

## Documentation Links

- [Income API Reference](./income/INCOME_API_REFERENCE.md)
- [Income Complete Guide](./income/INCOME_COMPLETE_GUIDE.md)
- [Expense API Reference](./expense/EXPENSE_API_REFERENCE.md)
- [Expense Complete Guide](./expense/EXPENSE_COMPLETE_GUIDE.md)
- [Transaction API Reference](./transaction/TRANSACTION_API_REFERENCE.md)

## Support

For detailed implementation guides, troubleshooting, and examples, refer to the individual documentation files in:

- `documents/income/`
- `documents/expense/`
- `documents/transaction/`
