const Permission = require('../models/Permission');
const Role = require('../models/Role');

// Check if user has specific permission
const hasPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles with permissions
      const userRoles = await Role.find({
        _id: { $in: req.user.roles },
        isActive: true
      }).populate('permissions');

      // Check if any role has the required permission
      let hasRequiredPermission = false;

      for (const role of userRoles) {
        for (const permission of role.permissions) {
          if (permission.resource === resource && permission.action === action && permission.isActive) {
            hasRequiredPermission = true;
            break;
          }
        }
        if (hasRequiredPermission) break;
      }

      if (!hasRequiredPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${resource}:${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Check if user has any of the specified permissions
const hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles with permissions
      const userRoles = await Role.find({
        _id: { $in: req.user.roles },
        isActive: true
      }).populate('permissions');

      // Check if user has any of the required permissions
      let hasAnyRequiredPermission = false;

      for (const role of userRoles) {
        for (const permission of role.permissions) {
          for (const requiredPermission of permissions) {
            const [resource, action] = requiredPermission.split(':');
            if (permission.resource === resource && permission.action === action && permission.isActive) {
              hasAnyRequiredPermission = true;
              break;
            }
          }
          if (hasAnyRequiredPermission) break;
        }
        if (hasAnyRequiredPermission) break;
      }

      if (!hasAnyRequiredPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Check if user has all of the specified permissions
const hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles with permissions
      const userRoles = await Role.find({
        _id: { $in: req.user.roles },
        isActive: true
      }).populate('permissions');

      // Collect all user permissions
      const userPermissions = new Set();
      for (const role of userRoles) {
        for (const permission of role.permissions) {
          if (permission.isActive) {
            userPermissions.add(`${permission.resource}:${permission.action}`);
          }
        }
      }

      // Check if user has all required permissions
      const hasAllRequiredPermissions = permissions.every(permission => 
        userPermissions.has(permission)
      );

      if (!hasAllRequiredPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !userPermissions.has(permission)
        );
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Missing: ${missingPermissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Check if user has permission for a specific resource
const hasResourcePermission = (resource) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles with permissions
      const userRoles = await Role.find({
        _id: { $in: req.user.roles },
        isActive: true
      }).populate('permissions');

      // Check if user has any permission for the resource
      let hasResourceAccess = false;

      for (const role of userRoles) {
        for (const permission of role.permissions) {
          if (permission.resource === resource && permission.isActive) {
            hasResourceAccess = true;
            break;
          }
        }
        if (hasResourceAccess) break;
      }

      if (!hasResourceAccess) {
        return res.status(403).json({
          success: false,
          message: `No permissions for resource: ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('Resource permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource permissions'
      });
    }
  };
};

// Get user permissions (utility function)
const getUserPermissions = async (userId) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    if (!user) {
      return [];
    }

    const permissions = new Set();
    for (const role of user.roles) {
      if (role.isActive) {
        for (const permission of role.permissions) {
          if (permission.isActive) {
            permissions.add(`${permission.resource}:${permission.action}`);
          }
        }
      }
    }

    return Array.from(permissions);
  } catch (error) {
    console.error('Get user permissions error:', error);
    return [];
  }
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  getUserPermissions
};
