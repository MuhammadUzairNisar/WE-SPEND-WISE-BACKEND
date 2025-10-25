const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Permission = require('../models/Permission');
const { protect, authorize } = require('../middleware/auth');
const { hasPermission, hasAnyPermission } = require('../middleware/permissions');
const router = express.Router();

// @desc    Get all permissions
// @route   GET /api/permissions
// @access  Private (Admin only)
router.get('/', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('permissions', 'read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('resource').optional().trim().isLength({ max: 50 }).withMessage('Resource name too long'),
    query('action').optional().trim().isLength({ max: 20 }).withMessage('Action name too long'),
    query('category').optional().trim().isLength({ max: 50 }).withMessage('Category name too long'),
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
      
      if (req.query.resource) {
        filter.resource = req.query.resource.toLowerCase();
      }
      
      if (req.query.action) {
        filter.action = req.query.action.toLowerCase();
      }
      
      if (req.query.category) {
        filter.category = req.query.category.toLowerCase();
      }
      
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }

      // Get permissions with pagination
      const permissions = await Permission.find(filter)
        .sort({ resource: 1, action: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Permission.countDocuments(filter);

      res.json({
        success: true,
        data: {
          permissions,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            limit
          }
        }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting permissions'
      });
    }
  }
);

// @desc    Get permission by ID
// @route   GET /api/permissions/:id
// @access  Private (Admin only)
router.get('/:id', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('permissions', 'read'),
  async (req, res) => {
    try {
      const permission = await Permission.findById(req.params.id);

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      res.json({
        success: true,
        data: { permission }
      });
    } catch (error) {
      console.error('Get permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting permission'
      });
    }
  }
);

// @desc    Create new permission
// @route   POST /api/permissions
// @access  Private (Super Admin only)
router.post('/', 
  protect, 
  authorize('super-admin'),
  hasPermission('permissions', 'create'),
  [
    body('displayName')
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Display name must be between 2 and 150 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters'),
    body('resource')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Resource must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Resource can only contain lowercase letters, numbers, and hyphens'),
    body('action')
      .trim()
      .isIn(['create', 'read', 'update', 'delete', 'manage', 'export', 'import'])
      .withMessage('Action must be one of: create, read, update, delete, manage, export, import'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot be more than 50 characters')
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

      const { displayName, description, resource, action, category } = req.body;

      // Check if permission already exists
      const existingPermission = await Permission.findOne({ 
        resource: resource.toLowerCase(), 
        action: action.toLowerCase() 
      });
      
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: 'Permission with this resource and action already exists'
        });
      }

      // Create permission
      const permission = await Permission.create({
        displayName,
        description,
        resource: resource.toLowerCase(),
        action: action.toLowerCase(),
        category: category ? category.toLowerCase() : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: { permission }
      });
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating permission'
      });
    }
  }
);

// @desc    Update permission
// @route   PUT /api/permissions/:id
// @access  Private (Super Admin only)
router.put('/:id', 
  protect, 
  authorize('super-admin'),
  hasPermission('permissions', 'update'),
  [
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Display name must be between 2 and 150 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot be more than 500 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot be more than 50 characters'),
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

      const permission = await Permission.findById(req.params.id);
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      // Prevent modifying system permissions
      if (permission.isSystemPermission) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system permissions'
        });
      }

      const updateData = {};
      if (req.body.displayName) updateData.displayName = req.body.displayName;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const updatedPermission = await Permission.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Permission updated successfully',
        data: { permission: updatedPermission }
      });
    } catch (error) {
      console.error('Update permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating permission'
      });
    }
  }
);

// @desc    Delete permission
// @route   DELETE /api/permissions/:id
// @access  Private (Super Admin only)
router.delete('/:id', 
  protect, 
  authorize('super-admin'),
  hasPermission('permissions', 'delete'),
  async (req, res) => {
    try {
      const permission = await Permission.findById(req.params.id);
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }

      // Prevent deleting system permissions
      if (permission.isSystemPermission) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete system permissions'
        });
      }

      // Check if permission is assigned to any roles
      const Role = require('../models/Role');
      const rolesWithPermission = await Role.countDocuments({ permissions: permission._id });
      
      if (rolesWithPermission > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete permission. It is assigned to ${rolesWithPermission} role(s)`
        });
      }

      await Permission.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting permission'
      });
    }
  }
);

// @desc    Get permissions by resource
// @route   GET /api/permissions/resource/:resource
// @access  Private (Admin only)
router.get('/resource/:resource', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('permissions', 'read'),
  async (req, res) => {
    try {
      const permissions = await Permission.findByResource(req.params.resource);

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get permissions by resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting permissions by resource'
      });
    }
  }
);

// @desc    Get permissions by category
// @route   GET /api/permissions/category/:category
// @access  Private (Admin only)
router.get('/category/:category', 
  protect, 
  authorize('admin', 'super-admin'),
  hasPermission('permissions', 'read'),
  async (req, res) => {
    try {
      const permissions = await Permission.findByCategory(req.params.category);

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get permissions by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting permissions by category'
      });
    }
  }
);

module.exports = router;
