import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('חנות', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('קפה עולה 15 $ ונותן הרבה אנרגיה', async () => {
    await game.buyItem('coffee');

    await expect(game.money).toHaveText('35'); // 50 - 15
    await expect(game.needValue('energy')).toHaveText('100'); // 80 + 60, חסום ב-100
  });

  test('מסיבת פיצה מעלה שובע וכיף ועולה 25 $', async () => {
    await game.buyItem('pizza');

    await expect(game.money).toHaveText('25'); // 50 - 25
    await expect(game.needValue('food')).toHaveText('100');
    await expect(game.needValue('fun')).toHaveText('100');
  });

  test('קנייה בחנות נרשמת ביומן', async () => {
    await game.buyItem('spa');

    await expect(game.logEntries.first()).toHaveText('Noa enjoyed a spa day');
  });

  test('אי אפשר לקנות כשאין מספיק כסף, ומופיע הסבר', async () => {
    // מתחילים עם 50 $. ספא עולה 30 → נשאר 20, לא מספיק לעוד ספא
    await game.buyItem('spa');

    await expect(game.money).toHaveText('20');
    await expect(game.shopItem('spa')).toBeDisabled();
    await expect(game.actionHint('spa')).toHaveText('Not enough money');
  });
});
