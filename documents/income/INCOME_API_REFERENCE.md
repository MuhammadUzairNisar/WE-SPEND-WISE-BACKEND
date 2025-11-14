# Income Management API Reference

Complete API documentation for managing income sources in the We Spend Wise application.

## Overview

Income sources represent both recurring and spontaneous income streams. Users can track:
- **Fixed Income**: Recurring income (monthly, quarterly, yearly) like salary
- **Spontaneous Income**: One-time income like freelance payments or gifts

## Features

- Create, read, update, and delete income sources
- Support for fixed (recurring) and spontaneous (one-time) income
- Associate income sources with specific wallets
- Set recurring cycles for fixed income (monthly, quarterly, yearly)
- Track entry dates for spontaneous income
- Automatic relaxation date calculation for fixed income
- Soft delete functionality

## Base URL

```
http://localhost:5000/api/incomes
```

## Authentication

All endpoints require authentication using a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Income Source

Create a new income source for the authenticated user.

**Endpoint:** `POST /api/incomes`

**Request Body (Fixed Income):**

```json
{
  "walletId": "64a1b2c3d4e5f6789012345",
  "name": "Salary from Biafotech",
  "description": "Monthly salary payment",
  "amount": 30000,
  "isFixedIncome": true,
  "cycleDate": 5,
  "cycleType": "monthly"
}
```

**Request Body (Spontaneous Income):**

```json
{
  "walletId": "64a1b2c3d4e5f6789012345",
  "name": "Freelance Project Payment",
  "description": "Website development project",
  "amount": 15000,
  "isFixedIncome": false,
  "entryDate": "2024-01-15T10:30:00Z"
}
```

**Field Descriptions:**

- `walletId` (required): MongoDB ObjectId of the wallet to associate with
- `name` (required): Name of the income source (max 100 characters)
- `description` (optional): Description of the income source (max 500 characters)
- `amount` (required): Amount of income (must be positive)
- `isFixedIncome` (optional): Boolean, defaults to `true`. Set to `false` for spontaneous income
- `cycleDate` (required if isFixedIncome=true): Day of the month (1-31)
- `cycleType` (required if isFixedIncome=true): One of `monthly`, `quarterly`, or `yearly`
- `entryDate` (required if isFixedIncome=false): Date when income was received (ISO 8601 format)

**Success Response (201 Created) - Fixed Income:**

```json
{
  "success": true,
  "message": "Income source created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Salary from Biafotech",
    "description": "Monthly salary payment",
    "amount": 30000,
    "isFixedIncome": true,
    "cycleDate": 5,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Success Response (201 Created) - Spontaneous Income:**

```json
{
  "success": true,
  "message": "Income source created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012347",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Freelance Project Payment",
    "description": "Website development project",
    "amount": 15000,
    "isFixedIncome": false,
    "entryDate": "2024-01-15T10:30:00.000Z",
    "relaxationDate": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Note:** When creating spontaneous income (`isFixedIncome: false`), a transaction is automatically created and the wallet balance is updated immediately.

**Error Responses:**

400 Bad Request - Validation Error:

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

404 Not Found - Wallet Not Found:

```json
{
  "success": false,
  "message": "Wallet not found or does not belong to you"
}
```

---

### 2. Get All Income Transactions

Retrieve all income transactions for the authenticated user (sorted by transaction date, newest first).

**Endpoint:** `GET /api/incomes/transactions`

**Success Response (200 OK):**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012348",
      "userId": "64a1b2c3d4e5f6789012345",
      "walletId": {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Cash Wallet",
        "walletType": "cash"
      },
      "title": "Income: Freelance Project Payment",
      "description": "Spontaneous income from Freelance Project Payment",
      "amount": 15000,
      "transactionType": "income",
      "transactionDate": "2024-01-15T10:30:00.000Z",
      "file": null,
      "isDeleted": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012349",
      "userId": "64a1b2c3d4e5f6789012345",
      "walletId": {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Cash Wallet",
        "walletType": "cash"
      },
      "title": "Income: Monthly Salary",
      "description": "Added Income for Monthly Salary on January 5, 2024",
      "amount": 50000,
      "transactionType": "income",
      "transactionDate": "2024-01-05T09:00:00.000Z",
      "file": null,
      "isDeleted": false,
      "createdAt": "2024-01-05T09:00:00.000Z",
      "updatedAt": "2024-01-05T09:00:00.000Z"
    }
  ]
}
```

---

### 3. Get All Income Sources

Retrieve all income sources for the authenticated user.

**Endpoint:** `GET /api/incomes`

**Success Response (200 OK):**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012346",
      "userId": "64a1b2c3d4e5f6789012345",
      "walletId": "64a1b2c3d4e5f6789012345",
      "name": "Salary from Biafotech",
      "description": "Monthly salary payment",
      "amount": 30000,
      "cycleDate": 5,
      "cycleType": "monthly",
      "relaxationDate": null,
      "isDeleted": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "_id": "64a1b2c3d4e5f6789012347",
      "userId": "64a1b2c3d4e5f6789012345",
      "walletId": "64a1b2c3d4e5f6789012345",
      "name": "Freelance Work",
      "description": "Quarterly payment from client",
      "amount": 50000,
      "cycleDate": 1,
      "cycleType": "quarterly",
      "relaxationDate": null,
      "isDeleted": false,
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z"
    }
  ]
}
```

---

### 4. Get Single Income Source

Retrieve a specific income source by ID.

**Endpoint:** `GET /api/incomes/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the income source

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Salary from Biafotech",
    "description": "Monthly salary payment",
    "amount": 30000,
    "cycleDate": 5,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Income source not found"
}
```

---

### 5. Update Income Source

Update an existing income source.

**Endpoint:** `PUT /api/incomes/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the income source

**Request Body:**

```json
{
  "name": "Updated Salary Name",
  "amount": 35000,
  "cycleDate": 7
}
```

All fields are optional. Only include the fields you want to update.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Income source updated successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Updated Salary Name",
    "description": "Monthly salary payment",
    "amount": 35000,
    "cycleDate": 7,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 6. Delete Income Source

Soft delete an income source (marks as deleted but doesn't remove from database).

**Endpoint:** `DELETE /api/incomes/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the income source

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Income source deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Income source not found"
}
```

---

## Data Model

### Income Schema

```javascript
{
  _id: ObjectId,              // Auto-generated
  userId: ObjectId,           // Reference to User
  walletId: ObjectId,         // Reference to UserWallet
  name: String,               // Income source name
  description: String,        // Optional description
  amount: Number,             // Income amount (≥ 0)
  isFixedIncome: Boolean,     // true = recurring, false = spontaneous (default: true)
  cycleDate: Number,          // Day of month (1-31) - required if isFixedIncome=true
  cycleType: String,          // 'monthly' | 'quarterly' | 'yearly' - required if isFixedIncome=true
  entryDate: Date,            // Date received - required if isFixedIncome=false
  relaxationDate: Date,       // Next prompt date (for fixed income only)
  isDeleted: Boolean,         // Soft delete flag
  deletedAt: Date,           // Deletion timestamp
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

### Cycle Types

- **monthly**: Income received every month on the same day
- **quarterly**: Income received every 3 months on the same day
- **yearly**: Income received every year on the same day

---

## Usage Examples

### Example 1: Creating Fixed Monthly Salary

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Monthly Salary",
    "description": "Primary job salary",
    "amount": 50000,
    "isFixedIncome": true,
    "cycleDate": 5,
    "cycleType": "monthly"
  }'
```

### Example 2: Creating Spontaneous Freelance Income

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Freelance Project",
    "description": "Website development",
    "amount": 25000,
    "isFixedIncome": false
  }'
```

### Example 3: Creating Yearly Bonus

```bash
curl -X POST http://localhost:5000/api/incomes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Yearly Bonus",
    "description": "Annual performance bonus",
    "amount": 100000,
    "isFixedIncome": true,
    "cycleDate": 31,
    "cycleType": "yearly"
  }'
```

### Example 4: Updating Income Amount

```bash
curl -X PUT http://localhost:5000/api/incomes/64a1b2c3d4e5f6789012346 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 55000
  }'
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

## Best Practices

1. **Income Type Selection**: Use `isFixedIncome=true` for recurring income, `isFixedIncome=false` for one-time income
2. **Wallet Verification**: Always ensure the wallet belongs to the user before creating an income source
3. **Cycle Date**: Use valid day numbers (1-31) for fixed income but consider month-end edge cases
4. **Entry Date**: For spontaneous income, entryDate defaults to current time if not provided
5. **Amount Validation**: Always use positive numbers for income amounts
6. **Soft Delete**: Use soft delete to maintain data integrity and audit trails
7. **Relaxation Date**: The system will automatically calculate the next relaxation date when processing fixed income cycles

---

## Integration Notes

### With Transaction System

Income sources are designed to work with the transaction system:

**Fixed Income:**
- When processed by cron job, it creates a transaction
- Transaction title format: `Added Income for {name} on {formatted_date}`
- The wallet balance is automatically updated when transactions are created

**Spontaneous Income:**
- Transaction is created immediately upon income creation
- Transaction title format: `Income: {name}`
- Wallet balance is updated instantly
- Can be retrieved via `/api/incomes/transactions` endpoint

### With Notification System

Fixed income sources work with cron jobs to send notifications:

- Notifications are sent at 9 AM on the cycle date (fixed income only)
- User is prompted to confirm if they received the income
- Upon confirmation, a transaction is created
- The relaxation date is updated for the next cycle
- Spontaneous income does not trigger automated notifications

---

## Related Documentation

- [Expense API Reference](../expense/EXPENSE_API_REFERENCE.md)
- [Transaction API Reference](../transaction/TRANSACTION_API_REFERENCE.md)
- [Wallet API Reference](../wallet/WALLET_API_REFERENCE.md)
