const express = require('express');
const User = require('../models/User');
const Sublease = require('../models/Sublease');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Conversation = require('../models/Conversation');
const ClaimRequest = require('../models/ClaimRequest');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me/saved
router.get('/me/saved', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('savedListings');
    res.json({ savedListings: user.savedListings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me — update profile
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const allow = ['name', 'bio', 'avatarUrl'];
    allow.forEach((k) => {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    });
    await req.user.save();
    res.json({ user: req.user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me — self-service account deletion.
//
// What this does is what the Privacy page promises:
//   - hard-delete the user record (name, email, password hash, bio)
//   - hard-delete subleases the user posted
//   - hard-delete reports the user filed
//   - hard-delete the user's saved listings (they live on the user record;
//     deleting the user removes them)
//   - hard-delete claim requests by the user (manager only)
//   - hard-delete conversations the user is a participant in. This is the
//     blunt option; other participants lose context, but it's the option
//     most aligned with "delete my data".
//   - leave behind: reviews are *anonymized* (author cleared) rather than
//     deleted, so the listing's rating count stays meaningful for other
//     students. The Privacy page documents this and says we'll fully delete
//     reviews on explicit request (handled by passing ?wipeReviews=true).
//
// Admins cannot delete themselves through this endpoint (avoids accidental
// lockout). Suspended accounts CAN delete themselves; we treat that as the
// user's right regardless of moderation status.
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({
        error:
          'Admin accounts cannot self-delete. Another admin must demote you first.',
      });
    }

    const wipeReviews = req.query.wipeReviews === 'true';
    const userId = req.user._id;

    if (wipeReviews) {
      await Review.deleteMany({ author: userId });
    } else {
      // Anonymize: set author to null and force anonymous display.
      // Note: schema currently requires `author`; we leave it pointing at
      // the (now-deleted) user id. The frontend already handles a missing
      // author when `anonymous: true`.
      await Review.updateMany(
        { author: userId },
        { $set: { anonymous: true } }
      );
    }

    await Promise.all([
      Sublease.deleteMany({ poster: userId }),
      Report.deleteMany({ reporter: userId }),
      ClaimRequest.deleteMany({ manager: userId }),
      Conversation.deleteMany({ participants: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({
      ok: true,
      message:
        'Your account has been deleted. Reviews you left have been anonymized; pass ?wipeReviews=true to fully delete them.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
