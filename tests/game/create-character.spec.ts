import { test, expect } from '@playwright/test';

test.describe('יצירת דמות', () => {
  test.beforeEach(async ({ page }) => {
    // '/' = כתובת המשחק (מוגדרת ב-baseURL בקובץ playwright.config.ts)
    await page.goto('/');
  });

  test('כפתור ההתחלה מושבת כשאין שם', async ({ page }) => {
    await expect(page.getByTestId('start-button')).toBeDisabled();
  });

  test('שם עם רווחים בלבד לא מתקבל', async ({ page }) => {
    await page.getByTestId('name-input').fill('   ');
    await expect(page.getByTestId('start-button')).toBeDisabled();
  });

  test('יצירת דמות פותחת את מסך המשחק עם ערכי התחלה', async ({ page }) => {
    await page.getByTestId('name-input').fill('נועה');
    await page.getByTestId('start-button').click();

    // מסך היצירה נעלם ומסך המשחק מופיע
    await expect(page.getByTestId('create-screen')).toBeHidden();
    await expect(page.getByTestId('game-screen')).toBeVisible();

    // בדיקת ערכי ההתחלה
    await expect(page.getByTestId('character-name')).toHaveText('נועה');
    await expect(page.getByTestId('money')).toHaveText('50');
    await expect(page.getByTestId('food-value')).toHaveText('80');
    await expect(page.getByTestId('energy-value')).toHaveText('80');
    await expect(page.getByTestId('fun-value')).toHaveText('80');
    await expect(page.getByTestId('hygiene-value')).toHaveText('80');
    await expect(page.getByTestId('mood')).toHaveText('מעולה 😊');
  });

  test('אפשר להתחיל גם בלחיצה על Enter', async ({ page }) => {
    await page.getByTestId('name-input').fill('דני');
    await page.getByTestId('name-input').press('Enter');

    await expect(page.getByTestId('character-name')).toHaveText('דני');
  });
});
