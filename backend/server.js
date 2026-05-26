require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

function ensureSafeConfig() {
  const MIN_PROD_SECRET_LEN = 48;

  if (process.env.NODE_ENV === 'production') {
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < MIN_PROD_SECRET_LEN
    ) {
      console.error(
        `[fatal] JWT_SECRET must be at least ${MIN_PROD_SECRET_LEN} characters in production. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
      );
      process.exit(1);
    }
  } else if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      require('crypto').randomBytes(48).toString('hex');
    console.warn(
      '[warn] JWT_SECRET was missing or too short. Using an ephemeral dev secret.'
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    console.error('[fatal] MONGO_URI must be set in production.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLIENT_ID) {
    console.warn(
      '[warn] GOOGLE_CLIENT_ID is not set. Google sign-in will be disabled.'
    );
  }
}

function parseAllowedOrigins() {
  // Comma-separated list. Supports both CLIENT_ORIGINS (preferred) and the
  // legacy CLIENT_ORIGIN singular env var that the prompt references.
  const raw =
    process.env.CLIENT_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, '')) // strip trailing slashes
    .filter(Boolean);
  // In development, always allow common local dev origins as a safety net.
  if (process.env.NODE_ENV !== 'production') {
    for (const o of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
      if (!list.includes(o)) list.push(o);
    }
  }
  return list;
}

function corsOptions() {
  const allowed = parseAllowedOrigins();
  return {
    origin(origin, cb) {
      // No Origin header (curl, same-origin, server-to-server) → allow.
      if (!origin) return cb(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (allowed.includes(normalized)) return cb(null, true);

      if (process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
        try {
          if (/\.vercel\.app$/.test(new URL(origin).hostname)) {
            return cb(null, true);
          }
        } catch (_e) {
          /* fall through */
        }
      }
      // Return a non-Error denial so we don't crash the request — express will
      // simply omit the CORS headers and the browser blocks it client-side.
      // (Throwing here historically produced 500s in logs that looked scary.)
      console.warn(`[cors] denied origin ${origin}`);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  };
}

async function start() {
  ensureSafeConfig();
  const { memServer } = await connectDB();

  // Auto-seed in-memory DB for local dev.
  // In production with MONGO_URI set, seeding is gated by SEED_DEMO_DATA=true
  // so prod databases don't accidentally get demo accounts.
  if (!process.env.MONGO_URI) {
    const { seedDatabase } = require('./seedData');
    await seedDatabase();
  } else if (process.env.SEED_DEMO_DATA === 'true') {
    if (process.env.NODE_ENV === 'production') {
      const User = require('./models/User');
      const existingUsers = await User.countDocuments();

      if (existingUsers > 0) {
        console.error(
          `[fatal] SEED_DEMO_DATA=true in production with ${existingUsers} existing users. ` +
          'Refusing to wipe the database. Unset SEED_DEMO_DATA or use a fresh database.'
        );
        process.exit(1);
      }
    }

    console.warn(
      '[seed] SEED_DEMO_DATA=true — seeding with demo data. Turn this OFF before public launch.'
    );

    const { seedDatabase } = require('./seedData');
    await seedDatabase();
  }

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const corsMw = cors(corsOptions());
  app.use(corsMw);
  // Explicit preflight handler so OPTIONS requests always get a clean
  // response with the right CORS headers, regardless of routing.
  app.options('*', corsMw);

  app.use(express.json({ limit: '1mb' }));
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/listings', require('./routes/listings'));
  app.use('/api/subleases', require('./routes/subleases'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/conversations', require('./routes/conversations'));
  app.use('/api/claims', require('./routes/claims'));
  app.use('/api/manager-claims', require('./routes/managerClaims'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/admin', require('./routes/admin'));

  app.use(notFound);
  app.use(errorHandler);

  const port = process.env.PORT || 5050;
  const server = app.listen(port, () => {
    const addr = server.address();
    const allowed = parseAllowedOrigins();
    console.log(`[server] hone API listening on port ${addr.port}`);
    // Safe to log — these are the values the operator put in env vars, not credentials.
    console.log(`[server] CORS allowed origins: ${allowed.join(', ')}`);
    console.log(
      `[server] Google sign-in: ${process.env.GOOGLE_CLIENT_ID ? 'enabled' : 'DISABLED'}`
    );
    console.log(
      `[server] Feature flags: ` +
      `AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES=${process.env.AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES || 'false'}, ` +
      `MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES=${process.env.MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES || 'false'}`
    );
  });

  async function teardown() {
    try {
      if (server && server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
    } catch (_) { }

    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (_) { }

    try {
      if (memServer && typeof memServer.stop === 'function') {
        await memServer.stop();
      }
    } catch (_) { }
  }

  return { server, teardown };
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}

module.exports = { start };
