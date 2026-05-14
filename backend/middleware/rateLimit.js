// Rate limiting for abuse-sensitive endpoints. We use express-rate-limit's
// in-memory store, which is fine for a single-instance Render free-tier
// deploy. If you scale to multiple instances, swap in a shared store
// (rate-limit-redis or similar) — this file is the only place to change.
//
// In test mode (NODE_ENV=test) we disable rate limiting entirely so the
// test suite isn't blocked when it makes many requests in a tight loop.

const rateLimit = require('express-rate-limit');

const IS_TEST = process.env.NODE_ENV === 'test';

function make(opts) {
  if (IS_TEST) {
    // no-op middleware
    return (_req, _res, next) => next();
  }
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Custom JSON error so the frontend can show a friendly message.
    handler(_req, res /*, _next, options */) {
      res.status(429).json({
        error:
          opts.errorMessage ||
          'Too many requests — please slow down and try again in a few minutes.',
      });
    },
    ...opts,
  });
}

// Tight: 5 attempts per 15 minutes per IP. Login + register + resend-verify.
const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 5,
  errorMessage:
    'Too many attempts from this IP. Please wait 15 minutes and try again, or use “forgot password”.',
});

// Email-verification resend specifically. Even tighter because each one
// triggers an email send.
const resendVerifyLimiter = make({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  errorMessage:
    'Too many verification emails requested. Check your inbox (and spam folder), then try again in an hour.',
});

// Reports: 10 / hour / IP. Plenty for legitimate users; deters mass-flagging.
const reportLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 10,
  errorMessage:
    'You’ve filed many reports recently. Take a break and come back later.',
});

// Generic write limiter for sublease/review creation + manager claim.
// 20 / hour / IP. A real student would never hit this.
const writeLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 20,
});

// Messaging: 60 messages / 10 min / IP. Generous but throttles spammers.
const messageLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 60,
});

module.exports = {
  authLimiter,
  resendVerifyLimiter,
  reportLimiter,
  writeLimiter,
  messageLimiter,
};
