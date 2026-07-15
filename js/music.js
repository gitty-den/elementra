// music.js — Generative Hintergrundmusik über WebAudio, keine Audio-Dateien.
// Zwei Themes: 'map' (ruhig, dunkel-episch) und 'battle' (treibend).
// Lookahead-Scheduler (Timer plant Noten ~1.2 s voraus) — überlebt Tab-Drosselung.
// Nutzt den AudioContext von Sfx (eine Instanz, entsperrt bei erster Interaktion).

const Music = {
  theme: null,     // gewünschtes Theme (bleibt gesetzt, auch wenn Musik aus)
  bus: null,       // Gain-Bus des laufenden Themes (für sauberes Ausblenden)
  timer: null,
  step: 0,
  nextTime: 0,
  noiseBuf: null,

  get enabled() { return Save.settings.music !== false; }, // alte Saves: an

  // A-Moll, dunkel: Akkorde als [Grundton, Terz/Quinte...] in Hz.
  MAP_CHORDS: [
    [110.00, 130.81, 164.81], // Am
    [87.31, 130.81, 174.61],  // F
    [73.42, 146.83, 220.00],  // Dm
    [82.41, 123.47, 164.81],  // Em
  ],
  MAP_PLUCK: [220, 261.63, 293.66, 329.63, 392, 440], // A-Moll-Pentatonik
  BATTLE_CHORDS: [
    [110.00, 130.81, 164.81], // Am
    [110.00, 130.81, 164.81], // Am
    [87.31, 130.81, 174.61],  // F
    [82.41, 123.47, 164.81],  // Em
  ],

  play(theme, force = false) {
    if (this.theme === theme && this.timer && !force) return;
    this.theme = theme;
    this.stopPlayback();
    if (!this.enabled || !theme) return;
    const ctx = Sfx.ensure();
    if (!ctx) return;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, 0.4); // sanft rein
    this.bus.connect(ctx.destination);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.pump(), 300);
    this.pump();
  },

  stopPlayback() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.bus && Sfx.ctx) {
      const bus = this.bus;
      bus.gain.setTargetAtTime(0.0001, Sfx.ctx.currentTime, 0.15);
      setTimeout(() => bus.disconnect(), 800);
    }
    this.bus = null;
  },

  stop() { this.stopPlayback(); this.theme = null; },

  toggle() {
    Save.settings.music = this.enabled ? false : true;
    persist();
    if (this.enabled) this.play(this.theme || 'map', true);
    else this.stopPlayback();
  },

  pump() {
    const ctx = Sfx.ctx;
    if (!ctx || !this.bus) return;
    const ahead = ctx.currentTime + 1.2;
    while (this.nextTime < ahead) {
      const stepDur = this.theme === 'battle' ? 0.2 : 0.5;
      if (this.theme === 'battle') this.battleStep(ctx, this.step, this.nextTime);
      else this.mapStep(ctx, this.step, this.nextTime);
      this.nextTime += stepDur;
      this.step++;
    }
  },

  // ---------- Bausteine ----------

  note(ctx, t, freq, dur, type, vol, opts = {}) {
    if (!this.bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const att = opts.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (opts.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lowpass;
      g.connect(f); out = f;
    }
    osc.connect(g);
    out.connect(this.bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  noise(ctx, t, dur, vol, highpassHz) {
    if (!this.bus) return;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.3);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = highpassHz;
    src.connect(g).connect(f).connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  },

  // ---------- Themes ----------

  // map: 1 Step = 0,5 s; 8 Steps = 1 Takt (4 s), Akkordwechsel je Takt.
  mapStep(ctx, step, t) {
    const bar = Math.floor(step / 8);
    const inBar = step % 8;
    const chord = this.MAP_CHORDS[bar % this.MAP_CHORDS.length];
    if (inBar === 0) {
      chord.forEach(f => {
        this.note(ctx, t, f, 4.2, 'triangle', 0.05, { attack: 1.2, lowpass: 700 });
        this.note(ctx, t, f, 4.2, 'sawtooth', 0.016, { attack: 1.4, lowpass: 420, detune: 7 });
      });
    }
    if (inBar === 0 || inBar === 4) // Bass-Puls
      this.note(ctx, t, chord[0] / 2, 1.6, 'sine', 0.09, { attack: 0.04 });
    if (inBar >= 2 && Math.random() < 0.3) { // sparsame Pentatonik-Tupfer
      const f = this.MAP_PLUCK[Math.floor(Math.random() * this.MAP_PLUCK.length)];
      this.note(ctx, t, f * (Math.random() < 0.25 ? 2 : 1), 0.5, 'triangle', 0.035, { lowpass: 1800 });
    }
  },

  // battle: 1 Step = 0,2 s (Achtel bei 150 bpm); 16 Steps = 1 Takt (3,2 s).
  battleStep(ctx, step, t) {
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const chord = this.BATTLE_CHORDS[bar % this.BATTLE_CHORDS.length];
    // Bass auf jedem Achtel, Akzent auf Viertel
    this.note(ctx, t, chord[0], 0.16, 'sawtooth', inBar % 4 === 0 ? 0.055 : 0.032, { lowpass: 500 });
    if (inBar % 4 === 0) // Kick
      this.note(ctx, t, 120, 0.13, 'sine', 0.12, { slideTo: 42 });
    if (inBar % 4 === 2) // Hi-Hat
      this.noise(ctx, t, 0.04, 0.05, 6000);
    if (inBar % 2 === 0) { // Arpeggio
      const arp = [chord[0] * 2, chord[1] * 2, chord[2] * 2, chord[1] * 2];
      this.note(ctx, t, arp[(inBar / 2) % 4], 0.18, 'square', 0.02, { lowpass: 2400 });
    }
  },
};
