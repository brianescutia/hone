# hone deploy guide

Concrete, opinionated steps for shipping the current beta to UC Davis
students. This is meant to be **followed in order** the first time you
deploy. After that, the **Checklist** at the bottom is the short version
for follow-up deploys.

---

## 1. Provision infra (one time)

You need three accounts: **MongoDB Atlas**, **Railway**, **Vercel**, plus a
Google Cloud project for OAuth and (optionally) **Resend** for email.

### MongoDB Atlas
- Create an `M0`/free cluster.
- Database user with a strong password.
- Under **Network Access**, allow Railway's egress (or `0.0.0.0/0` while
  iterating — tighten later).
- Copy the SRV connection string. This is `MONGO_URI`.

### Google OAuth
- console.cloud.google.com → APIs & Services → Credentials → **OAuth 2.0
  Client ID**, Web application.
- Authorized JavaScript origins:
  - `https://hone-olive.vercel.app` (and any custom domain)
  - `http://localhost:5173` (for dev)
- Authorized redirect URIs: leave the Railway callback URL in too, even
  though the ID-token flow doesn't strictly need it.
- Copy the Client ID and Client Secret.

### Resend (optional but recommended)
- Get an API key.
- Verify a domain in the Resend dashboard. `EMAIL_FROM` must use that
  domain (e.g. `hone <no-reply@your-domain.com>`).

---

## 2. Backend env vars (Railway)

Set these in **Railway → your service → Variables**. None of these go in
git.

| Var | Required | Value |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `JWT_SECRET` | yes | 48+ random hex chars. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MONGO_URI` | yes | Atlas SRV string |
| `GOOGLE_CLIENT_ID` | yes | from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | yes | from Google Cloud |
| `CLIENT_ORIGIN` | yes | comma-separated, e.g. `https://hone-olive.vercel.app,https://yourcustom.com` |
| `ALLOW_VERCEL_PREVIEWS` | no | `false` for prod; `true` if you actively use preview deploys |
| `SUPPORT_EMAIL` | yes | A real, monitored email. **Do not leave as `admin@hone.local`.** |
| `AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES` | yes | `true` for private beta after first wave is reviewed manually |
| `MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES` | yes | `true` once first round of manager edits is reviewed |
| `SEED_DEMO_DATA` | yes | **`false`** for production |
| `RESEND_API_KEY` | recommended | from Resend |
| `EMAIL_FROM` | recommended | `hone <no-reply@your-domain.com>` |
| `APIFY_TOKEN` | no | only if you plan to use external imports |

> **Refusal-to-boot safety nets.** The backend refuses to start in
> production if `JWT_SECRET` is missing/short or `MONGO_URI` is missing. It
> warns if `GOOGLE_CLIENT_ID` is missing.

---

## 3. Frontend env vars (Vercel)

Set these in **Vercel → Project → Settings → Environment Variables**.
Vite inlines `VITE_*` vars at build time, so you must redeploy after
changing them.

| Var | Required | Value |
|---|---|---|
| `VITE_API_BASE_URL` | yes | `https://hone-production-6f2e.up.railway.app/api` (or your Railway URL) |
| `VITE_GOOGLE_CLIENT_ID` | yes | same as backend's `GOOGLE_CLIENT_ID` |
| `VITE_SUPPORT_EMAIL` | yes | same address as backend's `SUPPORT_EMAIL` |
| `VITE_SHOW_DEMO_CREDENTIALS` | yes | **`false`** for production |

The Contact/Privacy/Terms/About pages all read `VITE_SUPPORT_EMAIL` and
silently hide the support email line in production if it's not set or is
set to a `.local` / `example.com` placeholder. Setting a real address is
how that line shows up.

---

## 4. First-deploy bootstrap

After Railway is up but before public launch:

```bash
# Locally with prod MONGO_URI in your shell:
ADMIN_EMAIL='you@your-real-domain.com' \
ADMIN_PASSWORD='<a long random string, save in a password manager>' \
ADMIN_NAME='Your Name' \
MONGO_URI='<prod-uri>' \
JWT_SECRET='<prod-secret>' \
node backend/scripts/createAdmin.js
```

This creates exactly one admin account. Demo seed data is **not** loaded
in production unless `SEED_DEMO_DATA=true`.

---

## 5. Security cleanup before public launch

Do all of these before you tell more than a small private beta about hone.

- [ ] **Rotate `JWT_SECRET`** to a value no one outside you has seen. Every
      currently-signed-in user will be logged out — that's fine for a
      private beta.
- [ ] **Remove or change every demo password.** The seed data uses
      `password123`; that exists for in-memory dev only. Use
      `scripts/createAdmin.js` to set real admin credentials.
- [ ] **`SEED_DEMO_DATA=false`** in Railway. Confirm by checking the
      Railway logs on startup don't say "seeding production-style DB".
- [ ] **`VITE_SHOW_DEMO_CREDENTIALS=false`** in Vercel. Confirm by
      visiting `/login` and `/manager-login` — the "Demo (dev only)" box
      must not appear.
- [ ] **`SUPPORT_EMAIL` and `VITE_SUPPORT_EMAIL`** point at a real,
      monitored mailbox — not `admin@hone.local`.
- [ ] **CORS origins** in `CLIENT_ORIGIN` match exactly what the browser
      sends. No trailing slashes, no http:// vs https:// mismatches.
- [ ] **`.env` files are git-ignored.** `git check-ignore -v backend/.env`
      must say so. They are; this is a "trust but verify" line.
- [ ] **No secrets logged.** Backend logs the host of `MONGO_URI` but not
      credentials; it never logs JWTs or the Google client secret. Skim
      a real production log to confirm.
- [ ] **Google OAuth origins** include the production frontend URL.
- [ ] **MongoDB Atlas IP allowlist** is at least as tight as
      "everywhere" — ideally only Railway egress IPs.

---

## 6. Build and deploy

Backend (Railway) auto-deploys from `main` by default. To trigger:

```bash
git push origin main
```

Frontend (Vercel) auto-deploys from `main` by default. To trigger
manually:

```bash
# from frontend/
vercel --prod
```

Or push to main.

---

## 7. External imports (Apify) — policy

The Apify integration is NOT enabled in this pass. When you turn it on
later, the rules below are non-negotiable:

- **Nothing scraped auto-publishes.** Every Apify item lands as an
  `ExternalLead` with `status: 'needs_review'`. Admin reviews them in
  the External Leads tab.
- **Facebook Marketplace, Zillow, and similar imports must be
  admin-reviewed before becoming visible Listings.** Approving a lead
  creates a Listing draft with `sourceType: 'external_import'` and
  `verificationStatus: 'unverified'`.
- **Imported listings are labeled "External listing — not verified by
  hone"** until a verified UC Davis student, an approved manager, or an
  admin verifies the data.
- **Managers can later claim imported listings through the normal claim
  flow** — no separate path.
- **Respect source terms and privacy.** Scraping Facebook Marketplace,
  Zillow, Craigslist, etc. may violate their TOS and in some
  jurisdictions implicates the CFAA or equivalent laws. Use Apify
  imports as an internal moderator tool, not a real-time index. Strip
  seller PII from the public-facing fields (the import service already
  does this; do not bypass it).

---

## Short checklist (every subsequent deploy)

```
[ ] CI / tests green (cd backend && npm test; cd ../frontend && npm run build)
[ ] git push origin main
[ ] Watch Railway logs for "[server] hone API listening"
[ ] Watch Vercel deploy for green build
[ ] Curl /api/health on the prod backend
[ ] Hit /login as a verified student via Google
[ ] Hit /manager as the demo manager account
[ ] Hit /admin as your real admin account
```
