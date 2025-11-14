# Expense Model Changelog

## Version 2.0.0 - Fixed vs Spontaneous Expense Support

### Date: 2024

### Overview
Added support for two types of expenses: **Fixed Expense** (recurring) and **Spontaneous Expense** (one-time/random).

---

## Changes

### New Fields

#### 1. `isFixedExpense` (Boolean)
- **Default:** `true`
- **Description:** Determines if the expense is recurring (fixed) or one-time (spontaneous)
- **Values:**
  - `true` - Fixed recurring expense (e.g., monthly rent)
  - `false` - Spontaneous expense (e.g., medical bill, repair)

#### 2. `entryDate` (Date)
- **Required:** Only when `isFixedExpense = false`
- **Default:** Current date/time for spontaneous expense
- **Description:** The date when spontaneous expense was paid

### Modified Fields

#### `cycleDate` (Number)
- **Required:** Only when `isFixedExpense = true`
- **Previous:** Always required
- **Current:** Conditionally required based on `isFixedExpense`

#### `cycleType` (String)
- **Required:** Only when `isFixedExpense = true`
- **Previous:** Always required
- **Current:** Conditionally required based on `isFixedExpense`

### New Indexes
- `isFixedExpense` - For filtering by expense type
- `entryDate` - For querying spontaneous expense by date

---

## Use Cases

### Fixed Expense (isFixedExpense = true)
- Monthly rent
- Car EMI
- Utility bills
- Insurance premiums
- Subscriptions

### Spontaneous Expense (isFixedExpense = false)
- Medical bills
- Car repairs
- Emergency expenses
- One-time purchases
- Gifts

---

## API Impact

### Create Expense Endpoint
**POST** `/api/expenses`

#### For Fixed Expense:
```json
{
  "name": "Monthly Rent",
  "amount": 25000,
  "walletId": "wallet123",
  "isFixedExpense": true,
  "cycleDate": 1,
  "cycleType": "monthly"
}
```
- No immediate transaction created
- Processed by cron job on cycle date

#### For Spontaneous Expense:
```json
{
  "name": "Car Repair",
  "amount": 5000,
  "walletId": "wallet123",
  "isFixedExpense": false
}
```
- **Transaction created immediately**
- **Wallet balance updated instantly**
- **Balance verification before processing**

### New Endpoint: Get Expense Transactions
**GET** `/api/expenses/transactions`

Retrieve all expense transactions (both fixed and spontaneous) sorted by transaction date.

### Endpoints Summary
- `POST /api/expenses` - Create expense source
- `GET /api/expenses` - Get all expense sources
- `GET /api/expenses/transactions` - Get all expense transactions (NEW)
- `GET /api/expenses/:id` - Get single expense source
- `PUT /api/expenses/:id` - Update expense source
- `DELETE /api/expenses/:id` - Delete expense source

---

## Cron Job Behavior

### Fixed Expense
- Processed by automated cron jobs
- Runs daily at 9:00 AM
- Checks `cycleDate` and `cycleType`
- Creates transactions automatically
- Updates `relaxationDate` for next cycle
- Balance verification before processing

### Spontaneous Expense
- **NOT processed by cron jobs**
- Manually recorded by users
- **Transaction created immediately upon entry**
- **Wallet balance updated instantly**
- **Balance checked before transaction**
- No `relaxationDate` management needed
- Appears in `/api/expenses/transactions` endpoint

---

## Benefits

1. **Clear Differentiation** - Easily distinguish between recurring and one-time expenses
2. **Better Analytics** - Separate reporting for fixed vs variable expenses
3. **Accurate Forecasting** - Predict future expenses based on fixed sources only
4. **Flexible Tracking** - Record spontaneous expenses without cycle constraints
5. **Improved UX** - Simplified forms based on expense type
6. **Instant Recording** - Spontaneous expenses create transactions immediately
7. **Unified View** - Single endpoint to view all expense transactions
8. **Balance Protection** - Insufficient balance check for spontaneous expenses
