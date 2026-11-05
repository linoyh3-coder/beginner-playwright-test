import { test, expect } from '@playwright/test';

// הבדיקות האלה רצות על אתר חיצוני (חנות תרגול), לא על המשחק שלנו
test.use({ baseURL: 'https://www.saucedemo.com' });

// שם משתמש וסיסמה מגיעים מקובץ .env ולא כתובים בקוד
const username = process.env.SAUCE_USERNAME!;
const password = process.env.SAUCE_PASSWORD!;

test.describe('התחברות לחנות', () => {
  // אם אין שם משתמש/סיסמה (למשל ב-GitHub בלי Secrets) – מדלגים במקום להיכשל
  test.skip(!username || !password, 'חסרים SAUCE_USERNAME / SAUCE_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('משתמש תקין מצליח להתחבר', async ({ page }) => {
    await page.getByTestId('username').fill(username);
    await page.getByTestId('password').fill(password);
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByTestId('title')).toHaveText('Products');
  });

  test('סיסמה שגויה מציגה שגיאה', async ({ page }) => {
    await page.getByTestId('username').fill(username);
    await page.getByTestId('password').fill('wrong-password');
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('error')).toContainText('Username and password do not match');
    await expect(page).not.toHaveURL(/inventory\.html/);
  });

  test('משתמש נעול לא יכול להתחבר', async ({ page }) => {
    await page.getByTestId('username').fill('locked_out_user');
    await page.getByTestId('password').fill(password);
    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('error')).toContainText('locked out');
  });
});
