# Transaction Management API Reference

Complete API documentation for managing transactions in the We Spend Wise application.

## Overview

Transactions represent individual income and expense entries in the system. They are automatically created when income/expense sources are processed, providing a detailed history of all financial activities.

## Features

- Create transactions with optional file attachments (PDF, JPG, PNG)
- View all transactions with filtering and pagination
- View detailed transaction information
- Filter by wallet, type, and date range
- Get summary statistics (total income, total expense, net amount)
- Automatic wallet balance updates
- Soft delete functionality

## Base URL

```
http://localhost:5000/api/transactions
```

## Authentication

All endpoints require authentication using a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Transaction

Create a new transaction with optional file attachment.

**Endpoint:** `POST /api/transactions`

**Content-Type:** `multipart/form-data`

**Request Fields:**

| Field           | Type   | Required | Description                               |
| --------------- | ------ | -------- | ----------------------------------------- |
| walletId        | String | Yes      | MongoDB ObjectId of the wallet            |
| title           | String | Yes      | Transaction title (max 200 characters)    |
| description     | String | No       | Optional description (max 500 characters) |
| amount          | Number | Yes      | Transaction amount (must be positive)     |
| transactionType | String | Yes      | Must be `income` or `expense`             |
| transactionDate | String | No       | Date in ISO 8601 format (defaults to now) |
| file            | File   | No       | PDF, JPG, or PNG file (max 10MB)          |

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012348",
    "walletId": "64a1b2c3d4e5f6789012345",
    "userId": "64a1b2c3d4e5f6789012345",
    "title": "Manual Income Entry",
    "description": "Bonus payment",
    "file": "/uploads/transactions/transaction-1234567890-123456789.pdf",
    "amount": 10000,
    "transactionType": "income",
    "transactionDate": "2024-01-20T10:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request - Validation Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Transaction title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

400 Bad Request - Invalid File Type:

```json
{
  "success": false,
  "message": "Only PDF, JPG, and PNG files are allowed"
}
```

400 Bad Request - Insufficient Balance:

```json
{
  "success": false,
  "message": "Insufficient balance in wallet"
}
```

**Note:** When creating an expense transaction, the system checks if the wallet has sufficient balance. If not, the transaction is rolled back.

---

### 2. Get All Transactions

Retrieve all transactions for the authenticated user with optional filtering.

**Endpoint:** `GET /api/transactions`

**Query Parameters:**

- `walletId` (optional): Filter by specific wallet
- `transactionType` (optional): Filter by `income` or `expense`
- `startDate` (optional): Filter transactions from this date (ISO 8601 format)
- `endDate` (optional): Filter transactions until this date (ISO 8601 format)

**Examples:**

Get all transactions:

```
GET /api/transactions
```

Get transactions for a specific wallet:

```
GET /api/transactions?walletId=64a1b2c3d4e5f6789012345
```

Get only income transactions:

```
GET /api/transactions?transactionType=income
```

Get transactions for a date range:

```
GET /api/transactions?startDate=2024-01-01&endDate=2024-01-31
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "count": 3,
  "summary": {
    "totalIncome": 80000,
    "totalExpense": 55000,
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
      "title": "Added Income for Salary from Biafotech on 5 January, 2024",
      "description": "Monthly salary payment",
      "file": null,
      "amount": 50000,
      "transactionType": "income",
      "transactionDate": "2024-01-05T09:00:00.000Z",
      "isDeleted": false,
      "createdAt": "2024-01-05T09:00:00.000Z",
      "updatedAt": "2024-01-05T09:00:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012349",
      "walletId": {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Main Wallet",
        "currentAmount": 25000
      },
      "userId": "64a1b2c3d4e5f6789012345",
      "title": "Added Expense for Car EMI on 15 January, 2024",
      "description": "Monthly car loan payment",
      "file": null,
      "amount": 15000,
      "transactionType": "expense",
      "transactionDate": "2024-01-15T09:00:00.000Z",
      "isDeleted": false,
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012350",
      "walletId": {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Main Wallet",
        "currentAmount": 25000
      },
      "userId": "64a1b2c3d4e5f6789012345",
      "title": "Added Income for Freelance Work on 1 January, 2024",
      "description": "Quarterly payment from client",
      "file": null,
      "amount": 30000,
      "transactionType": "income",
      "transactionDate": "2024-01-01T09:00:00.000Z",
      "isDeleted": false,
      "createdAt": "2024-01-01T09:00:00.000Z",
      "updatedAt": "2024-01-01T09:00:00.000Z"
    }
  ]
}
```

**Summary Fields:**

- `totalIncome`: Sum of all income transactions
- `totalExpense`: Sum of all expense transactions
- `netAmount`: Difference between income and expenses (income - expenses)

---

### 3. Get Single Transaction

Retrieve detailed information about a specific transaction.

**Endpoint:** `GET /api/transactions/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the transaction

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012348",
    "walletId": {
      "_id": "64a1b2c3d4e5f6789012345",
      "name": "Main Wallet",
      "currentAmount": 25000
    },
    "userId": "64a1b2c3d4e5f6789012345",
    "title": "Added Income for Salary from Biafotech on 5 January, 2024",
    "description": "Monthly salary payment",
    "file": null,
    "amount": 50000,
    "transactionType": "income",
    "transactionDate": "2024-01-05T09:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2024-01-05T09:00:00.000Z",
    "updatedAt": "2024-01-05T09:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

---

### 4. Delete Transaction

Soft delete a transaction (marks as deleted but doesn't remove from database).

**Endpoint:** `DELETE /api/transactions/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the transaction

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

---

## Data Model

### Transaction Schema

```javascript
{
  _id: ObjectId,              // Auto-generated
  walletId: ObjectId,         // Reference to UserWallet
  userId: ObjectId,           // Reference to User
  title: String,              // Transaction title
  description: String,        // Optional description
  file: String,               // Optional file URL (PDF, JPG, PNG only)
  amount: Number,             // Transaction amount (≥ 0)
  transactionType: String,    // 'income' | 'expense'
  transactionDate: Date,      // Date of transaction
  isDeleted: Boolean,         // Soft delete flag
  deletedAt: Date,           // Deletion timestamp
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

### File Types Allowed

The `file` field accepts only the following file formats:

- **PDF** (`.pdf`)
- **JPG/JPEG** (`.jpg`, `.jpeg`)
- **PNG** (`.png`)

All other file types will be rejected with a validation error.

### Transaction Title Formats

**Income:**

```
Added Income for {name} on {formatted_date}
```

Example: "Added Income for Salary from Biafotech on 5 January, 2024"

**Expense:**

```
Added Expense for {name} on {formatted_date}
```

Example: "Added Expense for Car EMI on 15 January, 2024"

---

## Usage Examples

### Example 1: Create Transaction with File

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "walletId=64a1b2c3d4e5f6789012345" \
  -F "title=Manual Income Entry" \
  -F "description=Bonus payment" \
  -F "amount=10000" \
  -F "transactionType=income" \
  -F "transactionDate=2024-01-20T10:00:00.000Z" \
  -F "file=@receipt.pdf"
```

### Example 2: Create Transaction without File

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "walletId=64a1b2c3d4e5f6789012345" \
  -F "title=Manual Expense Entry" \
  -F "description=Grocery shopping" \
  -F "amount=5000" \
  -F "transactionType=expense"
```

### Example 3: Get All Transactions

```bash
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Get Income Only

```bash
curl -X GET "http://localhost:5000/api/transactions?transactionType=income" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 5: Get Transactions for Date Range

```bash
curl -X GET "http://localhost:5000/api/transactions?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 6: Get Transactions for Specific Wallet

```bash
curl -X GET "http://localhost:5000/api/transactions?walletId=64a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 7: Delete Transaction

```bash
curl -X DELETE http://localhost:5000/api/transactions/64a1b2c3d4e5f6789012348 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Only for validation errors
}
```

### Common Error Codes

- **400**: Bad Request - Validation errors
- **401**: Unauthorized - Invalid or missing token
- **404**: Not Found - Resource doesn't exist
- **500**: Internal Server Error - Server-side errors

---

## Query Parameters

### Filtering Options

| Parameter         | Type                      | Description       | Example                             |
| ----------------- | ------------------------- | ----------------- | ----------------------------------- |
| `walletId`        | String (MongoDB ObjectId) | Filter by wallet  | `?walletId=64a1b2c3d4e5f6789012345` |
| `transactionType` | String                    | Filter by type    | `?transactionType=income`           |
| `startDate`       | String (ISO 8601)         | Filter from date  | `?startDate=2024-01-01`             |
| `endDate`         | String (ISO 8601)         | Filter until date | `?endDate=2024-01-31`               |

### Combining Filters

You can combine multiple filters:

```
GET /api/transactions?walletId=123&transactionType=income&startDate=2024-01-01
```

---

## Summary Statistics

The GET all transactions endpoint automatically calculates:

- **totalIncome**: Sum of all income transactions
- **totalExpense**: Sum of all expense transactions
- **netAmount**: Net amount (income - expense)

These calculations include all transactions matching the applied filters.

---

## Best Practices

1. **Use Filters**: Apply appropriate filters to reduce response size and improve performance
2. **Date Ranges**: Use date ranges for generating reports and analytics
3. **Wallet Filtering**: Filter by wallet to get transaction history for specific wallets
4. **Soft Delete**: Use soft delete to maintain transaction history and audit trails
5. **Limits**: The endpoint limits results to 100 transactions to prevent overwhelming responses

---

## Integration Notes

### With Income Sources

Transactions are automatically created when income sources are processed:

- Created from the income source name and amount
- Transaction type: `income`
- Wallet balance is increased

### With Expense Sources

Transactions are automatically created when expense sources are processed:

- Created from the expense source name and amount
- Transaction type: `expense`
- Wallet balance is decreased

### Cron Job Integration

Transactions are typically created through cron jobs that:

1. Check for income/expense sources on their cycle dates
2. Send notifications to users at 9 AM
3. Create transactions when users confirm receipt/payment
4. Update wallet balances accordingly

---

## Related Documentation

- [Income API Reference](../income/INCOME_API_REFERENCE.md)
- [Expense API Reference](../expense/EXPENSE_API_REFERENCE.md)
- [Wallet API Reference](../wallet/WALLET_API_REFERENCE.md)
