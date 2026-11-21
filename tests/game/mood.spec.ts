import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

// מצב הרוח מחושב כממוצע של כל 4 הצרכים:
//   Great (😄): ממוצע ≥ 70
//   Okay  (🙂): ממוצע ≥ 40
//   Bad   (😢): ממוצע < 40

test.describe('מצב רוח ואווטאר', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('בהתחלה מצב הרוח "Great" והאווטאר שמח', async () => {
    // ממוצע = (90+90+90+90)/4 = 90 → Great
    await expect(game.mood).toHaveText('Great');
    await expect(game.avatar).toHaveText('😄');
  });

  test('אחרי 8 תקתוקים מצב הרוח הופך ל-"Okay"', async () => {
    // food: 58, energy: 74, fun: 66, hygiene: 78 → ממוצע 69 → Okay
    await game.advanceSeconds(8 * 6);

    await expect(game.mood).toHaveText('Okay');
    await expect(game.avatar).toHaveText('🙂');
  });

  test('אחרי 20 תקתוקים מצב הרוח הופך ל-"Bad"', async () => {
    // food: 10, energy: 50, fun: 30, hygiene: 60 → ממוצע 37.5 → Bad
    await game.advanceSeconds(20 * 6);

    await expect(game.mood).toHaveText('Bad');
    await expect(game.avatar).toHaveText('😢');
  });

  test('אכילה משפרת מצב רוח מ-"Bad" ל-"Okay"', async () => {
    await game.advanceSeconds(20 * 6); // ממוצע 37.5 → Bad
    await expect(game.mood).toHaveText('Bad');

    await game.doAction('eat'); // food: 10 → 40
    // food: 40, energy: 50, fun: 30, hygiene: 55 → ממוצע 43.75 → Okay
    await expect(game.mood).toHaveText('Okay');
    await expect(game.avatar).toHaveText('🙂');
  });

  // בדיקה שרצה פעמיים – פעם לכל פריט חנות שמשפר מצב רוח מ-Bad ל-Okay
  const boosts = [
    { item: 'coffee', label: 'קפה',  note: '+60 אנרגיה → ממוצע 52' },
    { item: 'spa',    label: 'ספא',  note: '+50 ניקיון +30 כיף → ממוצע 56.5' },
  ];
  for (const { item, label, note } of boosts) {
    test(`${label} מחנות משפר מצב רוח (${note})`, async () => {
      await game.advanceSeconds(20 * 6); // → Bad
      await expect(game.mood).toHaveText('Bad');

      await game.buyItem(item);

      await expect(game.mood).not.toHaveText('Bad');
    });
  }
});
