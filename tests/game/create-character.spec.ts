import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('יצירת דמות', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
  });

  test('כפתור ההתחלה מושבת כשאין שם', async () => {
    await expect(game.startButton).toBeDisabled();
  });

  test('שם עם רווחים בלבד לא מתקבל', async () => {
    await game.nameInput.fill('   ');
    await expect(game.startButton).toBeDisabled();
  });

  test('יצירת דמות פותחת את מסך המשחק עם ערכי התחלה', async () => {
    await game.createCharacter('Noa');

    // מסך היצירה נעלם ומסך המשחק מופיע
    await expect(game.createScreen).toBeHidden();
    await expect(game.gameScreen).toBeVisible();

    // בדיקת ערכי ההתחלה
    await expect(game.characterName).toHaveText('Noa');
    await expect(game.money).toHaveText('50');
    await expect(game.needValue('food')).toHaveText('80');
    await expect(game.needValue('energy')).toHaveText('80');
    await expect(game.needValue('fun')).toHaveText('80');
    await expect(game.needValue('hygiene')).toHaveText('80');
    await expect(game.mood).toHaveText('Great');
    await expect(game.avatar).toHaveText('😄');
    await expect(game.survivalTime).toHaveText('0:00');
  });

  test('אפשר להתחיל גם בלחיצה על Enter', async () => {
    await game.nameInput.fill('Dan');
    await game.nameInput.press('Enter');

    await expect(game.characterName).toHaveText('Dan');
  });

  test('שם עם קוד HTML מוצג כטקסט רגיל ולא מורץ', async () => {
    // בדיקת אבטחה בסיסית: מה שהמשתמש מקליד לא אמור להפוך לקוד בדף
    await game.createCharacter('<b>Bold</b>');

    await expect(game.characterName).toHaveText('<b>Bold</b>');
  });
});
