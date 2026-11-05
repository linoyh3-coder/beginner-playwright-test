# 🏡 Tiny Life – פרויקט אוטומציה עם Playwright

פרויקט לימוד של בדיקות אוטומטיות עם [Playwright](https://playwright.dev).
בפרויקט יש משחק סימולציה קטן שכתבנו בעצמנו (**Tiny Life**, באנגלית), ובדיקות אוטומטיות שבודקות אותו.

## 🎮 המשחק

יוצרים דמות, ולדמות יש 4 צרכים (0–100): **Food, Energy, Fun, Hygiene**.
כל 3 שניות הצרכים יורדים, וצריך לטפל בדמות:

| פעולה | מה היא עושה |
|---|---|
| 🍔 Eat | Food +30, Hygiene −5, עולה $10 |
| 😴 Sleep | Energy +40 |
| 🎮 Play | Fun +25, Energy −10 |
| 🚿 Shower | Hygiene +40 |
| 💼 Work | +$20, Energy −15, Fun −10 |

חוקים: אי אפשר לאכול בלי כסף, ואי אפשר לעבוד כשהאנרגיה מתחת ל-15 (מופיע הסבר מתחת לכפתור).

**עוד במשחק:** אווטאר שמשנה פרצוף לפי מצב הרוח, פסים שמשנים צבע (ירוק → כתום → אדום),
שעון "Alive for", יומן פעולות עם זמנים, הודעות קופצות, מצב כהה/בהיר (נשמר), ותצוגה מותאמת לטלפון.

## 🧪 הבדיקות

| קובץ | מה נבדק |
|---|---|
| `tests/game/create-character.spec.ts` | יצירת דמות, ערכי התחלה, שם ריק, הגנה מ-HTML בשם |
| `tests/game/actions.spec.ts` | כל פעולה, חוקי כסף/עייפות, יומן, הודעות קופצות, התחלה מחדש |
| `tests/game/time.spec.ts` | הזמן עובר (עם `page.clock`), אזהרות, מצב רוח, צבעי פסים |
| `tests/game/ui.spec.ts` | מצב כהה/בהיר, נגישות (`getByRole`), תצוגת טלפון |
| `tests/saucedemo/login.spec.ts` | התחברות לאתר תרגול חיצוני |

## 🧩 Page Object Model

כל ה"איך מוצאים אלמנט במשחק" וכל הפעולות מרוכזים בקובץ אחד:
[`pages/GamePage.ts`](pages/GamePage.ts). הבדיקות משתמשות בו, ולכן הן קצרות וקריאות.
אם משהו באתר ישתנה – מתקנים שם פעם אחת, לא בכל הבדיקות.

```ts
const game = new GamePage(page);
await game.goto();
await game.createCharacter('Noa');
await game.doAction('eat');
await expect(game.money).toHaveText('40');
```

## 📁 מבנה הפרויקט

```
game/                  ← המשחק (HTML, CSS, JavaScript)
server.js              ← שרת קטן שמריץ את המשחק
tests/game/            ← בדיקות של המשחק
tests/saucedemo/       ← בדיקות על אתר תרגול חיצוני
playwright.config.ts   ← הגדרות Playwright
.env.example           ← דוגמה לקובץ סודות (את .env עצמו לא מעלים לגיט!)
```

## 🚀 התקנה והרצה

```bash
npm install
npx playwright install
cp .env.example .env     # ולמלא את הפרטים מתוך saucedemo.com
```

| פקודה | מה היא עושה |
|---|---|
| `npm run game` | מריץ את המשחק – לפתוח http://127.0.0.1:3000 |
| `npm run test:game` | מריץ את בדיקות המשחק בכרום |
| `npm test` | מריץ את כל הבדיקות בכל הדפדפנים |
| `npm run test:ui` | מצב UI – רואים כל בדיקה צעד אחר צעד |
| `npm run test:headed` | מריץ עם דפדפן פתוח שרואים |
| `npm run report` | פותח דוח HTML של הריצה האחרונה |

## 📚 מה לומדים פה

- **Locators** – איך מוצאים אלמנטים בדף (`getByTestId`, `getByRole`)
- **Assertions** – איך בודקים שמשהו נכון (`toHaveText`, `toBeDisabled`, `toBeVisible`)
- **beforeEach** – קוד שרץ לפני כל בדיקה
- **page.clock** – שליטה בזמן, כדי לא לחכות באמת
- **webServer** – Playwright מפעיל את האתר לבד לפני הבדיקות
- **.env** – שמירת סיסמאות מחוץ לקוד
