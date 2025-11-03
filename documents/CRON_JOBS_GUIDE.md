# Cron Jobs Implementation Guide

Complete guide for the automated income and expense processing system using cron jobs.

## Overview

The We Spend Wise backend uses automated cron jobs to process recurring income and expense sources on their scheduled cycle dates. This eliminates manual entry and ensures users never miss tracking their regular transactions.

## How It Works

### Daily Execution

Both income and expense cron jobs run **every day at 9:00 AM** server time.

### Processing Flow

```
1. Cron job triggers at 9:00 AM
   ↓
2. Query database for all active sources (not deleted)
   ↓
3. Check if today matches the cycle date
   ↓
4. Verify cycle type rules (monthly/quarterly/yearly)
   ↓
5. Create transaction automatically
   ↓
6. Update wallet balance
   ↓
7. Set relaxation date for next cycle
   ↓
8. Log results
```

### Income Processing

When processing income sources:

1. ✅ **Create Transaction** - Automatic transaction with formatted title
2. ✅ **Increase Wallet Balance** - Add income amount to wallet
3. ✅ **Update Relaxation Date** - Schedule next processing date
4. ✅ **Log Success** - Detailed console logging

### Expense Processing

When processing expense sources:

1. ✅ **Check Balance** - Verify wallet has sufficient funds
2. ✅ **Create Transaction** - Automatic transaction with formatted title
3. ✅ **Decrease Wallet Balance** - Deduct expense amount from wallet
4. ✅ **Update Relaxation Date** - Schedule next processing date
5. ✅ **Log Results** - Detailed console logging

⚠️ **Note:** If wallet has insufficient balance for an expense, the transaction is **NOT** created and a warning is logged.

## Installation

### 1. Install node-cron

```bash
npm install node-cron
```

### 2. Cron Jobs File

The cron jobs are automatically loaded from `utils/cronJobs.js`.

### 3. Server Integration

The cron jobs are automatically started when the server starts (except in test environment):

```javascript
// In server.js
if (process.env.NODE_ENV !== "test") {
  require("./utils/cronJobs");
}
```

## File Structure

```
utils/
└── cronJobs.js          # Main cron jobs implementation
```

## Cycle Type Logic

### Monthly

**Processing:** Every month on the same day

**Example:**
- Cycle Date: 5
- Processes: 5th of every month

### Quarterly

**Processing:** Every 3 months on specific months

**Months:** January (0), April (3), July (6), October (9)

**Example:**
- Cycle Date: 1
- Processes: Jan 1, Apr 1, Jul 1, Oct 1

### Yearly

**Processing:** Once per year on the same day

**Example:**
- Cycle Date: 31
- Processes: December 31st each year

**Note:** Yearly processing also checks if `relaxationDate` has passed to prevent duplicate processing within the same year.

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

## Console Logging

### Startup Messages

```
✅ Income cron job started (runs daily at 9:00 AM)
✅ Expense cron job started (runs daily at 9:00 AM)
```

### Daily Execution Logs

#### Income Cron

```
📊 [Income Cron] Checking income sources...
✅ Processed income: Monthly Salary - Amount: 50000 - Transaction: 64a1b2c3d4e5f6789012348
📊 [Income Cron] Completed. Processed: 1, Skipped: 5, Total: 6
```

#### Expense Cron

```
💰 [Expense Cron] Checking expense sources...
✅ Processed expense: Monthly Rent - Amount: 20000 - Transaction: 64a1b2c3d4e5f6789012349
💰 [Expense Cron] Completed. Processed: 1, Insufficient Funds: 0, Skipped: 3, Total: 4
```

### Error Logs

```
❌ [Income Cron] Error checking income sources: Error message here
❌ Error processing income 64a1b2c3d4e5f6789012345 (Monthly Salary): Error details
```

### Insufficient Balance Warning

```
⚠️  Insufficient balance in wallet for expense: Car EMI. Current: 5000, Required: 15000
```

## Testing Cron Jobs

### Manual Testing

You can manually test cron jobs by requiring the file:

```javascript
const { processIncomeSource, processExpenseSource } = require('./utils/cronJobs');

// Test with a specific income source
const income = await Income.findOne({ _id: 'income_id' });
await processIncomeSource(income);

// Test with a specific expense source
const expense = await Expense.findOne({ _id: 'expense_id' });
await processExpenseSource(expense);
```

### Changing Cron Schedule

To change when cron jobs run, edit the schedule in `utils/cronJobs.js`:

```javascript
// Current: Every day at 9:00 AM
const checkIncomeSources = cron.schedule("0 9 * * *", async () => {

// Examples:
// Every hour: "0 * * * *"
// Every 30 minutes: "*/30 * * * *"
// Every day at midnight: "0 0 * * *"
// Every day at noon: "0 12 * * *"
```

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌─────────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌─────── month (1 - 12)
│ │ │ │ ┌───── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

## Common Scenarios

### Scenario 1: Monthly Salary

**Setup:**
```json
{
  "name": "Monthly Salary",
  "amount": 50000,
  "cycleDate": 5,
  "cycleType": "monthly"
}
```

**Result:**
- Processes on 5th of every month at 9:00 AM
- Creates income transaction
- Adds 50,000 to wallet balance
- Sets next relaxation date to 5th of next month

### Scenario 2: Car EMI

**Setup:**
```json
{
  "name": "Car EMI",
  "amount": 15000,
  "cycleDate": 15,
  "cycleType": "monthly"
}
```

**Result:**
- Processes on 15th of every month at 9:00 AM
- Checks wallet balance first
- Creates expense transaction (if balance sufficient)
- Deducts 15,000 from wallet balance
- Sets next relaxation date to 15th of next month

### Scenario 3: Quarterly Insurance

**Setup:**
```json
{
  "name": "Car Insurance",
  "amount": 35000,
  "cycleDate": 15,
  "cycleType": "quarterly"
}
```

**Result:**
- Processes on Jan 15, Apr 15, Jul 15, Oct 15 at 9:00 AM
- Creates expense transaction
- Deducts 35,000 from wallet balance
- Sets next relaxation date to 3 months later

### Scenario 4: Insufficient Balance

**Setup:**
```json
{
  "name": "Monthly Rent",
  "amount": 20000,
  "cycleDate": 1,
  "cycleType": "monthly"
}
```

**Wallet State:** Current balance = 10,000

**Result:**
- Processes on 1st of month at 9:00 AM
- Checks wallet balance
- Balance insufficient (needs 20,000, has 10,000)
- Transaction NOT created
- Warning logged
- Relaxation date NOT updated
- Will retry on next cycle

## Best Practices

### 1. Cycle Date Selection

- ✅ Use days 1-28 for monthly cycles
- ✅ Use specific months for quarterly cycles
- ✅ Use memorable dates for yearly cycles
- ❌ Avoid day 31 for monthly cycles (not all months have 31 days)

### 2. Testing

- Test cron jobs with sample data
- Verify transaction creation
- Check wallet balance updates
- Confirm relaxation dates

### 3. Monitoring

- Check console logs regularly
- Monitor for errors
- Track insufficient balance warnings
- Verify transaction history

### 4. Error Handling

- Cron jobs handle errors gracefully
- Failed processing doesn't stop other sources
- Errors are logged for debugging
- Transactions are atomic (all-or-nothing)

## Troubleshooting

### Issue: Transactions Not Created

**Possible Causes:**
1. Wrong cycle date
2. Wrong cycle type
3. Relaxation date not set
4. Sources soft-deleted

**Solutions:**
1. Verify cycle date matches current date
2. Check cycle type is correct
3. Ensure sources are not deleted
4. Check console logs for errors

### Issue: Wallet Balance Not Updating

**Possible Causes:**
1. Transaction creation failed
2. Database update error
3. Insufficient balance (for expenses)

**Solutions:**
1. Check console logs
2. Verify database connection
3. Check wallet balance before processing
4. Review transaction records

### Issue: Duplicate Transactions

**Possible Causes:**
1. Cron job running multiple times
2. Relaxation date not updating

**Solutions:**
1. Verify only one cron job instance
2. Check relaxation date calculation
3. Review previous transaction dates
4. Implement idempotency checks

## Configuration

### Environment Variables

The cron jobs automatically skip in test environment:

```javascript
if (process.env.NODE_ENV !== "test") {
  require("./utils/cronJobs");
}
```

### Custom Schedule

To change the schedule, edit the cron expression:

```javascript
// utils/cronJobs.js
const checkIncomeSources = cron.schedule("0 9 * * *", async () => {
  // Your custom time here
});
```

## Summary Statistics

### Daily Processing Metrics

The cron jobs log the following statistics:

**Income Cron:**
- Total income sources checked
- Number processed
- Number skipped
- Any errors

**Expense Cron:**
- Total expense sources checked
- Number processed
- Number skipped
- Insufficient funds count
- Any errors

## Related Documentation

- [Income API Reference](./income/INCOME_API_REFERENCE.md)
- [Income Complete Guide](./income/INCOME_COMPLETE_GUIDE.md)
- [Expense API Reference](./expense/EXPENSE_API_REFERENCE.md)
- [Expense Complete Guide](./expense/EXPENSE_COMPLETE_GUIDE.md)
- [Transaction API Reference](./transaction/TRANSACTION_API_REFERENCE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

