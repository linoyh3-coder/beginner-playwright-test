import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

// בדיקות האשג'ס: מערכת ההישגים של המשחק.
// כל הישג "נפתח" כשמתקיימים תנאים מסוימים (אוכל, עבודה, כסף...),
// ואז מוצגת הודעה קופצת (toast) וגם נשמר ב-localStorage.
test.describe('מערכת הישגים', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('אין toast לפני שביצענו פעולה', async () => {
    await expect(game.page.getByTestId('achievement-toast')).toBeHidden();
  });

  test('אכילה ראשונה פותחת את ההישג First Bite', async () => {
    await game.doAction('eat');

    await expect(game.page.getByTestId('achievement-toast')).toBeVisible();
    await expect(game.page.getByTestId('achievement-toast')).toContainText('First Bite');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Eat your very first meal');
  });

  test('אחרי 3 שניות ה-toast הופך לשקוף', async () => {
    await game.doAction('eat');
    const toast = game.page.getByTestId('achievement-toast');
    await expect(toast).toBeVisible();

    await game.advanceSeconds(3.3);

    await expect(toast).toHaveCSS('opacity', '0');
  });

  test('הישגים נשמרים ב-localStorage', async () => {
    await game.doAction('eat');

    const saved = await game.page.evaluate(() =>
      localStorage.getItem('tiny-life-achievements'),
    );
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!)).toHaveProperty('first-meal', true);
  });

  test('ה-toast מוסתר כשלא מבצעים פעולה (אין דריסה)', async () => {
    // קידום זמן בלי פעולה לא אמור להציג הישגים
    await game.advanceSeconds(24 * 6); // יום שלם
    await expect(game.page.getByTestId('achievement-toast')).toBeHidden();
  });

  test('כמה הישגים נפתחים ברצף', async () => {
    // אוכל 5 פעמים → Foodie (אחרי 5 ארוחות)
    for (let i = 0; i < 5; i++) {
      await game.doAction('eat');
    }

    // ההישג האחרון שנפתח הוא Foodie
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Foodie');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Eat 5 meals');
  });

  test('עבודה 5 פעמים פותחת את ההישג Hustler', async () => {
    // אנרגיה: 90 → 75 → 60 → 45 → 30 → 15 (אחרי 5 עבודות)
    for (let i = 0; i < 5; i++) {
      await game.doAction('work');
    }

    await expect(game.page.getByTestId('achievement-toast')).toContainText('Hustler');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Go to work 5 times');
  });

  test('משחק 3 פעמים פותח את ההישג Gamer', async () => {
    for (let i = 0; i < 3; i++) {
      await game.doAction('play');
    }

    await expect(game.page.getByTestId('achievement-toast')).toContainText('Gamer');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Play games 3 times');
  });

  test('קניית פיצה פותחת את ההישג Party Animal', async () => {
    await game.buyItem('pizza');

    await expect(game.page.getByTestId('achievement-toast')).toContainText('Party Animal');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('Throw a pizza party');
  });

  test('"התחלה מחדש" מנקה את ההישגים', async () => {
    await game.doAction('eat');
    await expect(game.page.getByTestId('achievement-toast')).toContainText('First Bite');

    await game.resetButton.click();

    // חזרה למסך יצירת דמות — ההישגים אופסו
    await expect(game.createScreen).toBeVisible();
    await expect(game.page.getByTestId('achievement-toast')).toBeHidden();
  });

  test('אפשר לפתוח כמה הישגים עם כסף (Rich)', async () => {
    // מרוויחים כסף בעבודה: 50 → 70 → 90 → 110 → 130 → 150...
    // אחרי 8 עבודות: 50 + 8*20 = 210 ≥ 200 → Rich
    // אבל צריך אנרגיה: 90 - 8*15 = -30 → לא יעבוד. נשתמש בשינה + עבודה לסירוגין.
    // פשוט יותר: קונים פיצה ומשפרים מצב רוח, אבל Rich דורש 200$.
    // נעשה 8 עבודות עם שינה באמצע:
    await game.doAction('work'); // 70
    await game.doAction('work'); // 90
    await game.doAction('sleep'); // אנרגיה חוזרת
    await game.doAction('work'); // 110
    await game.doAction('work'); // 130
    await game.doAction('sleep');
    await game.doAction('work'); // 150
    await game.doAction('work'); // 170
    await game.doAction('sleep');
    await game.doAction('work'); // 190
    await game.doAction('work'); // 210 → Rich

    await expect(game.page.getByTestId('achievement-toast')).toContainText('Money Maker');
  });
});