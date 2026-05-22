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
  return (
    (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')[0]
      .trim()
  );
}

function buildVerifyUrl(user, rawToken) {
  return `${clientOrigin()}/verify-email?token=${rawToken}&id=${user._id}`;
}

async function deliverVerification(user, rawToken) {
  const url = buildVerifyUrl(user, rawToken);
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: url });
  } catch (err) {
    if (IS_PROD && isLive()) throw err;
    console.error('[verify] email send failed:', err.message);
  }
  return url;
}

// ============================================================================
// Google OAuth — primary verification path for UC Davis students
// ============================================================================
//
// Flow (Approach B — frontend obtains ID token, backend verifies):
//   1. Frontend loads Google Identity Services (GIS), shows the button.
//   2. User clicks "Continue with Google", picks a Google account.
//   3. Google returns a signed ID token (JWT) to the frontend.
//   4. Frontend POSTs { credential: <id_token> } to /api/auth/google.
//   5. Backend verifies the ID token via google-auth-library:
//        - signature must verify against Google's public keys
//        - audience must equal our GOOGLE_CLIENT_ID
//        - email_verified must be true
//   6. Backend reads payload.email and payload.sub (Google user id).
//   7. Find-or-create the user, set verification fields based on email domain.
//   8. Return app JWT + user.
//
// Important guardrails:
//   - Existing admin/manager accounts MUST NOT be downgraded if they sign in
//     with Google. We only update verification fields and authProvider; role,
//     managerStatus, suspended, etc. are preserved.
//   - We never trust a manually-typed @ucdavis.edu email. studentVerified is
//     ONLY set true when Google itself returns a verified @ucdavis.edu email.

router.post('/google', async (req, res, next) => {
  try {
    const credential = req.body && (req.body.credential || req.body.idToken || req.body.id_token);
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential (ID token).' });
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        error: 'Google sign-in is not configured on this server (GOOGLE_CLIENT_ID missing).',
      });
    }

    // Lazy-require so the app still boots if the dep isn't installed yet.
    let OAuth2Client;
    try {
      ({ OAuth2Client } = require('google-auth-library'));
    } catch (_err) {
      return res.status(503).json({
        error:
          'google-auth-library is not installed on the server. Run `npm i google-auth-library` in /backend and redeploy.',
      });
    }

    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId, // also rejects tokens issued for other client IDs
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn('[auth/google] token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid Google credential.' });
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: 'Google did not return a usable identity.' });
    }
    if (payload.email_verified !== true) {
      return res.status(401).json({
        error:
          'Your Google account has not verified its email yet. Verify it with Google, then try again.',
      });
    }

    const email = String(payload.email).toLowerCase().trim();
    const isUCDavis = /@ucdavis\.edu$/i.test(email);
    // Google may include a hosted_domain (hd) claim for Workspace accounts.
    // We don't require it (personal Gmail @ucdavis.edu won't have it), but we
    // log it for visibility.
    const hd = payload.hd || null;
    const googleId = payload.sub;
    const displayName =
      payload.name ||
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      email.split('@')[0];

    // Find existing user by googleId first, then by email.
    let user =
      (await User.findOne({ googleId })) || (await User.findOne({ email }));

    if (!user) {
      // New account. Default to student role; non-Davis emails get role=student
      // but studentVerified stays false (they can browse, not post).
      const randomPwHash = await User.hashPassword(
        require('crypto').randomBytes(24).toString('hex')
      );
      user = new User({
        name: displayName,
        email,
        passwordHash: randomPwHash, // unused; Google is the auth path
        role: 'student',
        authProvider: 'google',
        googleId,
        emailVerified: true,
        // The User pre-save hook will set studentVerified and verificationStatus
        // from emailVerified + role + email domain.
      });
      await user.save();
    } else {
      // Existing user signed in with Google.
      // Update Google linkage + verification, but DO NOT change role,
      // managerStatus, suspended, or company.
      user.googleId = googleId;
      user.authProvider = 'google';
      user.emailVerified = true;
      // Clear any stale email-link verification artifacts.
      user.emailVerifyTokenHash = null;
      user.emailVerifyExpires = null;
      // Refresh display name only if we don't have one stored.
      if (!user.name && displayName) user.name = displayName;
      await user.save();
    }

    if (user.suspended) {
      return res.status(403).json({
        error: 'This account has been suspended. Contact admin@hone.local for help.',
      });
    }

    // Categorize the verification outcome for the frontend.
    let verificationOutcome;
    if (isUCDavis) {
      verificationOutcome = 'verified'; // studentVerified === true
    } else {
      verificationOutcome = 'not_ucdavis'; // emailVerified yes, studentVerified no
    }
    // verificationStatus on the user is derived by the pre-save hook; we send
    // an explicit field for the frontend banner copy.
    return res.json({
      token: signToken(user),
      user: user.toPublicJSON(),
      googleVerification: verificationOutcome,
      hostedDomain: hd,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// Legacy email/password routes
// ============================================================================
// Kept for: admin accounts, manager applications, manually-seeded accounts,
// and any pre-existing accounts. Email/password registration NEVER marks a
// student as verified — that path is Google-only now.

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
      authProvider: 'local',
      emailVerified: false,
      company: company || '',
      managerStatus: role === 'manager' ? 'pending' : 'approved',
    });

    // For students: do NOT pretend to send a verification email. Tell them
    // to verify via Google. For managers: keep the email-link path because
    // managers don't necessarily have UC Davis Google accounts.
    let verifyUrl = null;
    const shouldSendEmailLink = role === 'manager' && isLive();
    if (shouldSendEmailLink) {
      const rawToken = user.issueVerificationToken();
      await user.save();
      verifyUrl = await deliverVerification(user, rawToken);
    } else {
      await user.save();
    }

    const response = {
      token: signToken(user),
      user: user.toPublicJSON(),
    };
    if (role === 'student') {
      response.message =
        'Account created, but to become a verified UC Davis student you need to sign in with Google using your @ucdavis.edu account.';
      response.needsGoogleVerification = true;
    } else if (shouldSendEmailLink) {
      response.emailDelivery = 'live';
      if (!IS_PROD && verifyUrl) response.devVerifyUrl = verifyUrl;
    } else {
      // Manager but no email provider configured — be honest about it.
      response.message =
        'Manager account created. An admin will review your application.';
    }

    res.status(201).json(response);
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

    if (!user.passwordHash) {
      return res.status(401).json({
        error:
          'This account uses Google sign-in. Click "Continue with Google" instead.',
      });
    }

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

// POST /api/auth/verify-email — kept so manager email-link verification works.
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

// POST /api/auth/resend-verification — only meaningful for managers when
// Resend is configured. For students we tell them to use Google.
router.post(
  '/resend-verification',
  resendVerifyLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      if (req.user.emailVerified)
        return res.status(400).json({ error: 'Email is already verified' });

      if (req.user.role === 'student') {
        return res.status(400).json({
          error:
            'Student verification is now via Google. Sign in with your UC Davis Google account on the login page.',
        });
      }

      if (!isLive()) {
        return res.status(503).json({
          error:
            'Email sending is not configured on this server. Contact an admin.',
        });
      }

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
