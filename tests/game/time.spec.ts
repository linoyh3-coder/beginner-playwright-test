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

  test('אחרי 3 שניות כל הצרכים יורדים', async () => {
    await game.advanceSeconds(3);

    await expect(game.needValue('food')).toHaveText('75');
    await expect(game.needValue('energy')).toHaveText('77');
    await expect(game.needValue('fun')).toHaveText('76');
    await expect(game.needValue('hygiene')).toHaveText('78');
    await expect(game.survivalTime).toHaveText('0:03');
  });

  test('בלי טיפול מופיעה אזהרה ומצב הרוח נהיה גרוע', async () => {
    await expect(game.warning).toBeHidden();

    await game.advanceSeconds(12 * 3); // 12 "תקתוקים" = 36 שניות

    // שובע: 80 - 12×5 = 20 ← נמוך!
    await expect(game.warning).toBeVisible();
    await expect(game.warning).toContainText('Food');
    await expect(game.mood).toHaveText('Bad');
    await expect(game.avatar).toHaveText('😢');
    await expect(game.survivalTime).toHaveText('0:36');
  });

  test('צרכים לא יורדים מתחת ל-0', async () => {
    await game.advanceSeconds(60 * 3); // 3 דקות

    await expect(game.needValue('food')).toHaveText('0');
    await expect(game.needValue('hygiene')).toHaveText('0');
    await expect(game.survivalTime).toHaveText('3:00');
  });

  test('אכילה מצילה מאזהרה של רעב', async () => {
    await game.advanceSeconds(12 * 3);
    await expect(game.warning).toContainText('Food');

    await game.doAction('eat');

    await expect(game.warning).not.toContainText('Food');
  });

  test('פס הצורך משנה צבע לאדום כשהוא נמוך', async () => {
    await expect(game.needBar('food')).not.toHaveClass(/level-low/);

    await game.advanceSeconds(12 * 3);

    await expect(game.needBar('food')).toHaveClass(/level-low/);
    await expect(game.needBar('food')).toHaveAttribute('aria-valuenow', '20');
  });
});
