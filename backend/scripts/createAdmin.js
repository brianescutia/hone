// scripts/createAdmin.js
//
// Safely create or reset an admin user in production. Never commit demo
// passwords — use this script to provision the first admin instead.
//
// Usage:
//   ADMIN_EMAIL=you@example.com \
//   ADMIN_PASSWORD='<long-random-string>' \
//   ADMIN_NAME='Your Name' \
//   MONGO_URI='mongodb+srv://...' \
//   JWT_SECRET='...' \
//   node scripts/createAdmin.js
//
// If an account with ADMIN_EMAIL already exists, the script will UPDATE its
// password and promote it to role=admin. It will refuse to run with a weak
// password.

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'hone admin';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }
  if (/^password|^demo|^changeme/i.test(password)) {
    console.error('Refusing to use an obvious password.');
    process.exit(1);
  }

  await connectDB();
  const passwordHash = await User.hashPassword(password);

  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.passwordHash = passwordHash;
    user.authProvider = 'local';
    user.emailVerified = true;
    user.suspended = false;
    if (!user.name) user.name = name;
    await user.save();
    console.log(`[create-admin] Updated existing user ${email} to admin.`);
  } else {
    user = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      authProvider: 'local',
      emailVerified: true,
    });
    console.log(`[create-admin] Created admin user ${email}.`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[create-admin:error]', err);
  process.exit(1);
});
