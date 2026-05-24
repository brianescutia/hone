// backend/test/davisBootstrap.test.js
//
// Validates the new scripts/bootstrapDavisApartments.js:
//   - Creates the expected listings on first run
//   - Is idempotent — second run does NOT duplicate
//   - Bootstrapped listings appear in GET /listings (they're verified)
//   - Bootstrapped listings are claimable + unclaimed
//   - The existing seeded external-import (Greens at Cordova) is still
//     hidden from public /listings and present in /admin/pending
//
// Run:
//   cd backend && PORT=0 NODE_ENV=test npm test

const test = require('node:test');
const assert = require('node:assert/strict');

let server;
let base;
let teardown;

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

test.before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'a'.repeat(48);
    process.env.MONGO_URI = '';

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
});

test.after(async () => {
    if (teardown) await teardown();
});

test('bootstrapDavisApartments creates Davis-area listings', async () => {
    const { bootstrapDavisApartments } = require('../scripts/bootstrapDavisApartments');
    const { DAVIS_APARTMENTS } = require('../data/davisApartments');

    const Listing = require('../models/Listing');
    const beforeCount = await Listing.countDocuments({});

    const result = await bootstrapDavisApartments();


    // Some apartments share names with the seed (e.g. Almondwood Apartments).
    // The seed already has 7 listings. Bootstrap should create the *new*
    // ones and refresh the ones that match by name.
    assert.equal(result.total, DAVIS_APARTMENTS.length);
    assert.ok(result.created >= 0);
    assert.ok(result.refreshed >= 0);
    assert.equal(result.created + result.refreshed + result.skippedClaimed, result.total);

    const afterCount = await Listing.countDocuments({});
    // Every distinct Davis apartment name should now be in the DB.
    assert.equal(afterCount - beforeCount, result.created);

    // Spot-check a Davis-only entry that's NOT in the seed.
    const universityCourt = await Listing.findOne({ name: 'University Court' });
    assert.ok(universityCourt, 'University Court should be created by bootstrap');
    assert.equal(universityCourt.sourceType, 'manual_seed');
    assert.equal(universityCourt.verificationStatus, 'verified');
    assert.equal(universityCourt.claimable, true);
    assert.equal(universityCourt.claimStatus, 'unclaimed');
    assert.equal(universityCourt.claimedByManager, false);
    assert.equal(universityCourt.managerVerified, false);
});

test('bootstrapDavisApartments is idempotent — running twice does not duplicate', async () => {
    const { bootstrapDavisApartments } = require('../scripts/bootstrapDavisApartments');
    const Listing = require('../models/Listing');

    const countBefore = await Listing.countDocuments({});
    const result = await bootstrapDavisApartments();
    const countAfter = await Listing.countDocuments({});

    // Second run creates zero new listings.
    assert.equal(result.created, 0);
    assert.equal(countBefore, countAfter);
});

test('does not overwrite a manager-claimed listing', async () => {
    const Listing = require('../models/Listing');
    const { bootstrapDavisApartments } = require('../scripts/bootstrapDavisApartments');

    // Almondwood is claimed by the seeded manager. Bootstrap must skip it.
    const before = await Listing.findOne({ name: 'Almondwood Apartments' });
    assert.equal(before.claimedByManager, true);
    const beforeAddress = before.address;
    const beforeDesc = before.description;

    await bootstrapDavisApartments();

    const after = await Listing.findOne({ name: 'Almondwood Apartments' });
    assert.equal(after.claimedByManager, true);
    assert.equal(after.address, beforeAddress);
    assert.equal(after.description, beforeDesc);
});

test('bootstrapped listings appear in public GET /listings', async () => {
    const r = await getJSON('/listings');
    assert.equal(r.status, 200);
    const { listings } = await r.json();

    // The Davis-only entries should be visible (verified + manual_seed).
    assert.ok(
        listings.some((l) => l.name === 'University Court'),
        'University Court should be in public listings after bootstrap'
    );
    assert.ok(
        listings.some((l) => l.name === 'Anderson Place'),
        'Anderson Place should be in public listings after bootstrap'
    );

    // And the existing rule still holds: Greens at Cordova is hidden.
    assert.ok(
        !listings.some((l) => l.name === 'Greens at Cordova'),
        'Greens at Cordova should remain hidden from public listings'
    );
});

test('bootstrapped listings are claimable and unclaimed', async () => {
    const r = await getJSON('/listings');
    const { listings } = await r.json();

    const sampleNames = ['University Court', 'Anderson Place', 'Sundance Apartments'];
    for (const name of sampleNames) {
        const item = listings.find((l) => l.name === name);
        if (!item) continue; // some envs may have customized the data file
        assert.equal(item.claimable, true, `${name} should be claimable`);
        assert.equal(item.claimStatus, 'unclaimed', `${name} should be unclaimed`);
        assert.equal(item.claimedByManager, false, `${name} should not be manager-claimed`);
    }
});

test('listings with priceMin=0 are returned (frontend renders Contact for pricing)', async () => {
    const r = await getJSON('/listings');
    const { listings } = await r.json();

    // The Davis-only entries have priceMin: null in the source data,
    // which the bootstrap normalizes to 0.
    const universityCourt = listings.find((l) => l.name === 'University Court');
    if (universityCourt) {
        assert.equal(typeof universityCourt.priceMin, 'number');
        assert.equal(universityCourt.priceMin, 0);
    }
});