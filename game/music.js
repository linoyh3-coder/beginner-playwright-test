'use strict';

// Procedural lofi music generator using Web Audio API
// Chord progression: Dm7 → Bbmaj7 → Am7 → Gm7 (smooth minor cycle)
// BPM: 78  |  Key: D minor  |  Style: late-night lofi hip hop

window.LofiMusic = (() => {
  // ===== State =====
  let ctx, master, compressor, reverb, dryBus, wetBus, vinylSrc;
  let schedulerTimer = null;
  let isPlaying = false;
  let beatCount = 0;
  let nextBeatTime = 0;
  let targetVolume = 0.42;

  const BPM = 78;
  const BEAT = 60 / BPM;        // ~0.769 s per beat
  const LOOKAHEAD = 0.28;       // schedule 280 ms ahead
  const TICK_MS = 65;           // how often the scheduler fires

  // Note frequencies (Hz)
  const D2=73.42, F2=87.31, G2=98.00, A2=110.00, Bb2=116.54, C3=130.81;
  const D3=146.83, Eb3=155.56, E3=164.81, F3=174.61, G3=196.00, A3=220.00, Bb3=233.08;
  const C4=261.63, D4=293.66;

  // 4-bar progression: each entry = one bar of 4 beats
  //   root  = bass root note
  //   chord = 4 voicing notes (arpeggiated on beat 1)
  //   mel   = 4 melody notes (quarter notes through the bar)
  const BARS = [
    { root: D2,  chord: [D2, F2, A2, C3],   mel: [D3, F3, A3, C4]  },   // Dm7
    { root: Bb2, chord: [Bb2, D3, F3, A3],  mel: [Bb3, A3, G3, F3] },   // Bbmaj7
    { root: A2,  chord: [A2, C3, E3, G3],   mel: [A3, G3, E3, D3]  },   // Am7
    { root: G2,  chord: [G2, Bb2, D3, F3],  mel: [G3, F3, Eb3, D3] },   // Gm7
  ];

  // ===== Audio graph =====

  function makeReverb() {
    // Algorithmic impulse response: decaying stereo noise
    const len = Math.floor(ctx.sampleRate * 2.2);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.9);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0;

    // Gentle glue compressor
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 8;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.03;
    compressor.release.value = 0.22;

    reverb = makeReverb();

    dryBus = ctx.createGain(); dryBus.gain.value = 0.62;
    wetBus = ctx.createGain(); wetBus.gain.value = 0.38;

    dryBus.connect(master);
    wetBus.connect(reverb);
    reverb.connect(master);
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }

  // ===== Instruments =====

  // Piano-like tone: triangle fundamental + 2 sine harmonics
  function piano(freq, time, dur, vol) {
    const detune = (Math.random() - 0.5) * 10; // ±5 cents vintage wobble
    const layers = [[1, 'triangle', 1.0], [2, 'sine', 0.28], [3.1, 'sine', 0.1]];
    for (const [harm, type, hv] of layers) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * harm;
      osc.detune.value = detune;
      const pk = time + 0.005;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(vol * hv, pk);
      g.gain.exponentialRampToValueAtTime(vol * hv * 0.32, pk + 0.55);
      g.gain.setValueAtTime(vol * hv * 0.32, Math.max(pk + 0.56, time + dur - 0.28));
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.45);
      osc.connect(g);
      g.connect(dryBus);
      g.connect(wetBus);
      osc.start(time);
      osc.stop(time + dur + 0.55);
    }
  }

  function bass(freq, time, dur) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.26, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g); g.connect(master);
    osc.start(time); osc.stop(time + dur + 0.1);
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(148, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.082);
    g.gain.setValueAtTime(0.88, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(g); g.connect(master);
    osc.start(time); osc.stop(time + 0.3);
  }

  function snare(time) {
    // Tonal body
    const o  = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 185;
    og.gain.setValueAtTime(0.2, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    o.connect(og); og.connect(master);
    o.start(time); o.stop(time + 0.08);

    // Noise snap
    const len = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.14, time);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    src.connect(f); f.connect(ng); ng.connect(master);
    src.start(time);
  }

  function hihat(time, vol, dec) {
    const len = Math.floor(ctx.sampleRate * dec * 2.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 8800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dec);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(time);
  }

  function startVinyl() {
    // Pink noise (Paul Kellet algorithm) for warm vinyl crackle
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 + w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) / 7;
      b6 = w * 0.115926;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.value = 0.017;
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start();
    vinylSrc = src;
  }

  // ===== Scheduler =====

  function scheduleBeat(n, t) {
    const bit = n % 4;                                      // beat in bar (0-3)
    const bar = BARS[Math.floor(n / 4) % BARS.length];     // which chord

    // Kick: beat 1 always, beat 3 with slight swing delay
    if (bit === 0) kick(t);
    if (bit === 2) kick(t + (Math.random() > 0.55 ? 0.014 : 0));

    // Snare: beats 2 and 4, with subtle humanization
    if (bit === 1 || bit === 3) snare(t + Math.random() * 0.009);

    // Hi-hat: 8th notes (on-beat louder, off-beat softer)
    hihat(t, 0.058, 0.034);
    hihat(t + BEAT * 0.5, 0.036, 0.022);

    // Piano chord: arpeggiated on beat 1 (notes staggered 22 ms each)
    if (bit === 0) {
      bar.chord.forEach((f, i) => piano(f, t + i * 0.022, BEAT * 3.6, 0.11 - i * 0.015));
    }

    // Bass: root on beats 1 and 3
    if (bit === 0) bass(bar.root, t, BEAT * 1.65);
    if (bit === 2) bass(bar.root, t + 0.005, BEAT * 1.4);

    // Melody: quarter notes with 12% random rests for natural phrasing
    const mel = bar.mel[bit];
    if (mel && Math.random() > 0.12) {
      piano(mel, t + 0.009 + Math.random() * 0.013, BEAT * 0.84, 0.065);
    }
  }

  function runScheduler() {
    while (nextBeatTime < ctx.currentTime + LOOKAHEAD) {
      scheduleBeat(beatCount, nextBeatTime);
      beatCount++;
      // Tiny tempo humanization: ±0.3% per beat
      nextBeatTime += BEAT * (1 + (Math.random() - 0.5) * 0.006);
    }
    schedulerTimer = setTimeout(runScheduler, TICK_MS);
  }

  // ===== Public API =====

  function ensureCtx() {
    if (!ctx) setup();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play() {
    try {
      ensureCtx();
      if (isPlaying) return;
      if (!vinylSrc) startVinyl();
      isPlaying = true;
      beatCount = 0;
      nextBeatTime = ctx.currentTime + 0.08;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 1.8);
      runScheduler();
      updateUI();
    } catch (e) {
      /* AudioContext unavailable (e.g. in test environment) */
    }
  }

  function pause() {
    if (!isPlaying) return;
    isPlaying = false;
    clearTimeout(schedulerTimer);
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
    }
    updateUI();
  }

  function toggle() {
    isPlaying ? pause() : play();
  }

  function setVolume(v) {
    targetVolume = Math.max(0, Math.min(1, v));
    if (isPlaying && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.08);
    }
  }

  function updateUI() {
    const btn    = document.getElementById('music-toggle');
    const player = document.getElementById('music-player');
    if (!btn) return;
    btn.setAttribute('aria-label', isPlaying ? 'Pause lofi music' : 'Play lofi music');
    btn.querySelector('.music-icon').textContent = isPlaying ? '⏸' : '🎵';
    if (player) player.classList.toggle('is-playing', isPlaying);
  }

  // Wire up the UI controls once the DOM is ready
  function initUI() {
    const btn = document.getElementById('music-toggle');
    const vol = document.getElementById('music-vol');
    if (btn) btn.addEventListener('click', () => toggle());
    if (vol) vol.addEventListener('input', (e) => setVolume(e.target.value / 100));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  return {
    play,
    pause,
    toggle,
    setVolume,
    get isPlaying() { return isPlaying; },
  };
})();
