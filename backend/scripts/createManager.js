// scripts/createManager.js
//
// Safely create or update a property-manager account.
//
// Usage:
//   MANAGER_EMAIL=leasing@yourproperty.com \
//   MANAGER_PASSWORD='<long-random>' \
//   MANAGER_NAME='Jane Smith' \
//   MANAGER_COMPANY='Almondwood Apartments' \
//   MANAGER_STATUS=approved \   # or "pending" (default in prod is "pending")
//   MONGO_URI='mongodb+srv://...' \
//   npm run create-manager
//
// Notes:
//   - Refuses weak passwords. NEVER prints the password or MONGO_URI.
//   - In production (NODE_ENV=production), managerStatus defaults to
//     "pending" unless MANAGER_STATUS=approved is set explicitly.
//   - Will REFUSE to run if MANAGER_PASSWORD matches any obvious demo
//     password (e.g. "password123"). This is the script's whole purpose:
//     to NOT create demo accounts in prod.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const FORBIDDEN_PASSWORDS = [
  'password', 'password1', 'password123', 'password1234',
  'demo', 'demo1234', 'demopassword',
  'changeme', 'changeme123',
  'qwerty', 'qwerty123',
  'letmein', 'letmein123',
  'admin', 'admin123',
  '12345678', '123456789',
];

function isWeakPassword(pw) {
  if (!pw || pw.length < 12) return 'must be at least 12 characters';
  const lower = pw.toLowerCase();
  for (const f of FORBIDDEN_PASSWORDS) {
    if (lower === f || lower.startsWith(f)) return `matches a common weak password ("${f}…")`;
  }
  if (!/\d/.test(pw)) return 'must contain at least one digit';
  if (!/[A-Za-z]/.test(pw)) return 'must contain at least one letter';
  return null;
}

function deriveDomain(email) {
  const at = String(email).indexOf('@');
  return at < 0 ? '' : String(email).slice(at + 1).toLowerCase();
}

async function main() {
  const email = (process.env.MANAGER_EMAIL || '').toLowerCase().trim();
  const password = process.env.MANAGER_PASSWORD || '';
  const name = process.env.MANAGER_NAME || 'Property Manager';
  const company = process.env.MANAGER_COMPANY || '';
  const isProd = process.env.NODE_ENV === 'production';
  const requestedStatus = (process.env.MANAGER_STATUS || '').toLowerCase().trim();
  const managerStatus =
    requestedStatus === 'approved' ? 'approved'
    : requestedStatus === 'rejected' ? 'rejected'
    : isProd ? 'pending'
    : 'approved';

  if (!process.env.MONGO_URI) {
    console.error('[create-manager] MONGO_URI is required.');
    process.exit(2);
  }
  if (!email || !password) {
    console.error('[create-manager] MANAGER_EMAIL and MANAGER_PASSWORD are required.');
    process.exit(1);
  }
  if (!company) {
    console.error('[create-manager] MANAGER_COMPANY is required (the property/management company name).');
    process.exit(1);
  }
  const weak = isWeakPassword(password);
  if (weak) {
    console.error(`[create-manager] Refusing to use a weak password — it ${weak}.`);
    console.error('                Pick a long random string. This script intentionally rejects demo passwords.');
    process.exit(1);
  }

  console.log('[create-manager] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const passwordHash = await User.hashPassword(password);
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'manager';
      user.passwordHash = passwordHash;
      user.authProvider = 'local';
      user.emailVerified = true;
      user.suspended = false;
      user.company = company || user.company;
      user.managerStatus = managerStatus;
      user.workEmail = email;
      user.managerDomain = deriveDomain(email);
      if (!user.name) user.name = name;
      await user.save();
      console.log(`[create-manager] Updated existing user <${email}> to role=manager, status=${managerStatus}.`);
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'manager',
        authProvider: 'local',
        emailVerified: true,
        company,
        managerStatus,
        workEmail: email,
        managerDomain: deriveDomain(email),
        managerVerifiedAt: managerStatus === 'approved' ? new Date() : null,
      });
      console.log(`[create-manager] Created manager <${email}> for "${company}", status=${managerStatus}.`);
    }
    console.log('[create-manager] Done. The manager can now sign in at /manager-login.');
    console.log('                Next: have them submit a property claim, which still requires admin approval.');
  } finally {
    await mongoose.disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  const safe = String(err && err.message ? err.message : err).replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, 'mongodb://***');
  console.error('[create-manager:error]', safe);
  process.exit(1);
});
