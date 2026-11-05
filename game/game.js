'use strict';

// ===== Game settings =====

// How often needs drop (milliseconds). 3000 = 3 seconds
const TICK_MS = 3000;

// Starting values for a new buddy
const START_STATE = { food: 80, energy: 80, fun: 80, hygiene: 80, money: 50 };

// How much each need drops on every tick
const DECAY = { food: 5, energy: 3, fun: 4, hygiene: 2 };

// Display names of the needs
const NEEDS = { food: 'Food', energy: 'Energy', fun: 'Fun', hygiene: 'Hygiene' };

// What every action does to needs and money
const ACTIONS = {
  eat:    { verb: 'had a meal',    changes: { food: 30, hygiene: -5, money: -10 } },
  sleep:  { verb: 'took a nap',    changes: { energy: 40 } },
  play:   { verb: 'played a game', changes: { fun: 25, energy: -10 } },
  shower: { verb: 'took a shower', changes: { hygiene: 40 } },
  work:   { verb: 'went to work',  changes: { money: 20, energy: -15, fun: -10 } },
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

const THEME_KEY = 'tiny-life-theme';

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

// Rules: no eating without money, no working when too tired.
// Returns the reason an action is blocked, or '' if it is allowed.
function blockedReason(action) {
  if (action === 'eat' && state.money < 10) return 'Not enough money';
  if (action === 'work' && state.energy < 15) return 'Too tired to work';
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

  for (const action of Object.keys(ACTIONS)) {
    const reason = blockedReason(action);
    const button = el(`action-${action}`);
    button.disabled = reason !== '';
    button.title = reason;
    const hint = el(`${action}-hint`);
    if (hint) hint.textContent = reason;
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

function bumpAvatar() {
  const avatar = el('avatar');
  avatar.classList.remove('bump');
  void avatar.offsetWidth; // restart the CSS animation
  avatar.classList.add('bump');
}

// ===== Events =====

function doAction(action) {
  if (blockedReason(action)) return;
  applyChanges(ACTIONS[action].changes);
  const sentence = `${characterName} ${ACTIONS[action].verb}`;
  addLog(sentence);
  showToast(sentence);
  bumpAvatar();
  render();
}

function tick() {
  const decay = {};
  for (const [key, amount] of Object.entries(DECAY)) decay[key] = -amount;
  applyChanges(decay);
  state.elapsed += TICK_MS / 1000;
  render();
}

function startGame() {
  characterName = el('name-input').value.trim();
  if (!characterName) return;

  state = { ...START_STATE, elapsed: 0 };
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
  el('toast').classList.remove('visible');
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
el('theme-toggle').addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});
for (const action of Object.keys(ACTIONS)) {
  el(`action-${action}`).addEventListener('click', () => doAction(action));
}
