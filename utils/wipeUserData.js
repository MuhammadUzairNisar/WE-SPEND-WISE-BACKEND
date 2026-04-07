/**
 * wipeUserData.js
 * Deletes all financial data for every non-system user so you can
 * do a clean sync test.  Preserves the User and Role documents.
 *
 * Usage:
 *   node utils/wipeUserData.js
 *
 * Set MONGO_URI in .env or pass it as an env var before running.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not set in .env');
  process.exit(1);
}

async function wipe() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const collections = [
    'transactions',
    'incomes',
    'expenses',
    'savings',
    'userwallets',
    'categories',
    'synclogs',
    'dedup_logs',
  ];

  for (const col of collections) {
    try {
      const result = await mongoose.connection.collection(col).deleteMany({});
      console.log(`  ${col}: deleted ${result.deletedCount} documents`);
    } catch (e) {
      console.warn(`  ${col}: skipped (${e.message})`);
    }
  }

  console.log('\nAll financial data wiped. Users and roles are untouched.');
  await mongoose.disconnect();
}

wipe().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
