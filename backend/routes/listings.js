const express = require('express');
const Listing = require('../models/Listing');
const Sublease = require('../models/Sublease');
const Review = require('../models/Review');
const {
  attachUser,
  requireAuth,
  requireVerifiedManagerOfListing,
} = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// GET /api/listings — filterable listing search
// Supported query params:
//   q, longTerm, sublease, bedrooms, priceMin, priceMax, rating, maxBusMinutes, petFriendly
router.get('/', attachUser, async (req, res, next) => {
  try {
    const {
      q,
      longTerm,
      sublease,
      bedrooms,
      priceMin,
      priceMax,
      rating,
      maxBusMinutes,
      petFriendly,
    } = req.query;

    const filter = {
      hidden: { $ne: true },
      // Hide external imports that aren't verified/claimed yet.
      $or: [
        { sourceType: { $ne: 'external_import' } },
        { verificationStatus: { $in: ['verified', 'claimed'] } },
      ],
    };

    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }
    if (longTerm === 'true') filter.tags = { $in: ['long term'] };
    if (sublease === 'true') filter.tags = { $in: ['sublease'] };
    if (bedrooms) filter.bedroomsMin = { $lte: Number(bedrooms) };
    if (priceMin) filter.priceMin = { ...(filter.priceMin || {}), $gte: Number(priceMin) };
    if (priceMax) filter.priceMin = { ...(filter.priceMin || {}), $lte: Number(priceMax) };
    if (rating) filter.rating = { $gte: Number(rating) };
    if (maxBusMinutes) filter['commute.bus.minutes'] = { $lte: Number(maxBusMinutes) };
    if (petFriendly === 'true') filter.petFriendly = true;

    const listings = await Listing.find(filter).sort({ rating: -1, priceMin: 1 });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id
router.get('/:id', attachUser, async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('claimedBy', 'name company');
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const [subleases, reviews, similar] = await Promise.all([
      Sublease.find({
        listing: listing._id,
        moderation: 'approved',
        status: { $ne: 'taken' },
      })
        .populate('poster', 'name verified')
        .sort({ startDate: 1 }),
      Review.find({ listing: listing._id, removed: false })
        .populate('author', 'name verified')
        .sort({ createdAt: -1 }),
      Listing.find({ _id: { $ne: listing._id } })
        .sort({ rating: -1 })
        .limit(3),
    ]);

    res.json({ listing, subleases, reviews, similar });
  } catch (err) {
    next(err);
  }
});

// POST /api/listings/:id/favorite — toggle save (student only)
router.post('/:id/favorite', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student' || !req.user.studentVerified)
      return res.status(403).json({ error: 'Only verified students can save listings' });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const idx = req.user.savedListings.findIndex((id) => id.equals(listing._id));
    if (idx >= 0) req.user.savedListings.splice(idx, 1);
    else req.user.savedListings.push(listing._id);
    await req.user.save();

    res.json({ savedListings: req.user.savedListings, saved: idx < 0 });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/listings/:id — manager edits to a claimed listing
//
// Only verified managers of THIS listing can call it (enforced by
// requireVerifiedManagerOfListing). Even then, only an allowlisted set of
// fields can be touched — no flipping verificationStatus, no swapping
// sourceType, no reassigning claimedBy.
//
// If MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES is true, the edit is
// applied immediately and `lastManagerUpdateAt` is bumped. Otherwise the
// route returns 503 (no "pending edits" table in this pass).
// ---------------------------------------------------------------------------

const MANAGER_EDITABLE_FIELDS = new Set([
  'priceMin',
  'priceMax',
  'bedroomsMin',
  'bedroomsMax',
  'bathroomsMin',
  'bathroomsMax',
  'amenities',
  'keyAmenities',
  'feesAndPolicies',
  'tags',
  'photos',
  'description',
  'sourceUrl', // official property website
  'contactEmail',
  'contactPhone',
  'officeHours',
  'petFriendly',
  'floorPlans',
]);

router.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  requireVerifiedManagerOfListing('id'),
  async (req, res, next) => {
    try {
      const autoApprove =
        String(process.env.MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES || '')
          .toLowerCase() === 'true';
      if (!autoApprove) {
        return res.status(503).json({
          error:
            'Manager edits are disabled on this deployment. Ask an admin to enable MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES.',
        });
      }

      const listing = await Listing.findById(req.params.id);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      const updates = {};
      for (const [k, v] of Object.entries(req.body || {})) {
        if (MANAGER_EDITABLE_FIELDS.has(k)) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error:
            'No editable fields supplied. Editable: ' +
            Array.from(MANAGER_EDITABLE_FIELDS).join(', '),
        });
      }

      Object.assign(listing, updates);
      listing.lastManagerUpdateAt = new Date();
      await listing.save();

      res.json({
        listing,
        editedFields: Object.keys(updates),
        autoApproved: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
