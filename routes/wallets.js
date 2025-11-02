const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const UserWallet = require('../models/UserWallet');
const User = require('../models/User');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/wallets
// @desc    Create multiple wallets with images
// @access  Private
router.post('/',
  protect,
  upload.array('images', 10),
  async (req, res) => {
    try {
      if (!req.body.wallets) {
        return res.status(400).json({
          success: false,
          message: 'Wallets data is required'
        });
      }

      // Parse wallets if it's a string, otherwise use as-is
      const wallets = typeof req.body.wallets === 'string' 
        ? JSON.parse(req.body.wallets) 
        : req.body.wallets;
      
      if (!Array.isArray(wallets) || wallets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Wallets must be a non-empty array'
        });
      }

      const userId = req.user._id;
      const uploadedFiles = req.files || [];

      // Prepare wallets with userId and images
      let fileIndex = 0;
      const walletsToCreate = wallets.map((wallet) => {
        const walletData = {
          ...wallet,
          userId,
          currentAmount: wallet.initialAmount
        };
        
        // Attach image if wallet has hasImage flag and file is available
        if (wallet.hasImage && uploadedFiles[fileIndex]) {
          walletData.image = `/uploads/wallets/${uploadedFiles[fileIndex].filename}`;
          fileIndex++;
        }
        
        delete walletData.hasImage; // Remove flag before saving
        return walletData;
      });

      // Create wallets
      const createdWallets = await UserWallet.insertMany(walletsToCreate);

      // Update user with wallet IDs
      await User.findByIdAndUpdate(userId, {
        $push: { wallets: { $each: createdWallets.map(w => w._id) } }
      });

      res.status(201).json({
        success: true,
        message: 'Wallets created successfully',
        data: createdWallets
      });
    } catch (error) {
      console.error('Create wallets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create wallets',
        error: error.message
      });
    }
  }
);

// @route   GET /api/wallets
// @desc    Get all wallets for logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const wallets = await UserWallet.find({
      userId: req.user._id,
      isDeleted: false
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      count: wallets.length,
      data: wallets
    });
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallets',
      error: error.message
    });
  }
});

// @route   GET /api/wallets/:id
// @desc    Get single wallet
// @access  Private
router.get('/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid wallet ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const wallet = await UserWallet.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/wallets/:id
// @desc    Update wallet with optional image
// @access  Private
router.put('/:id',
  protect,
  upload.single('image'),
  [
    param('id').isMongoId().withMessage('Invalid wallet ID'),
    body('name').optional().trim().notEmpty().withMessage('Wallet name cannot be empty'),
    body('hasAppNotification').optional().isBoolean(),
    body('notificationName').optional().trim(),
    body('hasSMSCode').optional().isBoolean(),
    body('smsCode').optional().trim(),
    body('isDefault').optional().isBoolean(),
    body('currentAmount').optional().isFloat(),
    body('image').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const wallet = await UserWallet.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const allowedUpdates = ['name', 'hasAppNotification', 'notificationName', 'hasSMSCode', 'smsCode', 'isDefault', 'currentAmount', 'image'];
      const updates = {};
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      
      // Add uploaded image if present
      if (req.file) {
        updates.image = `/uploads/wallets/${req.file.filename}`;
      }

      Object.assign(wallet, updates);
      await wallet.save();

      res.json({
        success: true,
        message: 'Wallet updated successfully',
        data: wallet
      });
    } catch (error) {
      console.error('Update wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update wallet',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/wallets/:id
// @desc    Soft delete wallet
// @access  Private
router.delete('/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid wallet ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const wallet = await UserWallet.findOne({
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      if (wallet.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default wallet'
        });
      }

      wallet.isDeleted = true;
      await wallet.save();

      // Remove from user's wallets array
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { wallets: wallet._id }
      });

      res.json({
        success: true,
        message: 'Wallet deleted successfully'
      });
    } catch (error) {
      console.error('Delete wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete wallet',
        error: error.message
      });
    }
  }
);

module.exports = router;
