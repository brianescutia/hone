# hone manual QA checklist

Walk this list after every deploy to production. The goal is not
exhaustive coverage — it's catching regressions in the paths that, if
broken, would make hone look amateur to a UC Davis student who heard
about the private beta from a friend.

Time budget: ~10 minutes.

---

## 0. Smoke

- [ ] `GET https://<api>/api/health` returns `{ ok: true }` quickly (<1s).
- [ ] Frontend home loads, map tiles render, listing cards render, no
      console errors related to env vars.
- [ ] No `VITE_*` is missing — open the network tab, confirm
      `VITE_API_BASE_URL` produces real backend requests, not 404s on
      `/api/...` relative paths.
- [ ] `/login` and `/manager-login` do **not** show the "Demo (dev only)"
      box.

## 1. Auth (Google)

- [ ] `/login` → "Continue with Google" pops the Google account chooser.
- [ ] Signing in with a `@ucdavis.edu` Google account lands you on `/`
      with `Welcome, <name>. You're verified as a UC Davis student.`
- [ ] Signing in with a non-Davis Google account shows the
      "isn't a UC Davis Google account" toast. Posting is blocked.
- [ ] `/auth/me` returns the user after a hard refresh (no flash of
      logged-out state for >0.5s).

## 2. Auth (email/password)

- [ ] `/login` accepts `admin@your-real-domain` + the password you set
      via `createAdmin.js`. (Do **not** test demo passwords in prod.)
- [ ] `/manager-login` lets a new manager apply; account lands in
      `managerStatus: pending`.

## 3. Browse + filter

- [ ] Home page lists at least the seeded apartments (or the bootstrapped
      Davis list if you ran the import script).
- [ ] Search input filters by name.
- [ ] Pills: price, bedrooms, rating, commute open popovers ABOVE the
      map (not clipped).
- [ ] On mobile, the filter pill row scrolls horizontally, popovers fit
      on screen, and the list/map toggle works.
- [ ] Empty state ("No listings match those filters") shows with a
      visible "Clear all filters" button when filters return no results.

## 4. Listing detail

- [ ] Photos render, or the placeholder card shows for listings without
      photos.
- [ ] Claim badge shows the right label:
  - Almondwood → "Verified Property Manager" (demo only) OR
    "Claimed by Property"
  - All other seed listings → "Unclaimed listing" or the appropriate state
- [ ] External import demo listing ("Greens at Cordova" in the seed) is
      **not** visible to public users until verified.
- [ ] Commute panel, expense calculator, reviews list all render.
- [ ] Report button on a review opens the report dialog and submits.

## 5. Sublease post

- [ ] As a verified UC Davis student, `/subleases/new` renders.
- [ ] Submit with `AUTO_APPROVE_VERIFIED_STUDENT_SUBLEASES=true`:
      toast says "Your sublease is live."
- [ ] Submit with the flag false: toast says "pending review" and the
      sublease appears under `/admin/pending` → Subleases.
- [ ] As an unverified student or signed-out user, the route bounces or
      shows the verification gate.
- [ ] Safety notice is visible on the form.

## 6. Manager claim

- [ ] Existing manager (`/manager`) sees their verified properties (if
      any) and the pending/rejected claim history.
- [ ] `/manager/claim-property?listing=<id>` pre-selects that listing.
- [ ] Submitting a claim with `workEmail` on a free provider (gmail.com)
      lands as `confidence: 'low'`.
- [ ] Submitting with a `workEmail` whose domain matches `companyWebsite`
      lands as `confidence: 'high'`.
- [ ] Admin `/admin` → Pending tab → "Pending manager claims" shows the
      claim card with confidence, reason, proof message, and both the
      Approve and Reject buttons working.
- [ ] After admin approves: the listing's `claimStatus` becomes
      `claimed`, the manager's `verifiedManagerFor` includes the listing.
- [ ] Approved manager can hit `/manager/listings/:id/edit` and save
      changes (when `MANAGER_AUTO_APPROVE_CLAIMED_LISTING_UPDATES=true`).
- [ ] Manager cannot edit a listing they're not verified for: PATCH
      returns 403.

## 7. Admin tools

- [ ] `/admin` Pending tab shows accurate counts for:
  - Pending subleases
  - Pending listings (external imports awaiting verification)
  - Pending manager claims
  - Open reports
- [ ] Approve/reject buttons each succeed and re-fetch the queue.
- [ ] External Leads tab: every imported lead is labeled "External lead
      — not verified" and stays gated until admin acts on it.
- [ ] Users tab: suspend/unsuspend toggles work.
- [ ] Reports tab: resolving a report removes it from "open" count.

## 8. Trust/legal pages

- [ ] Footer links to: About, Safety, Contact, Report a problem,
      Privacy, Terms.
- [ ] About/Privacy/Terms render the **real** support email (set via
      `VITE_SUPPORT_EMAIL`). They must **not** show `admin@hone.local`
      in production.
- [ ] Contact page renders an "Email support" button that opens a
      `mailto:` to the real address.
- [ ] `/report-problem` as a signed-out user shows the "sign in to
      report" prompt.
- [ ] `/report-problem` as a signed-in user submits a report.
- [ ] Safety page links to `/report-problem`.

## 9. Account deletion

- [ ] Dashboard "Delete my account" button works on a throwaway student
      account; you are logged out and the user record is gone from the DB.
- [ ] "Delete + wipe reviews" also removes the user's reviews.
- [ ] Admin accounts cannot self-delete: the API returns 403.

## 10. Security spot-checks

- [ ] In a Railway log line, search for "mongodb+srv" — the URI itself
      must NOT appear. The log says `[db] Connecting to MongoDB...`,
      nothing more.
- [ ] JWTs do not appear in any log line.
- [ ] `view-source:` on the frontend — confirm `VITE_GOOGLE_CLIENT_ID` is
      the only Google value visible. The server's `GOOGLE_CLIENT_SECRET`
      must NOT appear.
- [ ] `.env` files are not committed: `git ls-files | grep -i env` only
      shows `.example` files.

---

If anything fails this list, **don't tell more students about hone
yet**. Roll the fix, redeploy, walk the list again.
