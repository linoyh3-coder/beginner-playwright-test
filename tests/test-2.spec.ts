import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://github.com/linoyh3-coder');
  await page.getByRole('link', { name: 'Repositories' }).click();
  await page.getByRole('link', { name: 'beginner-playwright-test' }).click();
  await expect(page.locator('#repository-container-header')).toContainText('linoyh3-coder');
  await page.getByRole('link', { name: 'Pull requests' }).click();
  await page.getByRole('link', { name: 'Actions' }).click();
  await expect(page.getByRole('link', { name: 'failed: Run 5 of Playwright' })).toContainText('run tests');
});