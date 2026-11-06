'use strict';

/*
 * Tiny Life – the apartment.
 *
 * Draws a cozy isometric room using plain SVG shapes (no image files),
 * walks the buddy between the furniture and plays small effects
 * (sleeping, shower, TV, working). game.js controls it through window.Room.
 *
 * Room coordinates: x runs toward the bottom-right, y toward the bottom-left,
 * z is height. The floor is 10 × 10 tiles. P() turns (x, y, z) into a screen point.
 *
 * Layers (back to front): walls → floor → shadows → furniture → night overlay → lights → buddy.
 * Only furniture "hotspots" react to the mouse; everything else ignores it.
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
  // Random places to stroll to when idle (kept clear of the beanbag and floor lamp)
  const WANDER = [[5.6, 6.6], [4.4, 7.9], [6.6, 7.9], [5.0, 5.7], [3.9, 6.6]];

  const MOUTHS = {
    'mood-great': 'M2,-76.5 Q5.5,-72.5 9,-76.5',
    'mood-okay':  'M2.5,-75.5 L8.5,-75.5',
    'mood-bad':   'M2,-73.5 Q5.5,-77 9,-73.5',
  };

  const LIGHT_PATCH = { day: '#fff3d6', evening: '#ffb46b', night: '#8f9cff' };

  // ===== Drawing helpers =====

  const P = (x, y, z = 0) => [(x - y) * COS * S, (x + y) * 0.5 * S - z * S];
  const pts = (list) => list.map(([x, y, z]) => P(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');

  function make(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (parent) parent.appendChild(node);
    return node;
  }

  const group = (parent, cls) => make('g', cls ? { class: cls } : {}, parent);

  const poly = (parent, corners, fill, attrs = {}) =>
    make('polygon', { points: pts(corners), fill, ...attrs }, parent);

  // Darken (factor < 1) or lighten (factor > 1) a #rrggbb colour
  function shade(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
    return `rgb(${rgb.join(',')})`;
  }

  // A solid box between the given ranges. Draws the three faces you can see.
  function block(parent, [x0, x1], [y0, y1], [z0, z1], color, faces = {}) {
    const g = make('g', {}, parent);
    poly(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], faces.left || shade(color, 0.86));
    poly(g, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], faces.right || shade(color, 0.7));
    poly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], faces.top || shade(color, 1.08));
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

  // A circle lying flat on the floor (looks like an ellipse in isometric view)
  function floorEllipse(parent, [x, y, z], r, fill, attrs = {}) {
    const [cx, cy] = P(x, y, z);
    return make('ellipse', {
      cx: cx.toFixed(1), cy: cy.toFixed(1),
      rx: (r * S * COS * Math.SQRT2).toFixed(1), ry: (r * S * 0.5 * Math.SQRT2).toFixed(1), fill, ...attrs,
    }, parent);
  }

  function line(parent, a, b, attrs) {
    const [x1, y1] = P(...a);
    const [x2, y2] = P(...b);
    return make('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), ...attrs }, parent);
  }

  function path(parent, d, attrs) {
    return make('path', { d, ...attrs }, parent);
  }

  // Soft shadow under a piece of furniture
  function contactShadow(parent, [x0, x1], [y0, y1], strength = 0.38) {
    const e = 0.14;
    onFloor(parent, [x0 - e, x1 + e], [y0 - e, y1 + e], 0.003, '#2b1408',
      { opacity: strength, filter: 'url(#blur-sm)' });
  }

  // Outline of a whole box – used as the clickable area of a piece of furniture
  const hull = ([x0, x1], [y0, y1], [z0, z1]) =>
    [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]];

  // Leafy plant: a few overlapping leaves around a point
  function leaves(parent, [x, y, z], size, colors) {
    const g = group(parent, 'sway');
    const [cx, cy] = P(x, y, z);
    const spots = [[-0.7, 0.1], [0.7, 0.05], [0, -0.55], [-0.35, -0.35], [0.4, -0.4], [0, 0.15]];
    spots.forEach(([dx, dy], i) => {
      make('ellipse', {
        cx: (cx + dx * size).toFixed(1), cy: (cy + dy * size).toFixed(1),
        rx: (size * 0.55).toFixed(1), ry: (size * 0.32).toFixed(1),
        transform: `rotate(${(dx * 40 + i * 13).toFixed(0)} ${(cx + dx * size).toFixed(1)} ${(cy + dy * size).toFixed(1)})`,
        fill: colors[i % colors.length],
      }, g);
    });
    return g;
  }

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

  // ===== Definitions: gradients and filters =====

  function buildDefs(svg) {
    const defs = make('defs', {}, svg);

    function linear(id, stops, vertical = true) {
      const g = make('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, defs);
      stops.forEach(([offset, color, opacity = 1]) =>
        make('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }, g));
    }
    function radial(id, color, inner = 0.95) {
      const g = make('radialGradient', { id }, defs);
      make('stop', { offset: 0, 'stop-color': color, 'stop-opacity': inner }, g);
      make('stop', { offset: 0.45, 'stop-color': color, 'stop-opacity': inner * 0.45 }, g);
      make('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, g);
    }
    function blur(id, amount) {
      const f = make('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
      make('feGaussianBlur', { stdDeviation: amount }, f);
    }

    linear('sky-day', [[0, '#6fb8ec'], [1, '#d4effc']]);
    linear('sky-evening', [[0, '#5b3a8c'], [0.45, '#ff7a45'], [1, '#ffd27a']]);
    linear('sky-night', [[0, '#0b1030'], [1, '#2a2f6b']]);
    linear('wall-left', [[0, '#6c8b79'], [1, '#86a693']]);
    linear('wall-right', [[0, '#e6d6bf'], [1, '#f4e9d8']]);
    linear('beam', [[0, '#fff1c9', 0.55], [1, '#fff1c9', 0]]);
    linear('screen-code', [[0, '#1d2340'], [1, '#2d2160']]);
    linear('tv-off', [[0, '#2b3446'], [0.5, '#171b24'], [1, '#0f1218']], false);
    linear('glass', [[0, '#ffffff', 0.35], [1, '#bfe6f5', 0.12]], false);

    radial('glow-warm', '#ffcf7a');
    radial('glow-purple', '#a06bff');
    radial('glow-cyan', '#5ad1ff');
    radial('glow-pink', '#ff6fae');

    blur('blur-xs', 1.2);
    blur('blur-sm', 3);
    blur('blur-md', 7);
    blur('blur-lg', 14);

    const shadow = make('filter', { id: 'drop', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    make('feDropShadow', { dx: 0, dy: 2, stdDeviation: 2, 'flood-color': '#000', 'flood-opacity': 0.25 }, shadow);
  }

  // ===== Walls and floor =====

  function buildShell(scene) {
    // Back-right wall (cream) and back-left wall (sage green)
    block(scene, [-0.45, 10], [-0.45, 0], [-0.6, 7.5], '#efe2cf',
      { top: '#fbf4ea', left: 'url(#wall-right)', right: '#b9a68b' });
    block(scene, [-0.45, 0], [0, 10], [-0.6, 7.5], '#7e9c8a',
      { top: '#b9d0c1', left: '#55705f', right: 'url(#wall-left)' });

    // Lower wall panels (wainscoting) with a trim on top
    onWallY(scene, 0.005, [0, 10], [0, 2.3], '#e2cfb3');
    onWallX(scene, 0.005, [0, 10], [0, 2.3], '#6a8876');
    for (let x = 0.9; x < 10; x += 1.15) {
      onWallY(scene, 0.008, [x, x + 0.04], [0.25, 2.05], 'rgba(120,90,60,0.18)');
    }
    for (let y = 0.9; y < 7; y += 1.15) {
      onWallX(scene, 0.008, [y, y + 0.04], [0.25, 2.05], 'rgba(30,50,40,0.25)');
    }
    block(scene, [0, 10], [0, 0.08], [2.3, 2.42], '#f7eee2');
    block(scene, [0, 0.08], [0, 10], [2.3, 2.42], '#9dbaa8');

    // Floor slab with wooden planks
    block(scene, [0, 10], [0, 10], [-0.6, 0], '#a7683f', { top: '#b7774b', left: '#7b4a2c', right: '#653b23' });
    const planks = ['#b9784b', '#c4855a', '#ad6d43', '#bd7d50'];
    for (let row = 0; row < 20; row++) {
      const y0 = row * 0.5;
      let x = -((row * 1.3) % 2.2);
      let i = 0;
      while (x < 10) {
        const length = 2.1 + ((row * 7 + i * 5) % 6) * 0.32;
        onFloor(scene, [Math.max(0, x), Math.min(10, x + length)], [y0, y0 + 0.5], 0.001,
          planks[(row * 3 + i) % planks.length], { stroke: 'rgba(70,35,15,0.28)', 'stroke-width': 0.7 });
        x += length;
        i++;
      }
    }

    // Skirting boards and soft dark corners where walls meet the floor
    block(scene, [0, 10], [0, 0.07], [0, 0.3], '#f7eee2');
    block(scene, [0, 0.07], [0, 10], [0, 0.3], '#9dbaa8');
    onFloor(scene, [0, 10], [0, 0.45], 0.002, '#2b1408', { opacity: 0.32, filter: 'url(#blur-sm)' });
    onFloor(scene, [0, 0.45], [0, 10], 0.002, '#2b1408', { opacity: 0.32, filter: 'url(#blur-sm)' });
    line(scene, [0, 0, 0], [0, 0, 7.5], { stroke: '#3a2a1c', 'stroke-width': 6, opacity: 0.18, filter: 'url(#blur-sm)' });
  }

  // ===== Window with a city view =====

  function buildWindow(scene) {
    // Frame and glass
    onWallX(scene, 0.01, [1.95, 6.05], [2.55, 5.95], '#f5efe6');
    ui.glass = onWallX(scene, 0.02, [2.15, 5.85], [2.75, 5.75], 'url(#sky-day)', { class: 'window-glass' });

    // Sun / moon and stars
    dot(scene, [0.025, 4.9, 5.05], 9, '#ffe58a', { class: 'sun' });
    const night = group(scene, 'stars');
    [[2.5, 5.45], [3.2, 5.1], [4.1, 5.5], [5.4, 4.9], [2.9, 4.7], [4.6, 4.85], [5.6, 5.5]].forEach(([y, z], i) => {
      dot(night, [0.025, y, z], 1.2, '#ffffff', { class: 'star', style: `animation-delay:${i * 0.4}s` });
    });
    dot(night, [0.025, 5.0, 5.15], 7, '#fdf3c7');
    dot(night, [0.026, 5.12, 5.2], 6, '#2a2f6b');

    // City skyline – buildings light up at night
    const buildings = [[2.15, 2.6, 3.7], [2.6, 3.05, 4.4], [3.05, 3.55, 3.4], [3.55, 3.95, 4.9],
      [3.95, 4.55, 3.9], [4.55, 5.0, 4.55], [5.0, 5.85, 3.55]];
    const city = group(scene, 'skyline');
    buildings.forEach(([y0, y1, top]) => onWallX(city, 0.03, [y0, y1], [2.75, top], 'currentColor'));
    const lit = group(scene, 'city-lights');
    buildings.forEach(([y0, y1, top], b) => {
      for (let z = 3.0; z < top - 0.2; z += 0.35) {
        for (let y = y0 + 0.1; y < y1 - 0.12; y += 0.2) {
          if ((Math.round(z * 10) + Math.round(y * 10) + b) % 3 === 0) {
            onWallX(lit, 0.035, [y, y + 0.08], [z, z + 0.12], '#ffd98a');
          }
        }
      }
    });

    // Window bars and reflection
    onWallX(scene, 0.04, [3.95, 4.05], [2.75, 5.75], '#f5efe6');
    onWallX(scene, 0.04, [2.15, 5.85], [4.2, 4.3], '#f5efe6');
    poly(scene, [[0.045, 2.4, 5.6], [0.045, 3.0, 5.6], [0.045, 2.5, 2.9], [0.045, 2.25, 2.9]], '#ffffff', { opacity: 0.18 });

    // Sill with a small plant
    block(scene, [0, 0.45], [1.85, 6.15], [2.4, 2.55], '#f5efe6');
    block(scene, [0.12, 0.38], [5.35, 5.65], [2.55, 2.8], '#d98c6a');
    leaves(scene, [0.25, 5.5, 3.0], 7, ['#4f9a68', '#62b07c', '#3f8a5a']);

    // Curtains and rod
    line(scene, [0.12, 1.3, 6.25], [0.12, 6.7, 6.25], { stroke: '#3a2a22', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    for (const [y0, y1] of [[1.35, 2.1], [5.9, 6.65]]) {
      const curtain = group(scene, 'curtain');
      onWallX(curtain, 0.1, [y0, y1], [2.2, 6.2], '#e6b36b');
      for (let y = y0 + 0.18; y < y1; y += 0.25) {
        onWallX(curtain, 0.11, [y, y + 0.07], [2.2, 6.2], 'rgba(120,70,20,0.22)');
      }
    }
  }

  // ===== Wall decorations (behind the furniture) =====

  function buildWallDecor(scene) {
    // Bathroom tiles on the left wall
    onWallX(scene, 0.01, [7.05, 10], [0, 5.6], '#dde8e5');
    for (let z = 0.4; z < 5.6; z += 0.4) onWallX(scene, 0.012, [7.05, 10], [z, z + 0.03], '#bfcfcb');
    for (let y = 7.35; y < 10; y += 0.4) onWallX(scene, 0.012, [y, y + 0.03], [0, 5.6], '#bfcfcb');

    // Rain shower
    block(scene, [0, 0.1], [8.55, 8.65], [1.25, 5.2], '#b8c2cc');
    block(scene, [0, 0.8], [8.5, 8.7], [5.15, 5.25], '#b8c2cc');
    block(scene, [0.5, 1.0], [8.35, 8.85], [5.0, 5.12], '#8f9aa5', { top: '#c9d2da' });

    // Towel ladder
    block(scene, [0.1, 0.18], [6.85, 6.92], [0, 3.6], '#b98a5e');
    block(scene, [0.1, 0.18], [7.18, 7.25], [0, 3.6], '#b98a5e');
    onWallX(scene, 0.2, [6.85, 7.25], [2.2, 3.3], '#f2a3a0');

    // Kitchen backsplash tiles
    onWallY(scene, 0.01, [1.9, 4.4], [1.6, 3.25], '#e9eef0');
    for (let z = 1.85; z < 3.25; z += 0.25) onWallY(scene, 0.012, [1.9, 4.4], [z, z + 0.025], '#c8d2d6');
    for (let x = 2.15; x < 4.4; x += 0.5) onWallY(scene, 0.012, [x, x + 0.025], [1.6, 3.25], '#c8d2d6');

    // Framed pictures above the bed
    for (const [x0, x1, z0, z1, art] of [[4.85, 5.85, 2.65, 3.95, '#d98c6a'], [6.1, 7.1, 2.9, 3.75, '#6f8fd6']]) {
      onWallY(scene, 0.02, [x0, x1], [z0, z1], '#2e2620');
      onWallY(scene, 0.03, [x0 + 0.08, x1 - 0.08], [z0 + 0.08, z1 - 0.08], '#f5efe6');
      onWallY(scene, 0.035, [x0 + 0.2, x1 - 0.2], [z0 + 0.2, z1 - 0.2], art);
      dot(scene, [(x0 + x1) / 2 + 0.1, 0.04, (z0 + z1) / 2 + 0.1], 4, '#f7d26b');
    }

    // Fairy lights hanging across the wall
    const fairy = group(scene, 'fairy-lights');
    const bulbs = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = 4.4 + t * 3.4;
      const z = 5.7 - Math.sin(t * Math.PI) * 0.45;
      bulbs.push([x, 0.04, z]);
    }
    make('polyline', { points: pts(bulbs), fill: 'none', stroke: '#4a3a2c', 'stroke-width': 1 }, fairy);
    bulbs.forEach((b, i) => dot(fairy, b, 2.4, ['#ffd27a', '#ff9eb8', '#9fe3ff'][i % 3],
      { class: 'bulb', style: `animation-delay:${(i % 5) * 0.3}s` }));

    // Wall clock – the hour hand follows the game clock
    const cx = 7.95;
    const cz = 4.6;
    const r = 0.42;
    const rim = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      rim.push([cx + r * Math.cos(t), 0.025, cz + r * Math.sin(t)]);
    }
    poly(scene, rim, '#fffaf2', { stroke: '#2e2620', 'stroke-width': 2.5 });
    line(scene, [cx, 0.03, cz], [cx, 0.03, cz + 0.32], { stroke: '#2e2620', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
    ui.hourHand = line(scene, [cx, 0.03, cz], [cx, 0.03, cz + 0.22], { stroke: '#e2554f', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    ui.clockCenter = [cx, cz];

    // Floating shelf above the TV with books, a record and a plant
    block(scene, [8.35, 9.85], [0, 0.45], [3.25, 3.35], '#6b4630');
    [[8.45, 0.1, '#e2554f'], [8.57, 0.13, '#f0c25a'], [8.72, 0.09, '#6f8fd6'], [8.83, 0.12, '#4f9a68']]
      .forEach(([x, w, c], i) => block(scene, [x, x + w], [0.08, 0.4], [3.35, 3.85 + (i % 2) * 0.12], c));
    block(scene, [9.1, 9.6], [0.05, 0.1], [3.35, 3.85], '#1f1f24');
    dot(scene, [9.35, 0.11, 3.6], 5, '#e2554f');
    block(scene, [9.62, 9.82], [0.12, 0.35], [3.35, 3.55], '#ece5de');
    leaves(scene, [9.72, 0.24, 3.75], 6, ['#4f9a68', '#62b07c']);
    // Art above the shelf
    onWallY(scene, 0.02, [8.65, 9.65], [3.9, 5.15], '#2e2620');
    onWallY(scene, 0.03, [8.73, 9.57], [3.98, 5.07], '#203046');
    poly(scene, [[8.73, 0.035, 3.98], [9.57, 0.035, 3.98], [9.2, 0.035, 4.7]], '#3d5a9e');
    dot(scene, [8.98, 0.04, 4.75], 4, '#ffd166');
  }

  // ===== Floor decoration: light, rugs, shadows =====

  function buildFloorDecor(scene) {
    ui.lightPatch = poly(scene, [[0.05, 2.2, 0.004], [0.05, 5.8, 0.004], [4.0, 7.2, 0.004], [4.0, 3.6, 0.004]],
      LIGHT_PATCH.day, { class: 'light-patch', filter: 'url(#blur-sm)' });

    // Round rug in the middle
    floorEllipse(scene, [5.6, 6.8, 0.006], 2.05, '#2e4b5c');
    floorEllipse(scene, [5.6, 6.8, 0.008], 1.85, '#d9a24a');
    floorEllipse(scene, [5.6, 6.8, 0.01], 1.55, '#3c6176');
    floorEllipse(scene, [5.6, 6.8, 0.012], 1.0, '#e8d4b0');
    floorEllipse(scene, [5.6, 6.8, 0.014], 0.45, '#c9663f');

    // Bath mat and TV rug
    onFloor(scene, [2.45, 3.45], [7.7, 9.3], 0.01, '#8fcbb8', { rx: 4 });
    onFloor(scene, [7.95, 9.95], [1.5, 3.8], 0.01, '#4a3d5c');
    onFloor(scene, [8.1, 9.8], [1.65, 3.65], 0.012, '#5d4f73');

    // Contact shadows under furniture
    contactShadow(scene, [0.3, 4.4], [0.15, 1.45]);
    contactShadow(scene, [0.15, 1.75], [2.6, 5.4], 0.3);
    contactShadow(scene, [4.6, 7.4], [0.25, 4.3]);
    contactShadow(scene, [7.6, 8.25], [0.2, 0.85]);
    contactShadow(scene, [8.35, 9.85], [0.2, 1.0]);
    contactShadow(scene, [0.15, 2.25], [7.3, 9.85]);
    contactShadow(scene, [0.05, 0.9], [6.1, 7.1]);
  }

  // ===== Furniture =====

  function buildKitchen(scene) {
    const k = hotspot(scene, 'kitchen', 'Kitchen – eat');
    // Upper cabinets with LED strip underneath
    block(k, [1.95, 4.35], [0, 0.7], [3.3, 4.35], '#3f5f50', { top: '#4d6f5f' });
    onWallY(k, 0.71, [3.12, 3.16], [3.35, 4.3], '#2f4a3e');
    onWallY(k, 0.72, [2.9, 3.0], [3.45, 3.52], '#d9b46a');
    onWallY(k, 0.72, [3.28, 3.38], [3.45, 3.52], '#d9b46a');
    ui.ledStrip = line(k, [1.98, 0.7, 3.29], [4.32, 0.7, 3.29], { stroke: '#ffe0a8', 'stroke-width': 2, class: 'led' });
    // Fridge
    block(k, [0.3, 1.85], [0.15, 1.45], [0, 4.3], '#dfe4e8', { top: '#eef2f5' });
    onWallY(k, 1.46, [0.3, 1.85], [2.85, 2.92], '#b9c3cb');
    onWallY(k, 1.47, [1.6, 1.67], [3.05, 3.9], '#8b97a1');
    onWallY(k, 1.47, [1.6, 1.67], [1.5, 2.6], '#8b97a1');
    block(k, [0.55, 0.95], [0.4, 0.75], [4.3, 4.6], '#d98c6a');                    // pot on the fridge
    // Counter with a marble top
    block(k, [1.9, 4.4], [0.15, 1.45], [0, 1.55], '#3f5f50', { top: '#3f5f50' });
    block(k, [1.85, 4.45], [0.12, 1.52], [1.55, 1.66], '#f2eee8', { top: '#faf8f4' });
    onWallY(k, 1.46, [3.12, 3.16], [0.12, 1.45], '#2f4a3e');
    onWallY(k, 1.47, [2.45, 2.65], [1.25, 1.3], '#d9b46a');
    onWallY(k, 1.47, [3.6, 3.8], [1.25, 1.3], '#d9b46a');
    onFloor(k, [2.1, 2.85], [0.35, 1.15], 1.665, '#c5d0d6');                        // sink
    block(k, [2.4, 2.48], [0.25, 0.33], [1.66, 2.15], '#b8c2cc');                   // tap
    block(k, [2.4, 2.48], [0.25, 0.65], [2.1, 2.16], '#b8c2cc');
    block(k, [3.55, 4.1], [0.3, 0.85], [1.66, 2.45], '#2a2a30', { top: '#3a3a42' }); // coffee machine
    dot(k, [4.11, 0.6, 2.2], 1.8, '#ff6b6b', { class: 'blink' });
    block(k, [3.7, 3.88], [0.85, 1.03], [1.66, 1.86], '#ffffff');                   // cup
    floorEllipse(k, [3.0, 0.8, 1.68], 0.28, '#e8dccb');                             // fruit bowl
    dot(k, [2.95, 0.8, 1.78], 3.5, '#f0a63a');
    dot(k, [3.08, 0.75, 1.8], 3.5, '#e2554f');
    dot(k, [3.0, 0.9, 1.8], 3.5, '#9cc85a');
    finishHotspot('kitchen', [[0.3, 4.45], [0, 1.52], [0, 4.35]]);

    // Moving decorations live OUTSIDE the clickable area, so the furniture stays still
    // (Playwright – and real users – need a stable target to click).
    const extras = group(scene);
    leaves(extras, [0.75, 0.6, 4.8], 9, ['#4f9a68', '#62b07c', '#3f8a5a']);
    steamAt(extras, [3.79, 0.94, 1.95]);
  }

  function steamAt(parent, at) {
    const [sx, sy] = P(...at);
    path(group(parent, 'steam'), `M${sx.toFixed(1)},${sy.toFixed(1)} q-4,-7 0,-13 q4,-6 0,-12`,
      { fill: 'none', stroke: '#ffffff', 'stroke-width': 1.5, 'stroke-linecap': 'round' });
  }

  function buildDesk(scene) {
    const d = hotspot(scene, 'desk', 'Desk – work');
    block(d, [0.2, 0.32], [2.65, 2.77], [0, 1.35], '#2b2b30');                      // legs
    block(d, [1.58, 1.7], [2.65, 2.77], [0, 1.35], '#2b2b30');
    block(d, [0.2, 1.7], [4.4, 5.35], [0, 1.35], '#6b4630');                        // drawers
    onWallX(d, 1.71, [4.6, 5.15], [0.95, 1.0], '#d9b46a');
    onWallX(d, 1.71, [4.6, 5.15], [0.45, 0.5], '#d9b46a');
    block(d, [0.15, 1.75], [2.6, 5.4], [1.35, 1.48], '#7a5038', { top: '#8c5d42' }); // desk top
    ui.deskLed = line(d, [1.74, 2.65, 1.34], [1.74, 5.35, 1.34], { stroke: '#b98aff', 'stroke-width': 1.8, class: 'led led-purple' });
    // Wide monitor showing code
    block(d, [0.4, 0.75], [3.85, 4.35], [1.48, 1.54], '#1d1d22');
    block(d, [0.52, 0.62], [4.05, 4.15], [1.54, 1.9], '#1d1d22');
    block(d, [0.38, 0.52], [3.05, 5.15], [1.85, 2.95], '#15161b');
    ui.monitor = onWallX(d, 0.53, [3.12, 5.08], [1.92, 2.88], 'url(#screen-code)', { class: 'monitor-screen' });
    const code = group(d, 'code-lines');
    const colors = ['#7ee0a1', '#ffd166', '#8fb8ff', '#ff8fa3', '#c9b6ff'];
    for (let i = 0; i < 7; i++) {
      const z = 2.75 - i * 0.12;
      const y0 = 3.25 + (i % 3) * 0.15;
      onWallX(code, 0.535, [y0, y0 + 0.4 + ((i * 7) % 5) * 0.18], [z, z + 0.05], colors[i % colors.length]);
    }
    // Keyboard with RGB glow, mouse, mug with steam, lamp
    block(d, [0.85, 1.18], [3.5, 4.6], [1.48, 1.53], '#2a2a30', { top: '#33333a' });
    onFloor(d, [0.88, 1.15], [3.55, 4.55], 1.535, 'url(#glow-cyan)', { class: 'rgb', opacity: 0.8 });
    block(d, [0.95, 1.12], [4.75, 4.92], [1.48, 1.54], '#2a2a30');
    block(d, [1.25, 1.45], [2.9, 3.1], [1.48, 1.72], '#f2eee8');                   // mug
    block(d, [0.3, 0.5], [2.75, 2.95], [1.48, 1.52], '#2b2b30');                    // desk lamp
    line(d, [0.4, 2.85, 1.52], [0.6, 2.85, 2.5], { stroke: '#2b2b30', 'stroke-width': 2 });
    block(d, [0.5, 0.9], [2.7, 3.0], [2.35, 2.6], '#2b2b30', { left: '#ffe2a3' });
    // Gaming chair
    block(d, [2.0, 2.85], [3.95, 4.1], [0.06, 0.14], '#1d1d22');
    block(d, [2.35, 2.5], [3.6, 4.45], [0.06, 0.14], '#1d1d22');
    block(d, [2.38, 2.47], [3.98, 4.07], [0.14, 0.92], '#2b2b30');
    block(d, [1.95, 2.9], [3.6, 4.45], [0.92, 1.12], '#2d2b3a', { top: '#3a3850' });
    block(d, [2.72, 2.92], [3.6, 4.45], [1.12, 2.35], '#2d2b3a');
    onWallX(d, 2.93, [3.85, 4.2], [1.25, 2.25], '#e2554f');
    finishHotspot('desk', [[0.15, 2.93], [2.6, 5.4], [0, 2.95]]);
    steamAt(group(scene), [1.35, 3.0, 1.8]);
  }

  function buildBookcase(scene) {
    const g = group(scene);
    block(g, [0.05, 0.9], [6.1, 7.1], [0, 4.4], '#6b4630', { top: '#7a5038' });
    onWallX(g, 0.905, [6.18, 7.02], [0.1, 4.3], '#3e281b');
    const palette = ['#e2554f', '#f0c25a', '#6f8fd6', '#4f9a68', '#c9b6ff', '#e6b36b', '#3f5f50', '#ff8fa3'];
    [0.12, 1.2, 2.28, 3.36].forEach((z, shelf) => {
      onWallX(g, 0.91, [6.18, 7.02], [z, z + 0.06], '#7a5038');
      let y = 6.22;
      let i = shelf * 3;
      while (y < 6.95) {
        const w = 0.07 + ((i * 3) % 4) * 0.02;
        const h = 0.62 + ((i * 5) % 4) * 0.08;
        onWallX(g, 0.915, [y, Math.min(6.98, y + w)], [z + 0.06, z + 0.06 + h], palette[i % palette.length]);
        y += w + 0.015;
        i++;
      }
    });
    block(g, [0.25, 0.7], [6.35, 6.85], [4.4, 4.75], '#ece5de');
    leaves(g, [0.47, 6.6, 5.05], 9, ['#4f9a68', '#62b07c', '#3f8a5a']);
  }

  function buildBed(scene) {
    // Nightstand with a lamp and a book (not clickable)
    const n = group(scene);
    block(n, [7.6, 8.25], [0.2, 0.85], [0, 1.0], '#6b4630', { top: '#7a5038' });
    onWallX(n, 8.26, [0.35, 0.7], [0.62, 0.66], '#d9b46a');
    block(n, [7.7, 8.05], [0.3, 0.6], [1.0, 1.06], '#e2554f');
    block(n, [7.82, 7.98], [0.48, 0.64], [1.0, 1.5], '#d9b46a');
    block(n, [7.65, 8.15], [0.32, 0.78], [1.5, 2.0], '#fff1c9', { top: '#fff8e6', left: '#ffe7b0', right: '#f5d798' });

    const b = hotspot(scene, 'bed', 'Bed – sleep');
    block(b, [4.6, 7.4], [0, 0.28], [0, 1.85], '#b9916a', { top: '#c9a27c' });       // upholstered headboard
    for (let x = 5.05; x < 7.4; x += 0.45) onWallY(b, 0.29, [x, x + 0.03], [0.4, 1.75], 'rgba(90,60,30,0.25)');
    block(b, [4.55, 7.45], [0.28, 4.35], [0, 0.5], '#7a5038', { top: '#8c5d42' });   // frame
    block(b, [4.68, 7.32], [0.32, 4.25], [0.5, 0.95], '#f6f1ea');                    // mattress
    block(b, [4.85, 5.95], [0.45, 1.35], [0.95, 1.28], '#ffffff', { top: '#fbfbfb' }); // pillows
    block(b, [6.05, 7.15], [0.45, 1.35], [0.95, 1.28], '#a9c2b2', { top: '#b9d0c1' });
    block(b, [4.64, 7.36], [1.6, 4.3], [0.55, 1.08], '#e9e1d4', { top: '#f3ede3' });  // duvet
    for (let y = 2.1; y < 4.3; y += 0.55) onFloor(b, [4.7, 7.3], [y, y + 0.04], 1.081, 'rgba(150,130,100,0.25)');
    block(b, [4.62, 7.38], [3.35, 4.32], [0.55, 1.12], '#d6a243', { top: '#e2b456' }); // throw blanket
    block(b, [4.64, 7.36], [1.6, 1.85], [1.08, 1.13], '#fffaf3');

    // The buddy lying in bed – only visible while sleeping
    ui.sleeper = group(b, 'sleeper');
    block(ui.sleeper, [4.95, 5.95], [1.9, 3.3], [1.08, 1.36], '#e9e1d4', { top: '#f3ede3' });
    dot(ui.sleeper, [5.4, 0.95, 1.5], 10.5, '#f3c49d');
    const [hx, hy] = P(5.4, 0.95, 1.5);
    make('ellipse', { cx: (hx - 2).toFixed(1), cy: (hy - 6).toFixed(1), rx: 10.5, ry: 6.5, fill: '#3a2a22' }, ui.sleeper);
    path(ui.sleeper, `M${hx + 1},${hy + 1} q2.5,2 5,0`, { stroke: '#2b1d16', 'stroke-width': 1.4, fill: 'none' });

    finishHotspot('bed', [[4.55, 7.45], [0, 4.35], [0, 1.85]]);
  }

  function buildTv(scene) {
    const t = hotspot(scene, 'tv', 'TV – play');
    block(t, [8.35, 9.85], [0.2, 1.0], [0.1, 0.72], '#6b4630', { top: '#7a5038' });  // media console
    block(t, [8.45, 8.55], [0.85, 0.95], [0, 0.1], '#2b2b30');
    block(t, [9.65, 9.75], [0.85, 0.95], [0, 0.1], '#2b2b30');
    onWallY(t, 1.01, [9.08, 9.12], [0.18, 0.66], '#4a3020');
    block(t, [8.5, 8.95], [0.6, 0.9], [0.72, 0.8], '#f2eee8');                       // game console
    block(t, [9.25, 9.75], [0.55, 0.75], [0.72, 0.82], '#1d1d22');                   // soundbar
    block(t, [9.05, 9.15], [0.42, 0.56], [0.72, 0.9], '#111111');                    // stand
    block(t, [8.4, 9.8], [0.4, 0.54], [0.9, 2.25], '#121318');                       // TV
    ui.tvScreen = onWallY(t, 0.55, [8.47, 9.73], [0.97, 2.18], 'url(#tv-off)', { class: 'tv-screen' });
    block(t, [9.88, 9.98], [1.2, 1.3], [0, 0.4], '#ece5de');                         // plant beside
    finishHotspot('tv', [[8.35, 9.85], [0.2, 1.0], [0, 2.25]]);
  }

  function buildBath(scene) {
    const bt = hotspot(scene, 'bath', 'Bathtub – shower');
    block(bt, [0.15, 2.25], [7.3, 9.85], [0.1, 1.25], '#f4f7f9', { top: '#ffffff' });
    for (const [x, y] of [[0.3, 9.7], [2.1, 9.7], [2.1, 7.45]]) block(bt, [x, x + 0.1], [y, y + 0.1], [0, 0.1], '#c9a36a');
    onFloor(bt, [0.32, 2.08], [7.47, 9.68], 1.25, '#dbe5ec');
    onFloor(bt, [0.42, 1.98], [7.57, 9.58], 1.251, '#9fd8f0');
    onFloor(bt, [0.42, 1.2], [7.57, 8.4], 1.252, '#ffffff', { opacity: 0.25 });
    block(bt, [0.18, 0.3], [8.45, 8.6], [1.25, 1.55], '#b8c2cc');                     // faucet
    block(bt, [0.18, 0.55], [8.47, 8.58], [1.5, 1.58], '#b8c2cc');

    const bubbles = group(bt, 'bath-bubbles');
    [[0.8, 8.2, 6], [1.3, 8.8, 7], [1.7, 8.1, 5], [0.9, 9.2, 5], [1.6, 9.3, 6], [1.2, 7.9, 4], [0.6, 8.7, 4]]
      .forEach(([x, y, r]) => dot(bubbles, [x, y, 1.33], r, '#ffffff', { opacity: 0.94 }));

    const water = group(bt, 'shower-water');
    [[-0.12, -0.12], [0.05, 0.05], [0.15, -0.05], [-0.02, 0.18], [0.12, 0.2], [-0.1, 0.08]].forEach(([dx, dy]) => {
      line(water, [0.75 + dx, 8.6 + dy, 5.0], [0.75 + dx, 8.6 + dy, 1.3],
        { stroke: '#bfe7fb', 'stroke-width': 1.6, 'stroke-dasharray': '6 7', 'stroke-linecap': 'round' });
    });

    // Glass shower panel
    poly(bt, [[2.25, 7.3, 1.25], [2.25, 8.3, 1.25], [2.25, 8.3, 4.6], [2.25, 7.3, 4.6]], 'url(#glass)',
      { stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 1 });
    finishHotspot('bath', [[0.15, 2.25], [7.3, 9.85], [0, 1.25]]);
  }

  // Beanbag with a sleeping cat, floor lamp and a big plant (decoration only)
  function buildCozyCorner(scene) {
    const g = group(scene);
    floorEllipse(g, [8.65, 5.45, 0.003], 0.95, '#2b1408', { opacity: 0.35, filter: 'url(#blur-sm)' });
    const [bx, by] = P(8.65, 5.45, 0.4);
    make('ellipse', { cx: bx, cy: by, rx: 32, ry: 21, fill: '#b9493f' }, g);
    make('ellipse', { cx: bx - 4, cy: by - 7, rx: 24, ry: 12, fill: '#cf5a4f' }, g);
    make('ellipse', { cx: bx - 8, cy: by - 10, rx: 10, ry: 4, fill: '#e57a6e', opacity: 0.7 }, g);

    // Cat curled up on the beanbag
    const cat = group(g, 'cat');
    const cx = bx + 2;
    const cy = by - 14;
    path(cat, `M${cx + 12},${cy + 2} q14,2 10,-10`, { class: 'cat-tail', fill: 'none', stroke: '#3a3a42', 'stroke-width': 4, 'stroke-linecap': 'round' });
    make('ellipse', { cx, cy, rx: 15, ry: 8.5, fill: '#3a3a42' }, cat);
    make('circle', { cx: cx - 12, cy: cy - 3, r: 7, fill: '#3a3a42' }, cat);
    path(cat, `M${cx - 18},${cy - 7} l2,-7 l4,5 Z M${cx - 10},${cy - 8} l1,-7 l5,5 Z`, { fill: '#3a3a42' });
    path(cat, `M${cx - 16},${cy - 3} q1.5,1.2 3,0 M${cx - 11},${cy - 3} q1.5,1.2 3,0`, { stroke: '#d9d9e0', 'stroke-width': 1, fill: 'none' });
    make('ellipse', { cx: cx + 1, cy: cy + 2, rx: 8, ry: 3, fill: '#4a4a54' }, cat);

    // Floor lamp in the corner behind the beanbag
    floorEllipse(g, [9.5, 4.3, 0.003], 0.4, '#2b1408', { opacity: 0.35, filter: 'url(#blur-sm)' });
    floorEllipse(g, [9.5, 4.3, 0.02], 0.28, '#2b2b30');
    line(g, [9.5, 4.3, 0.05], [9.5, 4.3, 4.0], { stroke: '#2b2b30', 'stroke-width': 2.5 });
    block(g, [9.2, 9.8], [4.0, 4.6], [3.9, 4.55], '#fff1c9', { top: '#fff8e6', left: '#ffe7b0', right: '#f5d798' });

    // Big plant in the front corner
    floorEllipse(g, [9.35, 9.25, 0.003], 0.55, '#2b1408', { opacity: 0.35, filter: 'url(#blur-sm)' });
    block(g, [9.0, 9.7], [8.9, 9.6], [0, 0.8], '#d98c6a', { top: '#5a3a22' });
    leaves(g, [9.35, 9.25, 1.35], 15, ['#3f8a5a', '#4f9a68', '#62b07c']);
    leaves(g, [9.25, 9.3, 2.05], 12, ['#4f9a68', '#62b07c', '#3f8a5a']);
  }

  // ===== Night overlay and light sources =====

  function buildLights(svg) {
    const lights = make('g', { class: 'lights' }, svg);

    // Sunlight through the window: a beam with floating dust
    poly(lights, [[0.03, 2.2, 5.7], [0.03, 5.8, 5.7], [4.0, 7.2, 0], [4.0, 3.6, 0]], 'url(#beam)',
      { class: 'light-beam', filter: 'url(#blur-md)' });
    const dust = group(lights, 'dust');
    [[1.0, 4.0, 3.5], [1.6, 4.8, 2.6], [2.2, 4.2, 1.8], [1.3, 5.2, 4.2], [2.6, 5.5, 1.2], [0.8, 3.4, 4.6]]
      .forEach((at, i) => dot(dust, at, 1.3, '#fff6dc', { style: `animation-delay:${i * 0.7}s` }));

    // Window glow
    ui.windowGlow = onWallX(lights, 0.03, [2.15, 5.85], [2.75, 5.75], '#ffcf70',
      { class: 'window-glow', filter: 'url(#blur-lg)' });

    // Lamps and LEDs
    dot(lights, [7.9, 0.55, 1.75], 85, 'url(#glow-warm)', { class: 'lamp-glow' });
    dot(lights, [9.5, 4.3, 4.2], 95, 'url(#glow-warm)', { class: 'lamp-glow' });
    floorEllipse(lights, [9.1, 4.8, 0.01], 1.6, 'url(#glow-warm)', { class: 'lamp-glow lamp-pool' });
    dot(lights, [0.7, 2.85, 2.4], 40, 'url(#glow-warm)', { class: 'lamp-glow' });
    dot(lights, [0.05, 4.1, 2.5], 95, 'url(#glow-purple)', { class: 'desk-glow' });
    line(lights, [1.98, 0.7, 3.29], [4.32, 0.7, 3.29], { stroke: '#ffd59a', 'stroke-width': 9, class: 'led-glow', filter: 'url(#blur-sm)' });
    onFloor(lights, [1.9, 4.4], [0.15, 1.5], 1.67, 'url(#glow-warm)', { class: 'led-glow' });
    line(lights, [1.74, 2.65, 1.34], [1.74, 5.35, 1.34], { stroke: '#a06bff', 'stroke-width': 10, class: 'led-glow led-purple', filter: 'url(#blur-sm)' });
    dot(lights, [6.1, 0.1, 5.4], 75, 'url(#glow-pink)', { class: 'fairy-glow' });

    // Screens light up the room
    dot(lights, [9.1, 1.4, 1.5], 90, 'url(#glow-cyan)', { class: 'tv-glow' });

    // Zzz above the bed
    const zzz = group(lights, 'zzz');
    [['z', 12, [5.7, 0.9, 2.2]], ['Z', 15, [6.0, 0.9, 2.7]], ['Z', 18, [6.35, 0.9, 3.25]]].forEach(([char, size, at], i) => {
      const [x, y] = P(...at);
      const text = make('text', { x: x.toFixed(1), y: y.toFixed(1), 'font-size': size, style: `animation-delay:${i * 0.35}s` }, zzz);
      text.textContent = char;
    });
  }

  // ===== The buddy =====

  function buildActor(svg) {
    const actor = make('g', { class: 'actor', 'data-test': 'character', 'data-location': 'idle' }, svg);
    make('ellipse', { class: 'shadow', cx: 0, cy: 0, rx: 15, ry: 5.5, fill: 'rgba(40,15,10,0.35)', filter: 'url(#blur-xs)' }, actor);

    ui.figure = group(actor, 'figure');
    const legs = group(ui.figure, 'legs');
    make('rect', { class: 'leg leg-a', x: -8, y: -36, width: 7.5, height: 34, rx: 3.5, fill: '#2f3a5c' }, legs);
    make('rect', { class: 'leg leg-b', x: 0.5, y: -36, width: 7.5, height: 34, rx: 3.5, fill: '#26304d' }, legs);
    make('rect', { x: -9, y: -4, width: 9.5, height: 5, rx: 2.5, fill: '#f2eee8' }, legs);   // shoes
    make('rect', { x: 0, y: -4, width: 9.5, height: 5, rx: 2.5, fill: '#e2e0dc' }, legs);

    const upper = group(ui.figure, 'upper');
    const body = group(upper, 'breathe');
    make('rect', { x: -14.5, y: -66, width: 6.5, height: 28, rx: 3.2, fill: '#b93c39' }, body);    // back arm
    make('rect', { x: -12.5, y: -71, width: 25, height: 40, rx: 10, fill: '#e2554f' }, body);      // shirt
    make('rect', { x: -12.5, y: -50, width: 25, height: 5, fill: '#cf4a45' }, body);               // stripe
    make('rect', { x: -12.5, y: -71, width: 9, height: 40, rx: 8, fill: '#000', opacity: 0.08 }, body);
    make('rect', { x: -3, y: -73, width: 6, height: 5, rx: 2, fill: '#e8b088' }, body);            // neck
    make('circle', { cx: 0, cy: -82, r: 12.5, fill: '#f3c49d' }, upper);                            // head
    make('circle', { cx: -9, cy: -81, r: 3, fill: '#e8b088' }, upper);                               // ear
    make('ellipse', { cx: -0.5, cy: -88.5, rx: 13.2, ry: 8.2, fill: '#3a2a22' }, upper);              // hair
    make('rect', { x: -13.7, y: -90, width: 7.5, height: 14, rx: 3.6, fill: '#3a2a22' }, upper);
    path(upper, 'M-1,-93 Q9,-94 13.2,-86 Q6,-89.5 -1,-89 Z', { fill: '#3a2a22' });
    make('circle', { cx: 3, cy: -82, r: 1.7, fill: '#2b1d16', class: 'eye' }, upper);
    make('circle', { cx: 9, cy: -82, r: 1.7, fill: '#2b1d16', class: 'eye' }, upper);
    make('ellipse', { cx: 10, cy: -77.5, rx: 2.4, ry: 1.4, fill: '#ff9b8a', opacity: 0.55 }, upper);  // blush
    ui.mouth = path(upper, MOUTHS['mood-great'], { fill: 'none', stroke: '#7a3b2c', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
    make('rect', { x: 6.5, y: -66, width: 6.5, height: 28, rx: 3.2, fill: '#d14a45' }, upper);      // front arm
    make('circle', { cx: 9.7, cy: -38, r: 3.3, fill: '#f3c49d' }, upper);                           // hand

    ui.bubble = make('g', { class: 'bubble', transform: 'translate(0,-122)', filter: 'url(#drop)' }, actor);
    make('rect', { x: -19, y: -17, width: 38, height: 32, rx: 14, fill: '#ffffff' }, ui.bubble);
    path(ui.bubble, 'M-4,14 L0,22 L5,14 Z', { fill: '#ffffff' });
    ui.bubbleText = make('text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 18 }, ui.bubble);

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
      buildWallDecor(scene);
      buildFloorDecor(scene);
      buildKitchen(scene);
      buildDesk(scene);
      buildBookcase(scene);
      buildBed(scene);
      buildTv(scene);
      buildBath(scene);
      buildCozyCorner(scene);
      poly(svg, [[-0.45, -0.45, 7.5], [10, -0.45, 7.5], [10, -0.45, -0.6], [10, 10, -0.6], [-0.45, 10, -0.6], [-0.45, 10, 7.5]],
        '#0d0a2a', { class: 'overlay' });
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
