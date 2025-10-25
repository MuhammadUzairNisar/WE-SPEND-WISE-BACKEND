const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Role name cannot be more than 50 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Role display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemRole: {
    type: Boolean,
    default: false
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for permission count
roleSchema.virtual('permissionCount').get(function() {
  return this.permissions ? this.permissions.length : 0;
});

// Index for better performance
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ level: 1 });

// Pre-save middleware to ensure unique role names
roleSchema.pre('save', function(next) {
  this.name = this.name.toLowerCase().replace(/\s+/g, '-');
  next();
});

// Static method to find role by name
roleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

// Static method to get all active roles
roleSchema.statics.findActive = function() {
  return this.find({ isActive: true }).populate('permissions');
};

// Instance method to add permission
roleSchema.methods.addPermission = function(permissionId) {
  if (!this.permissions.includes(permissionId)) {
    this.permissions.push(permissionId);
  }
  return this.save();
};

// Instance method to remove permission
roleSchema.methods.removePermission = function(permissionId) {
  this.permissions = this.permissions.filter(p => !p.equals(permissionId));
  return this.save();
};

// Instance method to check if role has permission
roleSchema.methods.hasPermission = function(permissionName) {
  return this.permissions.some(permission => 
    permission.name === permissionName || permission._id.toString() === permissionName
  );
};

module.exports = mongoose.model('Role', roleSchema);
