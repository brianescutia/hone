const express = require('express');
const Conversation = require('../models/Conversation');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/auth');
const { messageLimiter, reportLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// GET /api/conversations — list mine
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const convos = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name role verified company')
      .populate('listing', 'name')
      .populate('sublease', 'title')
      .sort({ updatedAt: -1 });
    res.json({ conversations: convos });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const convo = await Conversation.findById(req.params.id)
      .populate('participants', 'name role verified company')
      .populate('listing', 'name')
      .populate('sublease', 'title');
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!convo.participants.some((p) => p._id.equals(req.user._id)))
      return res.status(403).json({ error: 'Not a participant' });
    res.json({ conversation: convo });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations — start a new one (verified student initiates)
router.post('/', messageLimiter, requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student' && !req.user.studentVerified)
      return res.status(403).json({ error: 'Verify your UC Davis email to message users' });

    const { otherUserId, listingId, subleaseId, contextLabel, firstMessage } = req.body;
    if (!otherUserId)
      return res.status(400).json({ error: 'otherUserId is required' });

    const participants = [req.user._id, otherUserId];
    // Look for an existing convo with the same anchor
    const existing = await Conversation.findOne({
      participants: { $all: participants },
      listing: listingId || null,
      sublease: subleaseId || null,
    });

    let convo = existing;
    if (!convo) {
      convo = await Conversation.create({
        participants,
        listing: listingId || null,
        sublease: subleaseId || null,
        contextLabel: contextLabel || '',
        messages: [],
      });
    }

    if (firstMessage) {
      convo.messages.push({ sender: req.user._id, body: firstMessage });
      await convo.save();
    }
    res.status(201).json({ conversation: convo });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/messages — send message
router.post('/:id/messages', messageLimiter, requireAuth, async (req, res, next) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!convo.participants.some((p) => p.equals(req.user._id)))
      return res.status(403).json({ error: 'Not a participant' });

    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message body required' });

    convo.messages.push({ sender: req.user._id, body });
    await convo.save();
    res.json({ conversation: convo });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:id/report — report a conversation/message
router.post('/:id/report', reportLimiter, requireAuth, async (req, res, next) => {
  try {
    const VALID_CATEGORIES = [
      'scam',
      'harassment',
      'fake_listing',
      'inappropriate_content',
      'wrong_information',
      'spam',
      'other',
    ];
    const category = VALID_CATEGORIES.includes(req.body.category)
      ? req.body.category
      : 'other';
    await Report.create({
      reporter: req.user._id,
      targetType: 'message',
      targetId: req.params.id,
      category,
      reason: String(req.body.reason || '').slice(0, 1000),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
