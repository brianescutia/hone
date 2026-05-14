const express = require('express');
const ClaimRequest = require('../models/ClaimRequest');
const Listing = require('../models/Listing');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/claims — manager submits claim
router.post('/', writeLimiter, requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const { listingId, company, phone, note } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.claimable)
      return res.status(409).json({ error: 'Listing is not claimable' });

    const dup = await ClaimRequest.findOne({
      listing: listingId,
      manager: req.user._id,
      status: 'pending',
    });
    if (dup) return res.status(409).json({ error: 'You already have a pending claim for this listing' });

    const claim = await ClaimRequest.create({
      listing: listingId,
      manager: req.user._id,
      company: company || req.user.company,
      phone,
      note,
    });
    res.status(201).json({ claim });
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/mine — manager's own claims
router.get('/mine', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const claims = await ClaimRequest.find({ manager: req.user._id })
      .populate('listing', 'name address photos')
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) {
    next(err);
  }
});

// PUT /api/listings/:id (manager edits claimed listing) — also exposed here for clarity
router.put('/listing/:id', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.manager || !listing.manager.equals(req.user._id))
      return res.status(403).json({ error: 'Not your listing' });

    // Whitelisted fields
    const allow = [
      'description',
      'priceMin',
      'priceMax',
      'amenities',
      'feesAndPolicies',
      'keyAmenities',
      'contactPhone',
      'contactEmail',
      'officeHours',
      'photos',
      'floorPlans',
    ];
    allow.forEach((k) => {
      if (req.body[k] !== undefined) listing[k] = req.body[k];
    });
    await listing.save();
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
