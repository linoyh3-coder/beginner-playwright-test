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
    // שובע יורד 4 בכל תקתוק, מתחיל ב-90 → מגיע ל-0 אחרי 23 תקתוקים
    // (22 תקתוקים מורידים 88, נשארים 2; תקתוק 23 מוריד עוד 4 → 0)
    // כל תקתוק = 6 שניות → 23 * 6 = 138 שניות = 2:18
    await game.advanceSeconds(23 * 6);

    await expect(game.gameoverScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
    await expect(game.gameoverName).toHaveText('Noa');
    await expect(game.gameoverTime).toHaveText('2:18');
  });

  test('בסוף משחק ראשון מופיע "שיא חדש", והשיא מוצג גם במסך הפתיחה', async () => {
    await game.advanceSeconds(23 * 6);

    await expect(game.gameoverRecord).toBeVisible();
    await expect(game.gameoverBest).toHaveText('2:18');

    // "שחקו שוב" מחזיר למסך הפתיחה, שם מוצג השיא
    await game.playAgainButton.click();
    await expect(game.createScreen).toBeVisible();
    await expect(game.bestPill).toBeVisible();
    await expect(game.bestTime).toHaveText('2:18');
  });

  test('אחרי סוף משחק אפשר להתחיל משחק חדש', async () => {
    await game.advanceSeconds(23 * 6);
    await game.playAgainButton.click();

    await game.createCharacter('Dan');

    await expect(game.gameScreen).toBeVisible();
    await expect(game.characterName).toHaveText('Dan');
    await expect(game.needValue('food')).toHaveText('90'); // התחלה נקייה
  });
});
