const express = require('express');
const Sublease = require('../models/Sublease');
const Listing = require('../models/Listing');
const { requireAuth, requireVerifiedStudent } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// GET /api/subleases — list all approved subleases (public)
router.get('/', async (_req, res, next) => {
  try {
    const subleases = await Sublease.find({ moderation: 'approved', hidden: false })
      .populate('listing', 'name address photos location')
      .populate('poster', 'name studentVerified verificationStatus')
      .sort({ startDate: 1 });
    res.json({ subleases });
  } catch (err) {
    next(err);
  }
});

// GET /api/subleases/mine — caller's own subleases (any moderation status)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const subleases = await Sublease.find({ poster: req.user._id })
      .populate('listing', 'name address photos')
      .sort({ createdAt: -1 });
    res.json({ subleases });
  } catch (err) {
    next(err);
  }
});

// GET /api/subleases/:id
router.get('/:id', async (req, res, next) => {
  try {
    const sub = await Sublease.findById(req.params.id)
      .populate('listing')
      .populate('poster', 'name verified');
    if (!sub) return res.status(404).json({ error: 'Sublease not found' });
    res.json({ sublease: sub });
  } catch (err) {
    next(err);
  }
});

// POST /api/subleases — create (verified student only)
router.post('/', writeLimiter, requireAuth, requireVerifiedStudent, async (req, res, next) => {
  try {
    const errors = validateSubleaseInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(' '), fields: errors });
    }

    const listing = await Listing.findById(req.body.listing);
    if (!listing) return res.status(400).json({ error: 'Listing not found' });

    const sub = await Sublease.create({
      ...req.body,
      poster: req.user._id,
      moderation: 'pending',
    });
    res.status(201).json({
      sublease: sub,
      message:
        'Your sublease is pending review. An admin will approve it shortly, then it will appear publicly.',
    });
  } catch (err) {
    next(err);
  }
});

function validateSubleaseInput(b) {
  const errs = [];
  if (!b.listing) errs.push('Listing is required.');
  if (!b.title || !String(b.title).trim()) errs.push('Title is required.');
  if (!b.description || String(b.description).trim().length < 30)
    errs.push('Description must be at least 30 characters.');
  if (!b.contactPreference) errs.push('Contact preference is required.');

  const start = b.startDate ? new Date(b.startDate) : null;
  const end = b.endDate ? new Date(b.endDate) : null;
  if (!start || isNaN(start)) errs.push('Start date is required.');
  if (!end || isNaN(end)) errs.push('End date is required.');
  if (start && end && start >= end) errs.push('Start date must be before end date.');

  const price = Number(b.price);
  if (!Number.isFinite(price) || price <= 0)
    errs.push('Price must be a positive number.');
  // Davis housing realism: warn beyond $100 – $10,000/month.
  if (Number.isFinite(price) && (price < 100 || price > 10000))
    errs.push('Price must be between $100 and $10,000 per month.');

  return errs;
}

// PUT /api/subleases/:id — edit (owner only)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const sub = await Sublease.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Sublease not found' });
    if (!sub.poster.equals(req.user._id))
      return res.status(403).json({ error: 'Not your sublease' });

    // Merge with existing for validation, since edit may be partial.
    const merged = { ...sub.toObject(), ...req.body };
    const errors = validateSubleaseInput(merged);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(' '), fields: errors });
    }

    // Don't allow tampering with moderation or owner fields.
    const updates = { ...req.body };
    delete updates.moderation;
    delete updates.poster;
    delete updates.hidden;

    Object.assign(sub, updates);
    await sub.save();
    res.json({ sublease: sub });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subleases/:id — delete (owner or admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const sub = await Sublease.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Sublease not found' });
    if (!sub.poster.equals(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not your sublease' });

    await sub.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
