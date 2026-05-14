// Apify import service.
//
// PURPOSE
// -------
// Apify offers community-maintained "actors" (scrapers) for sites like
// Facebook Marketplace, Zillow, etc. This file converts their raw output
// into the ExternalLead shape so an admin can review imported items in
// /admin → External Leads BEFORE anything goes public.
//
// SAFETY RULES (enforced here and in routes/admin.js)
// ---------------------------------------------------
// 1. Nothing imported via Apify is auto-published to the public site. Every
//    lead starts as `status: needs_review`.
// 2. Seller contact details (phone, profile URL, etc.) are stripped from
//    the public-facing fields. They can stay in rawData for the admin to
//    cross-reference, but the public path never reads rawData.
// 3. Deduplication by sourceUrl prevents the same Marketplace listing from
//    being imported twice if you run the actor again later.
// 4. The actor itself runs server-side only; APIFY_TOKEN is never sent
//    to the browser.
//
// LEGAL / TOS CAVEATS
// -------------------
// Scraping Facebook Marketplace, Zillow, Craigslist, etc. may violate their
// terms of service and in some jurisdictions implicates the CFAA or
// equivalent laws. Treat Apify imports as a moderator tool only; do not
// scale this up to a "real-time index" without consulting a lawyer.

const ExternalLead = require('../models/ExternalLead');

/**
 * Convert Apify-style raw results into ExternalLead-shaped objects.
 * This is intentionally permissive — Apify actors vary in their output
 * shape, so we try multiple common fields.
 *
 * @param {Array<Object>} results Raw items returned by an Apify actor
 * @param {Object} [opts]
 * @param {string} [opts.sourceName] e.g. "Facebook Marketplace"
 * @returns {Array<Object>} normalized lead payloads (NOT yet saved)
 */
function normalizeApifyMarketplaceResults(results, opts = {}) {
  if (!Array.isArray(results)) return [];
  const sourceName = opts.sourceName || 'External';

  return results
    .map((r) => {
      // Sniff common fields across actor shapes.
      const sourceUrl =
        r.url || r.permalink || r.listingUrl || r.detailUrl || r.link || null;
      if (!sourceUrl) return null; // can't dedupe → skip

      const title = stringy(r.title || r.name || r.headline || r.summary);
      const price = numericish(r.price || r.priceAmount || r.monthlyRent);
      const locationText = stringy(
        r.location || r.locationText || r.city || r.area
      );
      const description = stringy(r.description || r.body || r.text);
      const imageUrls = collectImages(r);

      return {
        title: title.slice(0, 240),
        price: Number.isFinite(price) ? price : null,
        locationText: locationText.slice(0, 240),
        sourceName,
        sourceUrl,
        description: description.slice(0, 4000),
        imageUrls,
        scrapedAt: r.scrapedAt ? new Date(r.scrapedAt) : new Date(),
        // Keep raw payload but strip obvious PII keys.
        rawData: stripPII(r),
      };
    })
    .filter(Boolean);
}

function stringy(v) {
  if (v == null) return '';
  return String(v);
}

function numericish(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  // strip $ and commas; pick the first number found
  const m = String(v).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function collectImages(r) {
  const out = [];
  const candidates = [r.imageUrl, r.image, r.photo, r.thumbnail];
  for (const c of candidates) if (typeof c === 'string') out.push(c);
  if (Array.isArray(r.images)) {
    for (const img of r.images) {
      if (typeof img === 'string') out.push(img);
      else if (img && typeof img.url === 'string') out.push(img.url);
    }
  }
  if (Array.isArray(r.photos)) {
    for (const p of r.photos) if (typeof p === 'string') out.push(p);
  }
  // De-dup, cap at 10 to keep documents small.
  return Array.from(new Set(out)).slice(0, 10);
}

// Best-effort PII scrubbing on the raw payload. We keep what's useful for
// the moderator (title, price, location, photos) and drop anything that
// looks like personal contact info.
function stripPII(r) {
  if (!r || typeof r !== 'object') return {};
  const banned = new Set([
    'sellerPhone',
    'phone',
    'phoneNumber',
    'phone_number',
    'sellerEmail',
    'email',
    'profileUrl',
    'profileURL',
    'sellerProfileUrl',
    'sellerProfileURL',
    'profile',
    'sellerName',
    'sellerId',
    'seller_id',
    'userId',
    'user_id',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    if (banned.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Persist a batch of normalized leads with sourceUrl-based de-duplication.
 * Returns counts so the admin UI can show "imported X new, skipped Y dups".
 */
async function persistLeads(normalized) {
  let imported = 0;
  let duplicates = 0;
  for (const payload of normalized) {
    try {
      await ExternalLead.create({ ...payload, status: 'needs_review' });
      imported++;
    } catch (err) {
      // 11000 = duplicate key (sourceUrl unique). Anything else is real.
      if (err && err.code === 11000) duplicates++;
      else throw err;
    }
  }
  return { imported, duplicates };
}

/**
 * Run an Apify actor on-demand. ONLY called server-side from an admin route.
 *
 * NOTE: We require apify-client lazily so the dependency is optional —
 * the app boots fine without it as long as no one tries to run an import.
 *
 * @param {Object} opts
 * @param {string} opts.actorId Apify actor ID, e.g. process.env.APIFY_FACEBOOK_MARKETPLACE_ACTOR_ID
 * @param {Object} opts.input  Actor-specific input (search URL, query, location, maxItems)
 * @param {string} opts.sourceName Display name for the resulting leads
 */
async function runApifyActor({ actorId, input, sourceName }) {
  if (!process.env.APIFY_TOKEN) {
    throw new Error(
      'APIFY_TOKEN is not set on the server. Apify imports are disabled.'
    );
  }
  if (!actorId) throw new Error('actorId is required');

  let ApifyClient;
  try {
    ({ ApifyClient } = require('apify-client'));
  } catch (_err) {
    throw new Error(
      'apify-client is not installed. Run `npm i apify-client` in /backend to enable imports.'
    );
  }

  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const run = await client.actor(actorId).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const normalized = normalizeApifyMarketplaceResults(items, { sourceName });
  return persistLeads(normalized);
}

module.exports = {
  normalizeApifyMarketplaceResults,
  persistLeads,
  runApifyActor,
};
