import { test, expect } from '@playwright/test';

// בבדיקות האלה אנחנו "שולטים בזמן" עם page.clock,
// כדי לא לחכות באמת דקות שלמות שהצרכים ירדו.
test.describe('הזמן עובר', () => {
  test.beforeEach(async ({ page }) => {
    // חייבים להתקין את השעון המזויף *לפני* שהדף נטען
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('name-input').fill('נועה');
    await page.getByTestId('start-button').click();
  });

  test('אחרי 3 שניות כל הצרכים יורדים', async ({ page }) => {
    await page.clock.runFor(3000); // מריצים 3 שניות קדימה

    await expect(page.getByTestId('food-value')).toHaveText('75');
    await expect(page.getByTestId('energy-value')).toHaveText('77');
    await expect(page.getByTestId('fun-value')).toHaveText('76');
    await expect(page.getByTestId('hygiene-value')).toHaveText('78');
  });

  test('בלי טיפול מופיעה אזהרה ומצב הרוח נהיה גרוע', async ({ page }) => {
    await expect(page.getByTestId('warning')).toBeHidden();

    await page.clock.runFor(12 * 3000); // 12 "תקתוקים" = 36 שניות

    // שובע: 80 - 12×5 = 20 ← נמוך!
    await expect(page.getByTestId('warning')).toBeVisible();
    await expect(page.getByTestId('warning')).toContainText('שובע');
    await expect(page.getByTestId('mood')).toHaveText('גרוע 😢');
  });

  test('צרכים לא יורדים מתחת ל-0', async ({ page }) => {
    await page.clock.runFor(60 * 3000); // 3 דקות

    await expect(page.getByTestId('food-value')).toHaveText('0');
    await expect(page.getByTestId('hygiene-value')).toHaveText('0');
  });

  test('אכילה מצילה מאזהרה של רעב', async ({ page }) => {
    await page.clock.runFor(12 * 3000);
    await expect(page.getByTestId('warning')).toContainText('שובע');

    await page.getByTestId('action-eat').click();

    await expect(page.getByTestId('warning')).not.toContainText('שובע');
  });
});
