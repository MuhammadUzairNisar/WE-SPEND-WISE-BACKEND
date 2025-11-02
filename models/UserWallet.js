const mongoose = require('mongoose');

const userWalletSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Wallet name is required'],
    trim: true,
    maxlength: [100, 'Wallet name cannot be more than 100 characters']
  },
  hasAppNotification: {
    type: Boolean,
    default: false
  },
  notificationName: {
    type: String,
    trim: true,
    maxlength: [100, 'Notification name cannot be more than 100 characters']
  },
  hasSMSCode: {
    type: Boolean,
    default: false
  },
  smsCode: {
    type: String,
    trim: true,
    maxlength: [50, 'SMS code cannot be more than 50 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  initialAmount: {
    type: Number,
    required: [true, 'Initial amount is required'],
    default: 0,
    min: [0, 'Initial amount cannot be negative']
  },
  currentAmount: {
    type: Number,
    required: [true, 'Current amount is required'],
    default: 0
  },
  image: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better performance
userWalletSchema.index({ userId: 1, isDeleted: 1 });
userWalletSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default wallet per user
userWalletSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('UserWallet').updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Set currentAmount to initialAmount on creation
userWalletSchema.pre('save', function(next) {
  if (this.isNew && this.currentAmount === 0) {
    this.currentAmount = this.initialAmount;
  }
  next();
});

module.exports = mongoose.model('UserWallet', userWalletSchema);
