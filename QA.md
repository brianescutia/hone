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

## 11. Auth persistence (added after Google-login null-user fix)

### 11a. Storage contains both keys after Google login
- [ ] Sign in with an `@ucdavis.edu` Google account.
- [ ] Open DevTools → Application → Local Storage → `https://hone-olive.vercel.app`.
- [ ] `hone_token` is a JWT (three base64 segments joined by `.`).
- [ ] `hone_user` is a JSON object containing at least `id`, `email`, `role`, `studentVerified: true`.
- [ ] Same after email/password login. Same after register.

### 11b. Refresh keeps the user logged in
- [ ] After login, hard-refresh (Cmd-Shift-R / Ctrl-Shift-R). Dashboard reloads with the same user — no "logged out" flash.
- [ ] DevTools → Network shows one `GET /api/auth/me` returning 200. Response body has no `passwordHash`.

### 11c. Verified student can post a sublease
- [ ] As a verified student, fill out `/subleases/new` and submit.
- [ ] `POST /api/subleases` returns 201. Toast: "Your sublease is pending review."
- [ ] `Authorization: Bearer <hone_token>` was present on the request.

### 11d. Unverified user gets a clean 403
- [ ] Sign up with a non-Davis email/password (or sign in via Google with a Gmail account).
- [ ] Attempt `POST /api/subleases` (either via the form or via curl with their token).
- [ ] Server returns 403. Frontend shows: "Only verified UC Davis students can post subleases."
- [ ] User stays logged in (not bounced to /login).

### 11e. Stale-token recovery
This simulates what happens when JWT_SECRET rotates or the DB is reseeded.

- [ ] Open DevTools → Application → Local Storage. Confirm both `hone_token` and `hone_user` are set.
- [ ] In the Console, run: `localStorage.setItem('hone_token', 'eyJ0eXAiOi.broken.token')`
- [ ] Reload the page.
- [ ] Expected: toast "Please sign in again." → redirect to `/login`. Local storage no longer contains `hone_token` or `hone_user`.

Repeat with a token that's valid but for a deleted user (e.g., issued before a `seed.js` run):
- [ ] `requireAuth` middleware sees `User.findById(payload.id) === null` and returns 401.
- [ ] Global 401 handler in `api/client.js` fires the registered callback.
- [ ] `AuthContext` clears `hone_token` + `hone_user`, toasts, navigates to `/login`.

### 11f. Manual recovery still works
- [ ] In Console: `localStorage.clear()` → reload → user is logged out cleanly (no console errors, no spinner).
- [ ] Log back in via Google → both keys are restored.

## 12. /auth/me endpoint contract
```bash
TOKEN="..."  # paste from localStorage
curl -i https://hone-production-6f2e.up.railway.app/api/auth/me                                # → 401
curl -i -H "Authorization: Bearer bogus" https://hone-production-6f2e.up.railway.app/api/auth/me   # → 401
curl -i -H "Authorization: Bearer $TOKEN" https://hone-production-6f2e.up.railway.app/api/auth/me  # → 200 { "user": {...} }
```
- [ ] 200 response body has `user.id`, `user.email`, `user.role`, `user.studentVerified`.
- [ ] 200 response body does NOT contain `passwordHash`, `googleId`, or `emailVerifyTokenHash`.

