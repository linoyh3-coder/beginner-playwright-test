import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

// כאן בודקים את "השמירה האוטומטית" – המשחק זוכר את הדמות גם אחרי רענון הדף.
// השמירה נעשית ב-localStorage, הזיכרון של הדפדפן.
test.describe('שמירה אוטומטית', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
  });

  test('אחרי רענון הדף הדמות והמצב נשמרים', async ({ page }) => {
    await game.goto();
    await game.createCharacter('Noa');
    await game.doAction('eat'); // כסף: 50 → 40

    await page.reload();

    // חוזרים ישר למשחק, בלי מסך יצירת דמות
    await expect(game.gameScreen).toBeVisible();
    await expect(game.characterName).toHaveText('Noa');
    await expect(game.money).toHaveText('40');
  });

  test('"התחלה מחדש" מוחקת את השמירה', async ({ page }) => {
    await game.goto();
    await game.createCharacter('Noa');
    await game.resetButton.click();

    await page.reload();

    // אין שמירה → נשארים במסך יצירת דמות
    await expect(game.createScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
  });

  test('אחרי סוף משחק לא חוזרים לדמות שמתה', async ({ page }) => {
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
    await game.advanceSeconds(16 * 3); // מגיעים לסוף משחק
    await expect(game.gameoverScreen).toBeVisible();

    await page.reload();

    await expect(game.createScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
  });
});
