// CLI entrypoint for seeding a persistent MongoDB instance.
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { seedDatabase } = require('./seedData');

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_DATA !== 'true') {
    console.error(
      '[seed] Refusing to seed in production. Set SEED_DEMO_DATA=true to override (NOT recommended for public launch).'
    );
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.log(
      '[seed] MONGO_URI not set — the server auto-seeds the in-memory DB on startup. Running this script without MONGO_URI only seeds an ephemeral DB.'
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
