import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('עיצוב וחוויית משתמש', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
  });

  test('מעבר בין מצב בהיר לכהה, והבחירה נשמרת', async ({ page }) => {
    // מתחילים במצב בהיר (כמו מחשב שמוגדר למצב בהיר)
    await page.emulateMedia({ colorScheme: 'light' });
    await game.goto();
    const html = page.locator('html');

    await game.themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(game.themeToggle).toHaveAccessibleName('Switch to light mode');

    // אחרי רענון הדף הבחירה נשארת (נשמרת ב-localStorage)
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await game.themeToggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('הכפתורים נגישים לפי התפקיד והשם שלהם', async ({ page }) => {
    // getByRole מחפש כמו שקורא מסך מחפש – סימן שהאתר נגיש
    await game.goto();
    await page.getByRole('textbox', { name: 'Buddy name' }).fill('Noa');
    await page.getByRole('button', { name: /Start living/ }).click();

    await expect(page.getByRole('heading', { name: 'Noa' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Food' })).toHaveAttribute('aria-valuenow', '80');
  });

  test('המשחק עובד גם במסך של טלפון', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // גודל של אייפון
    await game.goto();
    await game.createCharacter('Noa');

    await expect(game.action('eat')).toBeVisible();
    await game.doAction('eat');
    await expect(game.money).toHaveText('40');

    // אין גלילה לרוחב – הדף לא רחב יותר מהמסך
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });
});
