const Role = require('../models/Role');
const Permission = require('../models/Permission');

// Default permissions
const defaultPermissions = [
  // User permissions
  { name: 'users:create', displayName: 'Create Users', resource: 'users', action: 'create', category: 'user-management', isSystemPermission: true },
  { name: 'users:read', displayName: 'Read Users', resource: 'users', action: 'read', category: 'user-management', isSystemPermission: true },
  { name: 'users:update', displayName: 'Update Users', resource: 'users', action: 'update', category: 'user-management', isSystemPermission: true },
  { name: 'users:delete', displayName: 'Delete Users', resource: 'users', action: 'delete', category: 'user-management', isSystemPermission: true },
  
  // Role permissions
  { name: 'roles:create', displayName: 'Create Roles', resource: 'roles', action: 'create', category: 'role-management', isSystemPermission: true },
  { name: 'roles:read', displayName: 'Read Roles', resource: 'roles', action: 'read', category: 'role-management', isSystemPermission: true },
  { name: 'roles:update', displayName: 'Update Roles', resource: 'roles', action: 'update', category: 'role-management', isSystemPermission: true },
  { name: 'roles:delete', displayName: 'Delete Roles', resource: 'roles', action: 'delete', category: 'role-management', isSystemPermission: true },
  
  // Permission permissions
  { name: 'permissions:create', displayName: 'Create Permissions', resource: 'permissions', action: 'create', category: 'permission-management', isSystemPermission: true },
  { name: 'permissions:read', displayName: 'Read Permissions', resource: 'permissions', action: 'read', category: 'permission-management', isSystemPermission: true },
  { name: 'permissions:update', displayName: 'Update Permissions', resource: 'permissions', action: 'update', category: 'permission-management', isSystemPermission: true },
  { name: 'permissions:delete', displayName: 'Delete Permissions', resource: 'permissions', action: 'delete', category: 'permission-management', isSystemPermission: true },
  
  // Profile permissions
  { name: 'profile:read', displayName: 'Read Profile', resource: 'profile', action: 'read', category: 'profile', isSystemPermission: true },
  { name: 'profile:update', displayName: 'Update Profile', resource: 'profile', action: 'update', category: 'profile', isSystemPermission: true },
  
  // Dashboard permissions
  { name: 'dashboard:read', displayName: 'Read Dashboard', resource: 'dashboard', action: 'read', category: 'dashboard', isSystemPermission: true },
  
  // Settings permissions
  { name: 'settings:read', displayName: 'Read Settings', resource: 'settings', action: 'read', category: 'settings', isSystemPermission: true },
  { name: 'settings:update', displayName: 'Update Settings', resource: 'settings', action: 'update', category: 'settings', isSystemPermission: true },
];

// Default roles
const defaultRoles = [
  {
    name: 'super-admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 10,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    level: 8,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'moderator',
    displayName: 'Moderator',
    description: 'Moderator access with limited administrative permissions',
    level: 6,
    isSystemRole: true,
    isActive: true
  },
  {
    name: 'user',
    displayName: 'User',
    description: 'Standard user with basic permissions',
    level: 1,
    isSystemRole: true,
    isActive: true
  }
];

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Create permissions
    console.log('Creating permissions...');
    const createdPermissions = [];
    for (const permissionData of defaultPermissions) {
      const existingPermission = await Permission.findOne({ name: permissionData.name });
      if (!existingPermission) {
        const permission = await Permission.create(permissionData);
        createdPermissions.push(permission);
        console.log(`Created permission: ${permission.name}`);
      } else {
        createdPermissions.push(existingPermission);
        console.log(`Permission already exists: ${existingPermission.name}`);
      }
    }

    // Create roles
    console.log('Creating roles...');
    const createdRoles = [];
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        // Assign permissions based on role level
        let rolePermissions = [];
        
        if (roleData.name === 'super-admin') {
          // Super admin gets all permissions
          rolePermissions = createdPermissions.map(p => p._id);
        } else if (roleData.name === 'admin') {
          // Admin gets most permissions except super-admin specific ones
          rolePermissions = createdPermissions
            .filter(p => !p.name.includes('permissions:') || p.action === 'read')
            .map(p => p._id);
        } else if (roleData.name === 'moderator') {
          // Moderator gets limited permissions
          rolePermissions = createdPermissions
            .filter(p => 
              p.category === 'profile' || 
              p.category === 'dashboard' ||
              (p.category === 'user-management' && p.action === 'read')
            )
            .map(p => p._id);
        } else if (roleData.name === 'user') {
          // User gets basic permissions
          rolePermissions = createdPermissions
            .filter(p => 
              p.category === 'profile' || 
              p.category === 'dashboard'
            )
            .map(p => p._id);
        }

        const role = await Role.create({
          ...roleData,
          permissions: rolePermissions
        });
        createdRoles.push(role);
        console.log(`Created role: ${role.name} with ${rolePermissions.length} permissions`);
      } else {
        createdRoles.push(existingRole);
        console.log(`Role already exists: ${existingRole.name}`);
      }
    }

    console.log('Database seeding completed successfully!');
    return { permissions: createdPermissions, roles: createdRoles };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = { seedDatabase };
