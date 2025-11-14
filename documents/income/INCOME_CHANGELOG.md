# Income Model Changelog

## Version 2.0.0 - Fixed vs Spontaneous Income Support

### Date: 2024

### Overview
Added support for two types of income: **Fixed Income** (recurring) and **Spontaneous Income** (one-time/random).

---

## Changes

### New Fields

#### 1. `isFixedIncome` (Boolean)
- **Default:** `true`
- **Description:** Determines if the income is recurring (fixed) or one-time (spontaneous)
- **Values:**
  - `true` - Fixed recurring income (e.g., monthly salary)
  - `false` - Spontaneous income (e.g., freelance payment, bonus)

#### 2. `entryDate` (Date)
- **Required:** Only when `isFixedIncome = false`
- **Default:** Current date/time for spontaneous income
- **Description:** The date when spontaneous income was received
- **Use Case:** Track when random income like freelance payments or gifts were received

### Modified Fields

#### `cycleDate` (Number)
- **Required:** Only when `isFixedIncome = true`
- **Previous:** Always required
- **Current:** Conditionally required based on `isFixedIncome`

#### `cycleType` (String)
- **Required:** Only when `isFixedIncome = true`
- **Previous:** Always required
- **Current:** Conditionally required based on `isFixedIncome`

### New Indexes
- `isFixedIncome` - For filtering by income type
- `entryDate` - For querying spontaneous income by date

---

## Use Cases

### Fixed Income (isFixedIncome = true)
- Monthly salary
- Quarterly bonuses
- Yearly dividends
- Rental income
- Pension payments

**Required Fields:**
- `name`, `amount`, `walletId`, `cycleDate`, `cycleType`

**Example:**
```json
{
  "name": "Monthly Salary",
  "amount": 50000,
  "walletId": "wallet123",
  "isFixedIncome": true,
  "cycleDate": 1,
  "cycleType": "monthly"
}
```

### Spontaneous Income (isFixedIncome = false)
- Freelance payments
- Gifts
- Refunds
- One-time bonuses
- Contest winnings

**Required Fields:**
- `name`, `amount`, `walletId`, `entryDate` (auto-set to now)

**Example:**
```json
{
  "name": "Freelance Project Payment",
  "amount": 15000,
  "walletId": "wallet123",
  "isFixedIncome": false,
  "entryDate": "2024-01-15T10:30:00Z"
}
```

---

## API Impact

### Create Income Endpoint
**POST** `/api/incomes`

#### For Fixed Income:
```json
{
  "name": "Monthly Salary",
  "amount": 50000,
  "walletId": "wallet123",
  "isFixedIncome": true,
  "cycleDate": 1,
  "cycleType": "monthly",
  "description": "Regular monthly salary"
}
```
- No immediate transaction created
- Processed by cron job on cycle date

#### For Spontaneous Income:
```json
{
  "name": "Freelance Payment",
  "amount": 15000,
  "walletId": "wallet123",
  "isFixedIncome": false,
  "description": "Website development project"
}
```
- **Transaction created immediately**
- **Wallet balance updated instantly**

### New Endpoint: Get Income Transactions
**GET** `/api/incomes/transactions`

Retrieve all income transactions (both fixed and spontaneous) sorted by transaction date.

### Endpoints Summary
- `POST /api/incomes` - Create income source
- `GET /api/incomes` - Get all income sources
- `GET /api/incomes/transactions` - Get all income transactions (NEW)
- `GET /api/incomes/:id` - Get single income source
- `PUT /api/incomes/:id` - Update income source
- `DELETE /api/incomes/:id` - Delete income source

---

## Cron Job Behavior

### Fixed Income
- Processed by automated cron jobs
- Runs daily at 9:00 AM
- Checks `cycleDate` and `cycleType`
- Creates transactions automatically
- Updates `relaxationDate` for next cycle

### Spontaneous Income
- **NOT processed by cron jobs**
- Manually recorded by users
- **Transaction created immediately upon entry**
- **Wallet balance updated instantly**
- No `relaxationDate` management needed
- Appears in `/api/incomes/transactions` endpoint

---

## Migration Notes

### Existing Data
- All existing income records will have `isFixedIncome = true` by default
- No data migration required
- Existing functionality remains unchanged

### Backward Compatibility
- ✅ Fully backward compatible
- ✅ Existing API calls work without changes
- ✅ Default behavior unchanged (fixed income)

---

## Validation Rules

### Fixed Income (isFixedIncome = true)
- ✅ `cycleDate` is required (1-31)
- ✅ `cycleType` is required (monthly/quarterly/yearly)
- ❌ `entryDate` is optional/ignored

### Spontaneous Income (isFixedIncome = false)
- ❌ `cycleDate` is optional/ignored
- ❌ `cycleType` is optional/ignored
- ✅ `entryDate` is required (auto-set to now if not provided)

---

## Benefits

1. **Clear Differentiation** - Easily distinguish between recurring and one-time income
2. **Better Analytics** - Separate reporting for fixed vs variable income
3. **Accurate Forecasting** - Predict future income based on fixed sources only
4. **Flexible Tracking** - Record spontaneous income without cycle constraints
5. **Improved UX** - Simplified forms based on income type
6. **Instant Recording** - Spontaneous income creates transactions immediately
7. **Unified View** - Single endpoint to view all income transactions

---

## Future Enhancements

- Add income type statistics in dashboard
- Separate views for fixed vs spontaneous income
- Income forecasting based on fixed income sources
- Notifications for spontaneous income entry reminders
