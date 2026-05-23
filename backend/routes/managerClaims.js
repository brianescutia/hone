const express = require('express');
const ManagerClaim = require('../models/ManagerClaim');
const Listing = require('../models/Listing');
const { requireAuth, requireRole } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { scoreClaim } = require('../services/domainConfidence');

const router = express.Router();

function validateClaimInput(b) {
  const errs = [];
  if (!b.listingId) errs.push('listingId is required.');
  if (!b.workEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.workEmail)))
    errs.push('A valid work email is required.');
  if (b.companyWebsite && !/^https?:\/\//i.test(String(b.companyWebsite)))
    errs.push('Company website must start with http:// or https://');
  if (b.proofMessage && String(b.proofMessage).length > 4000)
    errs.push('Proof message is too long (max 4000 chars).');
  return errs;
}

// POST /api/manager-claims
//
// Body: { listingId, workEmail, companyWebsite?, phoneNumber?, roleTitle?,
//         proofMessage?, propertyName? }
//
// Always lands in status: 'pending'. Confidence is computed and stored
// for the admin to see, but does NOT auto-approve — first claim on any
// listing always requires an admin review.
router.post(
  '/',
  writeLimiter,
  requireAuth,
  requireRole('manager'),
  async (req, res, next) => {
    try {
      const errors = validateClaimInput(req.body);
      if (errors.length)
        return res.status(400).json({ error: errors.join(' '), fields: errors });

      const listing = await Listing.findById(req.body.listingId);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      // Block double-claims: if already claimed by someone else, refuse.
      if (
        listing.claimedByManager &&
        listing.claimedBy &&
        !listing.claimedBy.equals(req.user._id)
      ) {
        return res.status(409).json({
          error: 'This listing is already claimed by another manager.',
        });
      }

      // One open claim per (manager, listing).
      const openExisting = await ManagerClaim.findOne({
        manager: req.user._id,
        listing: listing._id,
        status: 'pending',
      });
      if (openExisting) {
        return res.status(409).json({
          error: 'You already have a pending claim on this listing.',
          claim: openExisting.toPublicJSON(),
        });
      }

      const scored = scoreClaim({
        workEmail: req.body.workEmail,
        companyWebsite: req.body.companyWebsite,
      });

      const claim = await ManagerClaim.create({
        manager: req.user._id,
        listing: listing._id,
        propertyName: req.body.propertyName || listing.name,
        workEmail: String(req.body.workEmail).toLowerCase().trim(),
        emailDomain: scored.emailDomain || '',
        companyWebsite: req.body.companyWebsite || '',
        websiteDomain: scored.websiteDomain || '',
        phoneNumber: req.body.phoneNumber || '',
        roleTitle: req.body.roleTitle || '',
        proofMessage: req.body.proofMessage || '',
        confidence: scored.confidence,
        confidenceReason: scored.reason,
        status: 'pending',
      });

      // Track on the listing so a "claim pending" badge can render publicly.
      if (listing.claimStatus === 'unclaimed') {
        listing.claimStatus = 'pending';
        await listing.save();
      }

      // Track on the user so the dashboard can show "your claims".
      if (!req.user.claimedListings.some((id) => id.equals(listing._id))) {
        req.user.claimedListings.push(listing._id);
        if (!req.user.workEmail && scored.emailDomain) req.user.workEmail = req.body.workEmail;
        if (!req.user.managerDomain && scored.emailDomain) req.user.managerDomain = scored.emailDomain;
        await req.user.save();
      }

      res.status(201).json({
        claim: claim.toPublicJSON(),
        message:
          'Claim submitted. An admin will review it shortly. Confidence: ' +
          scored.confidence + '. ' + scored.reason,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/manager-claims/mine — the calling manager's own claims
router.get('/mine', requireAuth, requireRole('manager'), async (req, res, next) => {
  try {
    const claims = await ManagerClaim.find({ manager: req.user._id })
      .populate('listing', 'name address photos claimStatus claimedByManager')
      .sort({ createdAt: -1 });
    res.json({
      claims: claims.map((c) => ({
        ...c.toPublicJSON(),
        listing: c.listing,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
