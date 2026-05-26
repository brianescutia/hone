// scripts/createAdmin.js
//
// Safely create or reset an admin user. Use this script to provision the
// first admin (or rotate an admin password) in production. Never commit
// or share demo passwords.
//
// Usage:
//   ADMIN_EMAIL=you@example.com \
//   ADMIN_PASSWORD='<long-random-string>' \
//   ADMIN_NAME='Your Name' \
//   MONGO_URI='mongodb+srv://...' \
//   JWT_SECRET='...' \
//   npm run create-admin
//
// Behavior:
//   - If an account with ADMIN_EMAIL already exists, the script UPDATES its
//     password and promotes it to role=admin.
//   - Refuses weak passwords (< 12 chars, common dictionary words, or any
//     password matching "password123" / "demo" / "changeme" / "qwerty" /
//     "letmein" / "admin").
//   - NEVER prints the password or MONGO_URI to the console.
//   - Refuses to run without MONGO_URI (i.e. it will not silently use the
//     in-memory MongoDB and look like a no-op).

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Common weak passwords that should never be accepted, regardless of length.
const FORBIDDEN_PASSWORDS = [
  'password', 'password1', 'password123', 'password1234',
  'demo', 'demo1234', 'demopassword',
  'changeme', 'changeme123',
  'qwerty', 'qwerty123', 'qwertyuiop',
  'letmein', 'letmein123',
  'admin', 'admin123', 'administrator',
  '12345678', '123456789', '1234567890',
  'iloveyou', 'welcome', 'welcome123',
];

function isWeakPassword(pw) {
  if (!pw || pw.length < 12) return 'must be at least 12 characters';
  const lower = pw.toLowerCase();
  for (const f of FORBIDDEN_PASSWORDS) {
    if (lower === f || lower.startsWith(f)) return `matches a common weak password ("${f}…")`;
  }
  // Require at least one digit and one non-digit so "111111111111" fails.
  if (!/\d/.test(pw)) return 'must contain at least one digit';
  if (!/[A-Za-z]/.test(pw)) return 'must contain at least one letter';
  return null;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'hone admin';

  if (!process.env.MONGO_URI) {
    console.error('[create-admin] MONGO_URI is required. This script writes to a real database.');
    console.error('               Set MONGO_URI in your environment (NOT in this command line) and retry.');
    process.exit(2);
  }
  if (!email || !password) {
    console.error('[create-admin] ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('               Example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="<strong>" npm run create-admin');
    process.exit(1);
  }
  const weak = isWeakPassword(password);
  if (weak) {
    console.error(`[create-admin] Refusing to use a weak password — it ${weak}.`);
    process.exit(1);
  }

  console.log('[create-admin] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI);

  try {
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
      console.log(`[create-admin] Updated existing user <${email}> to role=admin and rotated password.`);
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        authProvider: 'local',
        emailVerified: true,
      });
      console.log(`[create-admin] Created admin user <${email}>.`);
    }
    console.log('[create-admin] Done. (Password and MONGO_URI intentionally not printed.)');
  } finally {
    await mongoose.disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  // Strip any accidental URI leak from the error message.
  const safe = String(err && err.message ? err.message : err).replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, 'mongodb://***');
  console.error('[create-admin:error]', safe);
  process.exit(1);
});
