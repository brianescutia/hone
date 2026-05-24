// Playwright config for hone end-to-end smoke tests.
//
// Design choices (for future-you):
//   - workers: 1 + fullyParallel: false. The dev backend is a single shared
//     in-memory or hone_dev instance. Parallel tests would race on its state.
//   - No webServer block. You start `npm run dev` in /backend and /frontend
//     yourself, so logs are clear and a missing server fails fast with a
//     readable "connect ECONNREFUSED" instead of a 2-minute spawn timeout.
//   - Chromium only — same reason as workers: less to install, less to flake.
//   - trace + screenshot on failure so you can debug from the HTML report.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5173',
        actionTimeout: 10_000,
        navigationTimeout: 15_000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
});