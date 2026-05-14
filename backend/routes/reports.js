const express = require('express');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const VALID_CATEGORIES = [
  'scam',
  'harassment',
  'fake_listing',
  'inappropriate_content',
  'wrong_information',
  'spam',
  'other',
];
const VALID_TARGETS = ['review', 'message', 'sublease', 'listing', 'user'];

// POST /api/reports — any logged-in user can file a report
router.post('/', reportLimiter, requireAuth, async (req, res, next) => {
  try {
    const { targetType, targetId, category = 'other', reason = '' } = req.body;
    if (!VALID_TARGETS.includes(targetType))
      return res.status(400).json({ error: 'Invalid targetType' });
    if (!targetId) return res.status(400).json({ error: 'targetId is required' });
    if (!VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      category,
      reason: String(reason).slice(0, 1000),
    });
    res.status(201).json({
      ok: true,
      message: 'Thanks — our moderators will review your report.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
