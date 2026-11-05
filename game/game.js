// ===== הגדרות המשחק =====

// כל כמה זמן הצרכים יורדים (במילישניות). 3000 = 3 שניות
const TICK_MS = 3000;

// ערכי התחלה של דמות חדשה
const START_STATE = { food: 80, energy: 80, fun: 80, hygiene: 80, money: 50 };

// בכמה יורד כל צורך בכל "תקתוק" של הזמן
const DECAY = { food: 5, energy: 3, fun: 4, hygiene: 2 };

// השמות בעברית של הצרכים
const NEEDS = { food: 'שובע', energy: 'אנרגיה', fun: 'כיף', hygiene: 'ניקיון' };

// מה כל פעולה עושה לצרכים ולכסף
const ACTIONS = {
  eat:    { log: '🍔 אכילה', changes: { food: 30, hygiene: -5, money: -10 } },
  sleep:  { log: '😴 שינה',  changes: { energy: 40 } },
  play:   { log: '🎮 משחק',  changes: { fun: 25, energy: -10 } },
  shower: { log: '🚿 מקלחת', changes: { hygiene: 40 } },
  work:   { log: '💼 עבודה', changes: { money: 20, energy: -15, fun: -10 } },
};

// מתחת לערך הזה (כולל) מופיעה אזהרה
const LOW_LIMIT = 20;

// ===== מצב המשחק =====
let state = null;
let characterName = '';
let timer = null;

// עוזר קטן: מוצא אלמנט לפי data-test
const el = (id) => document.querySelector(`[data-test="${id}"]`);

// ===== לוגיקה =====

// שומר שצורך יישאר בין 0 ל-100, וכסף לא יירד מתחת ל-0
function applyChanges(changes) {
  for (const [key, delta] of Object.entries(changes)) {
    const newValue = state[key] + delta;
    state[key] = key === 'money'
      ? Math.max(0, newValue)
      : Math.max(0, Math.min(100, newValue));
  }
}

// חוקים: אי אפשר לאכול בלי כסף, ואי אפשר לעבוד כשעייפים מדי
function canDo(action) {
  if (action === 'eat') return state.money >= 10;
  if (action === 'work') return state.energy >= 15;
  return true;
}

// מצב הרוח נקבע לפי ממוצע ארבעת הצרכים
function getMood() {
  const avg = (state.food + state.energy + state.fun + state.hygiene) / 4;
  if (avg >= 70) return 'מעולה 😊';
  if (avg >= 40) return 'בסדר 😐';
  return 'גרוע 😢';
}

// ===== תצוגה =====

function render() {
  for (const key of Object.keys(NEEDS)) {
    el(`${key}-bar`).value = state[key];
    el(`${key}-value`).textContent = state[key];
  }
  el('money').textContent = state.money;
  el('mood').textContent = getMood();

  const lowNeeds = Object.keys(NEEDS)
    .filter((key) => state[key] <= LOW_LIMIT)
    .map((key) => NEEDS[key]);
  el('warning').hidden = lowNeeds.length === 0;
  el('warning').textContent = lowNeeds.length ? `⚠️ נמוך: ${lowNeeds.join(', ')}` : '';

  for (const action of Object.keys(ACTIONS)) {
    el(`action-${action}`).disabled = !canDo(action);
  }
}

function addLog(text) {
  const item = document.createElement('li');
  item.textContent = `${characterName}: ${text}`; // textContent = בטוח, לא מריץ HTML
  el('log').prepend(item); // הפעולה האחרונה תמיד למעלה
}

// ===== אירועים =====

function doAction(action) {
  if (!canDo(action)) return;
  applyChanges(ACTIONS[action].changes);
  addLog(ACTIONS[action].log);
  render();
}

function tick() {
  const decay = {};
  for (const [key, amount] of Object.entries(DECAY)) decay[key] = -amount;
  applyChanges(decay);
  render();
}

function startGame() {
  characterName = el('name-input').value.trim();
  if (!characterName) return;

  state = { ...START_STATE };
  el('character-name').textContent = characterName;
  el('log').replaceChildren();
  el('create-screen').hidden = true;
  el('game-screen').hidden = false;
  render();
  timer = setInterval(tick, TICK_MS);
}

function resetGame() {
  clearInterval(timer);
  timer = null;
  state = null;
  el('name-input').value = '';
  el('start-button').disabled = true;
  el('game-screen').hidden = true;
  el('create-screen').hidden = false;
}

el('name-input').addEventListener('input', (event) => {
  el('start-button').disabled = event.target.value.trim() === '';
});
el('name-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') startGame();
});
el('start-button').addEventListener('click', startGame);
el('reset-button').addEventListener('click', resetGame);
for (const action of Object.keys(ACTIONS)) {
  el(`action-${action}`).addEventListener('click', () => doAction(action));
}
