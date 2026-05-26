#!/usr/bin/env node
// backend/scripts/bootstrapDavisApartments.js
//
// Idempotent bootstrap of Davis-area apartment reference data.
//
// Reads backend/data/davisApartments.js (DAVIS_APARTMENTS array) and
// upserts each entry into the Listing collection, keyed by `name`.
//
// SAFETY GUARANTEES:
//   - Stable key is `name`. Running this script repeatedly does NOT
//     create duplicates.
//   - Existing listings claimed by a manager are NEVER overwritten.
//     We only touch listings where `claimedByManager: false`, or
//     create new ones.
//   - No invented prices, photos, ratings, or reviews. Whatever the
//     data file says, that's what goes in. Unknown prices are stored
//     as 0 and rendered as "Contact for pricing" by the frontend.
//   - All bootstrapped listings are marked:
//       sourceType:        'manual_seed'   (reference data, not scraped)
//       verificationStatus: 'verified'     (these are real complexes)
//       claimable:          true
//       claimStatus:        'unclaimed'
//       claimedByManager:   false
//       managerVerified:    false
//     So managers can later claim them through the normal flow.
//
// USAGE:
//   cd backend
//   # Against a real Mongo instance:
//   MONGO_URI=mongodb://localhost:27017/hone node scripts/bootstrapDavisApartments.js
//   # Or use the npm script (see package.json patch):
//   npm run bootstrap:davis

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const { DAVIS_APARTMENTS } = require('../data/davisApartments');

const SAFE_FIELDS_TO_REFRESH_ON_UNCLAIMED = [
    'address',
    'location',
    'description',
    'bedroomsMin',
    'bedroomsMax',
    'bathroomsMin',
    'bathroomsMax',
    'amenities',
    'keyAmenities',
    'tags',
    'petFriendly',
    'commute',
    'sourceUrl',
    'contactEmail',
    'contactPhone',
    'photos'
];

function pickSafeFields(src) {
    const out = {};
    for (const k of SAFE_FIELDS_TO_REFRESH_ON_UNCLAIMED) {
        if (src[k] !== undefined && src[k] !== null) out[k] = src[k];
    }
    return out;
}

function normalize(apt) {
    // Coerce nulls in numeric fields to schema-compatible values without
    // inventing data. priceMin=0 is the agreed "unknown" sentinel that
    // the frontend renders as "Contact for pricing".
    return {
        name: apt.name,
        address: apt.address,
        location: apt.location,
        description: apt.description || '',
        priceMin: typeof apt.priceMin === 'number' ? apt.priceMin : 0,
        priceMax: typeof apt.priceMax === 'number' ? apt.priceMax : undefined,
        bedroomsMin: apt.bedroomsMin,
        bedroomsMax: apt.bedroomsMax,
        bathroomsMin: apt.bathroomsMin,
        bathroomsMax: apt.bathroomsMax,
        amenities: apt.amenities || [],
        keyAmenities: apt.keyAmenities || [],
        tags: apt.tags || ['long term'],
        petFriendly: apt.petFriendly === true,
        commute: apt.commute || {},
        sourceUrl: apt.sourceUrl || '',
        contactEmail: apt.contactEmail || '',
        contactPhone: apt.contactPhone || '',
        photos: apt.photos || [],
        // Trust labels — never lie:
        sourceType: 'manual_seed',
        sourceName: 'Davis apartment directory',
        verificationStatus: 'verified',
        claimable: true,
        claimStatus: 'unclaimed',
        claimedByManager: false,
        managerVerified: false,
    };
}

async function bootstrapDavisApartments({ dryRun = false } = {}) {
    let created = 0;
    let refreshed = 0;
    let skippedClaimed = 0;

    for (const apt of DAVIS_APARTMENTS) {
        const normalized = normalize(apt);
        const existing = await Listing.findOne({ name: normalized.name });

        if (!existing) {
            if (!dryRun) await Listing.create(normalized);
            created += 1;
            continue;
        }

        if (existing.claimedByManager) {
            // Never overwrite a listing that a real manager has claimed.
            skippedClaimed += 1;
            continue;
        }

        // Safe partial refresh: only fields that won't surprise users.
        const updates = pickSafeFields(normalized);
        if (Object.keys(updates).length > 0) {
            if (!dryRun) await Listing.updateOne({ _id: existing._id }, { $set: updates });
            refreshed += 1;
        }
    }

    return { created, refreshed, skippedClaimed, total: DAVIS_APARTMENTS.length };
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error(
            '[bootstrap:davis] MONGO_URI is not set. This script writes to a real database,\n' +
            '                 so it does not start an in-memory MongoDB. Set MONGO_URI in\n' +
            '                 backend/.env (e.g. mongodb://localhost:27017/hone) and re-run.'
        );
        process.exit(2);
    }

    console.log('[bootstrap:davis] connecting to MongoDB…');
    await mongoose.connect(mongoUri);
    try {
        const result = await bootstrapDavisApartments({ dryRun });
        console.log(`[bootstrap:davis] done (dryRun=${dryRun})`);
        console.log(`  total in reference data: ${result.total}`);
        console.log(`  created:                 ${result.created}`);
        console.log(`  refreshed (unclaimed):   ${result.refreshed}`);
        console.log(`  skipped (manager-claimed): ${result.skippedClaimed}`);
    } finally {
        await mongoose.disconnect();
    }
}

// Exported for tests; CLI only runs when invoked directly.
module.exports = { bootstrapDavisApartments, normalize };

if (require.main === module) {
    main().catch((err) => {
        console.error('[bootstrap:davis] failed:', err);
        process.exit(1);
    });
}