'use strict';

// ===== Game settings =====

// How often needs drop (milliseconds). 6000 = 6 seconds
// (Slower on purpose: gives the player time to enjoy the game instead of
//  scrambling to survive. Each in-game hour now takes 6 real seconds.)
const TICK_MS = 6000;

// Starting values for a new buddy
const START_STATE = { food: 90, energy: 90, fun: 90, hygiene: 90, money: 50, level: 1 };

// How much each need drops on every tick
// (Lower numbers than before, so needs last longer and the buddy stays
//  happy for a good while before the player has to step in.)
const DECAY = { food: 4, energy: 2, fun: 3, hygiene: 1.5 };

// Display names of the needs
const NEEDS = { food: 'Food', energy: 'Energy', fun: 'Fun', hygiene: 'Hygiene' };

// Free (or cheap) actions: what each one does to needs and money
const ACTIONS = {
  eat:    { verb: 'had a meal',    changes: { food: 30, hygiene: -5, money: -10 } },
  sleep:  { verb: 'took a nap',    changes: { energy: 40 } },
  play:   { verb: 'played a game', changes: { fun: 25, energy: -10 } },
  shower: { verb: 'took a shower', changes: { hygiene: 40 } },
  work:   { verb: 'went to work',  changes: { money: 20, energy: -15, fun: -10 } },
};

// Shop items: premium combos you pay for
const SHOP = {
  coffee: { verb: 'grabbed a coffee',    cost: 15, changes: { energy: 60 } },
  pizza:  { verb: 'threw a pizza party', cost: 25, changes: { food: 50, fun: 20 } },
  spa:    { verb: 'enjoyed a spa day',   cost: 30, changes: { hygiene: 50, fun: 30 } },
  gym:    { verb: 'crushed a workout',   cost: 20, changes: { energy: 35, hygiene: -20 } },
};

// At or below this value a need is "low" and a warning shows
const LOW_LIMIT = 20;
// At or below this value a need bar turns amber
const MID_LIMIT = 50;

const MOODS = [
  { min: 70, label: 'Great', face: '😄', className: 'mood-great' },
  { min: 40, label: 'Okay',  face: '🙂', className: 'mood-okay' },
  { min: 0,  label: 'Bad',   face: '😢', className: 'mood-bad' },
];

// Survival grade: earned at game over based on seconds survived
const GRADES = [
  { min: 300, grade: 'S', desc: 'Legendary survivor' },
  { min: 180, grade: 'A', desc: 'Impressive run' },
  { min:  90, grade: 'B', desc: 'Solid effort' },
  { min:  48, grade: 'C', desc: 'Getting there' },
  { min:  20, grade: 'D', desc: 'Short visit' },
  { min:   0, grade: 'F', desc: 'Better luck next time' },
];

// Title shown next to the level number
const LEVEL_LABELS = ['Rookie', 'Survivor', 'Veteran', 'Expert', 'Master', 'Legend'];

// The in-game clock: the game starts at 08:00 and every tick is one hour
const START_HOUR = 8;
const PHASE_ICONS = { day: '☀️', evening: '🌇', night: '🌙' };

// What the buddy "thinks about" when a need is low
const NEED_THOUGHTS = { food: '🍔', energy: '😴', fun: '🎮', hygiene: '🧼' };

// Where in the apartment each action / shop item happens
const ROOM_ACTIVITY = {
  eat:    { spot: 'kitchen', emoji: '🍔' },
  sleep:  { spot: 'bed',     emoji: '💤', effect: 'sleep' },
  play:   { spot: 'tv',      emoji: '🎮', effect: 'tv' },
  shower: { spot: 'bath',    emoji: '🫧', effect: 'shower' },
  work:   { spot: 'desk',    emoji: '💻', effect: 'work' },
  coffee: { spot: 'kitchen', emoji: '☕' },
  pizza:  { spot: 'tv',      emoji: '🍕', effect: 'tv' },
  spa:    { spot: 'bath',    emoji: '🧖', effect: 'shower' },
  gym:    { spot: 'bath',    emoji: '🏋️' },
};

// Clicking a piece of furniture in the room runs this action
const FURNITURE = { kitchen: 'eat', bed: 'sleep', tv: 'play', bath: 'shower', desk: 'work' };

// localStorage keys
const THEME_KEY = 'tiny-life-theme';
const SAVE_KEY = 'tiny-life-save';   // the current game (auto-save)
const BEST_KEY = 'tiny-life-best';   // best survival time, in seconds

// ===== Game state =====
let state = null;
let characterName = '';
let timer = null;
let toastTimer = null;

// Small helper: find an element by its data-test attribute
const el = (id) => document.querySelector(`[data-test="${id}"]`);

// ===== Logic =====

// Needs stay between 0 and 100; money never goes below 0
function applyChanges(changes) {
  for (const [key, delta] of Object.entries(changes)) {
    const next = state[key] + delta;
    state[key] = key === 'money' ? Math.max(0, next) : Math.max(0, Math.min(100, next));
  }
}

// Rules for the free actions: returns the block reason, or '' if allowed
function blockedReason(action) {
  if (action === 'eat' && state.money < 10) return 'Not enough money';
  if (action === 'work' && state.energy <= 15) return 'Too tired to work';
  return '';
}

function getMood() {
  const avg = (state.food + state.energy + state.fun + state.hygiene) / 4;
  return MOODS.find((mood) => avg >= mood.min);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// 06:00–16:59 day, 17:00–19:59 evening, otherwise night
function timeOfDay(hour) {
  const h = hour % 24;
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

function formatClock(hour) {
  const day = Math.floor(hour / 24) + 1;
  const h = String(hour % 24).padStart(2, '0');
  return `Day ${day} · ${h}:00`;
}

// ===== Saved data (localStorage) =====

function save() {
  if (!state || state.over) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ name: characterName, state }));
  } catch { /* storage unavailable */ }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(seconds) {
  try { localStorage.setItem(BEST_KEY, String(seconds)); } catch { /* storage unavailable */ }
}

function renderBest() {
  const best = loadBest();
  el('best-pill').hidden = best <= 0;
  el('best-time').textContent = formatTime(best);
}

// ===== Rendering =====

function render() {
  for (const key of Object.keys(NEEDS)) {
    const value = state[key];
    const bar = el(`${key}-bar`);
    el(`${key}-value`).textContent = value;
    bar.setAttribute('aria-valuenow', String(value));
    bar.firstElementChild.style.width = `${value}%`;
    bar.classList.toggle('level-low', value <= LOW_LIMIT);
    bar.classList.toggle('level-mid', value > LOW_LIMIT && value <= MID_LIMIT);
  }

  el('money').textContent = state.money;
  el('survival-time').textContent = formatTime(state.elapsed);

  const mood = getMood();
  el('mood').textContent = mood.label;
  el('avatar').textContent = mood.face;
  for (const m of MOODS) {
    el('mood-badge').classList.toggle(m.className, m === mood);
    el('avatar').classList.toggle(m.className, m === mood);
  }

  const lowNeeds = Object.keys(NEEDS).filter((key) => state[key] <= LOW_LIMIT).map((key) => NEEDS[key]);
  el('warning').hidden = lowNeeds.length === 0;
  el('warning').textContent = lowNeeds.length ? `⚠️ Running low: ${lowNeeds.join(', ')}` : '';

  // Free actions
  for (const action of Object.keys(ACTIONS)) {
    const reason = blockedReason(action);
    const button = el(`action-${action}`);
    button.disabled = reason !== '';
    button.title = reason;
    const hint = el(`${action}-hint`);
    if (hint) hint.textContent = reason;
  }

  // Shop items
  for (const [key, item] of Object.entries(SHOP)) {
    const blocked = state.money < item.cost;
    el(`shop-${key}`).disabled = blocked;
    const hint = el(`${key}-hint`);
    if (hint) hint.textContent = blocked ? 'Not enough money' : '';
  }

  // Level + label
  const level = state.level ?? 1;
  el('level').textContent = level;
  el('level-label').textContent = LEVEL_LABELS[Math.min(level - 1, LEVEL_LABELS.length - 1)];

  // Urgent highlight: action buttons pulse when their linked need is critically low
  const urgentMap = { eat: 'food', sleep: 'energy', shower: 'hygiene', play: 'fun' };
  for (const [action, need] of Object.entries(urgentMap)) {
    const btn = el(`action-${action}`);
    if (btn) btn.classList.toggle('urgent', state[need] <= LOW_LIMIT && !btn.disabled);
  }

  // The apartment: clock, light, the buddy's face and thoughts, usable furniture
  const phase = timeOfDay(state.hour);
  el('game-clock').textContent = formatClock(state.hour);
  el('phase-icon').textContent = PHASE_ICONS[phase];
  Room.setPhase(phase);
  Room.setClock(state.hour);
  Room.setMood(mood.className);
  const lowest = Object.keys(NEEDS)
    .filter((key) => state[key] <= LOW_LIMIT)
    .sort((a, b) => state[a] - state[b])[0];
  Room.setThought(lowest ? NEED_THOUGHTS[lowest] : '');
  for (const [object, action] of Object.entries(FURNITURE)) {
    Room.setBlocked(object, blockedReason(action));
  }

  el('log-empty').hidden = el('log').children.length > 0;
}

function addLog(text) {
  const item = document.createElement('li');
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = formatTime(state.elapsed);
  const message = document.createElement('span');
  message.dataset.test = 'log-text';
  message.textContent = text; // textContent is safe: never runs HTML
  item.append(time, message);
  el('log').prepend(item); // newest entry on top
}

function showToast(text) {
  const toast = el('toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function bumpNeeds(changes) {
  for (const key of Object.keys(NEEDS)) {
    if (changes[key] && changes[key] > 0) {
      const elBar = document.querySelector(`[data-test="${key}-bar"]`)?.closest('.need');
      if (elBar) {
        elBar.classList.remove('needs-notify');
        void elBar.offsetWidth;
        elBar.classList.add('needs-notify');
      }
    }
  }
}

function bumpAvatar() {
  const avatar = el('avatar');
  avatar.classList.remove('bump');
  void avatar.offsetWidth; // restart the CSS animation
  avatar.classList.add('bump');
}

// Runs after any change: redraw, save, and check for game over
function afterChange() {
  render();
  save();
  checkGameOver();
}

// ===== Game over =====

function launchConfetti() {
  const colors = ['#2f7a55', '#4fb784', '#e0a526', '#d94848', '#8b5cf6', '#3b82f6', '#f97316'];
  for (let i = 0; i < 44; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.cssText = [
      `left:${Math.random() * 100}vw`,
      `background:${colors[i % colors.length]}`,
      `animation-delay:${(Math.random() * 0.5).toFixed(2)}s`,
      `animation-duration:${(0.75 + Math.random() * 0.65).toFixed(2)}s`,
      `width:${4 + Math.random() * 6}px`,
      `height:${4 + Math.random() * 6}px`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
    ].join(';');
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

function checkGameOver() {
  if (!state || state.over) return;
  const dead = Object.keys(NEEDS).some((key) => state[key] <= 0);
  if (dead) gameOver();
}

function gameOver() {
  clearInterval(timer);
  timer = null;
  state.over = true;
  Room.setActive(false);

  const best = loadBest();
  const isRecord = state.elapsed > best;
  if (isRecord) saveBest(state.elapsed);

  clearSave();

  el('gameover-name').textContent = characterName;
  el('gameover-time').textContent = formatTime(state.elapsed);
  el('gameover-best').textContent = formatTime(loadBest());
  el('gameover-record').hidden = !isRecord;
  if (isRecord) launchConfetti();

  const { grade, desc } = GRADES.find((g) => state.elapsed >= g.min);
  const gradeEl = el('grade');
  gradeEl.textContent = grade;
  gradeEl.className = `grade-badge grade-${grade}`;
  el('grade-desc').textContent = desc;
  el('gameover-level').textContent = state.level ?? 1;

  el('game-screen').hidden = true;
  el('gameover-screen').hidden = false;
}

// ===== Actions =====

function doAction(action) {
  if (!state || state.over || blockedReason(action)) return;
  const changes = ACTIONS[action].changes;
  applyChanges(changes);
  bumpNeeds(changes);
  const sentence = `${characterName} ${ACTIONS[action].verb}`;
  addLog(sentence);
  showToast(sentence);
  bumpAvatar();
  Room.perform(ROOM_ACTIVITY[action]);
  afterChange();
  // feed the achievements system (may unlock something → its own toast)
  if (window.Achievements) window.Achievements.track(action, state);
}

// Clicking furniture in the room = doing its action (or explaining why not)
function useFurniture(object) {
  const action = FURNITURE[object];
  if (!state || state.over || !action) return;
  const reason = blockedReason(action);
  if (reason) {
    showToast(reason);
    return;
  }
  doAction(action);
}

function buyItem(key) {
  const item = SHOP[key];
  if (!state || state.over || state.money < item.cost) return;
  const changes = { money: -item.cost, ...item.changes };
  applyChanges(changes);
  bumpNeeds(changes);
  const sentence = `${characterName} ${item.verb}`;
  addLog(sentence);
  showToast(sentence);
  bumpAvatar();
  Room.perform(ROOM_ACTIVITY[key]);
  afterChange();
  // feed the achievements system (pizza party counts too)
  if (window.Achievements) window.Achievements.track(key, state);
}

function tick() {
  const level = state.level ?? 1;
  const decayMult = 1 + (level - 1) * 0.20;
  const decay = {};
  for (const [key, amount] of Object.entries(DECAY)) {
    decay[key] = -Math.round(amount * decayMult);
  }
  applyChanges(decay);
  state.elapsed += TICK_MS / 1000;
  state.hour += 1;

  const isNewDay = state.hour > 0 && state.hour % 24 === 0;
  if (isNewDay) state.level = level + 1;

  render();
  save();
  checkGameOver();

  if (isNewDay && state && !state.over) {
    showToast(`📅 Day ${Math.floor(state.hour / 24) + 1} — Level ${state.level}! Needs drop faster.`);
  }
}

// ===== Screens =====

function showScreen(name) {
  el('create-screen').hidden = name !== 'create';
  el('game-screen').hidden = name !== 'game';
  el('gameover-screen').hidden = name !== 'gameover';
}

function startGame() {
  characterName = el('name-input').value.trim();
  if (!characterName) return;

  state = { ...START_STATE, elapsed: 0, hour: START_HOUR, over: false };
  if (window.Achievements) window.Achievements.reset();
  el('character-name').textContent = characterName;
  el('log').replaceChildren();
  showScreen('game');
  Room.reset();
  Room.setActive(true);
  render();
  save();
  timer = setInterval(tick, TICK_MS);
}

function resumeGame(data) {
  characterName = data.name;
  state = { level: 1, hour: START_HOUR, ...data.state, over: false };
  el('character-name').textContent = characterName;
  el('log').replaceChildren();
  showScreen('game');
  Room.reset();
  Room.setActive(true);
  render();
  timer = setInterval(tick, TICK_MS);
}

function resetGame() {
  clearInterval(timer);
  timer = null;
  state = null;
  Room.setActive(false);
  clearSave();
  if (window.Achievements) window.Achievements.reset();
  el('name-input').value = '';
  el('start-button').disabled = true;
  el('toast').classList.remove('visible');
  renderBest();
  showScreen('create');
  el('name-input').focus();
}

function playAgain() {
  state = null;
  el('name-input').value = '';
  el('start-button').disabled = true;
  renderBest();
  showScreen('create');
  el('name-input').focus();
}

// ===== Theme (light / dark) =====

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton() {
  const dark = currentTheme() === 'dark';
  const button = el('theme-toggle');
  button.textContent = dark ? '☀️' : '🌙';
  button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  updateThemeButton();
}

try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch { /* storage unavailable */ }
updateThemeButton();

// ===== Wire up =====

el('name-input').addEventListener('input', (event) => {
  el('start-button').disabled = event.target.value.trim() === '';
});
el('create-form').addEventListener('submit', (event) => {
  event.preventDefault();
  startGame();
});
el('reset-button').addEventListener('click', resetGame);
el('play-again').addEventListener('click', playAgain);
el('theme-toggle').addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});
for (const action of Object.keys(ACTIONS)) {
  el(`action-${action}`).addEventListener('click', () => doAction(action));
}
for (const key of Object.keys(SHOP)) {
  const btn = el(`shop-${key}`);
  if (btn) btn.addEventListener('click', () => buyItem(key));
}

// ===== On startup: draw the apartment, then resume a saved game or show the create screen =====
Room.init(el('room'), { onUse: useFurniture });
renderBest();
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const data = JSON.parse(raw);
    if (data && data.name && data.state) resumeGame(data);
  }
} catch { /* ignore a broken save */ }
