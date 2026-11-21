import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

// בבדיקות האלה אנחנו "שולטים בזמן" עם page.clock,
// כדי לא לחכות באמת דקות שלמות שהצרכים ירדו.
test.describe('הזמן עובר', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('אחרי 6 שניות כל הצרכים יורדים', async () => {
    await game.advanceSeconds(6);

    await expect(game.needValue('food')).toHaveText('86');
    await expect(game.needValue('energy')).toHaveText('88');
    await expect(game.needValue('fun')).toHaveText('87');
    await expect(game.needValue('hygiene')).toHaveText('88'); // 90 - 1.5 ≈ 88
    await expect(game.survivalTime).toHaveText('0:06');
  });

  test('בלי טיפול מופיעה אזהרה ומצב הרוח נהיה גרוע', async () => {
    await expect(game.warning).toBeHidden();

    // 20 תקתוקים × 6 שניות = 120 שניות
    // food: 90 - 80 = 10, energy: 90-40=50, fun: 90-60=30, hygiene: 90-30=60
    await game.advanceSeconds(20 * 6);

    // שובע: 90 - 20×4 = 10 ← נמוך!
    await expect(game.warning).toBeVisible();
    await expect(game.warning).toContainText('Food');
    await expect(game.mood).toHaveText('Bad');
    await expect(game.avatar).toHaveText('😢');
    await expect(game.survivalTime).toHaveText('2:00');
  });

  test('אכילה מצילה מאזהרה של רעב', async () => {
    await game.advanceSeconds(20 * 6);
    await expect(game.warning).toContainText('Food');

    await game.doAction('eat');

    await expect(game.warning).not.toContainText('Food');
  });

  test('פס הצורך משנה צבע לאדום כשהוא נמוך', async () => {
    await expect(game.needBar('food')).not.toHaveClass(/level-low/);

    // 18 תקתוקים × 6 שניות = 108 שניות → food: 90-72=18
    await game.advanceSeconds(18 * 6);

    await expect(game.needBar('food')).toHaveClass(/level-low/);
    await expect(game.needBar('food')).toHaveAttribute('aria-valuenow', '18');
  });

  test('פס הצורך נהיה ענבר כשהוא מתחת ל-50', async () => {
    // MID_LIMIT = 50. אחרי 10 תקתוקים שובע = 90 - 40 = 50
    await expect(game.needBar('food')).not.toHaveClass(/level-mid/);

    await game.advanceSeconds(10 * 6);

    await expect(game.needBar('food')).toHaveClass(/level-mid/);
    await expect(game.needBar('food')).toHaveAttribute('aria-valuenow', '50');
  });

  test('כשכמה צרכים נמוכים בו-זמנית מופיעות כמה אזהרות', async () => {
    // אוכלים 4 פעמים: שובע=100, ניקיון=40, כסף=10
    for (let i = 0; i < 4; i++) {
      await game.doAction('eat');
    }

    // 18 תקתוקים: שובע=28, כיף=16 ← שניהם מתחת ל-20? בעצם שובע 28 >20, כיף 36? תיקון:
    // נשתמש ב-24 תקתוקים: שובע 90-24*4=4, כיף 90-24*3=18 → שניהם מתחת ל-20
    await game.advanceSeconds(24 * 6);

    await expect(game.warning).toContainText('Food');
    await expect(game.warning).toContainText('Fun');
  });
});
