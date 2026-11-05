import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('פעולות של הדמות', () => {
  let game: GamePage;

  // לפני כל בדיקה: נכנסים למשחק (עם זמן קפוא) ויוצרים דמות בשם Noa
  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('אכילה מעלה שובע, מורידה ניקיון ועולה 10 $', async () => {
    await game.doAction('eat');

    // 80 + 30 = 110, אבל המקסימום הוא 100
    await expect(game.needValue('food')).toHaveText('100');
    await expect(game.needValue('hygiene')).toHaveText('75');
    await expect(game.money).toHaveText('40');
  });

  test('משחק מעלה כיף ומוריד אנרגיה', async () => {
    await game.doAction('play');

    await expect(game.needValue('fun')).toHaveText('100');
    await expect(game.needValue('energy')).toHaveText('70');
  });

  test('עבודה מכניסה כסף אבל מעייפת', async () => {
    await game.doAction('work');

    await expect(game.money).toHaveText('70');
    await expect(game.needValue('energy')).toHaveText('65');
    await expect(game.needValue('fun')).toHaveText('70');
  });

  test('שינה ומקלחת לא עוברות את 100', async () => {
    await game.doAction('sleep');
    await game.doAction('shower');

    await expect(game.needValue('energy')).toHaveText('100');
    await expect(game.needValue('hygiene')).toHaveText('100');
  });

  test('אי אפשר לאכול כשנגמר הכסף, ומופיע הסבר', async () => {
    // יש 50 $, כל ארוחה עולה 10 $ ← אפשר לאכול 5 פעמים
    for (let i = 0; i < 5; i++) {
      await game.doAction('eat');
    }

    await expect(game.money).toHaveText('0');
    await expect(game.action('eat')).toBeDisabled();
    await expect(game.actionHint('eat')).toHaveText('Not enough money');
  });

  test('אי אפשר לעבוד כשהדמות עייפה מדי', async () => {
    // אנרגיה: 80 → 65 → 50 → 35 → 20 → 5
    for (let i = 0; i < 5; i++) {
      await game.doAction('work');
    }

    await expect(game.needValue('energy')).toHaveText('5');
    await expect(game.action('work')).toBeDisabled();
    await expect(game.actionHint('work')).toHaveText('Too tired to work');

    // אחרי שינה אפשר לעבוד שוב, וההסבר נעלם
    await game.doAction('sleep');
    await expect(game.action('work')).toBeEnabled();
    await expect(game.actionHint('work')).toBeHidden();
  });

  test('כל פעולה נרשמת ביומן, האחרונה למעלה', async () => {
    await expect(game.logEmpty).toBeVisible();

    await game.doAction('eat');
    await game.doAction('sleep');

    await expect(game.logEntries).toHaveCount(2);
    await expect(game.logEntries.first()).toHaveText('Noa took a nap');
    await expect(game.logEntries.last()).toHaveText('Noa had a meal');
    await expect(game.logEmpty).toBeHidden();
  });

  test('אחרי פעולה מופיעה הודעה קופצת', async () => {
    await game.doAction('shower');

    await expect(game.toast).toHaveText('Noa took a shower');
    await expect(game.toast).toHaveClass(/visible/);
  });

  test('התחלה מחדש מחזירה למסך יצירת הדמות', async () => {
    await game.resetButton.click();

    await expect(game.createScreen).toBeVisible();
    await expect(game.gameScreen).toBeHidden();
    await expect(game.nameInput).toBeEmpty();
  });
});
