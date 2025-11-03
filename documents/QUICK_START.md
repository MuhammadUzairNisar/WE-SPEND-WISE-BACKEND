# Quick Start Guide

Get up and running with the Income, Expense, and Transaction system in minutes.

## 🚀 Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
# Already configured in .env or env.example
# Key variables:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/we-spend-wise
JWT_SECRET=your-secret-key
```

### 3. Start MongoDB

```bash
# On macOS
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### 4. Run Server

```bash
npm run dev
```

You should see:
```
✅ Income cron job started (runs daily at 9:00 AM)
✅ Expense cron job started (runs daily at 9:00 AM)
🚀 Server running in development mode
```

## 📝 First API Call

### 1. Register a User

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### 2. Login

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Save the `token` from the response.

### 3. Create a Wallet

```bash
POST http://localhost:5000/api/wallets
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "wallets": [{
    "name": "Cash Wallet",
    "initialAmount": 50000,
    "isDefault": true
  }]
}
```

Save the `_id` of the created wallet.

### 4. Create Income Source

```bash
POST http://localhost:5000/api/incomes
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "walletId": "YOUR_WALLET_ID",
  "name": "Monthly Salary",
  "description": "Primary job salary",
  "amount": 50000,
  "cycleDate": 5,
  "cycleType": "monthly"
}
```

### 5. Create Expense Source

```bash
POST http://localhost:5000/api/expenses
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "walletId": "YOUR_WALLET_ID",
  "name": "Monthly Rent",
  "description": "Apartment rent",
  "amount": 20000,
  "cycleDate": 1,
  "cycleType": "monthly"
}
```

## 🤖 Automated Processing

The cron jobs will automatically:

1. Run **every day at 9:00 AM**
2. Check all active income/expense sources
3. Process matching cycle dates
4. Create transactions
5. Update wallet balances
6. Log results

### Manual Processing (For Testing)

You can manually trigger processing by calling the exported functions:

```javascript
// In Node.js console or test file
const { processIncomeSource, processExpenseSource } = require('./utils/cronJobs');

// Get a source and process it
const Income = require('./models/Income');
const income = await Income.findOne({ name: 'Monthly Salary' });
await processIncomeSource(income);
```

## 📊 View Your Data

### Get All Income Sources

```bash
GET http://localhost:5000/api/incomes
Authorization: Bearer YOUR_TOKEN
```

### Get All Expense Sources

```bash
GET http://localhost:5000/api/expenses
Authorization: Bearer YOUR_TOKEN
```

### Get All Transactions

```bash
GET http://localhost:5000/api/transactions
Authorization: Bearer YOUR_TOKEN
```

Response includes summary statistics:
```json
{
  "success": true,
  "count": 10,
  "summary": {
    "totalIncome": 150000,
    "totalExpense": 75000,
    "netAmount": 75000
  },
  "data": [...]
}
```

## 🔄 Complete Workflow Example

```bash
# 1. Register & Login
# 2. Create wallet with balance 50,000

# 3. Create income: Salary 30,000 on 5th monthly
# 4. Create expense: Rent 20,000 on 1st monthly

# 5. On 1st of month @ 9 AM:
#    - Expense cron creates transaction
#    - Wallet balance: 50,000 - 20,000 = 30,000

# 6. On 5th of month @ 9 AM:
#    - Income cron creates transaction
#    - Wallet balance: 30,000 + 30,000 = 60,000

# 7. View all transactions
GET /api/transactions
# Shows 2 transactions with summary
```

## 📖 Documentation

Quick references:
- [Income API](./income/INCOME_API_REFERENCE.md)
- [Expense API](./expense/EXPENSE_API_REFERENCE.md)
- [Transaction API](./transaction/TRANSACTION_API_REFERENCE.md)
- [Cron Jobs](./CRON_JOBS_GUIDE.md)
- [Complete Overview](./COMPLETE_SYSTEM_OVERVIEW.md)

## 🎯 Next Steps

1. Create your income sources
2. Create your expense sources
3. Monitor transaction history
4. Check console logs for cron job activity
5. Set up notifications (optional)

## 💡 Tips

- Use **cycleDate 1-28** for monthly cycles
- Create a **default wallet** first
- Monitor **wallet balances** regularly
- Check **console logs** for cron job activity
- Use **file uploads** for important receipts

Happy tracking! 💰📊

