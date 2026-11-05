import { test, expect } from '@playwright/test';

test.describe('פעולות של הדמות', () => {
  // לפני כל בדיקה: נכנסים למשחק ויוצרים דמות בשם נועה
  test.beforeEach(async ({ page }) => {
    // מקפיאים את הזמן: בלי זה, אם הבדיקה איטית (מעל 3 שניות),
    // הצרכים יורדים באמצע והמספרים לא יוצאים כמו שציפינו
    await page.clock.install({ time: new Date('2026-01-01T10:00:00') });
    await page.goto('/');
    await page.clock.pauseAt(new Date('2026-01-01T10:00:01')); // הזמן עוצר כאן
    await page.getByTestId('name-input').fill('נועה');
    await page.getByTestId('start-button').click();
  });

  test('אכילה מעלה שובע, מורידה ניקיון ועולה 10 ₪', async ({ page }) => {
    await page.getByTestId('action-eat').click();

    // 80 + 30 = 110, אבל המקסימום הוא 100
    await expect(page.getByTestId('food-value')).toHaveText('100');
    await expect(page.getByTestId('hygiene-value')).toHaveText('75');
    await expect(page.getByTestId('money')).toHaveText('40');
  });

  test('משחק מעלה כיף ומוריד אנרגיה', async ({ page }) => {
    await page.getByTestId('action-play').click();

    await expect(page.getByTestId('fun-value')).toHaveText('100');
    await expect(page.getByTestId('energy-value')).toHaveText('70');
  });

  test('עבודה מכניסה כסף אבל מעייפת', async ({ page }) => {
    await page.getByTestId('action-work').click();

    await expect(page.getByTestId('money')).toHaveText('70');
    await expect(page.getByTestId('energy-value')).toHaveText('65');
    await expect(page.getByTestId('fun-value')).toHaveText('70');
  });

  test('שינה ומקלחת לא עוברות את 100', async ({ page }) => {
    await page.getByTestId('action-sleep').click();
    await page.getByTestId('action-shower').click();

    await expect(page.getByTestId('energy-value')).toHaveText('100');
    await expect(page.getByTestId('hygiene-value')).toHaveText('100');
  });

  test('אי אפשר לאכול כשנגמר הכסף', async ({ page }) => {
    const eat = page.getByTestId('action-eat');

    // יש 50 ₪, כל ארוחה עולה 10 ₪ ← אפשר לאכול 5 פעמים
    for (let i = 0; i < 5; i++) {
      await eat.click();
    }

    await expect(page.getByTestId('money')).toHaveText('0');
    await expect(eat).toBeDisabled();
  });

  test('אי אפשר לעבוד כשהדמות עייפה מדי', async ({ page }) => {
    const work = page.getByTestId('action-work');

    // אנרגיה: 80 → 65 → 50 → 35 → 20 → 5
    for (let i = 0; i < 5; i++) {
      await work.click();
    }

    await expect(page.getByTestId('energy-value')).toHaveText('5');
    await expect(work).toBeDisabled();

    // אחרי שינה אפשר לעבוד שוב
    await page.getByTestId('action-sleep').click();
    await expect(work).toBeEnabled();
  });

  test('כל פעולה נרשמת ביומן, האחרונה למעלה', async ({ page }) => {
    await page.getByTestId('action-eat').click();
    await page.getByTestId('action-sleep').click();

    const logItems = page.getByTestId('log').getByRole('listitem');
    await expect(logItems).toHaveCount(2);
    await expect(logItems.first()).toHaveText('נועה: 😴 שינה');
    await expect(logItems.last()).toHaveText('נועה: 🍔 אכילה');
  });

  test('התחלה מחדש מחזירה למסך יצירת הדמות', async ({ page }) => {
    await page.getByTestId('reset-button').click();

    await expect(page.getByTestId('create-screen')).toBeVisible();
    await expect(page.getByTestId('game-screen')).toBeHidden();
    await expect(page.getByTestId('name-input')).toBeEmpty();
  });
});
