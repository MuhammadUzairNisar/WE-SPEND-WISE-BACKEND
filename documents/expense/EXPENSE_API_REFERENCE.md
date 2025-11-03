# Expense Management API Reference

Complete API documentation for managing expense sources in the We Spend Wise application.

## Overview

Expense sources represent recurring expenses that users have on a regular basis (monthly, quarterly, or yearly). These sources are used to send notifications to users and automatically track their expense transactions.

## Features

- Create, read, update, and delete expense sources
- Associate expense sources with specific wallets
- Set recurring cycles (monthly, quarterly, yearly)
- Automatic relaxation date calculation
- Soft delete functionality

## Base URL

```
http://localhost:5000/api/expenses
```

## Authentication

All endpoints require authentication using a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Expense Source

Create a new expense source for the authenticated user.

**Endpoint:** `POST /api/expenses`

**Request Body:**

```json
{
  "walletId": "64a1b2c3d4e5f6789012345",
  "name": "Car EMI",
  "description": "Monthly car loan payment",
  "amount": 15000,
  "cycleDate": 15,
  "cycleType": "monthly"
}
```

**Field Descriptions:**

- `walletId` (required): MongoDB ObjectId of the wallet to associate with
- `name` (required): Name of the expense source (max 100 characters)
- `description` (optional): Description of the expense source (max 500 characters)
- `amount` (required): Amount of expense (must be positive)
- `cycleDate` (required): Day of the month (1-31)
- `cycleType` (required): One of `monthly`, `quarterly`, or `yearly`

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Expense source created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Car EMI",
    "description": "Monthly car loan payment",
    "amount": 15000,
    "cycleDate": 15,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
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
      "msg": "Expense name is required",
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

### 2. Get All Expense Sources

Retrieve all expense sources for the authenticated user.

**Endpoint:** `GET /api/expenses`

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
      "name": "Car EMI",
      "description": "Monthly car loan payment",
      "amount": 15000,
      "cycleDate": 15,
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
      "name": "Rent",
      "description": "Monthly apartment rent",
      "amount": 25000,
      "cycleDate": 1,
      "cycleType": "monthly",
      "relaxationDate": null,
      "isDeleted": false,
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Single Expense Source

Retrieve a specific expense source by ID.

**Endpoint:** `GET /api/expenses/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the expense source

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Car EMI",
    "description": "Monthly car loan payment",
    "amount": 15000,
    "cycleDate": 15,
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
  "message": "Expense source not found"
}
```

---

### 4. Update Expense Source

Update an existing expense source.

**Endpoint:** `PUT /api/expenses/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the expense source

**Request Body:**

```json
{
  "name": "Updated Car EMI",
  "amount": 18000,
  "cycleDate": 20
}
```

All fields are optional. Only include the fields you want to update.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Expense source updated successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012345",
    "walletId": "64a1b2c3d4e5f6789012345",
    "name": "Updated Car EMI",
    "description": "Monthly car loan payment",
    "amount": 18000,
    "cycleDate": 20,
    "cycleType": "monthly",
    "relaxationDate": null,
    "isDeleted": false,
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. Delete Expense Source

Soft delete an expense source (marks as deleted but doesn't remove from database).

**Endpoint:** `DELETE /api/expenses/:id`

**URL Parameters:**

- `id` (required): MongoDB ObjectId of the expense source

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Expense source deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Expense source not found"
}
```

---

## Data Model

### Expense Schema

```javascript
{
  _id: ObjectId,              // Auto-generated
  userId: ObjectId,           // Reference to User
  walletId: ObjectId,         // Reference to UserWallet
  name: String,               // Expense source name
  description: String,        // Optional description
  amount: Number,             // Expense amount (≥ 0)
  cycleDate: Number,          // Day of month (1-31)
  cycleType: String,          // 'monthly' | 'quarterly' | 'yearly'
  relaxationDate: Date,       // Next prompt date
  isDeleted: Boolean,         // Soft delete flag
  deletedAt: Date,           // Deletion timestamp
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

### Cycle Types

- **monthly**: Expense occurs every month on the same day
- **quarterly**: Expense occurs every 3 months on the same day
- **yearly**: Expense occurs every year on the same day

---

## Usage Examples

### Example 1: Creating Monthly Rent

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

### Example 2: Creating Yearly Insurance

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

### Example 3: Updating Expense Amount

```bash
curl -X PUT http://localhost:5000/api/expenses/64a1b2c3d4e5f6789012346 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000
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

1. **Wallet Verification**: Always ensure the wallet belongs to the user before creating an expense source
2. **Cycle Date**: Use valid day numbers (1-31) but consider month-end edge cases
3. **Amount Validation**: Always use positive numbers for expense amounts
4. **Soft Delete**: Use soft delete to maintain data integrity and audit trails
5. **Relaxation Date**: The system will automatically calculate the next relaxation date when processing cycles

---

## Integration Notes

### With Transaction System

Expense sources are designed to work with the transaction system:

- When an expense source is processed, it creates a transaction
- Transaction title format: `Added Expense for {name} on {formatted_date}`
- The wallet balance is automatically deducted when transactions are created

### With Notification System

Expense sources work with cron jobs to send notifications:

- Notifications are sent at 9 AM on the cycle date
- User is prompted to confirm if they made the expense
- Upon confirmation, a transaction is created and balance is deducted
- The relaxation date is updated for the next cycle

---

## Common Use Cases

### Monthly Expenses

- Rent payment
- Utility bills
- Loan EMIs
- Subscriptions

### Quarterly Expenses

- Professional fees
- Quarterly insurance payments
- Maintenance charges

### Yearly Expenses

- Insurance premiums
- Annual subscriptions
- Tax payments
- License renewals

---

## Related Documentation

- [Income API Reference](../income/INCOME_API_REFERENCE.md)
- [Transaction API Reference](../transaction/TRANSACTION_API_REFERENCE.md)
- [Wallet API Reference](../wallet/WALLET_API_REFERENCE.md)
