// CLI entrypoint for seeding a persistent MongoDB instance.
// (When MONGO_URI is unset, the server auto-seeds the in-memory DB on startup.)
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { seedDatabase } = require('./seedData');

async function main() {
  if (!process.env.MONGO_URI) {
    console.log(
      '[seed] MONGO_URI not set — note: the server auto-seeds the in-memory DB on startup, ' +
        'so running this script standalone only seeds an ephemeral DB that disappears when this script exits.'
    );
  }
  await connectDB();
  await seedDatabase();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed:error]', err);
  process.exit(1);
});
