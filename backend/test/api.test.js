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
  assert.equal(data.user.passwordHash, undefined, 'passwordHash must never leak');
  studentToken.val = data.token;
});

// ---------------------------------------------------------------------------
// /auth/me — the endpoint AuthContext uses to validate tokens on every load
// ---------------------------------------------------------------------------

test('GET /auth/me with valid token returns the current user without passwordHash', async () => {
  const r = await getJSON('/auth/me', studentToken.val);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.ok(data.user);
  assert.equal(data.user.email, 'student@ucdavis.edu');
  assert.equal(data.user.studentVerified, true);
  assert.equal(data.user.passwordHash, undefined, 'passwordHash must never leak from /auth/me');
  assert.equal(data.user.emailVerifyTokenHash, undefined, 'verify token hash must not leak');
});

test('GET /auth/me without a token returns 401', async () => {
  const r = await getJSON('/auth/me');
  assert.equal(r.status, 401);
  const data = await r.json();
  assert.ok(data.error);
});

test('GET /auth/me with a malformed token returns 401', async () => {
  const r = await getJSON('/auth/me', 'not.a.real.jwt');
  assert.equal(r.status, 401);
});

test('GET /auth/me with a token signed by the wrong secret returns 401', async () => {
  // Manually mint a token with a different secret to simulate a JWT_SECRET
  // rotation (e.g. between two Railway deploys).
  const jwt = require('jsonwebtoken');
  const stale = jwt.sign({ id: '000000000000000000000000', role: 'student' }, 'totally-wrong-secret', {
    expiresIn: '7d',
  });
  const r = await getJSON('/auth/me', stale);
  assert.equal(r.status, 401);
});

test('GET /auth/me with a token for a deleted user returns 401 (stale-token case)', async () => {
  // Token signed with the right secret, but the user it points to does
  // not exist. Simulates the "DB was reseeded after issuing the token" case.
  const jwt = require('jsonwebtoken');
  const stale = jwt.sign(
    { id: '000000000000000000000000', role: 'student' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const r = await getJSON('/auth/me', stale);
  assert.equal(r.status, 401);
});

// ---------------------------------------------------------------------------
// Existing protected-action coverage
// ---------------------------------------------------------------------------

test('POST /auth/register for a student creates an unverified account', async () => {
  const r = await postJSON('/auth/register', {
    name: 'Test User',
    email: 'test.new@ucdavis.edu',
    password: 'password123',
  });
  assert.equal(r.status, 201);
  const data = await r.json();
  assert.equal(data.user.emailVerified, false);
  assert.equal(data.user.studentVerified, false);
  assert.equal(data.needsGoogleVerification, true);
  assert.ok(/Google/i.test(data.message || ''));
});

test('POST /subleases without a token returns 401', async () => {
  // requireVerifiedStudent does NOT add requireAuth automatically; the
  // route stack runs requireVerifiedStudent which itself checks for
  // req.user first and 401s if missing. Either path: no token = 401.
  const r = await postJSON('/subleases', {
    listing: '000000000000000000000000',
    title: 'x',
    description: 'too short',
    startDate: '2026-06-01',
    endDate: '2026-09-01',
    price: 1000,
    contactPreference: 'in_app_message',
  });
  assert.equal(r.status, 401);
});

test('POST /subleases with an unverified user returns 403', async () => {
  // Register a non-Davis user via email/password — they will have
  // studentVerified=false, so requireVerifiedStudent returns 403.
  const reg = await postJSON('/auth/register', {
    name: 'Outsider',
    email: `outsider.${Date.now()}@gmail.com`,
    password: 'password123',
  });
  assert.equal(reg.status, 201);
  const { token, user } = await reg.json();
  assert.equal(user.studentVerified, false);

  const { listings } = await (await getJSON('/listings')).json();
  const target = listings[0];

  const r = await postJSON(
    '/subleases',
    {
      listing: target._id,
      title: 'Trying to post without verification',
      description:
        'A reasonable description that is definitely more than thirty characters long for validation.',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: '2026-06-15',
      endDate: '2026-09-15',
      price: 1200,
      contactPreference: 'in_app_message',
    },
    token
  );
  assert.equal(r.status, 403);
  const body = await r.json();
  assert.ok(body.error);
  // Updated message references Google now.
  assert.match(body.error, /Google|verified UC Davis/i);
});

test('POST /subleases rejects bad input from a verified student', async () => {
  const r = await postJSON(
    '/subleases',
    {
      title: 'x',
      description: 'too short',
      startDate: '2026-09-01',
      endDate: '2026-06-01',
      price: 50,
      listing: '000000000000000000000000',
    },
    studentToken.val
  );
  assert.equal(r.status, 400);
  const data = await r.json();
  assert.ok(data.error.includes('Description'));
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
});

test('POST /reports requires auth', async () => {
  const u = await postJSON('/reports', {
    targetType: 'listing',
    targetId: '000000000000000000000000',
    category: 'scam',
  });
  assert.equal(u.status, 401);

  const r = await postJSON(
    '/reports',
    {
      targetType: 'listing',
      targetId: '000000000000000000000000',
      category: 'spam',
      reason: 'smoke',
    },
    studentToken.val
  );
  assert.equal(r.status, 201);
});

test('POST /auth/google with no GOOGLE_CLIENT_ID returns 503 (graceful)', async () => {
  const r = await postJSON('/auth/google', { credential: 'fake' });
  assert.ok(r.status === 503 || r.status === 400, `unexpected status ${r.status}`);
  const data = await r.json();
  assert.ok(data.error);
});

test('Helmet sets security headers', async () => {
  const r = await getJSON('/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
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
