const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Permission name cannot be more than 100 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Permission display name is required'],
    trim: true,
    maxlength: [150, 'Display name cannot be more than 150 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Resource cannot be more than 50 characters']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    lowercase: true,
    enum: ['create', 'read', 'update', 'delete', 'manage', 'export', 'import'],
    maxlength: [20, 'Action cannot be more than 20 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full permission string
permissionSchema.virtual('fullPermission').get(function() {
  return `${this.resource}:${this.action}`;
});

// Index for better performance
permissionSchema.index({ name: 1 });
permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ isActive: 1 });
permissionSchema.index({ category: 1 });

// Pre-save middleware to generate name from resource and action
permissionSchema.pre('save', function(next) {
  if (!this.name && this.resource && this.action) {
    this.name = `${this.resource}:${this.action}`;
  }
  next();
});

// Static method to find permission by name
permissionSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

// Static method to find permissions by resource
permissionSchema.statics.findByResource = function(resource) {
  return this.find({ resource: resource.toLowerCase(), isActive: true });
};

// Static method to find permissions by action
permissionSchema.statics.findByAction = function(action) {
  return this.find({ action: action.toLowerCase(), isActive: true });
};

// Static method to get all active permissions
permissionSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find permissions by category
permissionSchema.statics.findByCategory = function(category) {
  return this.find({ category: category.toLowerCase(), isActive: true });
};

// Instance method to check if permission matches resource and action
permissionSchema.methods.matches = function(resource, action) {
  return this.resource === resource.toLowerCase() && this.action === action.toLowerCase();
};

module.exports = mongoose.model('Permission', permissionSchema);
