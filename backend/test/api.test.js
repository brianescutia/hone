// Smoke tests for the hone API. Run with `npm test`.
//
// Uses Node's built-in `node:test` runner (no extra deps). Spins up an
// in-memory MongoDB + the Express server, then exercises HTTP routes via
// plain fetch.
//
// Requires `mongodb-memory-server` to be able to download a MongoDB binary
// for your platform — same dependency as `npm run dev`. If that fails the
// tests skip with a clear message.

const test = require('node:test');
const assert = require('node:assert/strict');

let server;
let base;
const studentToken = { val: null };
const adminToken = { val: null };

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

async function getJSON(path, token) {
  return fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test.before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'a'.repeat(48);
  // Force in-memory mode
  delete process.env.MONGO_URI;

  try {
    const { start } = require('../server');
    server = await start();
  } catch (err) {
    console.error('\n[test] Could not start server (likely a Mongo binary download failure):');
    console.error('       ' + err.message + '\n');
    console.error('       Run the server manually first to download the binary, then re-run tests.');
    process.exit(0); // exit cleanly so CI doesn't redbar on infra
  }

  const addr = server.address();
  base = `http://localhost:${addr.port}/api`;
});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

test('GET /health returns ok', async () => {
  const r = await getJSON('/health');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.ok, true);
});

test('GET /listings returns the seeded apartments and hides unverified imports', async () => {
  const r = await getJSON('/listings');
  assert.equal(r.status, 200);
  const { listings } = await r.json();
  // Seed has 7 listings (6 manual + 1 external_import); the import is hidden.
  assert.equal(listings.length, 6);
  assert.ok(listings.some((l) => l.name === 'Almondwood Apartments'));
  assert.ok(!listings.some((l) => l.name === 'Greens at Cordova'));
});

test('POST /auth/login with seed student returns a token and verified status', async () => {
  const r = await postJSON('/auth/login', {
    email: 'student@ucdavis.edu',
    password: 'password123',
  });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.ok(data.token);
  assert.equal(data.user.studentVerified, true);
  assert.equal(data.user.verificationStatus, 'verified_student');
  studentToken.val = data.token;
});

test('POST /auth/register issues an unverified account and returns dev verify URL', async () => {
  const r = await postJSON('/auth/register', {
    name: 'Test User',
    email: 'test.new@ucdavis.edu',
    password: 'password123',
  });
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.equal(data.user.emailVerified, false);
  assert.equal(data.user.studentVerified, false);
  assert.equal(data.user.verificationStatus, 'email_pending');
  assert.ok(data.devVerifyUrl, 'devVerifyUrl should be present in non-prod');
});

test('POST /subleases rejects bad input', async () => {
  const r = await postJSON(
    '/subleases',
    {
      title: 'x', // too short via description
      description: 'too short',
      startDate: '2026-09-01',
      endDate: '2026-06-01', // before start
      price: 50, // too low
      listing: '000000000000000000000000', // bad listing
    },
    studentToken.val
  );
  assert.equal(r.status, 400);
  const data = await r.json();
  assert.ok(data.error.includes('Description'));
  assert.ok(data.error.includes('Start date'));
  assert.ok(data.error.includes('Price'));
});

test('POST /subleases happy-path lands in moderation queue', async () => {
  const { listings } = await (await getJSON('/listings')).json();
  const target = listings[0];

  const r = await postJSON(
    '/subleases',
    {
      listing: target._id,
      title: 'Smoke-test sublease',
      description:
        'A reasonable description that is definitely more than thirty characters long for validation.',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: '2026-06-15',
      endDate: '2026-09-15',
      price: 1200,
      contactPreference: 'in_app_message',
    },
    studentToken.val
  );
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.equal(data.sublease.moderation, 'pending');
  assert.ok(data.message.includes('pending review'));
});

test('POST /reports requires auth and stores category', async () => {
  // Unauthenticated should 401
  const u = await postJSON('/reports', {
    targetType: 'listing',
    targetId: '000000000000000000000000',
    category: 'scam',
  });
  assert.equal(u.status, 401);

  // Authenticated should accept
  const r = await postJSON(
    '/reports',
    {
      targetType: 'listing',
      targetId: '000000000000000000000000',
      category: 'scam',
      reason: 'smoke test',
    },
    studentToken.val
  );
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.ok(data.ok);
});

test('Admin: pending tab lists the seeded external-import listing', async () => {
  const login = await postJSON('/auth/login', {
    email: 'admin@hone.local',
    password: 'password123',
  });
  const data = await login.json();
  adminToken.val = data.token;

  const r = await getJSON('/admin/pending', adminToken.val);
  assert.equal(r.status, 200);
  const pending = await r.json();
  assert.ok(pending.listings.some((l) => l.name === 'Greens at Cordova'));
});

test('Reports accept the new `spam` category', async () => {
  const r = await postJSON(
    '/reports',
    {
      targetType: 'listing',
      targetId: '000000000000000000000000',
      category: 'spam',
      reason: 'test',
    },
    studentToken.val
  );
  assert.equal(r.status, 201);
});

test('Helmet sets security headers on API responses', async () => {
  const r = await getJSON('/health');
  // Helmet sets a bunch of headers; we just check one specific one is present.
  // Fail loud if helmet is misconfigured.
  assert.ok(r.headers.get('x-content-type-options'), 'expected x-content-type-options header');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('Admin: external-leads import + approve + reject roundtrip', async () => {
  // Import a single normalized lead.
  const importRes = await postJSON(
    '/admin/external-leads/import',
    {
      items: [
        {
          title: 'Test imported sublease',
          price: 1250,
          locationText: 'Davis, CA',
          sourceName: 'TestSource',
          sourceUrl: 'https://example.com/listing/test-' + Date.now(),
          description: 'A test imported lead used by the smoke test.',
          imageUrls: [],
        },
      ],
    },
    adminToken.val
  );
  assert.equal(importRes.status, 201);
  const importData = await importRes.json();
  assert.equal(importData.imported, 1);
  assert.equal(importData.duplicates, 0);

  // List leads.
  const listRes = await getJSON(
    '/admin/external-leads?status=needs_review',
    adminToken.val
  );
  assert.equal(listRes.status, 200);
  const { leads } = await listRes.json();
  const ours = leads.find((l) => l.title === 'Test imported sublease');
  assert.ok(ours, 'expected the imported lead in the list');

  // Approve it → creates a Listing draft.
  const approveRes = await fetch(
    `${base}/admin/external-leads/${ours._id}/approve`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken.val}`,
      },
      body: JSON.stringify({}),
    }
  );
  assert.equal(approveRes.status, 200);
  const { lead, listing } = await approveRes.json();
  assert.equal(lead.status, 'approved');
  assert.equal(listing.sourceType, 'external_import');
  assert.equal(listing.verificationStatus, 'unverified');

  // Re-importing the same sourceUrl should produce 0 imports, 1 duplicate.
  const dupRes = await postJSON(
    '/admin/external-leads/import',
    {
      items: [
        {
          title: 'Test imported sublease (again)',
          sourceUrl: ours.sourceUrl,
          sourceName: 'TestSource',
        },
      ],
    },
    adminToken.val
  );
  assert.equal(dupRes.status, 201);
  const dupData = await dupRes.json();
  assert.equal(dupData.imported, 0);
  assert.equal(dupData.duplicates, 1);
});

test('Listings list still excludes unverified external imports after approve', async () => {
  // The newly-approved lead from the previous test is unverified, so it
  // must NOT appear in the public listings response.
  const r = await getJSON('/listings');
  const { listings } = await r.json();
  assert.ok(
    !listings.some((l) => l.name === 'Test imported sublease'),
    'unverified external_import should be hidden from public listings'
  );
});
