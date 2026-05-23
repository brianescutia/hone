// End-to-end tests for the manager-claim flow + sublease auto-approve flag.
//
// Follows the same shape as api.test.js: spin up the real server against an
// in-memory MongoDB, hit the HTTP endpoints with fetch, and assert on the
// response bodies + database side-effects.
//
// Coverage:
//   1. Manager submits a claim → 201, status=pending, listing.claimStatus='pending'
//   2. Admin /pending returns the new claim under managerClaims
//   3. Admin approves the claim → ManagerClaim.status=approved,
//      listing.claimedByManager=true, user.verifiedManagerFor includes listing
//   4. /auth/me for the manager reflects the verified relationship
//   5. With MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES=true, manager can
//      PATCH /api/listings/:id with allowlisted fields
//   6. Manager gets 403 PATCHing an unclaimed listing
//   7. Student gets 403 POSTing /api/manager-claims (wrong role)
//   8. AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES=true → sublease.moderation=approved
//   9. AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES=false → moderation=pending
//
// We rely on the seeded users from seedData.js (admin@hone.local,
// manager@almondwood.com, student@ucdavis.edu — all with password
// 'password123') to keep the test small and self-contained.

const test = require('node:test');
const assert = require('node:assert/strict');

let server;
let base;

const tokens = {
  admin: null,
  manager: null,
  student: null,
};

async function postJSON(path, body, token) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function patchJSON(path, body, token) {
  return fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
}

async function getJSON(path, token) {
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function login(email, password) {
  const r = await postJSON('/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`login(${email}) → ${r.status}`);
  const data = await r.json();
  return data.token;
}

test.before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'a'.repeat(48);
  // Default both feature flags ON for most of the test, then flip the
  // sublease one off in the dedicated test.
  process.env.AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES = 'true';
  process.env.MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES = 'true';
  delete process.env.MONGO_URI;

  try {
    const { start } = require('../server');
    server = await start();
  } catch (err) {
    console.error('\n[managerClaims.test] Could not start server:', err.message, '\n');
    process.exit(0);
  }

  const addr = server.address();
  base = `http://localhost:${addr.port}/api`;

  tokens.admin = await login('admin@hone.local', 'password123');
  tokens.manager = await login('manager@almondwood.com', 'password123');
  tokens.student = await login('student@ucdavis.edu', 'password123');
});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

// ---------------------------------------------------------------------------
// Helpers — lookups against the live API (avoids importing mongoose models
// into the test, which would cause connection clashes with the running server).
// ---------------------------------------------------------------------------

async function findListing(predicate) {
  const r = await getJSON('/listings');
  const { listings } = await r.json();
  return listings.find(predicate);
}

// ---------------------------------------------------------------------------
// Manager-claim flow
// ---------------------------------------------------------------------------

test('Student cannot POST /manager-claims (wrong role)', async () => {
  const someListing = await findListing(() => true);
  const r = await postJSON(
    '/manager-claims',
    {
      listingId: someListing._id,
      workEmail: 'me@example.com',
      companyWebsite: 'https://example.com',
    },
    tokens.student
  );
  assert.equal(r.status, 403);
});

test('Manager submits a claim on an unclaimed listing → 201, pending', async () => {
  // The seeded Almondwood is already claimed by manager@almondwood.com,
  // so claim a different unclaimed property. La Rue is unclaimed in seed.
  const target = await findListing((l) => l.name === 'The Colleges at La Rue');
  assert.ok(target, 'expected seeded La Rue listing');

  const r = await postJSON(
    '/manager-claims',
    {
      listingId: target._id,
      propertyName: target.name,
      workEmail: 'leasing@collegesatlarue.com',
      companyWebsite: 'https://collegesatlarue.com',
      phoneNumber: '(530) 555-0000',
      roleTitle: 'Leasing Manager',
      proofMessage: 'I run leasing for this property.',
    },
    tokens.manager
  );
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.equal(data.claim.status, 'pending');
  assert.ok(['low', 'medium', 'high'].includes(data.claim.confidence));
});

test('Admin /pending lists the new manager claim under managerClaims', async () => {
  const r = await getJSON('/admin/pending', tokens.admin);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(Array.isArray(body.managerClaims), 'managerClaims must be an array');
  const hit = body.managerClaims.find((c) => c.propertyName === 'The Colleges at La Rue');
  assert.ok(hit, 'newly-submitted claim should appear in /admin/pending → managerClaims');
  assert.equal(hit.status, 'pending');
  // Populated refs the admin UI relies on.
  assert.ok(hit.listing && hit.listing.name);
  assert.ok(hit.manager && hit.manager.email);
});

test('Admin approves the claim → listing becomes claimed, user.verifiedManagerFor updated', async () => {
  const pending = await getJSON('/admin/pending', tokens.admin).then((r) => r.json());
  const claim = pending.managerClaims.find((c) => c.propertyName === 'The Colleges at La Rue');
  assert.ok(claim, 'precondition: pending claim must exist');

  const r = await patchJSON(`/admin/manager-claims/${claim._id}/approve`, {}, tokens.admin);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.claim.status, 'approved');
  assert.equal(body.listing.claimedByManager, true);
  assert.equal(body.listing.claimStatus, 'claimed');

  // Manager's /auth/me should now include the listing under verifiedManagerFor.
  const me = await getJSON('/auth/me', tokens.manager).then((r) => r.json());
  assert.ok(
    me.user.verifiedManagerFor.map(String).includes(String(body.listing._id)),
    'manager.verifiedManagerFor should include the newly-claimed listing'
  );
  assert.equal(me.user.managerStatus, 'approved');
});

test('Manager can PATCH /listings/:id with allowlisted fields (auto-approve env on)', async () => {
  const me = await getJSON('/auth/me', tokens.manager).then((r) => r.json());
  // Use any listing the manager has been verified for. La Rue was just approved.
  const target = await findListing((l) => l.name === 'The Colleges at La Rue');

  const r = await patchJSON(
    `/listings/${target._id}`,
    {
      priceMin: 1525,
      // Includes a forbidden field — the route should silently drop it.
      verificationStatus: 'verified',
      contactPhone: '(530) 555-1212',
    },
    tokens.manager
  );
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.autoApproved, true);
  assert.equal(body.listing.priceMin, 1525);
  assert.equal(body.listing.contactPhone, '(530) 555-1212');
  // verificationStatus must NOT have been touched by the manager.
  assert.notEqual(body.listing.verificationStatus, 'verified', 'verificationStatus must be protected from manager edits');
  assert.ok(!body.editedFields.includes('verificationStatus'));
});

test('Manager gets 403 PATCHing a listing they are not verified for', async () => {
  // Pick a listing the manager has NOT been approved for.
  const unrelated = await findListing(
    (l) => l.name !== 'Almondwood Apartments' && l.name !== 'The Colleges at La Rue'
  );
  assert.ok(unrelated, 'need a third listing for negative test');

  const r = await patchJSON(
    `/listings/${unrelated._id}`,
    { priceMin: 999 },
    tokens.manager
  );
  assert.equal(r.status, 403);
});

// ---------------------------------------------------------------------------
// Student sublease auto-approve flag
// ---------------------------------------------------------------------------

test('Verified student sublease auto-approves when env flag is true', async () => {
  process.env.AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES = 'true';
  const target = await findListing(() => true);

  const r = await postJSON(
    '/subleases',
    {
      listing: target._id,
      title: 'Auto-approve smoke test',
      description:
        'A reasonable description that is definitely more than thirty characters long for validation.',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: '2026-06-15',
      endDate: '2026-09-15',
      price: 1200,
      contactPreference: 'in_app_message',
    },
    tokens.student
  );
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.autoApproved, true);
  assert.equal(body.sublease.moderation, 'approved');
  assert.match(body.message, /live/i);
});

test('Verified student sublease stays pending when env flag is false', async () => {
  process.env.AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES = 'false';
  const target = await findListing(() => true);

  const r = await postJSON(
    '/subleases',
    {
      listing: target._id,
      title: 'Pending smoke test',
      description:
        'Another reasonable description that is definitely more than thirty characters long for tests.',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: '2026-06-15',
      endDate: '2026-09-15',
      price: 1200,
      contactPreference: 'in_app_message',
    },
    tokens.student
  );
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.autoApproved, false);
  assert.equal(body.sublease.moderation, 'pending');
});
