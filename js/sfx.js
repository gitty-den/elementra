// sfx.js — Mini-Synth über WebAudio, keine Audio-Dateien nötig.
// AudioContext wird erst bei erster Nutzer-Interaktion erzeugt (Browser-Policy).

const Sfx = {
  ctx: null,
  get volume() { const v = Save.settings.sfxVol; return typeof v === 'number' ? v : 1; },
  get enabled() { return this.volume > 0; },
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
    g.gain.setValueAtTime(vol * this.volume, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  // ---- Rausch-Kanal (20.07.2026) ----
  // Echte 8-Bit-Chips (NES/Game Boy) hatten neben den Ton-Kanälen einen Noise-
  // Kanal — genau der fehlte hier. Damit klingen Feuer (Fauchen), Dampf (Zischen)
  // und Frost (Klirren) endlich unterscheidbar, ohne den Chiptune-Charakter zu
  // verlieren: die Melodie-Anteile bleiben Square/Triangle/Saw.
  noiseBuf: null,
  getNoise(ctx) {
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      // Grobkörniges Rauschen: Wert nur alle paar Samples neu (klingt „digital",
      // nicht wie sauberes weißes Rauschen aus einer Wave-Datei).
      let v = 0;
      for (let i = 0; i < len; i++) {
        if (i % 3 === 0) v = Math.random() * 2 - 1;
        d[i] = v;
      }
    }
    return this.noiseBuf;
  },
  // Gefiltertes Rauschen mit Filter-Sweep. o.type: 'lowpass'|'highpass'|'bandpass'.
  noise(dur, o = {}) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + dur);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = ctx.createGain();
    const vol = (o.vol == null ? 0.1 : o.vol) * this.volume;
    const atk = o.attack == null ? 0.012 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  },

  click() { this.tone(660, 0.06, 'triangle', 0.08); },
  // Angriffs-Sound je Element: Feuer knistert, Wasser ploppt, Natur schlägt dumpf,
  // Dampf zischt, Asche grollt, Frost klirrt. Ohne Element: alter Einheits-Hit.
  hit(element) {
    switch (element) {
      case 'fire':   this.tone(170, 0.09, 'sawtooth', 0.06, 70); this.tone(950, 0.05, 'square', 0.025, 320, 0.015); break;
      case 'nature': this.tone(130, 0.11, 'triangle', 0.09, 80); this.tone(1600, 0.04, 'square', 0.02, 900, 0.01); break;
      case 'water':  this.tone(520, 0.11, 'sine', 0.08, 130); break;
      case 'steam':  this.tone(1100, 0.1, 'sawtooth', 0.03, 380); this.tone(330, 0.09, 'sine', 0.05, 140, 0.01); break;
      case 'ash':    this.tone(110, 0.12, 'square', 0.055, 55); this.tone(680, 0.05, 'sawtooth', 0.028, 240, 0.03); break;
      case 'frost':  this.tone(1150, 0.07, 'triangle', 0.05, 1700); this.tone(560, 0.06, 'sine', 0.045, 290, 0.02); break;
      default:       this.tone(180, 0.09, 'square', 0.06, 90);
    }
  },
  // Rundenstart-Countdown: drei trockene Ticks, dann ein heller Startakkord.
  countTick() { this.tone(440, 0.1, 'square', 0.07); this.noise(0.05, { freq: 1800, vol: 0.03 }); },
  countGo()   { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.11, null, i * 0.04)); },
  ulti()  { this.tone(220, 0.35, 'sawtooth', 0.1, 880); },
  heal()  { this.tone(520, 0.18, 'sine', 0.09, 780); },
  // ---- Ult-Sounds (überarbeitet 20.07.2026) ----
  // Bauplan je Ult: 1 Ton-Kern (Chiptune-Charakter) + 1 Rausch-Schicht (Textur)
  // + 1 Akzent (Transiente). Dadurch klingt jede Ult nach dem, was sie TUT.

  // Schild: Metall rastet ein, danach summt die Barriere.
  ultShield() {
    [294, 392, 587].forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.1, null, i * 0.045));
    this.tone(160, 0.55, 'sine', 0.07, 320);                                  // Brummen der Barriere
    this.noise(0.09, { type: 'bandpass', freq: 2600, freqTo: 1400, q: 6, vol: 0.09 }); // „Klong"
  },
  // Heilung: weiche Glocke, aufsteigend, mit Luft-Schimmer statt Kratzen.
  ultHeal() {
    [523, 659, 880, 1175].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.09, null, i * 0.055));
    [1047, 1319].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.035, null, 0.12 + i * 0.06));
    this.noise(0.5, { type: 'highpass', freq: 3200, freqTo: 7000, q: 0.6, vol: 0.03, attack: 0.15 });
  },
  // Wiedergeburt: Chor steigt auf, am Schluss ein heller Funke.
  ultRevive() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.1, null, i * 0.065));
    this.tone(1568, 0.5, 'sine', 0.06, null, 0.4);
    this.noise(0.55, { type: 'highpass', freq: 2400, freqTo: 8000, q: 0.7, vol: 0.045, attack: 0.2 });
  },
  ultAttack(el) {
    switch (el) {
      case 'fire':
        // Flammenwurf: langes Fauchen (breitbandiges Rauschen) über tiefem Grollen.
        this.noise(0.62, { type: 'bandpass', freq: 480, freqTo: 1800, q: 0.8, vol: 0.13, attack: 0.06 });
        this.tone(70, 0.5, 'sawtooth', 0.11, 180);
        this.tone(1200, 0.07, 'square', 0.04, 300);                     // Zündfunke
        break;
      case 'ash':
        // Aschesturm: dumpfer, körniger, ohne die hellen Spitzen des Feuers.
        this.noise(0.7, { type: 'lowpass', freq: 900, freqTo: 260, q: 1, vol: 0.13, attack: 0.09 });
        this.tone(58, 0.6, 'square', 0.1, 130);
        break;
      case 'nature':
        // Rasierblatt: scharfer Schnitt-Whoosh, danach das Zischen der Klinge.
        this.noise(0.18, { type: 'bandpass', freq: 3400, freqTo: 900, q: 4, vol: 0.12 });
        this.tone(160, 0.28, 'triangle', 0.1, 1100);
        this.noise(0.14, { type: 'highpass', freq: 5200, q: 1, vol: 0.05, delay: 0.16 });
        break;
      case 'water':
        // Wasserstrahl: Schwall aus dunklem Rauschen, Tonhöhe steigt mit dem Druck.
        this.noise(0.5, { type: 'lowpass', freq: 700, freqTo: 2600, q: 2, vol: 0.12, attack: 0.05 });
        this.tone(260, 0.36, 'sine', 0.1, 1100);
        break;
      case 'frost':
        // Frost: splitterndes Klirren oben, kalter Ton drunter.
        this.noise(0.34, { type: 'highpass', freq: 4200, freqTo: 9000, q: 1.5, vol: 0.1 });
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, i * 0.05));
        this.tone(300, 0.3, 'sine', 0.07, 190);
        break;
      case 'steam':
        // Dampf: reines Zischen, kaum Tonhöhe — Druck entweicht.
        this.noise(0.6, { type: 'highpass', freq: 2200, freqTo: 5200, q: 0.7, vol: 0.12, attack: 0.04 });
        this.tone(420, 0.3, 'sine', 0.05, 900);
        break;
      default:
        this.noise(0.4, { type: 'bandpass', freq: 1200, freqTo: 500, q: 1.2, vol: 0.09 });
        this.tone(180, 0.36, 'sawtooth', 0.12, 720);
    }
  },
  die()   { this.tone(300, 0.4, 'sawtooth', 0.08, 60); },
  win()   { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, null, i * 0.13)); },
  lose()  { [400, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.1, null, i * 0.2)); },
  fuse()  { this.tone(160, 0.8, 'sawtooth', 0.08, 1200); this.tone(1200, 0.5, 'sine', 0.06, 2000, 0.5); },
};
