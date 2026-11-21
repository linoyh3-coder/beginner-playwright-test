'use strict';

/*
 * Tiny Life – achievements system.
 *
 * Tracks milestones (meals, sleep, work, purchases…) and pops a little
 * celebration toast when the player unlocks one. Achievements are saved to
 * localStorage so they survive a refresh, and reset with the rest of the game.
 *
 * game.js calls Achievements.init(), then Achievements.track(action, state)
 * after every action / purchase. Achievements renders its own toast into the
 * game screen (no HTML changes needed in index.html).
 */
(function () {
  const STORAGE_KEY = 'tiny-life-achievements';

  // Each achievement: id, icon, title, description and a test() that decides
  // when it unlocks, based on the player's lifetime stats + current state.
  const ACHIEVEMENTS = [
    { id: 'first-meal',  icon: '🍔', title: 'First Bite',      desc: 'Eat your very first meal',        test: (s) => s.stats.meals   >= 1 },
    { id: 'foodie',      icon: '🍕', title: 'Foodie',          desc: 'Eat 5 meals',                     test: (s) => s.stats.meals   >= 5 },
    { id: 'night-owl',   icon: '😴', title: 'Beauty Sleep',    desc: 'Sleep 3 times',                   test: (s) => s.stats.sleeps  >= 3 },
    { id: 'hustler',     icon: '💼', title: 'Hustler',         desc: 'Go to work 5 times',              test: (s) => s.stats.works   >= 5 },
    { id: 'party',       icon: '🎉', title: 'Party Animal',    desc: 'Throw a pizza party',             test: (s) => s.stats.pizza    >= 1 },
    { id: 'gamer',       icon: '🎮', title: 'Gamer',           desc: 'Play games 3 times',              test: (s) => s.stats.plays   >= 3 },
    { id: 'rich',        icon: '💰', title: 'Money Maker',     desc: 'Hold $200 at once',               test: (s) => s.state.money  >= 200 },
    { id: 'clean-freak', icon: '🛁', title: 'Squeaky Clean',   desc: 'Reach 100 hygiene',               test: (s) => s.state.hygiene >= 100 },
    { id: 'level-3',     icon: '⭐', title: 'Rising Star',     desc: 'Reach level 3',                   test: (s) => s.state.level  >= 3 },
    { id: 'survivor',    icon: '🏆', title: 'Survivor',        desc: 'Survive 5 minutes',               test: (s) => s.state.elapsed >= 300 },
  ];

  let unlocked = {};          // id -> true
  let stats = null;           // lifetime counters
  let state = null;           // reference to the live game state
  let toastEl = null;         // the toast element we render into
  let toastTimer = null;

  function loadUnlocked() {
    try {
      unlocked = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      unlocked = {};
    }
  }

  function saveUnlocked() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
      // localStorage might be unavailable — ignore, achievements just won't persist
    }
  }

  // Creates a small "achievement unlocked" toast. Styled inline so it works
  // even without touching style.css, but we also add a class for theming.
  function ensureToast() {
    if (toastEl && document.body.contains(toastEl)) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'achievement-toast';
    toastEl.setAttribute('data-test', 'achievement-toast');
    toastEl.style.cssText = [
      'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#ffd35c,#ffb03a)', 'color:#3a2a00',
      'font-weight:800', 'padding:12px 22px', 'border-radius:14px',
      'box-shadow:0 8px 30px rgba(0,0,0,.35)', 'z-index:9999',
      'opacity:0', 'transition:opacity .3s, transform .3s',
      'pointer-events:none', 'font-family:inherit',
    ].join(';');
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(ach) {
    const el = ensureToast();
    el.textContent = `${ach.icon} Achievement unlocked: ${ach.title} — ${ach.desc}`;
    el.setAttribute('data-test', 'achievement-toast');
    // force reflow so the transition runs even if we show again quickly
    void el.offsetWidth;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(-6px)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%)';
    }, 3200);
  }

  // After every action we refresh stats from the game state + our own counters.
  function syncStats() {
    if (!state) return;
    // keep stats in a predictable shape
    stats = stats || {};
  }

  // Checks every achievement and unlocks any whose test() passes.
  // Returns the list of newly-unlocked achievements (for tests to read).
  function check() {
    if (!state || !stats) return [];
    const newly = [];
    ACHIEVEMENTS.forEach((ach) => {
      if (!unlocked[ach.id] && ach.test({ state, stats })) {
        unlocked[ach.id] = true;
        newly.push(ach);
        showToast(ach);
      }
    });
    if (newly.length) saveUnlocked();
    return newly;
  }

  // Called by game.js after an action / purchase.
  // `actionId` is one of eat/sleep/play/shower/work/coffee/pizza/spa/gym.
  function track(actionId, liveState) {
    state = liveState;
    stats = stats || { meals: 0, sleeps: 0, works: 0, pizza: 0, plays: 0, showers: 0 };

    if (actionId === 'eat') stats.meals += 1;
    else if (actionId === 'sleep') stats.sleeps += 1;
    else if (actionId === 'work') stats.works += 1;
    else if (actionId === 'play') stats.plays += 1;
    else if (actionId === 'shower') stats.showers += 1;
    else if (actionId === 'pizza') stats.pizza += 1;

    syncStats();
    check();
  }

  // Read-only snapshot for tests / UI
  function getUnlocked() {
    return ACHIEVEMENTS.filter((a) => unlocked[a.id]).map((a) => ({ id: a.id, title: a.title, desc: a.desc, icon: a.icon }));
  }

  function getLocked() {
    return ACHIEVEMENTS.filter((a) => !unlocked[a.id]).map((a) => ({ id: a.id, title: a.title, desc: a.desc, icon: a.icon }));
  }

  function reset() {
    unlocked = {};
    stats = null;
    state = null;
    saveUnlocked();
    if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    toastEl = null;
    clearTimeout(toastTimer);
  }

  window.Achievements = {
    ACHIEVEMENTS,
    track,
    getUnlocked,
    getLocked,
    reset,
    isUnlocked: (id) => !!unlocked[id],
  };

  // Load any previously-saved achievements as soon as the script runs
  loadUnlocked();
})();