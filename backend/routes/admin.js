const express = require('express');
const Sublease = require('../models/Sublease');
const ClaimRequest = require('../models/ClaimRequest');
const Review = require('../models/Review');
const Report = require('../models/Report');
const User = require('../models/User');
const Listing = require('../models/Listing');
const ExternalLead = require('../models/ExternalLead');
const {
  normalizeApifyMarketplaceResults,
  persistLeads,
  runApifyActor,
} = require('../services/apifyImportService');
const { geocode, DAVIS_CENTER } = require('../services/geocodeService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/pending — everything awaiting review
router.get('/pending', async (_req, res, next) => {
  try {
    const [subleases, claims, reports, listings] = await Promise.all([
      Sublease.find({ moderation: 'pending' })
        .populate('listing', 'name')
        .populate('poster', 'name email studentVerified verificationStatus'),
      ClaimRequest.find({ status: 'pending' })
        .populate('listing', 'name')
        .populate('manager', 'name email company'),
      Report.find({ status: 'open' })
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 }),
      Listing.find({ verificationStatus: 'pending_review' }),
    ]);
    res.json({ subleases, claims, reports, listings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/listings/:id/verify — mark external import as verified
router.patch('/listings/:id/verify', async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'verified' },
      { new: true }
    );
    if (!listing) return res.status(404).json({ error: 'Not found' });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/subleases/:id/approve
router.patch('/subleases/:id/approve', async (req, res, next) => {
  try {
    const sub = await Sublease.findByIdAndUpdate(
      req.params.id,
      { moderation: 'approved' },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({ sublease: sub });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/subleases/:id/reject
router.patch('/subleases/:id/reject', async (req, res, next) => {
  try {
    const sub = await Sublease.findByIdAndUpdate(
      req.params.id,
      { moderation: 'rejected' },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({ sublease: sub });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/claims/:id/approve — approve manager claim, attach listing
router.patch('/claims/:id/approve', async (req, res, next) => {
  try {
    const claim = await ClaimRequest.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Not found' });
    claim.status = 'approved';
    await claim.save();

    await Listing.findByIdAndUpdate(claim.listing, {
      manager: claim.manager,
      claimable: false,
    });
    await User.findByIdAndUpdate(claim.manager, { managerStatus: 'approved' });

    res.json({ claim });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/claims/:id/reject
router.patch('/claims/:id/reject', async (req, res, next) => {
  try {
    const claim = await ClaimRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', adminNote: req.body.adminNote },
      { new: true }
    );
    if (!claim) return res.status(404).json({ error: 'Not found' });
    res.json({ claim });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reviews/:id/remove
router.patch('/reviews/:id/remove', async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { removed: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ error: 'Not found' });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/subleases/:id/hide
router.patch('/subleases/:id/hide', async (req, res, next) => {
  try {
    const sub = await Sublease.findByIdAndUpdate(
      req.params.id,
      { hidden: true },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json({ sublease: sub });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/suspend
router.patch('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended: true, suspendedReason: req.body.reason || '' },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/unsuspend
router.patch('/users/:id/unsuspend', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended: false, suspendedReason: '' },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reports/:id/resolve
router.patch('/reports/:id/resolve', async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status || 'resolved' },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/listings/:id/hide
router.patch('/listings/:id/hide', async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { hidden: !!req.body.hidden },
      { new: true }
    );
    if (!listing) return res.status(404).json({ error: 'Not found' });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-passwordHash');
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/listings
router.get('/listings', async (_req, res, next) => {
  try {
    const listings = await Listing.find().populate('manager', 'name email');
    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// External Leads — admin-only import + review queue
// ============================================================
//
// Leads are housing items pulled from off-platform sources (Apify, manual
// CSV paste, etc.). They are NEVER auto-published. Approving a lead
// creates a Listing/Sublease draft marked `sourceType: external_import`
// with `verificationStatus: unverified`.

// GET /api/admin/external-leads?status=needs_review
router.get('/external-leads', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const leads = await ExternalLead.find(filter)
      .populate('reviewedBy', 'name email')
      .populate('importedListing', 'name')
      .populate('importedSublease', 'title')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/external-leads/import — bulk-import normalized leads.
// Accepts either pre-normalized payloads OR raw Apify-style items via
// `?normalize=apify` query.
router.post('/external-leads/import', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'items array is required' });
    if (items.length > 500)
      return res.status(400).json({ error: 'Max 500 items per import call' });

    const normalized =
      req.query.normalize === 'apify'
        ? normalizeApifyMarketplaceResults(items, {
            sourceName: req.body.sourceName || 'External import',
          })
        : items.filter((i) => i && i.sourceUrl);

    const { imported, duplicates } = await persistLeads(normalized);
    res.status(201).json({
      ok: true,
      imported,
      duplicates,
      attempted: items.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/external-leads/run-apify — optional admin-only Apify run.
// Disabled unless APIFY_TOKEN is configured server-side.
router.post('/external-leads/run-apify', async (req, res, next) => {
  try {
    if (!process.env.APIFY_TOKEN)
      return res.status(503).json({
        error: 'Apify integration disabled (APIFY_TOKEN not set on server).',
      });

    const { sourceType = 'facebook_marketplace', searchUrl, query, location, maxItems = 50 } = req.body;

    let actorId;
    let sourceName;
    if (sourceType === 'facebook_marketplace') {
      actorId = process.env.APIFY_FACEBOOK_MARKETPLACE_ACTOR_ID;
      sourceName = 'Facebook Marketplace';
    } else if (sourceType === 'zillow_like') {
      actorId = process.env.APIFY_ZILLOW_ACTOR_ID;
      sourceName = 'Zillow';
    } else {
      return res.status(400).json({ error: 'Unknown sourceType' });
    }
    if (!actorId)
      return res
        .status(503)
        .json({ error: `No actor configured for ${sourceType}` });

    const input = {
      // Most rental-search actors accept some subset of these; we pass them
      // all and let Apify ignore the unused ones.
      searchUrl,
      query,
      location: location || 'Davis, CA',
      maxItems: Math.min(Number(maxItems) || 50, 200),
    };

    const result = await runApifyActor({ actorId, input, sourceName });
    res.json({ ok: true, ...result, sourceName });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/external-leads/:id/approve
// Creates a Listing draft from the lead, links it back, marks lead approved.
router.patch('/external-leads/:id/approve', async (req, res, next) => {
  try {
    const lead = await ExternalLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.importedListing)
      return res.status(409).json({ error: 'Lead already imported' });

    // Best-effort geocode of the lead's location text. Falls back to Davis
    // center; the admin can drag the marker later (frontend feature).
    const geo = await geocode(lead.locationText);

    const listing = await Listing.create({
      name: lead.title || `Imported from ${lead.sourceName}`,
      address: geo.displayName || lead.locationText || 'Davis, CA',
      location: { lat: geo.lat, lng: geo.lng },
      description: lead.description || '',
      priceMin: Number.isFinite(lead.price) ? lead.price : 0,
      photos: lead.imageUrls || [],
      sourceType: 'external_import',
      sourceName: lead.sourceName,
      sourceUrl: lead.sourceUrl,
      verificationStatus: 'unverified',
      lastImportedAt: new Date(),
      hidden: false,
    });

    lead.status = 'approved';
    lead.importedListing = listing._id;
    lead.reviewedBy = req.user._id;
    lead.reviewedAt = new Date();
    if (req.body.notes) lead.notes = req.body.notes;
    await lead.save();

    res.json({ lead, listing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/external-leads/:id/reject
router.patch('/external-leads/:id/reject', async (req, res, next) => {
  try {
    const lead = await ExternalLead.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        notes: req.body.notes || '',
      },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/external-leads/:id/duplicate
router.patch('/external-leads/:id/duplicate', async (req, res, next) => {
  try {
    const lead = await ExternalLead.findByIdAndUpdate(
      req.params.id,
      {
        status: 'duplicate',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        possibleListingMatch: req.body.possibleListingMatch || null,
      },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/external-leads/:id/claim — mark that a verified
// student/manager has claimed the lead as their own (rare path).
router.patch('/external-leads/:id/claim', async (req, res, next) => {
  try {
    const lead = await ExternalLead.findByIdAndUpdate(
      req.params.id,
      {
        status: 'claimed',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.importedListing) {
      await Listing.findByIdAndUpdate(lead.importedListing, {
        verificationStatus: 'claimed',
      });
    }
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
