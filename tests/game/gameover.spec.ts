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
    // שובע יורד 4 בכל תקתוק עד רמה 2 (תקתוק 16), אחרי זה יורד 5
    // חישוב: 90 - (15*4) - (7*5) = 90 - 60 - 35 = -5 → מגיע לאפס סביב תקתוק 22
    // 22 * 6 = 132 שניות = 2:12
    await game.advanceSeconds(22 * 6);

    await expect(game.gameoverScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
    await expect(game.gameoverName).toHaveText('Noa');
    await expect(game.gameoverTime).toHaveText('2:12');
  });

  test('בסוף משחק ראשון מופיע "שיא חדש", והשיא מוצג גם במסך הפתיחה', async () => {
    await game.advanceSeconds(22 * 6);

    await expect(game.gameoverRecord).toBeVisible();
    await expect(game.gameoverBest).toHaveText('2:12');

    // "שחקו שוב" מחזיר למסך הפתיחה, שם מוצג השיא
    await game.playAgainButton.click();
    await expect(game.createScreen).toBeVisible();
    await expect(game.bestPill).toBeVisible();
    await expect(game.bestTime).toHaveText('2:12');
  });

  test('אחרי סוף משחק אפשר להתחיל משחק חדש', async () => {
    await game.advanceSeconds(22 * 6);
    await game.playAgainButton.click();

    await game.createCharacter('Dan');

    await expect(game.gameScreen).toBeVisible();
    await expect(game.characterName).toHaveText('Dan');
    await expect(game.needValue('food')).toHaveText('90'); // התחלה נקייה
  });
});
