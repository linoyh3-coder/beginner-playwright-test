import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('הדירה', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('הדמות מתחילה באמצע החדר', async () => {
    await expect(game.room).toBeVisible();
    await expect(game.character).toHaveAttribute('data-location', 'idle');
  });

  test('לחיצה על המיטה בחדר = שינה, והדמות הולכת למיטה', async () => {
    await game.doAction('work'); // אנרגיה 80 → 65
    await game.useFurniture('bed');

    await expect(game.needValue('energy')).toHaveText('100'); // 65 + 40, חסום ב-100
    await expect(game.character).toHaveAttribute('data-location', 'bed');
  });

  test('לחיצה על המטבח = אכילה, ונרשם ביומן', async () => {
    await game.useFurniture('kitchen');

    await expect(game.money).toHaveText('40');
    await expect(game.logEntries.first()).toHaveText('Noa had a meal');
    await expect(game.character).toHaveAttribute('data-location', 'kitchen');
  });

  // אותה בדיקה רצה 5 פעמים – פעם לכל פעולה. כך לא כותבים את אותו קוד שוב ושוב.
  const placeForAction = [
    { action: 'eat', place: 'kitchen' },
    { action: 'sleep', place: 'bed' },
    { action: 'play', place: 'tv' },
    { action: 'shower', place: 'bath' },
    { action: 'work', place: 'desk' },
  ];
  for (const { action, place } of placeForAction) {
    test(`הכפתור "${action}" שולח את הדמות אל ${place}`, async () => {
      await game.doAction(action);
      await expect(game.character).toHaveAttribute('data-location', place);
    });
  }

  test('קנייה בחנות שולחת את הדמות למקום המתאים', async () => {
    await game.buyItem('coffee');
    await expect(game.character).toHaveAttribute('data-location', 'kitchen');
  });

  test('בלי כסף המטבח חסום, ולחיצה עליו מסבירה למה', async () => {
    for (let i = 0; i < 5; i++) {
      await game.doAction('eat'); // 50 $ → 0 $
    }

    const kitchen = game.furniture('kitchen');
    await expect(kitchen).toBeDisabled(); // בודק את aria-disabled="true"

    // Playwright לא לוחץ על אלמנט חסום, אז מכריחים אותו עם force
    await kitchen.click({ force: true });
    await expect(game.toast).toHaveText('Not enough money');
    await expect(game.money).toHaveText('0');
  });

  test('אפשר להשתמש ברהיטים גם עם המקלדת', async () => {
    await game.furniture('desk').focus();
    await game.furniture('desk').press('Enter');

    await expect(game.money).toHaveText('70'); // עבודה: +20 $
    await expect(game.character).toHaveAttribute('data-location', 'desk');
  });

  test('כשצורך נמוך הדמות "חושבת" עליו', async ({ page }) => {
    await game.advanceSeconds(12 * 3); // שובע יורד ל-20

    await expect(page.locator('.bubble')).toHaveClass(/is-thought/);
    await expect(page.locator('.bubble text')).toHaveText('🍔');
  });
});

test.describe('יום ולילה', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('המשחק מתחיל ביום הראשון בשעה 08:00', async () => {
    await expect(game.gameClock).toHaveText('Day 1 · 08:00');
    await expect(game.room).toHaveAttribute('data-phase', 'day');
  });

  test('כל 3 שניות עוברת שעה במשחק', async () => {
    await game.advanceSeconds(3);
    await expect(game.gameClock).toHaveText('Day 1 · 09:00');
  });

  test('בשעה 17:00 מתחיל ערב', async () => {
    await game.advanceSeconds(9 * 3); // 9 שעות: 08:00 → 17:00
    await expect(game.gameClock).toHaveText('Day 1 · 17:00');
    await expect(game.room).toHaveAttribute('data-phase', 'evening');
  });

  test('בשעה 20:00 יורד לילה', async () => {
    await game.advanceSeconds(12 * 3); // 12 שעות: 08:00 → 20:00
    await expect(game.gameClock).toHaveText('Day 1 · 20:00');
    await expect(game.room).toHaveAttribute('data-phase', 'night');
  });
});
