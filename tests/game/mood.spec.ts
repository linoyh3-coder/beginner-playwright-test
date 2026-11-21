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
    // ממוצע = (80+80+80+80)/4 = 80 → Great
    await expect(game.mood).toHaveText('Great');
    await expect(game.avatar).toHaveText('😄');
  });

  test('אחרי 3 תקתוקים מצב הרוח הופך ל-"Okay"', async () => {
    // food: 65, energy: 71, fun: 68, hygiene: 74 → ממוצע 69.5 → Okay
    await game.advanceSeconds(3 * 3);

    await expect(game.mood).toHaveText('Okay');
    await expect(game.avatar).toHaveText('🙂');
  });

  test('אחרי 12 תקתוקים מצב הרוח הופך ל-"Bad"', async () => {
    // food: 20, energy: 44, fun: 32, hygiene: 56 → ממוצע 38 → Bad
    await game.advanceSeconds(12 * 3);

    await expect(game.mood).toHaveText('Bad');
    await expect(game.avatar).toHaveText('😢');
  });

  test('אכילה משפרת מצב רוח מ-"Bad" ל-"Okay"', async () => {
    await game.advanceSeconds(12 * 3); // ממוצע 38 → Bad
    await expect(game.mood).toHaveText('Bad');

    await game.doAction('eat'); // food: 20 → 50
    // food: 50, energy: 44, fun: 32, hygiene: 56 → ממוצע 45.5 → Okay
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
      await game.advanceSeconds(12 * 3); // → Bad
      await expect(game.mood).toHaveText('Bad');

      await game.buyItem(item);

      await expect(game.mood).not.toHaveText('Bad');
    });
  }
});
