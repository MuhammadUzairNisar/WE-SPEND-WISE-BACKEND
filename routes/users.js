const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission, hasAnyPermission } = require('../middleware/permissions');
const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('users', 'read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
    query('role').optional().trim().isLength({ max: 50 }).withMessage('Role name too long'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      
      if (req.query.search) {
        filter.$or = [
          { firstName: { $regex: req.query.search, $options: 'i' } },
          { lastName: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      if (req.query.role) {
        const role = await Role.findOne({ name: req.query.role });
        if (role) {
          filter.roles = role._id;
        }
      }

      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }

      // Get users with pagination
      const users = await User.find(filter)
        .populate('roles')
        .select('-password -refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            limit
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting users'
      });
    }
  }
);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', 
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .populate('roles')
        .select('-password -refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user can view this profile
      const userRoles = req.user.roles.map(role => role.name);
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super-admin');
      const isOwnProfile = req.user._id.toString() === req.params.id;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user profile'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting user'
      });
    }
  }
);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', 
  protect,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permissions
      const userRoles = req.user.roles.map(role => role.name);
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super-admin');
      const isOwnProfile = req.user._id.toString() === req.params.id;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this user'
        });
      }

      // Non-admin users can't update certain fields
      const updateData = {};
      if (req.body.firstName) updateData.firstName = req.body.firstName;
      if (req.body.lastName) updateData.lastName = req.body.lastName;
      if (req.body.phone) updateData.phone = req.body.phone;
      
      // Only admins can update isActive
      if (isAdmin && req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('roles');

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user'
      });
    }
  }
);

// @desc    Assign roles to user
// @route   PUT /api/users/:id/roles
// @access  Private (Admin only)
router.put('/:id/roles', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('users', 'update'),
  [
    body('roles')
      .isArray({ min: 1 })
      .withMessage('Roles must be an array with at least one role'),
    body('roles.*')
      .isMongoId()
      .withMessage('Each role must be a valid MongoDB ObjectId')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify all roles exist and are active
      const roles = await Role.find({
        _id: { $in: req.body.roles },
        isActive: true
      });

      if (roles.length !== req.body.roles.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more roles are invalid or inactive'
        });
      }

      // Update user roles
      user.roles = req.body.roles;
      await user.save();

      await user.populate('roles');

      res.json({
        success: true,
        message: 'User roles updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update user roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating user roles'
      });
    }
  }
);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('users', 'delete'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent deleting super-admin users
      const userRoles = user.roles.map(role => role.name);
      if (userRoles.includes('super-admin')) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete super-admin users'
        });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting user'
      });
    }
  }
);

// @desc    Change user password
// @route   PUT /api/users/:id/password
// @access  Private
router.put('/:id/password', 
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check permissions
      const userRoles = req.user.roles.map(role => role.name);
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super-admin');
      const isOwnProfile = req.user._id.toString() === req.params.id;

      if (!isAdmin && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to change this user password'
        });
      }

      // Verify current password (only for own profile)
      if (isOwnProfile) {
        const isCurrentPasswordValid = await user.comparePassword(req.body.currentPassword);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }
      }

      // Update password
      user.password = req.body.newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error changing password'
      });
    }
  }
);

module.exports = router;
