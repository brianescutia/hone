require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

function ensureSafeConfig() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[fatal] JWT_SECRET must be set to a long random string in production.'
      );
      process.exit(1);
    }
    // Dev fallback: warn but generate an ephemeral secret so the dev server runs.
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      require('crypto').randomBytes(48).toString('hex');
    console.warn(
      '[warn] JWT_SECRET was missing or too short. Using an ephemeral dev secret. ' +
        'Set a real one in backend/.env before going to production.'
    );
  }

  // In production we also require an explicit MONGO_URI — the in-memory
  // database is for local demos only and shouldn't silently power prod.
  if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    console.error(
      '[fatal] MONGO_URI must be set in production. Refusing to fall back to in-memory MongoDB.'
    );
    process.exit(1);
  }
}

function parseAllowedOrigins() {
  // Comma-separated list, e.g. "https://hone.app,https://hone-staging.vercel.app"
  const raw =
    process.env.CLIENT_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsOptions() {
  const allowed = parseAllowedOrigins();
  return {
    origin(origin, cb) {
      // Allow non-browser tools (curl, mobile) and same-origin (no Origin header).
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      // Allow any *.vercel.app preview if explicitly opted in.
      if (
        process.env.ALLOW_VERCEL_PREVIEWS === 'true' &&
        /\.vercel\.app$/.test(new URL(origin).hostname)
      ) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  };
}

async function start() {
  ensureSafeConfig();
  await connectDB();

  // Auto-seed when running on an in-memory DB so the app is usable out of the box.
  if (!process.env.MONGO_URI) {
    const { seedDatabase } = require('./seedData');
    await seedDatabase();
  }

  const app = express();

  // Security headers. We disable CSP because the frontend is served from a
  // separate origin (Vercel) and the API only returns JSON — there's no HTML
  // to protect here. crossOriginResourcePolicy='cross-origin' keeps the API
  // reachable from the frontend domain.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors(corsOptions()));
  // Body limit: 1mb is plenty for JSON; bigger payloads should go through
  // an object storage upload, not the API.
  app.use(express.json({ limit: '1mb' }));

  // Trust the proxy hop (Render/Railway/Fly all sit behind one) so
  // express-rate-limit can see the real client IP.
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/listings', require('./routes/listings'));
  app.use('/api/subleases', require('./routes/subleases'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/conversations', require('./routes/conversations'));
  app.use('/api/claims', require('./routes/claims'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/admin', require('./routes/admin'));

  app.use(notFound);
  app.use(errorHandler);

  const port = process.env.PORT || 5050;
  const server = app.listen(port, () => {
    const addr = server.address();
    console.log(`[server] hone API listening on port ${addr.port}`);
    console.log(`[server] CORS allowed origins: ${parseAllowedOrigins().join(', ')}`);
  });

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}

module.exports = { start };
