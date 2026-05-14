# Deploying hone

This guide walks through a production deployment using free or near-free tiers:

- **Database:** MongoDB Atlas (free tier)
- **Backend:** Render (free web service) — Railway and Fly.io work the same way
- **Frontend:** Vercel (free hobby)

Total cost: $0 for low traffic. Expect ~30 minutes for the first deploy.

---

## 1. MongoDB Atlas

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> and create an organization.
2. **Build a Database** → pick the free **M0** tier, any cloud, region close to your backend.
3. **Database Access** → **Add New Database User**. Username and a strong password — copy them somewhere safe.
4. **Network Access** → **Add IP Address**. For first setup, allow `0.0.0.0/0` ("anywhere"). Tighten later by adding your backend host's egress IPs only.
5. **Database** → **Connect** → **Drivers** → **Node.js**. Copy the SRV URI; it looks like:

   ```
   mongodb+srv://USER:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real one, and add `/hone` before the `?` so the URI ends with `/hone?retryWrites=…`. That's your `MONGO_URI`.

---

## 2. Seed the production DB (once)

The first time, you need to run the seed script against Atlas so demo data and demo accounts exist. Do it locally:

```bash
cd backend
MONGO_URI="mongodb+srv://USER:PASS@cluster0.example.mongodb.net/hone?retryWrites=true&w=majority" \
JWT_SECRET="anything_for_seed_script" \
npm run seed
```

You should see `[seed] done`. Skip this step if you'd rather start with an empty database.

---

## 3. Backend on Render

1. Push your code to GitHub.
2. Go to <https://dashboard.render.com> → **New +** → **Web Service** → connect your repo.
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. **Environment** tab → add the variables from `backend/.env.production.example`:
   - `NODE_ENV=production`
   - `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `MONGO_URI` — from step 1
   - `CLIENT_ORIGINS` — leave blank for now; come back after step 4
5. Deploy. Once it's live, note the URL — e.g. `https://hone-api.onrender.com`.
6. Health check: `curl https://hone-api.onrender.com/api/health` should return `{"ok":true}`.

> **Render free-tier note:** the service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to cold-boot. Fine for student demos; upgrade or move to Railway/Fly.io if that's a problem.

**Railway and Fly.io** work identically — point at the `backend` folder, set the same env vars, deploy.

---

## 4. Frontend on Vercel

1. Same GitHub repo. Go to <https://vercel.com/new> → import the repo.
2. Settings:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite (auto-detected)
   - **Build command:** `npm run build` (default)
   - **Output directory:** `dist` (default)
3. **Environment Variables** → add:
   - `VITE_API_BASE=https://hone-api.onrender.com/api` (from step 3)
4. Deploy. Vercel gives you a URL like `https://hone.vercel.app`.

---

## 5. Connect CORS

Back to Render → your backend service → **Environment**:

- Set `CLIENT_ORIGINS=https://hone.vercel.app,https://your-custom-domain.com`
- Optionally set `ALLOW_VERCEL_PREVIEWS=true` so PR preview deploys also work
- Save → Render redeploys automatically

Open your Vercel URL in a private window. Sign in with the seeded demo account — if you see listings, CORS is good.

---

## 6. Custom domain (optional)

- **Frontend:** Vercel → Project → Domains → add `hone.app`, follow the DNS instructions.
- **Backend:** Render → Service → Settings → Custom Domains → add `api.hone.app`.
- Update `VITE_API_BASE` on Vercel to `https://api.hone.app/api` and `CLIENT_ORIGINS` on Render to your new frontend domain. Both services redeploy automatically.

---

## 7. Set up Resend for real email

Verification emails fall back to the server console if `RESEND_API_KEY` is missing — useful for dev, useless for real users.

1. Sign up at <https://resend.com> (free tier: 100 emails/day).
2. **Domains** → **Add Domain** → add the domain you'll send from (e.g. `hone.app`). Add the DNS records Resend gives you to your domain provider.
3. **API Keys** → **Create API Key** → "Full access" or "Sending access". Copy the `re_…` value.
4. On Render → backend service → **Environment**:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=hone <no-reply@your-verified-domain.com>` — the `@` part must match the verified domain.
5. Redeploy. Sign up with a real address you control. You should receive a real branded email.

If sending fails in prod, the backend logs the Resend error and the signup response includes `emailDelivery: "live"` regardless — check Render logs.

---

## 8. Going from "launchable" to "launched"

Things to do before publicizing the URL on a UC Davis subreddit or Discord:

- [ ] **Rotate seed passwords.** Either remove the seed accounts from prod (`MONGO_URI` set → no auto-seed), or change `password123` on every seeded account.
- [ ] **Replace `admin@hone.local`** in `frontend/src/pages/{About,Privacy,Terms,Safety}.jsx` and `backend/routes/auth.js` (suspension message) with a real address you'll monitor.
- [ ] **Tighten Atlas Network Access.** Replace `0.0.0.0/0` with Render's egress IPs (Render → Service → Connect → Outbound IPs).
- [ ] **Atlas backups.** The free tier doesn't include automatic backups; enable scheduled snapshots on M2+ or write a nightly `mongodump` cron.
- [ ] **Add a real image upload pipeline.** The `ImagePreviewInput` component is structured so you can swap URL input for a Cloudinary/S3 uploader without changing call sites.
- [ ] **Monitoring.** Sentry on the frontend and a log drain on Render — even free tiers catch the worst crashes.
- [ ] **Test rate limits work.** From an incognito window, fail login 6 times → confirm 429 with friendly JSON error.
- [ ] **Test the deletion flow.** Sign up a throwaway, post a sublease, hit "Delete my account" on the dashboard, confirm it's gone.
- [ ] **(Optional) Apify.** If you'll use Apify imports, configure `APIFY_TOKEN` + actor IDs, run one test import, approve it through `/admin → external leads`, confirm the new listing renders with the "External lead — not verified" badge.

---

## Troubleshooting

**"CORS: origin … not allowed"** — your `CLIENT_ORIGINS` env var doesn't include the frontend URL. No trailing slash. Re-save and wait for redeploy.

**"Invalid email or password" on every login** — you didn't seed the prod DB (step 2), or you're hitting the wrong DB. Check `MONGO_URI` matches the cluster you seeded.

**The frontend works locally but not in prod** — check the browser network tab. If requests are going to `localhost:5050`, your `VITE_API_BASE` env var wasn't set at build time. Trigger a rebuild on Vercel after setting it.

**"JWT_SECRET must be set"** on Render boot — set the env var. The backend hard-fails in production if it's missing.

**Render service sleeping** — free tier. Either accept the cold start, or upgrade to Render's $7/mo Starter plan, or move the backend to Railway/Fly.io.
