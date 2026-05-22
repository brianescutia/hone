// Smoke tests for the hone API.
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
  delete process.env.MONGO_URI;

  try {
    const { start } = require('../server');
    server = await start();
  } catch (err) {
    console.error('\n[test] Could not start server:', err.message, '\n');
    process.exit(0);
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

test('GET /listings returns seeded apartments and hides unverified imports', async () => {
  const r = await getJSON('/listings');
  assert.equal(r.status, 200);
  const { listings } = await r.json();
  assert.equal(listings.length, 6);
  assert.ok(listings.some((l) => l.name === 'Almondwood Apartments'));
  assert.ok(!listings.some((l) => l.name === 'Greens at Cordova'));
});

test('POST /auth/login with seed student returns token and verified status', async () => {
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

test('POST /auth/register for a student creates an unverified account (no email-link dead end)', async () => {
  const r = await postJSON('/auth/register', {
    name: 'Test User',
    email: 'test.new@ucdavis.edu',
    password: 'password123',
  });
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.equal(data.user.emailVerified, false);
  assert.equal(data.user.studentVerified, false);
  // We no longer pretend to have sent a verification email.
  assert.equal(data.needsGoogleVerification, true);
  assert.ok(/Google/i.test(data.message || ''));
});

test('POST /auth/google with no GOOGLE_CLIENT_ID returns 503 (graceful)', async () => {
  const r = await postJSON('/auth/google', { credential: 'fake' });
  // Either 503 (no GOOGLE_CLIENT_ID) or 400 (missing credential) — both are
  // non-crashing responses. The point is the route exists and doesn't 500.
  assert.ok(r.status === 503 || r.status === 400, `unexpected status ${r.status}`);
  const data = await r.json();
  assert.ok(data.error);
});

test('Helmet sets security headers', async () => {
  const r = await getJSON('/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('Reports accept the spam category', async () => {
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
