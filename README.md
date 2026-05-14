# hone — UC Davis Student Housing

A UC Davis–first housing platform for apartments, subleases, verified student reviews, and commute-aware comparisons.

## Stack

- **Frontend:** React 18 + Vite + Tailwind + React Router + react-leaflet
- **Backend:** Node.js 18+ + Express + Mongoose
- **DB:** MongoDB Atlas in prod; `mongodb-memory-server` for local demo mode (auto-downloads on first run)
- **Auth:** JWT, role-based (`student` / `manager` / `admin`), email verification with hashed tokens
- **Email:** Resend (with dev-console fallback when `RESEND_API_KEY` isn't set)
- **Security:** helmet, express-rate-limit, 1 MB JSON body limit, CORS allow-list, prod MONGO_URI required
- **External imports:** `ExternalLead` model + Apify stub (admin-only, never auto-published)

---

## Quick start (local)

You need Node 18+.

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run dev           # http://localhost:5050 — auto-seeds in-memory DB

# 2. Frontend (second terminal)
cd frontend
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

Open <http://localhost:5173>.

> **First-run note.** The in-memory MongoDB downloads a ~100 MB binary on first start — give it a minute. If your OS is unsupported, the error message points you at the persistent-Mongo workaround.

### Demo accounts (after auto-seed)

| Role | Email | Password |
|---|---|---|
| Verified UC Davis student | `student@ucdavis.edu` | `password123` |
| Apartment manager (approved) | `manager@almondwood.com` | `password123` |
| Admin | `admin@hone.local` | `password123` |

All seed users are **pre-verified** so you can skip the verification step for demos.
**Before launching publicly, rotate these passwords or remove the seed accounts.**

---

## Email verification flow

Real verification, not just an email-domain check.

- On signup, the API generates a random token, stores **only its SHA-256 hash** with a 24-hour expiry, and either:
  - Sends a branded verification email via Resend if `RESEND_API_KEY` is set, or
  - Logs the verification URL to the server console (and returns it as `devVerifyUrl` in the registration response so the dev UI can show a clickable link).
- A user is only **`studentVerified`** when *both* their email ends in `@ucdavis.edu` *and* they have clicked their verification link. Posting subleases, leaving reviews, saving listings, and messaging are gated on `studentVerified`.

Verification states surfaced in the UI:
- ✓ Verified UC Davis student
- ✓ Apartment manager
- Email verified (non-Davis)
- Unverified
- ✓ Manager-posted listing
- ⚠ External lead — not verified by hone
- Admin-approved sublease

---

## Persistent local MongoDB

```bash
# In backend/.env:
MONGO_URI=mongodb://localhost:27017/hone

# Then seed once:
cd backend && npm run seed
```

The auto-seed only runs in in-memory mode, so set `MONGO_URI` once you want data to persist between restarts.

---

## Environment variables

### Backend (`backend/.env`)

| Var | Required? | Purpose |
|---|---|---|
| `MONGO_URI` | dev: optional · **prod: required** | Mongo connection string. Blank in dev → in-memory. |
| `JWT_SECRET` | **always** (prod hard-fails without it) | ≥48 hex chars. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | optional | Default 5050. Tests use `PORT=0` (random). |
| `CLIENT_ORIGINS` | prod | Comma-separated CORS allow-list. |
| `ALLOW_VERCEL_PREVIEWS` | prod opt-in | `true` allows `*.vercel.app` previews. |
| `RESEND_API_KEY` | dev: optional · **prod: required for email** | Live email send. Blank → console log. |
| `EMAIL_FROM` | with `RESEND_API_KEY` | Must be a verified sender in Resend. |
| `GEOCODER_USER_AGENT` | prod recommended | Identify yourself to Nominatim. `hone/1.0 (your-email)` |
| `APIFY_TOKEN` | optional | Enables the "Run Apify" admin button. |
| `APIFY_FACEBOOK_MARKETPLACE_ACTOR_ID` | optional | Actor ID for Marketplace imports. |
| `APIFY_ZILLOW_ACTOR_ID` | optional | Actor ID for Zillow-like imports. |

### Frontend (`frontend/.env`)

| Var | Purpose |
|---|---|
| `VITE_API_BASE` | Override the API base. Defaults to `/api` (Vite proxies in dev; in prod, set to your Render URL + `/api`). |

---

## External-leads workflow

Scraped/imported housing leads do **not** auto-publish.

1. Items land in the `ExternalLead` collection with `status: needs_review`.
2. Admin sees them in `/admin → external leads` with a clear "External lead — not verified" disclaimer.
3. Admin clicks **Approve** → creates a `Listing` draft with `sourceType: external_import` and `verificationStatus: unverified`.
4. The unverified listing is **hidden from the public listings response** (`GET /api/listings` filters it out).
5. Becomes public only after a verified UC Davis student, an approved manager, or an admin claims/verifies it.

Two ways to import:

```bash
# Manual paste (no Apify needed). Bulk-import pre-normalized leads.
curl -X POST http://localhost:5050/api/admin/external-leads/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"title":"...","sourceUrl":"...","sourceName":"..."}]}'
```

```bash
# Apify (optional). Disabled unless APIFY_TOKEN is set on the server.
curl -X POST http://localhost:5050/api/admin/external-leads/run-apify \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"facebook_marketplace","query":"Davis CA sublease","maxItems":50}'
```

**Important caveats:**
- Scraping Facebook Marketplace, Zillow, etc. may violate their terms of service. Treat Apify imports as a moderator tool, not a real-time product index.
- Seller contact details (phone, profile URL) are stripped from imported leads. We never display seller PII publicly.
- The hone app does not message scraped sellers on behalf of users — we only show the original source link.

---

## Test commands

```bash
cd backend
PORT=0 npm test       # PORT=0 prevents collision with a running dev server on 5050
```

```bash
cd frontend
npm run build
```

Backend tests run in-memory and skip cleanly if the in-memory MongoDB binary fails to download (sandbox or offline environments).

---

## Deploy to production

See [`DEPLOY.md`](./DEPLOY.md) for step-by-step instructions covering MongoDB Atlas, Render (backend), and Vercel (frontend). Templates: `backend/.env.production.example`, `frontend/.env.production.example`.

---

## Launch checklist

Before publicizing the URL on r/UCDavis or a Discord:

- [ ] `cd frontend && npm run build` succeeds
- [ ] `cd backend && PORT=0 npm test` passes
- [ ] MongoDB Atlas cluster created; egress IPs pinned (not `0.0.0.0/0`)
- [ ] `JWT_SECRET` ≥ 48 hex chars set on hosting provider
- [ ] `RESEND_API_KEY` set; `EMAIL_FROM` is a verified sender; sent yourself a test signup email
- [ ] Rate limiting verified (try 6 failed logins in a row → 429)
- [ ] `/privacy`, `/terms`, `/safety`, `/about` all load and link from the footer
- [ ] `admin@hone.local` replaced with a real address in the legal pages and login error copy
- [ ] Seed demo passwords rotated, or seed accounts removed from prod
- [ ] No `.env*` files committed (`grep -r 'JWT_SECRET=' .` should only hit examples)
- [ ] CORS `CLIENT_ORIGINS` matches your prod frontend exactly
- [ ] Filed a test report and approved/rejected it via `/admin`
- [ ] (Optional) Apify token set + one test import run, approved, and verified

---

## Manual QA checklist

Walk this list before any release. Each flow should complete without console errors.

### Guest
- [ ] Visit `/` — listings load, map renders, filter pills are clickable, dropdowns appear **above** the map.
- [ ] Click every filter pill in turn (long term, sublease, bedrooms, price, rating, commute, all filters) — each opens and stays open until you click outside.
- [ ] Open a listing detail page directly via URL.
- [ ] On mobile width (≤ 640px), the **List / Map** toggle works and filter pills scroll horizontally.
- [ ] Footer shows About / Safety / Privacy / Terms; each loads.
- [ ] Trying to favorite a listing redirects to login.

### Signup + verification
- [ ] Sign up with `test@ucdavis.edu`. After submit, the success page shows the dev verification link (when `RESEND_API_KEY` is unset).
- [ ] Click the link. Email verification page confirms success and the user is now a verified UC Davis student.
- [ ] Sign up with `test@gmail.com`. Verifying still works but you stay `email_verified` (not `verified_student`).
- [ ] Resend a verification link from `/verify-email` (rate-limited to 3/hour).
- [ ] Expired token (set `emailVerifyExpires` to a past date in the DB) returns the expected error.
- [ ] More than 5 failed logins in 15 min → 429.

### Verified student
- [ ] Post a sublease with description < 30 chars — backend rejects.
- [ ] Post a sublease with `startDate >= endDate` — backend rejects.
- [ ] Post a sublease with price = 50 or 50000 — backend rejects.
- [ ] Post a valid sublease — toast says "pending review", dashboard shows `pending`, public list doesn't include it yet.
- [ ] After admin approves, sublease appears on the listing detail page.
- [ ] Leave a review on a listing — rating average updates immediately.
- [ ] Save a listing — heart fills, dashboard shows it under saved.
- [ ] Send a message from a listing — conversation opens at `/messages`.

### Account deletion (Privacy promise)
- [ ] On `/dashboard`, scroll to "Danger zone".
- [ ] Click "Delete my account" → confirm modal → account is gone, you're logged out.
- [ ] Reviews you left are now anonymous but still visible on the listing.

### Manager
- [ ] Sign up a new manager — `managerStatus` is `pending`.
- [ ] Try to access `/manager` — see "Approval pending" page.
- [ ] After admin approves the manager **and** a claim, manager sees the claimed listing in their dashboard.

### Admin
- [ ] `/admin → pending` shows the pre-seeded external-import listing under "Pending listings". Verify it; it now appears in the public list.
- [ ] `/admin → external leads` exists. Imported leads carry the amber "External lead — not verified" badge.
- [ ] Approve a lead → a Listing is created with `sourceType: external_import` and stays hidden from the public list until verified.
- [ ] Approve / reject a pending sublease.
- [ ] Approve a manager claim request.
- [ ] File a report from a listing detail page (including the new **Spam** category); admin sees it under "Open reports".
- [ ] Remove a review from the report admin actions.
- [ ] Hide a sublease.
- [ ] Suspend a user — they can no longer sign in. Unsuspend — they can.

### Safety + trust
- [ ] External-import listing shows the amber "Not verified by hone" badge and the inline trust note.
- [ ] Sublease section on listing detail shows the safety notice.
- [ ] Report button on reviews appears on hover; report modal renders with all 7 categories.
- [ ] Toast notifications appear in the top-right and dismiss after a few seconds. No browser `alert()` or `confirm()` anywhere.

### Cross-cutting
- [ ] All buttons have hover/focus states.
- [ ] No console errors in normal flows.
- [ ] All empty states render with a friendly explanation.
- [ ] Page resizes to mobile / tablet / desktop without horizontal scrolling.

---

## Project layout

```
hone/
├── backend/
│   ├── server.js, seed.js, seedData.js
│   ├── config/db.js
│   ├── middleware/{auth, error, rateLimit}.js
│   ├── models/{User, Listing, Sublease, Review, Report, ClaimRequest,
│   │           Conversation, ExternalLead}.js
│   ├── routes/{auth, listings, subleases, reviews, conversations, claims,
│   │           reports, users, admin}.js
│   ├── services/{emailService, apifyImportService, geocodeService}.js
│   └── test/api.test.js
└── frontend/
    └── src/
        ├── api/client.js
        ├── context/{AuthContext, ToastContext}.jsx
        ├── components/{FilterBar, MapView, Navbar, Footer, ListingCard, …
        │               Badges, ImagePreviewInput, ReportButton, SafetyNotice,
        │               StaticPage, ProtectedRoute}.jsx
        └── pages/{Home, ListingDetail, Login, Signup, ManagerLogin,
                   VerifyEmail, Dashboard, SubleaseForm, Messages,
                   ManagerDashboard, AdminDashboard,
                   About, Privacy, Terms, Safety}.jsx
```

---

## Known limits (deferred)

- **Image uploads** are URL-only. `ImagePreviewInput`'s prop shape (`value`/`onChange` of a string URL) is designed for drop-in replacement with an uploader (Cloudinary, S3, UploadThing) without touching call sites.
- **Messaging is HTTP**, not WebSocket. Real-time isn't critical for a sublease platform but you'll feel the polling on a long conversation.
- **Commute times** are stored per-listing in seed data; no live transit API yet.
- **Geocoding** uses Nominatim (free, 1 req/sec). For high-volume imports, swap to Mapbox/Google in `services/geocodeService.js`.
- **Reviews are anonymized, not deleted, on account deletion** unless the user requests `?wipeReviews=true`. The Privacy page documents this.
