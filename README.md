# We Spend Wise Backend API

A comprehensive Node.js backend API with authentication, authorization, roles, and permissions system built with Express.js and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with refresh tokens
- 👥 **Role-Based Access Control (RBAC)** - Flexible role and permission system
- 🛡️ **Security** - Rate limiting, CORS, Helmet, input validation, and sanitization
- 📊 **User Management** - Complete CRUD operations for users with role assignment
- 🔑 **Permission System** - Granular permission control for resources and actions
- 💰 **Wallet Management** - Multiple wallet support with balance tracking
- 💵 **Income & Expense Tracking** - Recurring income/expense sources with automated transactions
- 📈 **Transaction History** - Complete transaction records with filtering and analytics
- 🔄 **Automated Processing** - Daily cron jobs for automatic transaction creation
- 📎 **File Attachments** - Support for PDF, JPG, PNG file uploads
- 🗄️ **MongoDB Integration** - Robust database connection with Mongoose ODM
- 📝 **Input Validation** - Express-validator for request validation
- 🚀 **Production Ready** - Error handling, logging, and graceful shutdown

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, bcryptjs
- **Validation**: Express-validator
- **Logging**: Morgan
- **Automation**: node-cron
- **File Upload**: Multer

## Project Structure

```
├── config/
│   ├── database.js          # MongoDB connection configuration
│   └── jwt.js              # JWT token utilities
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── permissions.js      # Authorization middleware
│   ├── security.js         # Security middleware (rate limiting, CORS, etc.)
│   ├── errorHandler.js     # Global error handling
│   ├── upload.js           # Wallet file upload middleware
│   └── uploadTransaction.js # Transaction file upload middleware
├── models/
│   ├── User.js             # User model with authentication
│   ├── Role.js             # Role model
│   ├── Permission.js       # Permission model
│   ├── UserWallet.js       # User wallet model
│   ├── Income.js           # Income source model
│   ├── Expense.js          # Expense source model
│   └── Transaction.js      # Transaction model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management routes
│   ├── roles.js            # Role management routes
│   ├── permissions.js      # Permission management routes
│   ├── wallets.js          # Wallet management routes
│   ├── incomes.js          # Income management routes
│   ├── expenses.js         # Expense management routes
│   └── transactions.js     # Transaction management routes
├── utils/
│   ├── seedData.js         # Database seeding utilities
│   └── cronJobs.js         # Automated cron jobs for income/expense
├── documents/
│   ├── income/             # Income documentation
│   ├── expense/            # Expense documentation
│   ├── transaction/        # Transaction documentation
│   └── CRON_JOBS_GUIDE.md  # Cron jobs implementation guide
├── uploads/
│   ├── wallets/            # Wallet uploaded images
│   └── transactions/       # Transaction uploaded files
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd we-spend-wise-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/we-spend-wise

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
   JWT_REFRESH_EXPIRE=30d

   # Security Configuration
   BCRYPT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Postman Collection

A complete Postman collection is available for testing the API:

📁 **Location:** `postman/` folder

### Import into Postman:

1. Open Postman
2. Click **Import**
3. Import both files:
   - `We_Spend_Wise_API.postman_collection.json`
   - `We_Spend_Wise_Environment.postman_environment.json`
4. Select the **"We Spend Wise - Development"** environment
5. Start testing!

### Features:

- ✅ All API endpoints pre-configured
- ✅ Automatic token management
- ✅ Default test credentials included
- ✅ Environment variables setup
- ✅ Example requests and responses

📖 See `postman/README.md` for detailed usage instructions.

## API Endpoints

### Authentication

| Method | Endpoint             | Description          | Access  |
| ------ | -------------------- | -------------------- | ------- |
| POST   | `/api/auth/register` | Register new user    | Public  |
| POST   | `/api/auth/login`    | User login           | Public  |
| POST   | `/api/auth/refresh`  | Refresh access token | Public  |
| POST   | `/api/auth/logout`   | User logout          | Private |
| GET    | `/api/auth/me`       | Get current user     | Private |
| PUT    | `/api/auth/profile`  | Update user profile  | Private |

### User Management

| Method | Endpoint                  | Description          | Access        |
| ------ | ------------------------- | -------------------- | ------------- |
| GET    | `/api/users`              | Get all users        | Admin         |
| GET    | `/api/users/:id`          | Get user by ID       | Private       |
| PUT    | `/api/users/:id`          | Update user          | Private/Admin |
| DELETE | `/api/users/:id`          | Delete user          | Admin         |
| PUT    | `/api/users/:id/roles`    | Assign roles to user | Admin         |
| PUT    | `/api/users/:id/password` | Change user password | Private/Admin |

### Role Management

| Method | Endpoint                                   | Description                 | Access      |
| ------ | ------------------------------------------ | --------------------------- | ----------- |
| GET    | `/api/roles`                               | Get all roles               | Admin       |
| GET    | `/api/roles/:id`                           | Get role by ID              | Admin       |
| POST   | `/api/roles`                               | Create new role             | Super Admin |
| PUT    | `/api/roles/:id`                           | Update role                 | Super Admin |
| DELETE | `/api/roles/:id`                           | Delete role                 | Super Admin |
| PUT    | `/api/roles/:id/permissions`               | Add permission to role      | Super Admin |
| DELETE | `/api/roles/:id/permissions/:permissionId` | Remove permission from role | Super Admin |

### Wallet Management

| Method | Endpoint           | Description             | Access  |
| ------ | ------------------ | ----------------------- | ------- |
| POST   | `/api/wallets`     | Create multiple wallets | Private |
| GET    | `/api/wallets`     | Get all user wallets    | Private |
| GET    | `/api/wallets/:id` | Get wallet by ID        | Private |
| PUT    | `/api/wallets/:id` | Update wallet           | Private |
| DELETE | `/api/wallets/:id` | Soft delete wallet      | Private |

### Income Management

| Method | Endpoint           | Description               | Access  |
| ------ | ------------------ | ------------------------- | ------- |
| POST   | `/api/incomes`     | Create income source      | Private |
| GET    | `/api/incomes`     | Get all income sources    | Private |
| GET    | `/api/incomes/:id` | Get income source by ID   | Private |
| PUT    | `/api/incomes/:id` | Update income source      | Private |
| DELETE | `/api/incomes/:id` | Soft delete income source | Private |

### Expense Management

| Method | Endpoint            | Description                | Access  |
| ------ | ------------------- | -------------------------- | ------- |
| POST   | `/api/expenses`     | Create expense source      | Private |
| GET    | `/api/expenses`     | Get all expense sources    | Private |
| GET    | `/api/expenses/:id` | Get expense source by ID   | Private |
| PUT    | `/api/expenses/:id` | Update expense source      | Private |
| DELETE | `/api/expenses/:id` | Soft delete expense source | Private |

### Transaction Management

| Method | Endpoint                | Description                       | Access  |
| ------ | ----------------------- | --------------------------------- | ------- |
| POST   | `/api/transactions`     | Create transaction with file      | Private |
| GET    | `/api/transactions`     | Get all transactions with filters | Private |
| GET    | `/api/transactions/:id` | Get transaction by ID             | Private |
| DELETE | `/api/transactions/:id` | Soft delete transaction           | Private |

### Permission Management

| Method | Endpoint                              | Description                 | Access      |
| ------ | ------------------------------------- | --------------------------- | ----------- |
| GET    | `/api/permissions`                    | Get all permissions         | Admin       |
| GET    | `/api/permissions/:id`                | Get permission by ID        | Admin       |
| POST   | `/api/permissions`                    | Create new permission       | Super Admin |
| PUT    | `/api/permissions/:id`                | Update permission           | Super Admin |
| DELETE | `/api/permissions/:id`                | Delete permission           | Super Admin |
| GET    | `/api/permissions/resource/:resource` | Get permissions by resource | Admin       |
| GET    | `/api/permissions/category/:category` | Get permissions by category | Admin       |

## Default Roles and Permissions

The system comes with pre-configured roles and permissions:

### Roles

- **Super Admin** (Level 10) - Full system access
- **Admin** (Level 8) - Administrative access
- **Moderator** (Level 6) - Limited administrative access
- **User** (Level 1) - Basic user access

### Permission Categories

- **User Management** - Create, read, update, delete users
- **Role Management** - Manage roles and role assignments
- **Permission Management** - Manage permissions
- **Profile** - User profile management
- **Dashboard** - Dashboard access
- **Settings** - System settings

## Default Users

The system automatically creates two default users on startup (in development mode):

### Regular User

- **Email:** `user@example.com`
- **Password:** `User@123456`
- **Role:** User
- **Access:** Basic user permissions

### Admin User

- **Email:** `admin@example.com`
- **Password:** `Admin@123456`
- **Role:** Admin
- **Access:** Administrative permissions

⚠️ **Important:** Change these passwords immediately after first login in production!

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Types

- **Access Token** - Short-lived token for API access (default: 7 days)
- **Refresh Token** - Long-lived token for refreshing access tokens (default: 30 days)

## Security Features

- **Rate Limiting** - Prevents abuse with configurable limits
- **CORS Protection** - Configurable cross-origin resource sharing
- **Helmet** - Security headers for protection against common vulnerabilities
- **Input Validation** - Comprehensive request validation using express-validator
- **Password Hashing** - bcryptjs for secure password storage
- **Account Lockout** - Automatic account lockout after failed login attempts
- **Request Sanitization** - XSS protection through input sanitization

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors (if any)
}
```

## Flutter Integration

Complete Flutter integration guide is available for registering and logging in users.

📁 **Location:** `flutter-integration/` folder

### Files:

- **`FLUTTER_INTEGRATION_GUIDE.md`** - Complete step-by-step guide with full code examples
- **`QUICK_START_PROMPT.md`** - Quick reference prompt with API details and code snippets

### Includes:

- ✅ Dio HTTP client setup with automatic token injection
- ✅ Complete AuthService implementation
- ✅ User and AuthResponse models
- ✅ Register page with form validation
- ✅ Login page with form validation
- ✅ Token storage using SharedPreferences
- ✅ Error handling and user feedback
- ✅ Loading states and UI indicators

📖 See `flutter-integration/FLUTTER_INTEGRATION_GUIDE.md` for complete implementation.

## Wallet Management

Complete wallet setup integration guide for Flutter is available.

📁 **Location:** `flutter-integration/` folder

### Files:

- **`WALLET_SETUP_GUIDE.md`** - Complete wallet setup flow with modern UI/UX

### Features:

- ✅ Multi-wallet creation API
- ✅ Default Cash wallet for physical money
- ✅ Payment wallet setup (JazzCash, Easypaisa, etc.)
- ✅ SMS and App notification configuration
- ✅ Beautiful welcome screen with animations
- ✅ Step-by-step wallet setup wizard
- ✅ Soft delete functionality
- ✅ Modern and appealing UI design

📖 See `flutter-integration/WALLET_SETUP_GUIDE.md` for complete implementation.

## Income & Expense Management

Complete documentation for managing income and expense sources is available.

📁 **Location:** `documents/` folder

### Income Management

**Location:** `documents/income/`

#### Files:

- **`INCOME_API_REFERENCE.md`** - Complete API reference with all endpoints
- **`INCOME_COMPLETE_GUIDE.md`** - Comprehensive implementation guide

#### Features:

- ✅ Create, read, update, and delete income sources
- ✅ Associate income sources with specific wallets
- ✅ Set recurring cycles (monthly, quarterly, yearly)
- ✅ Automatic relaxation date calculation
- ✅ Soft delete functionality
- ✅ Cron job integration for automatic processing

#### Common Use Cases:

- Monthly salary
- Quarterly bonuses
- Yearly dividends
- Freelance payments

📖 See `documents/income/INCOME_COMPLETE_GUIDE.md` for complete implementation.

### Expense Management

**Location:** `documents/expense/`

#### Files:

- **`EXPENSE_API_REFERENCE.md`** - Complete API reference with all endpoints
- **`EXPENSE_COMPLETE_GUIDE.md`** - Comprehensive implementation guide

#### Features:

- ✅ Create, read, update, and delete expense sources
- ✅ Associate expense sources with specific wallets
- ✅ Set recurring cycles (monthly, quarterly, yearly)
- ✅ Automatic relaxation date calculation
- ✅ Soft delete functionality
- ✅ Cron job integration for automatic processing
- ✅ Balance verification before processing

#### Common Use Cases:

- Monthly rent
- Car EMI
- Utility bills
- Insurance premiums
- Subscriptions

📖 See `documents/expense/EXPENSE_COMPLETE_GUIDE.md` for complete implementation.

### Transaction Management

**Location:** `documents/transaction/`

#### Files:

- **`TRANSACTION_API_REFERENCE.md`** - Complete API reference with all endpoints

#### Features:

- ✅ Create transactions with optional file attachments (PDF, JPG, PNG)
- ✅ View all transactions with filtering
- ✅ Filter by wallet, type, and date range
- ✅ Get summary statistics (total income, total expense, net amount)
- ✅ View detailed transaction information
- ✅ Automatic wallet balance updates
- ✅ Soft delete functionality

#### Workflow:

1. Income/Expense sources are created by users
2. Cron job checks for sources on their cycle dates
3. Notifications are sent to users at 9:00 AM
4. Users confirm receipt/payment
5. Transactions are automatically created
6. Wallet balances are updated accordingly

📖 See `documents/transaction/TRANSACTION_API_REFERENCE.md` for complete API documentation.

### Automated Cron Jobs

**Location:** `documents/CRON_JOBS_GUIDE.md`

#### Features:
- ✅ Daily automated processing at 9:00 AM
- ✅ Separate cron jobs for income and expense sources
- ✅ Automatic transaction creation
- ✅ Automatic wallet balance updates
- ✅ Balance verification and rollback
- ✅ Relaxation date management
- ✅ Detailed logging and error handling

#### How It Works:
1. Cron job triggers daily at 9:00 AM
2. Finds all active income/expense sources
3. Checks if today matches cycle date
4. Creates transactions automatically
5. Updates wallet balances
6. Sets next relaxation date

📖 See `documents/CRON_JOBS_GUIDE.md` for complete implementation details.

📖 See `documents/COMPLETE_SYSTEM_OVERVIEW.md` for complete system architecture and overview.

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (when implemented)

### Environment Variables

See `env.example` for all available environment variables.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique JWT secrets
3. Configure proper CORS origins
4. Set up MongoDB with authentication
5. Use a reverse proxy (nginx) for SSL termination
6. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
