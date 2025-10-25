const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission, hasAnyPermission } = require('../middleware/permissions');
const router = express.Router();

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Admin only)
router.get('/', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('roles', 'read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }

      // Get roles with pagination
      const roles = await Role.find(filter)
        .populate('permissions')
        .sort({ level: 1, name: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Role.countDocuments(filter);

      res.json({
        success: true,
        data: {
          roles,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            limit
          }
        }
      });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting roles'
      });
    }
  }
);

// @desc    Get role by ID
// @route   GET /api/roles/:id
// @access  Private (Admin only)
router.get('/:id', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('roles', 'read'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id).populate('permissions');

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.json({
        success: true,
        data: { role }
      });
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting role'
      });
    }
  }
);

// @desc    Create new role
// @route   POST /api/roles
// @access  Private (Super Admin only)
router.post('/', 
  protect, 
  authorize('super-admin'),
  hasPermission('roles', 'create'),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Role name can only contain lowercase letters, numbers, and hyphens'),
    body('displayName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*')
      .isMongoId()
      .withMessage('Each permission must be a valid MongoDB ObjectId'),
    body('level')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Level must be between 1 and 10')
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

      const { name, displayName, description, permissions = [], level = 1 } = req.body;

      // Check if role already exists
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }

      // Verify permissions exist and are active
      if (permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
          isActive: true
        });

        if (validPermissions.length !== permissions.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more permissions are invalid or inactive'
          });
        }
      }

      // Create role
      const role = await Role.create({
        name,
        displayName,
        description,
        permissions,
        level
      });

      await role.populate('permissions');

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { role }
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating role'
      });
    }
  }
);

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (Super Admin only)
router.put('/:id', 
  protect, 
  authorize('super-admin'),
  hasPermission('roles', 'update'),
  [
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be between 2 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*')
      .isMongoId()
      .withMessage('Each permission must be a valid MongoDB ObjectId'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('level')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Level must be between 1 and 10')
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

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modifying system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        });
      }

      const updateData = {};
      if (req.body.displayName) updateData.displayName = req.body.displayName;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.level !== undefined) updateData.level = req.body.level;

      // Handle permissions update
      if (req.body.permissions !== undefined) {
        // Verify permissions exist and are active
        if (req.body.permissions.length > 0) {
          const validPermissions = await Permission.find({
            _id: { $in: req.body.permissions },
            isActive: true
          });

          if (validPermissions.length !== req.body.permissions.length) {
            return res.status(400).json({
              success: false,
              message: 'One or more permissions are invalid or inactive'
            });
          }
        }
        updateData.permissions = req.body.permissions;
      }

      const updatedRole = await Role.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('permissions');

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: { role: updatedRole }
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating role'
      });
    }
  }
);

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (Super Admin only)
router.delete('/:id', 
  protect, 
  authorize('super-admin'),
  hasPermission('roles', 'delete'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent deleting system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete system roles'
        });
      }

      // Check if role is assigned to any users
      const User = require('../models/User');
      const usersWithRole = await User.countDocuments({ roles: role._id });
      
      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role. It is assigned to ${usersWithRole} user(s)`
        });
      }

      await Role.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting role'
      });
    }
  }
);

// @desc    Add permission to role
// @route   PUT /api/roles/:id/permissions
// @access  Private (Super Admin only)
router.put('/:id/permissions', 
  protect, 
  authorize('super-admin'),
  hasPermission('roles', 'update'),
  [
    body('permissionId')
      .isMongoId()
      .withMessage('Permission ID must be a valid MongoDB ObjectId')
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

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modifying system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        });
      }

      const permission = await Permission.findById(req.body.permissionId);
      if (!permission || !permission.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found or inactive'
        });
      }

      // Check if permission is already assigned
      if (role.permissions.includes(permission._id)) {
        return res.status(400).json({
          success: false,
          message: 'Permission is already assigned to this role'
        });
      }

      await role.addPermission(permission._id);
      await role.populate('permissions');

      res.json({
        success: true,
        message: 'Permission added to role successfully',
        data: { role }
      });
    } catch (error) {
      console.error('Add permission to role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error adding permission to role'
      });
    }
  }
);

// @desc    Remove permission from role
// @route   DELETE /api/roles/:id/permissions/:permissionId
// @access  Private (Super Admin only)
router.delete('/:id/permissions/:permissionId', 
  protect, 
  authorize('super-admin'),
  hasPermission('roles', 'update'),
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent modifying system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system roles'
        });
      }

      await role.removePermission(req.params.permissionId);
      await role.populate('permissions');

      res.json({
        success: true,
        message: 'Permission removed from role successfully',
        data: { role }
      });
    } catch (error) {
      console.error('Remove permission from role error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error removing permission from role'
      });
    }
  }
);

module.exports = router;
