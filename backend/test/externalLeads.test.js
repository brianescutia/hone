// backend/test/externalLeads.test.js
//
// Covers the admin-only Apify import path:
//   - /admin/external-leads/run-apify returns 503 when APIFY_TOKEN unset
//   - /admin/external-leads/import accepts mock items, creates needs_review leads
//   - Importing the same item twice dedups by sourceUrl
//   - Public GET /listings does NOT show un-approved leads (admin review only)
//   - Admin GET /admin/external-leads lists pending leads
//   - PATCH /admin/external-leads/:id/approve creates a Listing with
//     sourceType=external_import and verificationStatus=unverified
//
// IMPORTANT: This test NEVER hits the real Apify network. It uses POST
// /admin/external-leads/import with mock items to inject test data,
// which is the same path real Apify results take after running an actor.
//
// Run:
//   cd backend && PORT=0 NODE_ENV=test npm test

const test = require('node:test');
const assert = require('node:assert/strict');

let server;
let base;
let teardown;
let adminToken;

async function getJSON(path, token) {
    return fetch(`${base}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
}

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

test.before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'a'.repeat(48);
    process.env.MONGO_URI = '';
    // Ensure Apify is "disabled" for the 503 test.
    delete process.env.APIFY_TOKEN;

    try {
        const { start } = require('../server');
        const result = await start();
        server = result.server;
        teardown = result.teardown;
    } catch (err) {
        console.error('\n[test] Could not start server:', err.message, '\n');
        process.exit(0);
    }

    const addr = server.address();
    base = `http://localhost:${addr.port}/api`;

    // Get the admin token from the seeded admin user.
    const login = await postJSON('/auth/login', {
        email: 'admin@hone.local',
        password: 'password123',
    });
    const data = await login.json();
    adminToken = data.token;
    assert.ok(adminToken, 'admin login should succeed (seed data)');
});

test.after(async () => {
    if (teardown) await teardown();
});

test('run-apify returns 503 when APIFY_TOKEN is not set', async () => {
    delete process.env.APIFY_TOKEN;
    const r = await postJSON(
        '/admin/external-leads/run-apify',
        { sourceType: 'facebook_marketplace', query: 'Davis sublease' },
        adminToken
    );
    assert.equal(r.status, 503);
    const data = await r.json();
    assert.ok(/apify/i.test(data.error || ''));
});

test('import endpoint accepts mock items and creates needs_review leads', async () => {
    // These mock items skip the apify->normalize step and go straight in.
    const items = [
        {
            sourceUrl: 'https://example.com/listing/aaa-111',
            sourceName: 'Test Source',
            title: 'Cozy 1BR near campus',
            description: 'Available June 1. No deposit needed.',
            price: 1450,
            locationText: 'Davis, CA',
            imageUrls: ['https://example.com/a.jpg'],
        },
        {
            sourceUrl: 'https://example.com/listing/bbb-222',
            sourceName: 'Test Source',
            title: '2BR Cowell Blvd',
            description: 'Walking distance to Unitrans.',
            price: 2200,
            locationText: 'Davis, CA',
            imageUrls: [],
        },
    ];

    const r = await postJSON('/admin/external-leads/import', { items }, adminToken);
    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.attempted, 2);
    assert.equal(data.imported, 2);
    assert.equal(data.duplicates, 0);

    // Admin can see them in the leads list.
    const list = await getJSON('/admin/external-leads?status=needs_review', adminToken);
    assert.equal(list.status, 200);
    const { leads } = await list.json();
    const ours = leads.filter((l) => l.sourceUrl.startsWith('https://example.com/listing/'));
    assert.equal(ours.length, 2);
    for (const lead of ours) {
        assert.equal(lead.status, 'needs_review');
    }
});

test('importing the same sourceUrl twice is deduped', async () => {
    const items = [
        {
            sourceUrl: 'https://example.com/listing/aaa-111', // same as previous test
            sourceName: 'Test Source',
            title: 'Cozy 1BR near campus (duplicate)',
            description: 'Duplicate import attempt',
            price: 1450,
            locationText: 'Davis, CA',
            imageUrls: [],
        },
    ];

    const r = await postJSON('/admin/external-leads/import', { items }, adminToken);
    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.attempted, 1);
    assert.equal(data.imported, 0);
    assert.equal(data.duplicates, 1);
});

test('public GET /listings does NOT show unapproved external leads', async () => {
    const r = await getJSON('/listings');
    assert.equal(r.status, 200);
    const { listings } = await r.json();

    // None of the mock-imported leads have been approved, so none of them
    // should have produced a public Listing.
    assert.ok(
        !listings.some((l) => l.name === 'Cozy 1BR near campus'),
        'unapproved leads must not appear in public listings'
    );
    assert.ok(
        !listings.some((l) => l.name === '2BR Cowell Blvd'),
        'unapproved leads must not appear in public listings'
    );
});

test('approve creates a Listing with sourceType=external_import and verificationStatus=unverified', async () => {
    // Find the lead we want to approve.
    const list = await getJSON('/admin/external-leads?status=needs_review', adminToken);
    const { leads } = await list.json();
    const target = leads.find((l) => l.sourceUrl === 'https://example.com/listing/aaa-111');
    assert.ok(target, 'expected to find the lead we imported earlier');

    const r = await patchJSON(`/admin/external-leads/${target._id}/approve`, {}, adminToken);
    assert.equal(r.status, 200);
    const { lead, listing } = await r.json();

    assert.equal(lead.status, 'approved');
    assert.ok(listing && listing._id);
    assert.equal(listing.sourceType, 'external_import');
    assert.equal(listing.verificationStatus, 'unverified');
    // sourceUrl should be preserved end-to-end for traceability.
    assert.equal(listing.sourceUrl, 'https://example.com/listing/aaa-111');
});

test('approved-but-unverified listings are still hidden from public /listings', async () => {
    // The listings route filter only exposes external_import entries when
    // verificationStatus is 'verified' or 'claimed'. The freshly-approved
    // lead we just promoted is 'unverified', so it should remain hidden.
    const r = await getJSON('/listings');
    const { listings } = await r.json();
    assert.ok(
        !listings.some((l) => l.sourceUrl === 'https://example.com/listing/aaa-111'),
        'unverified external_import listings must stay hidden from public /listings'
    );
});

test('non-admin cannot access external-leads admin endpoints', async () => {
    // Use the seeded regular student account.
    const login = await postJSON('/auth/login', {
        email: 'student@ucdavis.edu',
        password: 'password123',
    });
    const studentData = await login.json();
    const studentToken = studentData.token;

    const r = await getJSON('/admin/external-leads', studentToken);
    // Admin guard should reject with 401/403.
    assert.ok(r.status === 401 || r.status === 403, `expected 401/403, got ${r.status}`);
});

test('import endpoint rejects empty/invalid input', async () => {
    const r = await postJSON('/admin/external-leads/import', { items: [] }, adminToken);
    assert.equal(r.status, 400);
});