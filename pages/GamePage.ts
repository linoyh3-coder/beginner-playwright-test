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
  readonly gameoverScreen: Locator;

  // מסך יצירת דמות
  readonly nameInput: Locator;
  readonly startButton: Locator;
  readonly bestPill: Locator;
  readonly bestTime: Locator;

  // מסך סוף משחק
  readonly gameoverName: Locator;
  readonly gameoverTime: Locator;
  readonly gameoverBest: Locator;
  readonly gameoverRecord: Locator;
  readonly playAgainButton: Locator;

  // פרופיל הדמות
  readonly characterName: Locator;
  readonly money: Locator;
  readonly mood: Locator;
  readonly avatar: Locator;
  readonly survivalTime: Locator;
  readonly resetButton: Locator;

  // הדירה: החדר, הדמות שמסתובבת בו והשעון של המשחק
  readonly room: Locator;
  readonly character: Locator;
  readonly gameClock: Locator;

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
    this.gameoverScreen = page.getByTestId('gameover-screen');

    this.nameInput = page.getByTestId('name-input');
    this.startButton = page.getByTestId('start-button');
    this.bestPill = page.getByTestId('best-pill');
    this.bestTime = page.getByTestId('best-time');

    this.gameoverName = page.getByTestId('gameover-name');
    this.gameoverTime = page.getByTestId('gameover-time');
    this.gameoverBest = page.getByTestId('gameover-best');
    this.gameoverRecord = page.getByTestId('gameover-record');
    this.playAgainButton = page.getByTestId('play-again');

    this.characterName = page.getByTestId('character-name');
    this.money = page.getByTestId('money');
    this.mood = page.getByTestId('mood');
    this.avatar = page.getByTestId('avatar');
    this.survivalTime = page.getByTestId('survival-time');
    this.resetButton = page.getByTestId('reset-button');

    this.room = page.getByTestId('room');
    this.character = page.getByTestId('character');
    this.gameClock = page.getByTestId('game-clock');

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

  /** קונה פריט בחנות: 'coffee' | 'pizza' | 'spa' */
  async buyItem(name: string) {
    await this.shopItem(name).click();
  }

  /** לוחץ על רהיט בחדר: 'kitchen' | 'desk' | 'bed' | 'tv' | 'bath' */
  async useFurniture(name: string) {
    await this.furniture(name).click();
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

  /** רהיט בחדר, למשל furniture('bed') */
  furniture(name: string): Locator {
    return this.page.getByTestId(`room-${name}`);
  }

  /** כפתור בחנות, למשל shopItem('coffee') */
  shopItem(name: string): Locator {
    return this.page.getByTestId(`shop-${name}`);
  }

  /** ההסבר שמופיע כשפעולה חסומה, למשל actionHint('eat') */
  actionHint(name: string): Locator {
    return this.page.getByTestId(`${name}-hint`);
  }
}
