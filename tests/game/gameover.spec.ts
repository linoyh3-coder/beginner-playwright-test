import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('סוף משחק', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('כשצורך מגיע ל-0 מופיע מסך סוף משחק עם הזמן ששרדת', async () => {
    // שובע יורד 5 בכל תקתוק, מתחיל ב-80 → מגיע ל-0 אחרי 16 תקתוקים = 48 שניות
    await game.advanceSeconds(16 * 3);

    await expect(game.gameoverScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
    await expect(game.gameoverName).toHaveText('Noa');
    await expect(game.gameoverTime).toHaveText('0:48');
  });

  test('בסוף משחק ראשון מופיע "שיא חדש", והשיא מוצג גם במסך הפתיחה', async () => {
    await game.advanceSeconds(16 * 3);

    await expect(game.gameoverRecord).toBeVisible();
    await expect(game.gameoverBest).toHaveText('0:48');

    // "שחקו שוב" מחזיר למסך הפתיחה, שם מוצג השיא
    await game.playAgainButton.click();
    await expect(game.createScreen).toBeVisible();
    await expect(game.bestPill).toBeVisible();
    await expect(game.bestTime).toHaveText('0:48');
  });

  test('אחרי סוף משחק אפשר להתחיל משחק חדש', async () => {
    await game.advanceSeconds(16 * 3);
    await game.playAgainButton.click();

    await game.createCharacter('Dan');

    await expect(game.gameScreen).toBeVisible();
    await expect(game.characterName).toHaveText('Dan');
    await expect(game.needValue('food')).toHaveText('80'); // התחלה נקייה
  });
});
