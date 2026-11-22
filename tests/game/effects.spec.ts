import { test, expect } from '@playwright/test';
import { GamePage } from '../../pages/GamePage';

test.describe('אפקטים חזותיים בסגנון Sims', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.gotoWithFrozenClock();
    await game.createCharacter('Noa');
  });

  test('ביצוע פעולה יוצר חלקיקים מרחפים וטבעת אנרגיה', async () => {
    // לפני הפעולה אין חלקיקים
    await expect(game.fxParticles()).toHaveCount(0);

    // לוחצים על אכילה
    await game.doAction('eat');

    // ממתינים זמן להליכה ולאפקטים להופיע (כ-3 שניות)
    await game.advanceSeconds(1);
    // ממתינים עד שהחלקיק הראשון יהיה גלוי
    await game.fxParticles().first().waitFor({ state: 'attached', timeout: 15000 });
    await expect(game.fxRing()).toBeVisible({ timeout: 5000 });
    await expect(game.fxParticles()).toHaveCount({ gte: 1 }, { timeout: 5000 });
    await expect(game.fxLayer()).toHaveCount(1, { timeout: 5000 });

    // מקדמים את הזמן כדי שהאפקטים יסתיימו
    await game.advanceSeconds(1);
    await expect(game.fxParticles()).toHaveCount(0);
  });

  test('פס הצרכים מהבהב בעדינות כאשר עולה (needs-notify)', async () => {
    // מבצעים מקלחת (שמעלה hygiene)
    await game.doAction('shower');

    // ממתינים לאנימציה של הפעימה
    await game.advanceSeconds(0.5);
    // בודקים של-id של ה-need יש class של needs-notify
    const hygieneContainer = game.needBarPulse('hygiene');
    await expect(hygieneContainer).toHaveClass(/needs-notify/);
  });

  test('אפקטים שונים לפי סוג הפעולה ( מקלחת מול עבודה )', async () => {
    // מקלחת
    await game.doAction('shower');
    await game.advanceSeconds(1);
    await game.fxParticles().first().waitFor({ state: 'attached', timeout: 15000 });
    const bubbles = await game.fxParticles().allTextContents();
    expect(bubbles.some(b => b.includes('🫧') || b.includes('✨') || b.includes('💛'))).toBeTruthy();

    await game.advanceSeconds(1);

    // עבודה
    await game.doAction('work');
    await game.advanceSeconds(1);
    await game.fxParticles().first().waitFor({ state: 'attached', timeout: 15000 });
    const workIcons = await game.fxParticles().allTextContents();
    expect(workIcons.some(w => w.includes('💻') || w.includes('💡') || w.includes('✨'))).toBeTruthy();
  });
});
