const mongoose = require('mongoose');

async function connectDB() {
  let uri = process.env.MONGO_URI;
  let usingInMemory = false;

  if (!uri) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memOpts = process.env.MONGO_MEMORY_VERSION
        ? { binary: { version: process.env.MONGO_MEMORY_VERSION } }
        : {};
      const mem = await MongoMemoryServer.create(memOpts);
      uri = mem.getUri();
      usingInMemory = true;
      console.log('[db] Using in-memory MongoDB');
    } catch (err) {
      console.error('\n[db] Failed to start the in-memory MongoDB binary.');
      console.error('     Reason:', err.message, '\n');
      console.error(
        '[db] Two fixes:\n' +
          '     1. Install MongoDB locally (https://www.mongodb.com/try/download/community)\n' +
          '        and set MONGO_URI=mongodb://localhost:27017/hone in backend/.env\n' +
          '     2. Or set MONGO_MEMORY_VERSION to a version listed at\n' +
          '        https://www.mongodb.com/try/download/community-edition/releases/archive\n'
      );
      throw err;
    }
  } else {
    // SECURITY: do NOT log the full URI — it contains credentials.
    // Log only the host so we can confirm we're hitting the right cluster.
    console.log('[db] Connecting to MongoDB...');
  }

  await mongoose.connect(uri);
  console.log('[db] Connected');
  return { connection: mongoose.connection, usingInMemory };
}

module.exports = { connectDB };
