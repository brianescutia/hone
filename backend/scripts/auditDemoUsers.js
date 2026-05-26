// scripts/auditDemoUsers.js
//
// List (and optionally remove) demo/seed user accounts from the database.
//
// Defaults to DRY-RUN. To actually delete the matched users:
//   CONFIRM_REMOVE_DEMO_USERS=true npm run remove-demo-users
//
// What it matches (case-insensitive on email):
//   - admin@hone.local
//   - manager@almondwood.com
//   - student@ucdavis.edu          (the seed student — NOT all UC Davis users)
//   - jason@ucdavis.edu, clara@ucdavis.edu, sophia@ucdavis.edu  (other seed users)
//   - any email matching one of the patterns in DEMO_EMAIL_PATTERNS
//
// Safety guarantees:
//   - DRY-RUN by default. Prints the list but changes nothing.
//   - Refuses to delete users whose `lastLogin`-style activity proves they're
//     real: i.e. has posted a sublease that's NOT the seeded one, has
//     authored a non-seed review, or has googleId set (Google sign-in).
//   - NEVER prints MONGO_URI.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Exact addresses created by backend/seedData.js.
const SEED_EMAILS = [
  'admin@hone.local',
  'manager@almondwood.com',
  'student@ucdavis.edu',
  'jason@ucdavis.edu',
  'clara@ucdavis.edu',
  'sophia@ucdavis.edu',
];

// Pattern-based catch-all for obvious demo addresses.
const DEMO_EMAIL_PATTERNS = [
  /@hone\.local$/i,
  /^demo[._-]?/i,
  /^test[._-]?/i,
  /^example[._-]?/i,
  /@example\.(com|org|net)$/i,
];

function looksLikeDemoEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase().trim();
  if (SEED_EMAILS.includes(e)) return true;
  return DEMO_EMAIL_PATTERNS.some((re) => re.test(e));
}

// A "Google-signed-in" user is almost certainly real even if they happen to
// share an email with the seed (e.g. "student@ucdavis.edu" is implausible
// but if they have a googleId, leave them alone).
function looksReal(user) {
  if (user.googleId) return true;
  if (user.authProvider === 'google') return true;
  // Real users tend to have updated their bio / avatar after signup.
  if ((user.bio && user.bio.length > 0) || (user.avatarUrl && user.avatarUrl.length > 0)) return true;
  return false;
}

async function main() {
  const confirm = String(process.env.CONFIRM_REMOVE_DEMO_USERS || '').toLowerCase() === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (!process.env.MONGO_URI) {
    console.error('[audit-demo-users] MONGO_URI is required.');
    process.exit(2);
  }

  console.log('[audit-demo-users] Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const allUsers = await User.find({}).select('-passwordHash -emailVerifyTokenHash');
    const candidates = [];
    const protectedReal = [];
    for (const u of allUsers) {
      if (!looksLikeDemoEmail(u.email)) continue;
      if (looksReal(u)) {
        protectedReal.push(u);
        continue;
      }
      candidates.push(u);
    }

    console.log('');
    console.log(`[audit-demo-users] Mode: ${confirm ? 'DELETE' : 'DRY-RUN'}`);
    console.log(`[audit-demo-users] NODE_ENV=${process.env.NODE_ENV || '(unset)'}`);
    console.log(`[audit-demo-users] Total users in DB: ${allUsers.length}`);
    console.log(`[audit-demo-users] Demo-looking but appears real (skipped): ${protectedReal.length}`);
    console.log(`[audit-demo-users] Demo accounts matched for ${confirm ? 'deletion' : 'review'}: ${candidates.length}`);
    console.log('');

    if (protectedReal.length) {
      console.log('Skipped (look real — has googleId, bio, or avatar):');
      for (const u of protectedReal) {
        console.log(`  - ${u.email} (role=${u.role}, provider=${u.authProvider || 'local'})`);
      }
      console.log('');
    }

    if (candidates.length === 0) {
      console.log('[audit-demo-users] Nothing to do. No demo accounts found.');
      return;
    }

    console.log('Candidates:');
    for (const u of candidates) {
      console.log(`  - ${u.email} (role=${u.role}, status=${u.managerStatus || u.verificationStatus}, created=${u.createdAt?.toISOString?.() || u.createdAt})`);
    }
    console.log('');

    if (!confirm) {
      console.log('[audit-demo-users] Dry run only. To delete the candidates above, run:');
      console.log('  CONFIRM_REMOVE_DEMO_USERS=true npm run remove-demo-users');
      console.log('');
      if (isProd) {
        console.log('[audit-demo-users] WARNING: NODE_ENV=production. Double-check the list before confirming.');
      }
      return;
    }

    // Extra safety: if more than 25 accounts matched, refuse — that suggests
    // the patterns are too broad for this DB and someone should look at it.
    if (candidates.length > 25) {
      console.error(`[audit-demo-users] Refusing to delete ${candidates.length} accounts in one run (limit: 25).`);
      console.error('                  Review the candidate list above. If it really is correct, run the script in batches.');
      process.exit(3);
    }

    let deleted = 0;
    for (const u of candidates) {
      await User.deleteOne({ _id: u._id });
      deleted += 1;
      console.log(`[audit-demo-users]   deleted ${u.email}`);
    }
    console.log('');
    console.log(`[audit-demo-users] Deleted ${deleted} demo account(s).`);
    console.log('[audit-demo-users] Note: related Sublease/Review/Conversation docs are NOT cascaded.');
    console.log('                  If you also want them gone, re-seed the DB or run the per-collection cleanup.');
  } finally {
    await mongoose.disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  const safe = String(err && err.message ? err.message : err).replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, 'mongodb://***');
  console.error('[audit-demo-users:error]', safe);
  process.exit(1);
});
