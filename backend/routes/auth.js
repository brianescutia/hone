const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, resendVerifyLimiter } = require('../middleware/rateLimit');
const { sendVerificationEmail, isLive } = require('../services/emailService');

const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function clientOrigin() {
  // Prefer the first allowed origin for building verification URLs.
  return (
    (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')[0]
      .trim()
  );
}

function buildVerifyUrl(user, rawToken) {
  return `${clientOrigin()}/verify-email?token=${rawToken}&id=${user._id}`;
}

// Dispatches the verification email via emailService. Returns the URL so
// the caller can echo it back in dev for one-click testing.
async function deliverVerification(user, rawToken) {
  const url = buildVerifyUrl(user, rawToken);
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: url });
  } catch (err) {
    // In prod we surface the error to the caller; in dev we just log it
    // (the link is also returned in the response).
    if (IS_PROD) throw err;
    console.error('[verify] email send failed:', err.message);
  }
  return url;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', company } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const cleanEmail = String(email).toLowerCase().trim();

    if (await User.findOne({ email: cleanEmail }))
      return res.status(409).json({ error: 'Email is already registered' });

    if (!['student', 'manager'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    if (role === 'manager' && !company)
      return res.status(400).json({ error: 'Manager accounts require a company / complex name' });

    const passwordHash = await User.hashPassword(password);

    const user = new User({
      name,
      email: cleanEmail,
      passwordHash,
      role,
      emailVerified: false,
      company: company || '',
      managerStatus: role === 'manager' ? 'pending' : 'approved',
    });

    // Issue verification token. Pre-save hook will set verificationStatus.
    const rawToken = user.issueVerificationToken();
    await user.save();
    const verifyUrl = await deliverVerification(user, rawToken);

    res.status(201).json({
      token: signToken(user),
      user: user.toPublicJSON(),
      // Returned only in non-prod so the dev UI can show a clickable link.
      ...(IS_PROD ? {} : { devVerifyUrl: verifyUrl }),
      emailDelivery: isLive() ? 'live' : 'dev_console',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (user.suspended)
      return res.status(403).json({
        error: 'This account has been suspended. Contact admin@hone.local for help.',
      });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({
      token: signToken(user),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email — consume a verification token
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token, id } = req.body;
    if (!token || !id) return res.status(400).json({ error: 'token and id are required' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerified) {
      return res.json({
        ok: true,
        alreadyVerified: true,
        user: user.toPublicJSON(),
      });
    }

    const hash = User.hashToken(token);
    if (user.emailVerifyTokenHash !== hash)
      return res.status(400).json({ error: 'Verification token is invalid' });
    if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date())
      return res.status(400).json({ error: 'Verification token has expired. Request a new one.' });

    user.emailVerified = true;
    user.emailVerifyTokenHash = null;
    user.emailVerifyExpires = null;
    await user.save();

    res.json({ ok: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification (requires login, rate-limited)
router.post(
  '/resend-verification',
  resendVerifyLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      if (req.user.emailVerified)
        return res.status(400).json({ error: 'Email is already verified' });

      const user = await User.findById(req.user._id);
      const rawToken = user.issueVerificationToken();
      await user.save();
      const verifyUrl = await deliverVerification(user, rawToken);

      res.json({
        ok: true,
        ...(IS_PROD ? {} : { devVerifyUrl: verifyUrl }),
        emailDelivery: isLive() ? 'live' : 'dev_console',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = router;
