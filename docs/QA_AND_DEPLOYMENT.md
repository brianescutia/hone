# hone — QA & Deployment Guide

Last updated: 2026-05-24

This is the developer/operator reference for running, testing, and shipping hone.
For end-user docs, see `/about`, `/safety`, `/privacy`, and `/terms` in the app.

---

## Quick start (local dev)

### Prerequisites
- Node.js 18+ and npm
- (Optional) MongoDB 6.0+ locally — only needed if you want persistent dev data

### One-time setup

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### Run

Two terminals:

```bash
# Terminal 1
cd backend && npm run dev
# expect: "hone API listening on port 5050"

# Terminal 2
cd frontend && npm run dev
# expect: "Local: http://localhost:5173"
```

Open http://localhost:5173.

---

## Database modes

The backend supports two modes, chosen by whether `MONGO_URI` is set in `backend/.env`:

| Mode        | When                | Behavior                                                                                                                  |
|-------------|---------------------|---------------------------------------------------------------------------------------------------------------------------|
| In-memory   | `MONGO_URI` unset   | Spins up an ephemeral MongoDB in-process. Auto-seeds demo data on every boot. Data lost on restart. Good for quick demos. |
| Real Mongo  | `MONGO_URI` set     | Connects to the URI. Does NOT auto-seed — you run `npm run seed` once. Persists across restarts. Good for real dev.       |

For real Mongo locally:

```bash
# Install + start (macOS)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# In backend/.env
MONGO_URI=mongodb://localhost:27017/hone_dev
```

Then once:

```bash
cd backend
npm run seed                # demo accounts + sample listings
npm run bootstrap:davis     # ~20 real Davis-area apartments (admin-curated, hidden until claimed)
```

---

## Demo accounts (after seed)

All passwords are `password123`. **Demo only — never use these in production.**

| Email                       | Role    | Notes                                                |
|-----------------------------|---------|------------------------------------------------------|
| student@ucdavis.edu         | student | Standard verified student account                    |
| manager@almondwood.com      | manager | Manages "Almondwood Apartments" listing              |
| admin@hone.local            | admin   | Full admin: pending, users, listings, reports, leads |

---

## Tests

### Backend (Node test runner)

```bash
cd backend && npm test
# expect: 39 passed, 0 failed (~3s)
```

Uses in-memory Mongo. Fresh DB per test. No external services.

### Frontend build sanity

```bash
cd frontend && npm run build
# expect: clean Vite build, no errors
```

### E2E smoke (Playwright)

```bash
cd frontend && npm run test:e2e
# expect: 11 passed, 1 skipped (~10s)
```

Playwright auto-starts both servers via the `webServer` config in `playwright.config.js`. The backend is launched with `NODE_ENV=test` so the auth rate limiter doesn't interfere with repeated test runs.

The one skipped test (`unknown-price listings render "Contact for pricing"`) only runs when `bootstrap:davis` data is present. To enable it: set `MONGO_URI` in `backend/.env`, then run `cd backend && npm run bootstrap:davis`. On the next test run it will execute (not skip).

Other useful e2e commands:

```bash
npm run test:e2e:headed     # watch the browser
npm run test:e2e:ui         # interactive Playwright UI
npx playwright show-report  # open last run's HTML report
```

---

## Manual QA checklist

Walk through this in a fresh browser session before any deploy or major merge.

### Public (logged out)
- [ ] `/` loads, shows seeded apartments
- [ ] No listing card shows `$0/month` — unknown prices show "Contact for pricing"
- [ ] No external_import listings show unless verified/claimed
- [ ] Clicking a listing opens its detail page
- [ ] Static pages load: `/about`, `/privacy`, `/terms`, `/safety`, `/contact`
- [ ] Trying to access `/dashboard` redirects to `/login`

### Student
- [ ] Sign up flow works (or use `student@ucdavis.edu`)
- [ ] Login lands on `/` and the navbar reflects signed-in state
- [ ] Dashboard loads (saved listings, my subleases)
- [ ] Can save a listing
- [ ] Can post a sublease
- [ ] Can send a message to a manager
- [ ] `/admin` is blocked

### Manager
- [ ] `manager@almondwood.com` logs in via `/manager-login`, lands on `/manager`
- [ ] Manager dashboard shows their managed listing(s)
- [ ] Can edit listing details
- [ ] Can respond to messages
- [ ] Can request to claim an unclaimed listing

### Admin
- [ ] `admin@hone.local` logs in, lands on `/admin`
- [ ] All admin tabs load without crashing: pending, users, listings, reports, manager claims, external leads
- [ ] External Leads tab loads even with zero leads
- [ ] Can approve/reject a pending claim
- [ ] Reports tab shows reports if any exist

### Edge cases
- [ ] With Google OAuth not configured, the login pages still work cleanly (no scary errors)
- [ ] Listings missing photos render with a placeholder
- [ ] Listings missing prices render with "Contact for pricing"
- [ ] Empty saved-listings, empty messages, empty reports all have friendly empty states

---

## Environment variables

### Backend (`backend/.env`)

| Var                     | Required?           | Notes                                                                                       |
|-------------------------|---------------------|---------------------------------------------------------------------------------------------|
| `MONGO_URI`             | Prod yes; dev no    | Connection string. If unset in dev, uses in-memory Mongo. **Always set in prod.**           |
| `JWT_SECRET`            | Yes                 | Long random string. **Regenerate for prod — never reuse the example value.**                |
| `PORT`                  | No                  | Defaults to 5050.                                                                           |
| `NODE_ENV`              | No                  | `production` in prod. `test` disables the auth rate limit (used by Playwright internally).  |
| `CLIENT_URL`            | Prod                | Frontend origin, used in CORS and email links (e.g. `https://hone.app`).                    |
| `GOOGLE_CLIENT_ID`      | Optional            | For verifying Google ID tokens. If unset, Google login is disabled gracefully.              |
| `SMTP_*`                | Prod                | Email service config. If unset, emails are no-ops (safe for dev).                           |
| `APIFY_TOKEN`           | **Never set in prod**| Only for admin-curated imports. Leave empty in prod for safety.                            |

### Frontend (`frontend/.env`)

| Var                     | Required? | Notes                                                                                       |
|-------------------------|-----------|---------------------------------------------------------------------------------------------|
| `VITE_API_BASE_URL`     | Yes       | Backend URL, e.g. `http://localhost:5050` for dev, `https://api.hone.app` for prod.         |
| `VITE_GOOGLE_CLIENT_ID` | Optional  | Must match backend's `GOOGLE_CLIENT_ID`. If unset, the Google button is hidden.             |

---

## Production deployment

### Pre-flight (do before first prod deploy)

- [ ] Set strong `JWT_SECRET` (regenerated, not copied from `.env.example`)
- [ ] Set `MONGO_URI` to a real production database (not in-memory)
- [ ] Set `CLIENT_URL` to your real frontend domain
- [ ] Set `NODE_ENV=production`
- [ ] Set `VITE_API_BASE_URL` to your real backend URL
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] Frontend build succeeds: `cd frontend && npm run build`
- [ ] E2E tests pass: `cd frontend && npm run test:e2e`
- [ ] Walk the manual QA checklist above on a staging environment

### Things you must NOT do in production

- **DO NOT run `npm run seed` against the production database after launch.** It will wipe and replace your real listings, users, and messages with demo data. The seed script is dev-only.
- **DO NOT run `npm run bootstrap:davis` after the prod DB has real, manager-claimed listings.** It assumes a fresh DB and can create duplicates of curated entries. Safe to run *once* during initial launch; never again without code-level review.
- **DO NOT set `APIFY_TOKEN` in production unless you have explicitly reviewed the import pipeline.** The Apify/external lead flow is admin-review-only by design; scraped listings must never auto-publish. They stay in `verificationStatus: 'pending_review'` until a human approves them.
- **DO NOT commit real `.env` files to git.** Only `.env.example` and `.env.production.example` are tracked.

### First-deploy seed sequence (one time only)

```bash
# 1. With prod MONGO_URI set
cd backend
npm run seed                  # creates demo + admin accounts; review seedData.js and comment out demo users before running in prod
npm run bootstrap:davis       # adds curated Davis-area apartment shells (pending_review, hidden until claimed)

# 2. Verify
curl https://api.hone.app/api/listings   # should return only verified/claimed listings
```

After this, all listing creation should go through the admin/manager UI — never through scripts.

---

## Troubleshooting

### `npm run test:e2e` shows `ERR_CONNECTION_REFUSED`
Playwright couldn't reach `localhost:5050` or `localhost:5173`. Usually a stale process is wedged on one of those ports. Check with:

```bash
lsof -i :5050
lsof -i :5173
# kill anything stuck:
lsof -ti :5050 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

Then re-run.

### Admin login bounces back to `/login`
You've hit the dev rate limiter (5 logins per 15 minutes per IP). The Playwright config sets `NODE_ENV=test` for the test backend to avoid this, but if you're hitting it manually in dev, wait 15 min or restart the backend (in-memory mode resets the limiter; real Mongo restart still resets it because the limiter store is in-process).

### Test #3 (unknown-price listings) is always skipped
This is intentional unless `bootstrap:davis` data is loaded. See "Database modes" above.

### "Greens at Cordova" or other external-import listings showing on the public page
Your dev DB has stale data from before the `verificationStatus` filter was added. Re-seed:

```bash
cd backend && npm run seed
```

### Google login button missing or showing an error
That's expected when `VITE_GOOGLE_CLIENT_ID` (frontend) and/or `GOOGLE_CLIENT_ID` (backend) aren't set. Email/password login still works. To enable Google: set both env vars to the same OAuth client ID from Google Cloud Console, and add your domain to that client's authorized origins.