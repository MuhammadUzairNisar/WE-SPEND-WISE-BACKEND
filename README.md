# We Spend Wise Backend API

A comprehensive Node.js backend API with authentication, authorization, roles, and permissions system built with Express.js and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with refresh tokens
- 👥 **Role-Based Access Control (RBAC)** - Flexible role and permission system
- 🛡️ **Security** - Rate limiting, CORS, Helmet, input validation, and sanitization
- 📊 **User Management** - Complete CRUD operations for users with role assignment
- 🔑 **Permission System** - Granular permission control for resources and actions
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

## Project Structure

```
├── config/
│   ├── database.js          # MongoDB connection configuration
│   └── jwt.js              # JWT token utilities
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── permissions.js      # Authorization middleware
│   ├── security.js         # Security middleware (rate limiting, CORS, etc.)
│   └── errorHandler.js     # Global error handling
├── models/
│   ├── User.js             # User model with authentication
│   ├── Role.js             # Role model
│   └── Permission.js       # Permission model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management routes
│   ├── roles.js            # Role management routes
│   └── permissions.js      # Permission management routes
├── utils/
│   └── seedData.js         # Database seeding utilities
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── env.example             # Environment variables template
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

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| POST | `/api/auth/logout` | User logout | Private |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/profile` | Update user profile | Private |

### User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Private |
| PUT | `/api/users/:id` | Update user | Private/Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| PUT | `/api/users/:id/roles` | Assign roles to user | Admin |
| PUT | `/api/users/:id/password` | Change user password | Private/Admin |

### Role Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/roles` | Get all roles | Admin |
| GET | `/api/roles/:id` | Get role by ID | Admin |
| POST | `/api/roles` | Create new role | Super Admin |
| PUT | `/api/roles/:id` | Update role | Super Admin |
| DELETE | `/api/roles/:id` | Delete role | Super Admin |
| PUT | `/api/roles/:id/permissions` | Add permission to role | Super Admin |
| DELETE | `/api/roles/:id/permissions/:permissionId` | Remove permission from role | Super Admin |

### Permission Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/permissions` | Get all permissions | Admin |
| GET | `/api/permissions/:id` | Get permission by ID | Admin |
| POST | `/api/permissions` | Create new permission | Super Admin |
| PUT | `/api/permissions/:id` | Update permission | Super Admin |
| DELETE | `/api/permissions/:id` | Delete permission | Super Admin |
| GET | `/api/permissions/resource/:resource` | Get permissions by resource | Admin |
| GET | `/api/permissions/category/:category` | Get permissions by category | Admin |

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