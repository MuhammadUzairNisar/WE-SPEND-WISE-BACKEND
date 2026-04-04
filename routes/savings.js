const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Saving = require('../models/Saving');
const UserWallet = require('../models/UserWallet');
const Transaction = require('../models/Transaction');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// Calculate remaining full months between two dates
function remainingMonths(from, to) {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  return Math.max(1, months);
}

// @route   POST /api/savings
// @desc    Create a new saving goal
// @access  Private
router.post('/',
  protect,
  [
    body('walletId').isMongoId().withMessage('Invalid wallet ID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('goalAmount').isFloat({ min: 1 }).withMessage('Goal amount must be positive'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('contributionDay').isInt({ min: 1, max: 31 }).withMessage('Contribution day must be 1-31')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { walletId, title, goalAmount, endDate, contributionDay } = req.body;
      const userId = req.user._id;

      const wallet = await UserWallet.findOne({ _id: walletId, userId, isDeleted: false });
      if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

      const startDate = new Date();
      const end = new Date(endDate);
      if (end <= startDate) {
        return res.status(400).json({ success: false, message: 'End date must be in the future' });
      }

      const months = remainingMonths(startDate, end);
      const monthlyAmount = parseFloat((goalAmount / months).toFixed(2));

      const saving = await Saving.create({
        userId, walletId, title, goalAmount, endDate: end,
        startDate, contributionDay, monthlyAmount
      });

      res.status(201).json({ success: true, message: 'Saving goal created', data: saving });
    } catch (error) {
      console.error('Create saving error:', error);
      res.status(500).json({ success: false, message: 'Failed to create saving', error: error.message });
    }
  }
);

// @route   GET /api/savings
// @desc    List all active savings for the user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const savings = await Saving.find({ userId: req.user._id, isDeleted: false })
      .populate('walletId', 'name currentAmount image')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: savings.length, data: savings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch savings', error: error.message });
  }
});

// @route   GET /api/savings/:id
// @desc    Get single saving detail
// @access  Private
router.get('/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid saving ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const saving = await Saving.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false })
        .populate('walletId', 'name currentAmount image');

      if (!saving) return res.status(404).json({ success: false, message: 'Saving not found' });

      res.json({ success: true, data: saving });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch saving', error: error.message });
    }
  }
);

// @route   PATCH /api/savings/:id/contribute
// @desc    Add a contribution — deducts from wallet and creates an expense transaction
// @access  Private
router.patch('/:id/contribute',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid saving ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const saving = await Saving.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false, status: 'active' });
      if (!saving) return res.status(404).json({ success: false, message: 'Active saving not found' });

      const { amount } = req.body;
      const wallet = await UserWallet.findOne({ _id: saving.walletId, userId: req.user._id, isDeleted: false });
      if (!wallet) return res.status(404).json({ success: false, message: 'Linked wallet not found' });

      if (wallet.currentAmount < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      // Deduct from wallet and create expense transaction
      wallet.currentAmount -= amount;
      await wallet.save();

      const transaction = await Transaction.create({
        userId: req.user._id,
        walletId: wallet._id,
        title: `Savings: ${saving.title}`,
        description: `Contribution to saving goal "${saving.title}"`,
        amount,
        transactionType: 'expense',
        transactionDate: new Date()
      });

      // Update saving's currentAmount and add to contributions history
      saving.currentAmount += amount;
      saving.contributions.push({
        amount,
        date: new Date(),
        transactionId: transaction._id
      });
      if (saving.currentAmount >= saving.goalAmount) {
        saving.status = 'completed';
      }
      await saving.save();

      res.json({ success: true, message: 'Contribution recorded', data: saving });
    } catch (error) {
      console.error('Contribute error:', error);
      res.status(500).json({ success: false, message: 'Failed to record contribution', error: error.message });
    }
  }
);

// @route   PATCH /api/savings/:id/postpone
// @desc    Skip current month contribution and recalculate monthly amount
// @access  Private
router.patch('/:id/postpone',
  protect,
  [param('id').isMongoId().withMessage('Invalid saving ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const saving = await Saving.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false, status: 'active' });
      if (!saving) return res.status(404).json({ success: false, message: 'Active saving not found' });

      const now = new Date();
      const remaining = remainingMonths(now, saving.endDate);

      if (remaining <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot postpone — deadline is too close' });
      }

      const amountLeft = saving.goalAmount - saving.currentAmount;
      // Recalculate over remaining months minus the one being skipped
      saving.monthlyAmount = parseFloat((amountLeft / (remaining - 1)).toFixed(2));
      await saving.save();

      res.json({ success: true, message: 'Contribution postponed and monthly amount recalculated', data: saving });
    } catch (error) {
      console.error('Postpone error:', error);
      res.status(500).json({ success: false, message: 'Failed to postpone', error: error.message });
    }
  }
);

// @route   DELETE /api/savings/:id
// @desc    Soft delete a saving
// @access  Private
router.delete('/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid saving ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const saving = await Saving.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
      if (!saving) return res.status(404).json({ success: false, message: 'Saving not found' });

      saving.isDeleted = true;
      saving.status = 'cancelled';
      await saving.save();

      res.json({ success: true, message: 'Saving cancelled successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete saving', error: error.message });
    }
  }
);

module.exports = router;
