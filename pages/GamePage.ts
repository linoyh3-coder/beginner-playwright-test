import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object של המשחק Tiny Life.
 *
 * כל ה"איך מוצאים אלמנט במשחק" וכל הפעולות נמצאים כאן, במקום אחד.
 * הבדיקות משתמשות במחלקה הזו, ולכן הן קצרות וקריאות.
 * אם משהו באתר ישתנה – מתקנים כאן פעם אחת, ולא בכל הבדיקות.
 */
export class GamePage {
  readonly page: Page;

  // מסכים
  readonly createScreen: Locator;
  readonly gameScreen: Locator;

  // מסך יצירת דמות
  readonly nameInput: Locator;
  readonly startButton: Locator;

  // פרופיל הדמות
  readonly characterName: Locator;
  readonly money: Locator;
  readonly mood: Locator;
  readonly avatar: Locator;
  readonly survivalTime: Locator;
  readonly resetButton: Locator;

  // אזהרה, יומן, הודעה קופצת, מצב כהה/בהיר
  readonly warning: Locator;
  readonly logEntries: Locator;
  readonly logEmpty: Locator;
  readonly toast: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createScreen = page.getByTestId('create-screen');
    this.gameScreen = page.getByTestId('game-screen');

    this.nameInput = page.getByTestId('name-input');
    this.startButton = page.getByTestId('start-button');

    this.characterName = page.getByTestId('character-name');
    this.money = page.getByTestId('money');
    this.mood = page.getByTestId('mood');
    this.avatar = page.getByTestId('avatar');
    this.survivalTime = page.getByTestId('survival-time');
    this.resetButton = page.getByTestId('reset-button');

    this.warning = page.getByTestId('warning');
    this.logEntries = page.getByTestId('log-text');
    this.logEmpty = page.getByTestId('log-empty');
    this.toast = page.getByTestId('toast');
    this.themeToggle = page.getByTestId('theme-toggle');
  }

  // ===== מעבר לדף =====

  /** פותח את המשחק. '/' = הכתובת מ-baseURL שבהגדרות */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * פותח את המשחק עם "זמן קפוא".
   * בלי זה, בדיקה איטית (מעל 3 שניות) גורמת לצרכים לרדת באמצע.
   * חייבים להתקין את השעון *לפני* טעינת הדף, ולכן זה כאן ולא ב-goto רגיל.
   */
  async gotoWithFrozenClock() {
    await this.page.clock.install({ time: new Date('2026-01-01T10:00:00') });
    await this.goto();
    await this.page.clock.pauseAt(new Date('2026-01-01T10:00:01'));
  }

  /** מריץ את הזמן קדימה בכמות שניות נתונה (עובד רק אחרי gotoWithFrozenClock) */
  async advanceSeconds(seconds: number) {
    await this.page.clock.runFor(seconds * 1000);
  }

  // ===== פעולות =====

  /** יוצר דמות בשם נתון ונכנס למסך המשחק */
  async createCharacter(name: string) {
    await this.nameInput.fill(name);
    await this.startButton.click();
  }

  /** לוחץ על אחת הפעולות: 'eat' | 'sleep' | 'play' | 'shower' | 'work' */
  async doAction(name: string) {
    await this.action(name).click();
  }

  // ===== מאתרים "מחושבים" (לפי שם) =====

  /** הערך המספרי של צורך, למשל needValue('food') */
  needValue(need: string): Locator {
    return this.page.getByTestId(`${need}-value`);
  }

  /** הפס הצבעוני של צורך, למשל needBar('energy') */
  needBar(need: string): Locator {
    return this.page.getByTestId(`${need}-bar`);
  }

  /** כפתור הפעולה, למשל action('work') */
  action(name: string): Locator {
    return this.page.getByTestId(`action-${name}`);
  }

  /** ההסבר שמופיע כשפעולה חסומה, למשל actionHint('eat') */
  actionHint(name: string): Locator {
    return this.page.getByTestId(`${name}-hint`);
  }
}
