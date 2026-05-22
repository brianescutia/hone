# QA.md — hone post-fix verification

Run this list after deploying the changes in this PR. Each box should be checked off before announcing the launch.

## 1. Endpoints respond
- [ ] `curl https://hone-production-6f2e.up.railway.app/api/health` → `{"ok":true}`
- [ ] `curl https://hone-production-6f2e.up.railway.app/api/listings` → JSON with at least one listing
- [ ] Visit `https://hone-olive.vercel.app/` → listings and map render

## 2. SPA refresh works
Open each of these in a fresh tab (not via in-app navigation) and confirm the page renders (no 404):
- [ ] `https://hone-olive.vercel.app/login`
- [ ] `https://hone-olive.vercel.app/signup`
- [ ] `https://hone-olive.vercel.app/dashboard`
- [ ] `https://hone-olive.vercel.app/subleases/new`
- [ ] `https://hone-olive.vercel.app/admin`

## 3. API routing from the browser
Open DevTools → Network on `https://hone-olive.vercel.app/`. Reload.
- [ ] Requests to `/api/listings` (or directly to Railway, depending on `VITE_API_BASE_URL`) return 200.
- [ ] No 404s under any `/api/...` path.
- [ ] No CORS errors in the console.

## 4. Auth — Google OAuth
- [ ] `/login` shows a "Continue with Google" button.
- [ ] Helper text reads: "Use your UC Davis Google account to become a verified student" and "Only verified UC Davis students can post subleases or leave verified reviews."
- [ ] Sign in with an `@ucdavis.edu` Google account → toast: "You're verified as a UC Davis student." Dashboard shows the Verified UC Davis student badge.
- [ ] Sign in with a non-`@ucdavis.edu` Google account → toast: "this isn't a UC Davis Google account" — dashboard shows the "browsing only" notice. `studentVerified` is `false`.
- [ ] Manually-typed `@ucdavis.edu` email/password signup does NOT mark `studentVerified`. (The new signup page tells them so directly.)

## 5. No fake email-verification dead ends
- [ ] Signing up as a student with email/password no longer says "check your inbox" or "we sent a verification link."
- [ ] The page that previously said it now says: "To become a verified UC Davis student, sign in with Google using your @ucdavis.edu account."
- [ ] No "Resend verification email" button shown to students.

## 6. Protected actions still require `studentVerified`
- [ ] Verified UC Davis student can `POST /api/subleases` (returns 201).
- [ ] Unverified (or non-Davis-Google) account gets 403 on `POST /api/subleases`.
- [ ] Verified UC Davis student can `POST /api/reviews`.
- [ ] Unverified account gets 403 on `POST /api/reviews`.
- [ ] None of the backend protected actions use `email.endsWith('@ucdavis.edu')` — only `studentVerified === true`.

## 7. Admin/manager not downgraded by Google sign-in
- [ ] Sign an admin account in via Google with the same email → role stays `admin`, not demoted to `student`.
- [ ] Sign an approved manager in via Google with the same email → role stays `manager`, `managerStatus` stays `approved`.

## 8. CORS
- [ ] Railway env has `CLIENT_ORIGIN=https://hone-olive.vercel.app` (or `CLIENT_ORIGINS=...`).
- [ ] Cross-origin requests from `hone-olive.vercel.app` succeed.
- [ ] Preflight `OPTIONS` requests return 204/200 with proper `Access-Control-Allow-*` headers.
- [ ] Server logs show only `[cors] denied origin <foo>` for actually-disallowed origins — no full URI dumps.

## 9. Security
- [ ] Railway logs do NOT contain the full `MONGO_URI` string.
- [ ] Railway logs show `[db] Connecting to MongoDB...` then `[db] Connected` — no credentials.
- [ ] Demo credentials block does NOT appear on `/login` or `/manager-login` in production.
- [ ] `VITE_SHOW_DEMO_CREDENTIALS` is unset (or `false`) on Vercel.
- [ ] `SEED_DEMO_DATA` is `false` (or unset) on Railway.

## 10. Smoke test summary
```bash
# Backend
cd backend
npm install
PORT=0 npm test

# Frontend
cd ../frontend
npm install
npm run build
```
