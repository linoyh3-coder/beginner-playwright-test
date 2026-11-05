'use strict';

/*
 * Tiny Life – the apartment.
 *
 * Draws an isometric room using plain SVG shapes (no image files),
 * walks the buddy between the furniture and plays small effects
 * (sleeping, shower, TV, working). game.js controls it through window.Room.
 *
 * Room coordinates: x runs toward the bottom-right, y toward the bottom-left,
 * z is height. The floor is 10 × 10 tiles. P() turns (x, y, z) into a screen point.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = 30;                          // pixels per tile
  const COS = Math.cos(Math.PI / 6);     // isometric angle
  const EFFECT_MS = 2600;                // how long an activity animation lasts
  const WANDER_MS = 7000;                // idle wandering interval

  // Where the buddy stands for each activity (room coordinates)
  const SPOTS = {
    idle:    [5.6, 6.6],
    kitchen: [2.7, 2.3],
    desk:    [2.42, 4.02],
    bed:     [6.0, 5.0],
    tv:      [9.1, 2.6],
    bath:    [2.95, 8.5],
  };
  // Which way the buddy looks when they arrive at a spot
  const FACING = { kitchen: 'right', desk: 'left', bed: 'right', tv: 'right', bath: 'left' };
  // Random places to stroll to when idle
  const WANDER = [[5.6, 6.6], [4.4, 7.9], [7.3, 6.4], [6.4, 8.6], [4.0, 5.6]];

  const MOUTHS = {
    'mood-great': 'M2,-76 Q5.5,-72.5 9,-76',
    'mood-okay':  'M2.5,-75.5 L8.5,-75.5',
    'mood-bad':   'M2,-73.5 Q5.5,-77 9,-73.5',
  };

  const WINDOW_GLOW = { day: '#d9f2ff', evening: '#ffcf70', night: '#7f8cff' };
  const LIGHT_PATCH = { day: '#fff6dc', evening: '#ffc37a', night: '#9aa6ff' };

  // ===== Drawing helpers =====

  const P = (x, y, z = 0) => [(x - y) * COS * S, (x + y) * 0.5 * S - z * S];
  const pts = (list) => list.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');

  function make(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (parent) parent.appendChild(node);
    return node;
  }

  const poly = (parent, corners, fill, attrs = {}) =>
    make('polygon', { points: pts(corners), fill, ...attrs }, parent);

  // Darken a #rrggbb colour by a factor (0–1)
  function shade(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
    return `rgb(${rgb.join(',')})`;
  }

  // A solid box between the given ranges. Draws the three faces you can see.
  function block(parent, [x0, x1], [y0, y1], [z0, z1], color, faces = {}) {
    const g = make('g', {}, parent);
    poly(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], faces.left || shade(color, 0.88));
    poly(g, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], faces.right || shade(color, 0.74));
    poly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], faces.top || color);
    return g;
  }

  // Flat shapes lying on a wall or on the floor
  const onWallX = (parent, x, [y0, y1], [z0, z1], fill, attrs) =>
    poly(parent, [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], fill, attrs);
  const onWallY = (parent, y, [x0, x1], [z0, z1], fill, attrs) =>
    poly(parent, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, attrs);
  const onFloor = (parent, [x0, x1], [y0, y1], z, fill, attrs) =>
    poly(parent, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, attrs);

  function dot(parent, [x, y, z], r, fill, attrs = {}) {
    const [cx, cy] = P(x, y, z);
    return make('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r, fill, ...attrs }, parent);
  }

  function line(parent, a, b, attrs) {
    const [x1, y1] = P(...a);
    const [x2, y2] = P(...b);
    return make('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), ...attrs }, parent);
  }

  // Outline of a whole box – used as the clickable area of a piece of furniture
  const hull = ([x0, x1], [y0, y1], [z0, z1]) =>
    [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]];

  // ===== State =====

  const ui = {};
  const hotspots = {};
  let timers = [];
  let walkTimer = null;
  let pos = { x: SPOTS.idle[0], y: SPOTS.idle[1] };
  let busy = false;
  let active = false;
  let sayEmoji = '';
  let thoughtEmoji = '';
  let onUse = () => {};

  // ===== Clickable furniture =====

  function hotspot(parent, name, label) {
    const g = make('g', {
      class: 'hotspot', 'data-test': `room-${name}`, role: 'button', tabindex: 0, 'aria-label': label,
    }, parent);
    const title = make('title', {}, g);
    title.textContent = label;
    hotspots[name] = { g, title, label };
    g.addEventListener('click', () => onUse(name));
    g.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onUse(name);
      }
    });
    return g;
  }

  // Adds the invisible click area on top of everything in the hotspot
  function finishHotspot(name, ranges) {
    poly(hotspots[name].g, hull(...ranges), 'transparent', { class: 'hit' });
  }

  // ===== Building the room =====

  function buildDefs(svg) {
    const defs = make('defs', {}, svg);
    const skies = {
      day: ['#79c4f0', '#d6f1fd'],
      evening: ['#ff7f3a', '#ffd98a'],
      night: ['#111737', '#2d3470'],
    };
    for (const [name, [top, bottom]] of Object.entries(skies)) {
      const gradient = make('linearGradient', { id: `sky-${name}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      make('stop', { offset: 0, 'stop-color': top }, gradient);
      make('stop', { offset: 1, 'stop-color': bottom }, gradient);
    }
    const glow = make('radialGradient', { id: 'lamp-glow' }, defs);
    make('stop', { offset: 0, 'stop-color': '#ffe7a8', 'stop-opacity': 0.95 }, glow);
    make('stop', { offset: 1, 'stop-color': '#ffe7a8', 'stop-opacity': 0 }, glow);
    const blur = make('filter', { id: 'soft-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    make('feGaussianBlur', { stdDeviation: 10 }, blur);
  }

  function buildShell(scene) {
    // Back-right wall, back-left wall, then the floor in front of them
    block(scene, [-0.4, 10], [-0.4, 0], [-0.5, 7.5], '#f3c46b', { top: '#f8e0ae', left: '#f3c46b', right: '#c99640' });
    block(scene, [-0.4, 0], [0, 10], [-0.5, 7.5], '#e6a19f', { top: '#f3d0cb', left: '#b97a7e', right: '#e6a19f' });
    block(scene, [0, 10], [0, 10], [-0.5, 0], '#f2b597', { top: '#f2b597', left: '#d48f74', right: '#bf7d64' });

    // Floor boards
    for (let i = 1; i < 10; i++) {
      line(scene, [0, i, 0], [10, i, 0], { stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 1 });
    }

    // Skirting boards
    block(scene, [0, 10], [0, 0.07], [0, 0.32], '#fbe6bf');
    block(scene, [0, 0.07], [0, 10], [0, 0.32], '#f6d6d3');
  }

  function buildWindow(scene) {
    onWallX(scene, 0.01, [2.05, 5.95], [2.45, 5.75], '#fdf7f2');
    ui.glass = onWallX(scene, 0.02, [2.25, 5.75], [2.65, 5.55], 'url(#sky-day)', { class: 'window-glass' });

    // Sun (day/evening) and moon + stars (night)
    ui.sun = dot(scene, [0.03, 4.8, 4.7], 9, '#ffe58a', { class: 'sun' });
    const night = make('g', { class: 'stars' }, scene);
    for (const [y, z] of [[2.7, 5.2], [3.5, 4.8], [4.4, 5.3], [5.3, 4.4], [3.0, 3.8], [4.9, 3.2], [2.6, 3.0]]) {
      dot(night, [0.03, y, z], 1.3, '#ffffff');
    }
    dot(night, [0.03, 4.9, 4.9], 7, '#fdf3c7');

    // Window bars and sill
    onWallX(scene, 0.03, [3.95, 4.05], [2.65, 5.55], '#fdf7f2');
    onWallX(scene, 0.03, [2.25, 5.75], [4.05, 4.15], '#fdf7f2');
    block(scene, [0, 0.4], [1.95, 6.05], [2.3, 2.45], '#fdf7f2');
  }

  function buildWallDecor(scene) {
    // Shower pipe on the left wall, above the bathtub
    block(scene, [0, 0.1], [8.55, 8.65], [1.2, 5.0], '#c3cbd3');
    block(scene, [0, 0.75], [8.45, 8.75], [5.0, 5.12], '#c3cbd3');
    block(scene, [0.55, 0.8], [8.4, 8.8], [4.85, 5.0], '#aab4be');

    // Poster above the TV
    onWallY(scene, 0.02, [8.55, 9.75], [3.0, 4.9], '#fdf7f2');
    onWallY(scene, 0.03, [8.68, 9.62], [3.13, 4.77], '#6f8fd6');
    poly(scene, [[8.68, 0.035, 3.13], [9.62, 0.035, 3.13], [9.2, 0.035, 4.1]], '#4c6bb3');
    poly(scene, [[8.68, 0.036, 3.13], [9.15, 0.036, 3.13], [8.85, 0.036, 3.7]], '#3d5a9e');
    dot(scene, [8.95, 0.04, 4.4], 5, '#ffd166');

    // Wall clock – the hour hand follows the game clock
    const cx = 7.9;
    const cz = 4.75;
    const r = 0.42;
    const rim = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      rim.push([cx + r * Math.cos(t), 0.025, cz + r * Math.sin(t)]);
    }
    poly(scene, rim, '#ffffff', { stroke: '#5b4636', 'stroke-width': 2 });
    line(scene, [cx, 0.03, cz], [cx, 0.03, cz + 0.32], { stroke: '#333', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
    ui.hourHand = line(scene, [cx, 0.03, cz], [cx, 0.03, cz + 0.22], { stroke: '#333', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    ui.clockCenter = [cx, cz];

    // Shelf above the bed with a plant and a lamp
    block(scene, [4.95, 7.15], [0, 0.55], [3.55, 3.68], '#a9734c');
    block(scene, [5.2, 5.6], [0.1, 0.45], [3.68, 4.08], '#ece5de');
    dot(scene, [5.4, 0.27, 4.35], 7, '#5a9a6b');
    dot(scene, [5.25, 0.27, 4.45], 5, '#e46f92');
    dot(scene, [5.55, 0.27, 4.55], 5, '#f19ab3');
    dot(scene, [5.42, 0.27, 4.65], 4, '#e46f92');
    block(scene, [6.45, 6.85], [0.12, 0.45], [3.68, 3.76], '#5b4636');
    block(scene, [6.62, 6.68], [0.25, 0.31], [3.76, 4.1], '#5b4636');
    block(scene, [6.38, 6.92], [0.05, 0.55], [4.1, 4.62], '#ffe0a0', { top: '#fff1c9' });
  }

  function buildFloorDecor(scene) {
    ui.lightPatch = poly(scene, [[0.05, 2.3, 0.005], [0.05, 5.7, 0.005], [3.8, 6.9, 0.005], [3.8, 3.5, 0.005]],
      LIGHT_PATCH.day, { class: 'light-patch' });
    onFloor(scene, [3.4, 7.8], [5.2, 9.0], 0.01, '#d9707f');
    onFloor(scene, [3.65, 7.55], [5.45, 8.75], 0.012, '#e88d93');
    onFloor(scene, [2.45, 3.45], [7.7, 9.3], 0.01, '#8fcbb8');
    onFloor(scene, [8.0, 9.9], [1.6, 3.7], 0.01, '#7da7c4');
  }

  function buildKitchen(scene) {
    const k = hotspot(scene, 'kitchen', 'Kitchen – eat');
    block(k, [1.95, 4.35], [0, 0.7], [3.2, 4.2], '#f4eee6');                       // wall cabinet
    onWallY(k, 0.71, [3.12, 3.17], [3.25, 4.15], '#d8cfc4');
    block(k, [0.3, 1.85], [0.15, 1.45], [0, 4.3], '#e9f0f4');                       // fridge
    onWallY(k, 1.46, [0.3, 1.85], [2.88, 2.95], '#c7d2da');
    onWallY(k, 1.47, [1.55, 1.62], [3.1, 3.9], '#9aa7b1');
    onWallY(k, 1.47, [1.55, 1.62], [1.6, 2.6], '#9aa7b1');
    block(k, [1.9, 4.4], [0.15, 1.45], [0, 1.6], '#f4eee6', { top: '#c08a5e' });  // counter
    onWallY(k, 1.46, [3.12, 3.17], [0.15, 1.45], '#d8cfc4');
    onFloor(k, [2.2, 2.9], [0.35, 1.15], 1.605, '#c9d3da');                         // sink
    block(k, [3.55, 4.05], [0.35, 0.85], [1.6, 2.35], '#3a3a3f');                   // coffee machine
    dot(k, [4.06, 0.6, 2.1], 1.8, '#ff6b6b');
    block(k, [3.2, 3.35], [0.9, 1.05], [1.6, 1.8], '#ffffff');                      // mug
    finishHotspot('kitchen', [[0.3, 4.4], [0, 1.45], [0, 4.3]]);
  }

  function buildDesk(scene) {
    const d = hotspot(scene, 'desk', 'Desk – work');
    block(d, [0.2, 0.32], [2.65, 2.77], [0, 1.35], '#8a5e3c');                      // legs
    block(d, [1.58, 1.7], [2.65, 2.77], [0, 1.35], '#8a5e3c');
    block(d, [0.2, 1.7], [4.4, 5.35], [0, 1.35], '#d2a274');                        // drawers
    onWallX(d, 1.71, [4.7, 5.05], [1.0, 1.06], '#7a5134');
    onWallX(d, 1.71, [4.7, 5.05], [0.5, 0.56], '#7a5134');
    block(d, [0.15, 1.75], [2.6, 5.4], [1.35, 1.5], '#c08a5e', { top: '#d09a6c' }); // desk top
    block(d, [0.4, 0.75], [3.9, 4.3], [1.5, 1.56], '#2b2b30');                      // monitor stand
    block(d, [0.52, 0.62], [4.05, 4.15], [1.56, 1.9], '#2b2b30');
    block(d, [0.4, 0.55], [3.3, 4.9], [1.85, 2.85], '#22252c');                     // monitor
    ui.monitor = onWallX(d, 0.56, [3.38, 4.82], [1.93, 2.77], '#6fb6ea', { class: 'monitor-screen' });
    block(d, [0.85, 1.15], [3.55, 4.55], [1.5, 1.54], '#e9e9ec');                   // keyboard
    block(d, [0.95, 1.1], [4.75, 4.9], [1.5, 1.56], '#e9e9ec');                     // mouse
    block(d, [0.3, 0.55], [2.75, 3.0], [1.5, 1.75], '#ffffff');                     // small plant
    dot(d, [0.42, 2.87, 1.95], 6, '#5a9a6b');
    // Office chair
    block(d, [2.0, 2.85], [3.95, 4.1], [0.06, 0.14], '#2a2a33');
    block(d, [2.35, 2.5], [3.6, 4.45], [0.06, 0.14], '#2a2a33');
    block(d, [2.38, 2.47], [3.98, 4.07], [0.14, 0.92], '#3a3a44');
    block(d, [1.95, 2.9], [3.6, 4.45], [0.92, 1.1], '#3b3f52');
    block(d, [2.75, 2.92], [3.62, 4.43], [1.1, 2.15], '#3b3f52');
    finishHotspot('desk', [[0.15, 2.92], [2.6, 5.4], [0, 2.85]]);
  }

  function buildBed(scene) {
    // Nightstand with an alarm clock (not clickable)
    block(scene, [7.6, 8.25], [0.2, 0.85], [0, 1.0], '#a9734c');
    onWallX(scene, 8.26, [0.4, 0.65], [0.62, 0.67], '#7a5134');
    block(scene, [7.8, 8.05], [0.35, 0.55], [1.0, 1.22], '#e2554f');

    const b = hotspot(scene, 'bed', 'Bed – sleep');
    block(b, [4.6, 7.4], [0, 0.25], [0, 2.1], '#7b4a34', { top: '#94603f' });     // headboard
    block(b, [4.6, 7.4], [0.25, 4.3], [0, 0.62], '#7b4a34');                       // frame
    block(b, [4.7, 7.3], [0.3, 4.2], [0.62, 1.0], '#f6f1ea');                      // mattress
    block(b, [4.9, 5.95], [0.42, 1.35], [1.0, 1.3], '#ffffff', { top: '#fbfbfb' }); // pillows
    block(b, [6.05, 7.1], [0.42, 1.35], [1.0, 1.3], '#ffffff', { top: '#fbfbfb' });
    block(b, [4.66, 7.34], [1.7, 4.26], [0.62, 1.1], '#d9475a', { top: '#e2566a' }); // blanket
    block(b, [4.66, 7.34], [1.7, 1.95], [1.1, 1.14], '#f2dfe2');

    // The buddy lying in bed – only visible while sleeping
    ui.sleeper = make('g', { class: 'sleeper' }, b);
    block(ui.sleeper, [4.95, 5.95], [1.95, 3.7], [1.1, 1.38], '#d9475a', { top: '#e2566a' });
    dot(ui.sleeper, [5.42, 0.95, 1.5], 10.5, '#f3c49d');
    const [hx, hy] = P(5.42, 0.95, 1.5);
    make('ellipse', { cx: (hx - 2).toFixed(1), cy: (hy - 6).toFixed(1), rx: 10, ry: 6, fill: '#3a2a22' }, ui.sleeper);
    make('path', { d: `M${hx + 1},${hy + 1} q2.5,2 5,0`, stroke: '#2b1d16', 'stroke-width': 1.4, fill: 'none' }, ui.sleeper);

    finishHotspot('bed', [[4.6, 7.4], [0, 4.3], [0, 2.1]]);
  }

  function buildTv(scene) {
    const t = hotspot(scene, 'tv', 'TV – play');
    block(t, [8.35, 9.85], [0.2, 1.0], [0, 0.72], '#4b3b34', { top: '#5c4a41' });  // stand
    onWallY(t, 1.01, [9.08, 9.12], [0.08, 0.64], '#3a2d27');
    block(t, [8.5, 8.95], [0.6, 0.9], [0.72, 0.8], '#e9e9ec');                     // game console
    block(t, [9.05, 9.15], [0.45, 0.6], [0.72, 0.88], '#111111');                  // TV leg
    block(t, [8.45, 9.75], [0.42, 0.56], [0.88, 2.15], '#1d2027');                 // TV
    ui.tvScreen = onWallY(t, 0.57, [8.53, 9.67], [0.96, 2.07], '#2a3242', { class: 'tv-screen' });
    finishHotspot('tv', [[8.35, 9.85], [0.2, 1.0], [0, 2.15]]);
  }

  function buildBath(scene) {
    const bt = hotspot(scene, 'bath', 'Bathtub – shower');
    block(bt, [0.15, 2.25], [7.3, 9.85], [0, 1.2], '#f2f6f9', { top: '#ffffff' });
    onFloor(bt, [0.32, 2.08], [7.47, 9.68], 1.2, '#dfe8ee');
    onFloor(bt, [0.42, 1.98], [7.57, 9.58], 1.201, '#a6dcf2');

    const bubbles = make('g', { class: 'bath-bubbles' }, bt);
    for (const [x, y, r] of [[0.8, 8.2, 6], [1.3, 8.8, 7], [1.7, 8.1, 5], [0.9, 9.2, 5], [1.6, 9.3, 6], [1.2, 7.9, 4]]) {
      dot(bubbles, [x, y, 1.3], r, '#ffffff', { opacity: 0.92 });
    }

    const water = make('g', { class: 'shower-water' }, bt);
    for (const [dx, dy] of [[-0.08, -0.1], [0.05, 0.05], [0.12, -0.05], [-0.02, 0.15], [0.1, 0.18]]) {
      line(water, [0.68 + dx, 8.6 + dy, 4.85], [0.68 + dx, 8.6 + dy, 1.25],
        { stroke: '#bfe7fb', 'stroke-width': 1.6, 'stroke-dasharray': '6 7', 'stroke-linecap': 'round' });
    }
    finishHotspot('bath', [[0.15, 2.25], [7.3, 9.85], [0, 1.2]]);
  }

  function buildPlant(scene) {
    block(scene, [9.0, 9.7], [8.9, 9.6], [0, 0.75], '#ece5de');
    dot(scene, [9.35, 9.25, 1.3], 16, '#4f9a68');
    dot(scene, [9.1, 9.35, 1.75], 12, '#5fb07a');
    dot(scene, [9.55, 9.1, 1.9], 11, '#3f8a5a');
  }

  function buildLights(svg) {
    const lights = make('g', { class: 'lights' }, svg);
    ui.windowGlow = onWallX(lights, 0.02, [2.25, 5.75], [2.65, 5.55], WINDOW_GLOW.day,
      { class: 'window-glow', filter: 'url(#soft-blur)' });
    dot(lights, [6.65, 0.3, 4.3], 70, 'url(#lamp-glow)', { class: 'lamp-glow' });

    const zzz = make('g', { class: 'zzz' }, lights);
    [['z', 12, [5.7, 0.9, 2.2]], ['Z', 15, [6.0, 0.9, 2.7]], ['Z', 18, [6.35, 0.9, 3.25]]].forEach(([char, size, at], i) => {
      const [x, y] = P(...at);
      const text = make('text', { x: x.toFixed(1), y: y.toFixed(1), 'font-size': size, style: `animation-delay:${i * 0.35}s` }, zzz);
      text.textContent = char;
    });
  }

  function buildActor(svg) {
    const actor = make('g', { class: 'actor', 'data-test': 'character', 'data-location': 'idle' }, svg);
    make('ellipse', { class: 'shadow', cx: 0, cy: 0, rx: 15, ry: 5.5, fill: 'rgba(60,25,35,0.22)' }, actor);

    ui.figure = make('g', { class: 'figure' }, actor);
    const legs = make('g', { class: 'legs' }, ui.figure);
    make('rect', { class: 'leg leg-a', x: -8, y: -34, width: 7, height: 34, rx: 3, fill: '#2f3a5c' }, legs);
    make('rect', { class: 'leg leg-b', x: 1, y: -34, width: 7, height: 34, rx: 3, fill: '#26304d' }, legs);

    const upper = make('g', { class: 'upper' }, ui.figure);
    make('rect', { x: -14, y: -66, width: 6, height: 27, rx: 3, fill: '#c9433f' }, upper);   // back arm
    make('rect', { x: -12, y: -70, width: 24, height: 39, rx: 9, fill: '#e2554f' }, upper);  // shirt
    make('circle', { cx: 0, cy: -81, r: 12, fill: '#f3c49d' }, upper);                       // head
    make('ellipse', { cx: -1, cy: -88, rx: 12.5, ry: 7.5, fill: '#3a2a22' }, upper);           // hair
    make('rect', { x: -12.5, y: -89, width: 6, height: 13, rx: 3, fill: '#3a2a22' }, upper);
    make('circle', { cx: 2.5, cy: -81.5, r: 1.6, fill: '#2b1d16' }, upper);                   // eyes
    make('circle', { cx: 8.5, cy: -81.5, r: 1.6, fill: '#2b1d16' }, upper);
    ui.mouth = make('path', {
      d: MOUTHS['mood-great'], fill: 'none', stroke: '#7a3b2c', 'stroke-width': 1.6, 'stroke-linecap': 'round',
    }, upper);
    make('rect', { x: 6, y: -66, width: 6, height: 27, rx: 3, fill: '#d14a45' }, upper);      // front arm

    ui.bubble = make('g', { class: 'bubble', transform: 'translate(0,-118)' }, actor);
    make('rect', { x: -18, y: -16, width: 36, height: 30, rx: 13, fill: '#ffffff', stroke: 'rgba(0,0,0,0.12)' }, ui.bubble);
    make('path', { d: 'M-4,13 L0,21 L5,13 Z', fill: '#ffffff' }, ui.bubble);
    ui.bubbleText = make('text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 17 }, ui.bubble);

    ui.actor = actor;
  }

  // ===== Behaviour =====

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function setFacing(direction) {
    if (direction === 'left') ui.figure.setAttribute('transform', 'scale(-1,1)');
    else ui.figure.removeAttribute('transform');
  }

  function updateBubble() {
    const emoji = sayEmoji || thoughtEmoji;
    ui.bubbleText.textContent = emoji;
    ui.bubble.classList.toggle('visible', emoji !== '');
    ui.bubble.classList.toggle('is-thought', !sayEmoji && thoughtEmoji !== '');
  }

  // Walks to a named spot (or a point). Returns how long the walk takes, in ms.
  function moveTo(name, point = SPOTS[name]) {
    const [x, y] = point;
    const [fromX] = P(pos.x, pos.y);
    const [toX, toY] = P(x, y);
    const ms = Math.round(Math.min(1600, Math.hypot(x - pos.x, y - pos.y) * 240));
    pos = { x, y };

    const actor = ui.actor;
    actor.dataset.location = name;
    actor.classList.remove('is-sitting');
    if (Math.abs(toX - fromX) > 1) setFacing(toX < fromX ? 'left' : 'right');
    actor.style.transitionDuration = `${ms}ms`;
    actor.style.transform = `translate(${toX.toFixed(1)}px, ${toY.toFixed(1)}px)`;

    clearTimeout(walkTimer);
    actor.classList.toggle('is-walking', ms > 0);
    walkTimer = setTimeout(() => {
      actor.classList.remove('is-walking');
      if (FACING[name]) setFacing(FACING[name]);
      if (name === 'desk') actor.classList.add('is-sitting');
    }, ms);
    return ms;
  }

  const EFFECT_CLASSES = { sleep: 'is-sleeping', shower: 'is-showering', tv: 'is-watching', work: 'is-working' };

  function startEffect(effect) {
    if (EFFECT_CLASSES[effect]) ui.svg.classList.add(EFFECT_CLASSES[effect]);
  }

  function endEffects() {
    ui.svg.classList.remove(...Object.values(EFFECT_CLASSES));
  }

  function wander() {
    if (!active || busy) return;
    moveTo('idle', WANDER[Math.floor(Math.random() * WANDER.length)]);
  }

  // ===== Public API (used by game.js) =====

  window.Room = {
    init(svg, options = {}) {
      ui.svg = svg;
      onUse = options.onUse || onUse;
      buildDefs(svg);
      const scene = make('g', { class: 'scene' }, svg);
      buildShell(scene);
      buildWindow(scene);
      buildFloorDecor(scene);
      buildWallDecor(scene);
      buildKitchen(scene);
      buildDesk(scene);
      buildBed(scene);
      buildTv(scene);
      buildBath(scene);
      buildPlant(scene);
      poly(svg, [[-0.4, -0.4, 7.5], [10, -0.4, 7.5], [10, -0.4, -0.5], [10, 10, -0.5], [-0.4, 10, -0.5], [-0.4, 10, 7.5]],
        '#0b1033', { class: 'overlay' });
      buildLights(svg);
      buildActor(svg);
      this.reset();
      this.setPhase('day');
      setInterval(wander, WANDER_MS);
    },

    // Puts the buddy back in the middle of the room, with no animation
    reset() {
      clearTimers();
      clearTimeout(walkTimer);
      endEffects();
      busy = false;
      sayEmoji = '';
      pos = { x: SPOTS.idle[0], y: SPOTS.idle[1] };
      const [x, y] = P(pos.x, pos.y);
      ui.actor.style.transitionDuration = '0ms';
      ui.actor.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      ui.actor.dataset.location = 'idle';
      ui.actor.classList.remove('is-walking', 'is-sitting');
      setFacing('right');
      updateBubble();
    },

    setActive(value) {
      active = value;
    },

    // Walk to the right furniture and play the activity: { spot, emoji, effect }
    perform({ spot, emoji = '', effect = '' }) {
      clearTimers();
      endEffects();
      busy = true;
      const walk = moveTo(spot);
      sayEmoji = emoji;
      updateBubble();
      later(() => startEffect(effect), walk);
      later(() => {
        endEffects();
        sayEmoji = '';
        busy = false;
        updateBubble();
      }, walk + EFFECT_MS);
    },

    setPhase(phase) {
      ui.svg.dataset.phase = phase;
      ui.glass.setAttribute('fill', `url(#sky-${phase})`);
      ui.windowGlow.setAttribute('fill', WINDOW_GLOW[phase]);
      ui.lightPatch.setAttribute('fill', LIGHT_PATCH[phase]);
    },

    setClock(hour) {
      const [cx, cz] = ui.clockCenter;
      const angle = ((hour % 12) / 12) * Math.PI * 2;
      const [x2, y2] = P(cx + 0.22 * Math.sin(angle), 0.03, cz + 0.22 * Math.cos(angle));
      ui.hourHand.setAttribute('x2', x2.toFixed(1));
      ui.hourHand.setAttribute('y2', y2.toFixed(1));
    },

    setMood(className) {
      ui.mouth.setAttribute('d', MOUTHS[className] || MOUTHS['mood-okay']);
    },

    // A small "thought" above the head, e.g. 🍔 when hungry ('' = nothing)
    setThought(emoji) {
      thoughtEmoji = emoji;
      updateBubble();
    },

    // Marks a piece of furniture as unusable right now, with the reason
    setBlocked(name, reason) {
      const spot = hotspots[name];
      if (!spot) return;
      spot.g.classList.toggle('is-blocked', reason !== '');
      if (reason) spot.g.setAttribute('aria-disabled', 'true');
      else spot.g.removeAttribute('aria-disabled');
      spot.title.textContent = reason ? `${spot.label} (${reason})` : spot.label;
    },
  };
})();
