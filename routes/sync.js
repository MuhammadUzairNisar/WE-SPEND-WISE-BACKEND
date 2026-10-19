const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const UserWallet = require('../models/UserWallet');
const Saving = require('../models/Saving');

// Mapping of collection names to Mongoose models
const Models = {
  transactions: Transaction,
  incomes: Income,
  expenses: Expense,
  categories: Category,
  wallets: UserWallet,
  savings: Saving
};

// @route   POST /api/sync/push
// @desc    Sync local pending changes to database
// @access  Private
router.post('/push', protect, async (req, res) => {
  try {
    const { entities } = req.body;
    const results = {};

    for (const [collectionName, records] of Object.entries(entities)) {
      const Model = Models[collectionName];
      if (!Model) continue;

      results[collectionName] = { success: 0, failed: 0, syncedIds: {} };

      for (const [localId, recordData] of Object.entries(records)) {
        try {
          // Add userId from req.user
          recordData.userId = req.user.id;

          // Prevent overriding fixed Mongoose ID if accidentally passed
          delete recordData._id;

          // Deduplication: check if local_id already exists
          let existingRecord = await Model.findOne({ local_id: localId, userId: req.user.id });

          let savedId;
          if (existingRecord) {
            // Update
            const updated = await Model.findByIdAndUpdate(existingRecord._id, recordData, { new: true, runValidators: true });
            savedId = updated._id;
          } else {
            // Create
            recordData.local_id = localId;
            const newRecord = await Model.create(recordData);
            savedId = newRecord._id;
          }

          results[collectionName].syncedIds[localId] = savedId;
          results[collectionName].success++;

        } catch (error) {
          console.error(`Sync push error for ${collectionName} ${localId}:`, error);
          results[collectionName].failed++;
        }
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sync push failure:', error);
    res.status(500).json({ success: false, error: 'Server validation flow error during sync' });
  }
});

// @route   GET /api/sync/pull
// @desc    Get changes from database since last sync
// @access  Private
router.get('/pull', protect, async (req, res) => {
  try {
    const { last_sync_timestamp } = req.query;
    const sinceDate = last_sync_timestamp ? new Date(last_sync_timestamp) : new Date(0);
    
    const changes = {};

    for (const [collectionName, Model] of Object.entries(Models)) {
      const docs = await Model.find({
        userId: req.user.id,
        updatedAt: { $gt: sinceDate }
      });
      
      const mapped = {};
      docs.forEach(doc => {
        const docObj = doc.toObject();
        const key = docObj.local_id || docObj._id.toString();
        mapped[key] = docObj;
      });
      
      changes[collectionName] = mapped;
    }

    res.json({
      success: true,
      last_sync_timestamp: new Date().toISOString(),
      data: changes
    });
  } catch (error) {
    console.error('Sync pull failure:', error);
    res.status(500).json({ success: false, error: 'Failed to pull sync records' });
  }
});

module.exports = router;
