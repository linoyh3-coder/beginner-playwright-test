import { test, expect } from '@playwright/test';


test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();
  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});


// Homework
// Learn what is masking, and why we need to use masking in e2e tests, does it has some limitation's
// Learn about how to do correct snapshot testing, tell me where its useful or where its wrong.

test('homepage hero matches its visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://playwright.dev/docs/intro');

  await page.addStyleTag({ content: 'header.hero { background: crimson !important; }' });
  const hero = page.locator('header.hero');
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();

  // First run writes the baseline into tests/example.spec.ts-snapshots/.
  // Later runs compare against it and fail if the hero changes visually.
  // Re-record intentional changes with: npx playwright test --update-snapshots
  await expect(hero).toHaveScreenshot('homepage-hero.png', {
    maxDiffPixelRatio: 0.02,
  });
});
