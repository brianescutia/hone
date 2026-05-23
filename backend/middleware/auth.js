const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    // User not found = stale token (referenced ID was deleted, e.g. after
    // a DB reseed). Return 401 so the frontend's global 401 handler can
    // clear localStorage and bounce to /login.
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.suspended)
      return res.status(403).json({ error: 'Account suspended' });

    req.user = user;
    next();
  } catch (err) {
    // jwt.verify throws on invalid signature, malformed token, or expiry.
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth — attaches user if a valid token is present, otherwise continues.
async function attachUser(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.id).select('-passwordHash');
    }
  } catch (_err) {
    // ignore, treat as guest
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function requireVerifiedStudent(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'student' || !req.user.studentVerified)
    return res.status(403).json({
      error:
        'Only verified UC Davis students can do that. Sign in with your @ucdavis.edu Google account to verify.',
    });
  next();
}

// Guard for PATCH /listings/:id and similar manager-only edits.
//
// Allows the request iff:
//   1. req.user is a manager AND
//   2. req.user.verifiedManagerFor includes req.params[paramName]
//
// Returns 401 if not authed, 403 otherwise. Admins are deliberately NOT
// short-circuited here — admins should use the admin-only endpoints.
function requireVerifiedManagerOfListing(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== 'manager')
      return res.status(403).json({ error: 'Manager account required.' });

    const listingId = req.params[paramName];
    if (!listingId)
      return res.status(400).json({ error: 'Listing id missing in URL.' });

    const verifiedFor = (req.user.verifiedManagerFor || []).map(String);
    if (!verifiedFor.includes(String(listingId))) {
      return res.status(403).json({
        error:
          'You can only edit listings you have a verified manager claim for. Submit a claim and wait for admin approval.',
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  attachUser,
  requireRole,
  requireVerifiedStudent,
  requireVerifiedManagerOfListing,
};
