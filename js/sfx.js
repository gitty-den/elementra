// sfx.js — Mini-Synth über WebAudio, keine Audio-Dateien nötig.
// AudioContext wird erst bei erster Nutzer-Interaktion erzeugt (Browser-Policy).

const Sfx = {
  ctx: null,
  get enabled() { return Save.settings.sfx; },
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  click() { this.tone(660, 0.06, 'triangle', 0.08); },
  hit()   { this.tone(180, 0.09, 'square', 0.06, 90); },
  ulti()  { this.tone(220, 0.35, 'sawtooth', 0.1, 880); },
  heal()  { this.tone(520, 0.18, 'sine', 0.09, 780); },
  die()   { this.tone(300, 0.4, 'sawtooth', 0.08, 60); },
  win()   { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, null, i * 0.13)); },
  lose()  { [400, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.1, null, i * 0.2)); },
  fuse()  { this.tone(160, 0.8, 'sawtooth', 0.08, 1200); this.tone(1200, 0.5, 'sine', 0.06, 2000, 0.5); },
};
