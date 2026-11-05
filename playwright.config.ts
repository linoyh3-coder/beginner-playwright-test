import { defineConfig, devices } from '@playwright/test';

// טוען משתנים מקובץ .env (שמות משתמש/סיסמאות) לתוך process.env.
// מובנה ב-Node, לא צריך חבילה נוספת. אם אין קובץ .env, פשוט ממשיכים.
try {
  process.loadEnvFile();
} catch {}

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

  // ב-GitHub Actions מוסיפים גם דוח מיוחד שמסמן שגיאות ישר על הקוד
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    // כתובת המשחק שלנו. page.goto('/') פותח את הכתובת הזו.
    baseURL: 'http://127.0.0.1:3000',
    // האלמנטים מסומנים ב-data-test="..." — כך אפשר להשתמש ב-page.getByTestId('...')
    testIdAttribute: 'data-test',
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Playwright מפעיל את שרת המשחק לבד לפני הבדיקות, ומכבה אותו בסוף
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
