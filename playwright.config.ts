import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Run tests inside a file in parallel.
  fullyParallel: true,

  // Fail the build on CI if a test.only was left behind.
  forbidOnly: !!process.env.CI,

  // Retry flaky tests on CI only.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [['html'],['github'], { open: 'never' }], ['list']],

  use: {
    baseURL: 'https://www.google.com',
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});