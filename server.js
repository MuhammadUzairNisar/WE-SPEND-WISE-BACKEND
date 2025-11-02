require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const compression = require('compression');

// Import configurations
const connectDB = require('./config/database');

// Import middleware
const {
  generalLimiter,
  authLimiter,
  helmetConfig,
  corsConfig,
  sanitizeRequest,
  securityHeaders
} = require('./middleware/security');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const walletRoutes = require('./routes/wallets');

// Import utilities
const { seedDatabase } = require('./utils/seedData');

const app = express();

// Connect to database
connectDB();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Request sanitization
app.use(sanitizeRequest);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/wallets', walletRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'We Spend Wise API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile'
      },
      users: {
        list: 'GET /api/users',
        get: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
        roles: 'PUT /api/users/:id/roles',
        password: 'PUT /api/users/:id/password'
      },
      roles: {
        list: 'GET /api/roles',
        get: 'GET /api/roles/:id',
        create: 'POST /api/roles',
        update: 'PUT /api/roles/:id',
        delete: 'DELETE /api/roles/:id',
        permissions: 'PUT /api/roles/:id/permissions'
      },
      permissions: {
        list: 'GET /api/permissions',
        get: 'GET /api/permissions/:id',
        create: 'POST /api/permissions',
        update: 'PUT /api/permissions/:id',
        delete: 'DELETE /api/permissions/:id',
        byResource: 'GET /api/permissions/resource/:resource',
        byCategory: 'GET /api/permissions/category/:category'
      },
      wallets: {
        list: 'GET /api/wallets',
        get: 'GET /api/wallets/:id',
        create: 'POST /api/wallets',
        update: 'PUT /api/wallets/:id',
        delete: 'DELETE /api/wallets/:id'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Seed database on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  mongoose.connection.once('open', async () => {
    try {
      await seedDatabase();
    } catch (error) {
      console.error('Failed to seed database:', error);
    }
  });
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV} mode
📡 Server listening on port ${PORT}
🌐 API Documentation: http://localhost:${PORT}/api
💚 Health Check: http://localhost:${PORT}/health
📊 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/we-spend-wise'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app;
