// End-to-end smoke tests for hone.
//
// Preconditions before `npm run test:e2e`:
//   1. Backend running on :5050   (cd backend && npm run dev)
//   2. Frontend running on :5173  (cd frontend && npm run dev)
//   3. Seeded demo accounts:
//        student@ucdavis.edu    / password123
//        manager@almondwood.com / password123
//        admin@hone.local       / password123
//   4. For test #3:  cd backend && npm run bootstrap:davis
//      (loads Davis-area apartments with unknown prices)
//   5. For test #12: cd backend && npm run seed
//      (re-run if you have a stale "Greens at Cordova" from before the
//       external-import filter was added)
//
// Rate-limit note:
//   /api/auth/login is rate-limited to 5 attempts / 15 min / IP in dev.
//   This file does exactly 3 UI logins per run (one per role, via serial
//   describes + a shared browser context). You can therefore re-run the
//   full suite roughly every 5 minutes without tripping the limiter.

import { test, expect } from '@playwright/test';

const STUDENT = { email: 'student@ucdavis.edu', password: 'password123' };
const MANAGER = { email: 'manager@almondwood.com', password: 'password123' };
const ADMIN = { email: 'admin@hone.local', password: 'password123' };

// ----- helpers -----

async function loginAtLoginPage(page, { email, password }) {
    await page.goto('/login');
    await page.getByPlaceholder('email address').fill(email);
    await page.getByPlaceholder('password').fill(password);
    await page.getByRole('button', { name: 'Sign in with email' }).click();
}

async function loginAtManagerLoginPage(page, { email, password }) {
    await page.goto('/manager-login');
    await page.getByPlaceholder('email address').fill(email);
    await page.getByPlaceholder('password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

// ----- public listings -----

test.describe('Public listings page', () => {
    test('1. listings page loads with seeded apartments', async ({ page }) => {
        await page.goto('/');
        await expect(
            page.getByRole('heading', { name: 'Almondwood Apartments', level: 3 })
        ).toBeVisible();
    });

    test('2. no listing card shows $0/month', async ({ page }) => {
        await page.goto('/');
        await expect(
            page.getByRole('heading', { name: 'Almondwood Apartments', level: 3 })
        ).toBeVisible();
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toMatch(/\$0\s*\/\s*(mo|month)/i);
        expect(bodyText).not.toMatch(/\$0\+\s*\/\s*(mo|month)/i);
    });

    test('3. unknown-price listings render "Contact for pricing" (not "$0/month")', async ({ page, request }) => {
        // Look at the API directly to see whether any unknown-price listings
        // are in the dev DB. They come from `npm run bootstrap:davis`, which
        // only works against a real MongoDB (set MONGO_URI in backend/.env).
        const apiRes = await request.get('http://localhost:5050/api/listings');
        expect(apiRes.status()).toBe(200);
        const { listings } = await apiRes.json();
        const unknownPriced = listings.filter(
            (l) => (!l.priceMin || l.priceMin === 0) && (!l.priceMax || l.priceMax === 0)
        );

        // If you haven't run bootstrap:davis (or aren't on a real Mongo), this
        // test has nothing to check. We skip it with a clear hint rather than
        // failing — test #2 ("no $0/month") still guards the failure mode.
        test.skip(
            unknownPriced.length === 0,
            'No unknown-price listings in the dev DB. To enable this test: set MONGO_URI in backend/.env to a real MongoDB (e.g. mongodb://localhost:27017/hone_dev), run `cd backend && npm run seed && npm run bootstrap:davis`, then re-run.'
        );

        // Data exists — assert the rendering is correct.
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Contact for pricing').first()).toBeVisible();
    });

    test('4. clicking a listing card opens its detail page', async ({ page }) => {
        await page.goto('/');
        await page
            .getByRole('link', { name: /Almondwood Apartments/i })
            .first()
            .click();
        await expect(page).toHaveURL(/\/listings\/[a-f0-9]+/);
        await expect(
            page.getByRole('heading', { name: 'Almondwood Apartments', level: 1 })
        ).toBeVisible();
    });

    test('12. public listings do not show unapproved external leads', async ({ page, request }) => {
        // 1) API-level: the filter in routes/listings.js should hide any
        //    external_import listing whose verificationStatus isn't verified/claimed.
        const apiRes = await request.get('http://localhost:5050/api/listings');
        expect(apiRes.status()).toBe(200);
        const { listings } = await apiRes.json();
        const stale = listings.filter(
            (l) =>
                l.sourceType === 'external_import' &&
                !['verified', 'claimed'].includes(l.verificationStatus)
        );
        expect(
            stale.map((l) => `${l.name} (${l.verificationStatus})`),
            'API returned unverified external-import listings on the public endpoint. Your local DB has stale records — re-seed with: cd backend && npm run seed'
        ).toHaveLength(0);

        // 2) UI-level: the canonical external-import fixture must not render.
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Greens at Cordova')).toHaveCount(0);
    });
});

// ----- student session: tests 5 & 6 share one login -----

test.describe.serial('Student session', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        const ctx = await browser.newContext();
        page = await ctx.newPage();
        await loginAtLoginPage(page, STUDENT);
        await expect(page).toHaveURL('http://localhost:5173/');
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('5. student login lands on / with a signed-in navbar', async () => {
        await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    });

    test('6. logged-in student cannot access the admin dashboard', async () => {
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toHaveCount(0);
    });
});

// ----- manager session: tests 7 & 8 share one login -----

test.describe.serial('Manager session', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        const ctx = await browser.newContext();
        page = await ctx.newPage();
        await loginAtManagerLoginPage(page, MANAGER);
        await expect(page).toHaveURL('http://localhost:5173/manager');
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('7. manager login lands on /manager', async () => {
        expect(page.url()).toBe('http://localhost:5173/manager');
    });

    test('8. manager dashboard shows Almondwood Apartments', async () => {
        await expect(page.getByRole('heading', { name: 'Manager dashboard' })).toBeVisible();
        await expect(page.getByText(/You manage/i)).toContainText('Almondwood Apartments');
        await expect(
            page.getByRole('heading', { name: 'Your verified properties' })
        ).toBeVisible();
    });
});

// ----- admin session: tests 9, 10 & 11 share one login -----

test.describe.serial('Admin session', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        const ctx = await browser.newContext();
        page = await ctx.newPage();
        await loginAtLoginPage(page, ADMIN);
        await expect(page).toHaveURL('http://localhost:5173/admin');
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('9. admin login lands on /admin', async () => {
        expect(page.url()).toBe('http://localhost:5173/admin');
    });

    test('10. admin dashboard loads with all tabs', async () => {
        await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^pending \(\d+\)$/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /^external leads \(\d+\)$/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /^users \(\d+\)$/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /^listings \(\d+\)$/ })).toBeVisible();
    });

    test('11. External Leads tab loads without crashing', async () => {
        await page.getByRole('button', { name: /^external leads \(\d+\)$/ }).click();
        const empty = page.getByText('No external leads waiting on review.');
        const banner = page.getByText('External lead — not verified.', { exact: false });
        await expect(empty.or(banner).first()).toBeVisible();
    });
});