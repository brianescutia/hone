const mongoose = require('mongoose');

async function connectDB() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      // Auto-detect the right MongoDB binary for this machine. You can
      // override the version if needed via MONGO_MEMORY_VERSION.
      const memOpts = process.env.MONGO_MEMORY_VERSION
        ? { binary: { version: process.env.MONGO_MEMORY_VERSION } }
        : {};
      const mem = await MongoMemoryServer.create(memOpts);
      uri = mem.getUri();
      console.log('[db] Using in-memory MongoDB at', uri);
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
    console.log('[db] Connecting to', uri);
  }

  await mongoose.connect(uri);
  console.log('[db] Connected');
  return mongoose.connection;
}

module.exports = { connectDB };
