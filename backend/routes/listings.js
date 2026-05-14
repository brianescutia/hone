const express = require('express');
const Listing = require('../models/Listing');
const Sublease = require('../models/Sublease');
const Review = require('../models/Review');
const { attachUser, requireAuth } = require('../middleware/auth');

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
    const listing = await Listing.findById(req.params.id);
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

module.exports = router;
