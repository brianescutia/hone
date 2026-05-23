const express = require('express');
const Review = require('../models/Review');
const Listing = require('../models/Listing');
const { requireAuth, requireVerifiedStudent } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

async function recomputeListingRating(listingId) {
  const reviews = await Review.find({ listing: listingId, removed: false });
  const count = reviews.length;
  const avg = count
    ? reviews.reduce((s, r) => s + r.overall, 0) / count
    : 0;
  await Listing.findByIdAndUpdate(listingId, {
    rating: Math.round(avg * 10) / 10,
    reviewCount: count,
  });
}

// POST /api/reviews — verified student creates a review
router.post('/', writeLimiter, requireAuth, requireVerifiedStudent, async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.body.listing);
    if (!listing) return res.status(400).json({ error: 'Listing not found' });

    const review = await Review.create({
      ...req.body,
      author: req.user._id,
    });
    await recomputeListingRating(listing._id);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews?listing=:id — list reviews for a listing
router.get('/', async (req, res, next) => {
  try {
    const filter = { removed: false };
    if (req.query.listing) filter.listing = req.query.listing;
    const reviews = await Review.find(filter)
      .populate('author', 'name verified')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
