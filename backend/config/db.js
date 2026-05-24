// backend/config/db.js
//
// CHANGE FROM CURRENT FILE:
//   - connectDB() now returns { connection, usingInMemory, memServer } so the
//     caller (server.js) can tear down the in-memory MongoDB server cleanly
//     in tests. Previously the MongoMemoryServer instance was leaked, which
//     left an open handle and caused test runs to hit the 60s timeout.

const mongoose = require('mongoose');

async function connectDB() {
  let uri = process.env.MONGO_URI;
  let usingInMemory = false;
  let memServer = null;

  if (!uri) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memOpts = process.env.MONGO_MEMORY_VERSION
        ? { binary: { version: process.env.MONGO_MEMORY_VERSION } }
        : {};
      memServer = await MongoMemoryServer.create(memOpts);
      uri = memServer.getUri();
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
    console.log('[db] Connecting to MongoDB...');
  }

  await mongoose.connect(uri);
  console.log('[db] Connected');
  return { connection: mongoose.connection, usingInMemory, memServer };
}

module.exports = { connectDB };