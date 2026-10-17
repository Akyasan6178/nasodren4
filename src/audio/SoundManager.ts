/* =====================================================================
   AUDIO (WebAudio sentezi; harici dosya yok)
   NS4-03: main.ts'ten taşındı (sınıf adı Sound korundu). AudioContext yalnızca
   unlock() ile, kullanıcı etkileşiminde oluşturulur. Ses parametreleri değişmedi.
   DOM veya ayar paneline erişmez; ayarları constructor'dan alır.
   ===================================================================== */
import type { Settings } from '../types/settings';

export class Sound {
  ctx: AudioContext | null; musicOn: boolean;
  settings: Readonly<Pick<Settings, 'sound' | 'music'>>;   // NS4-03: ayar nesnesi dışarıdan verilir
  master!: GainNode; sfx!: GainNode; mus!: GainNode; noise!: AudioBuffer;
  wantMusic?: boolean; musNodes?: boolean; padLP!: BiquadFilterNode; chordIdx!: number; musTimer?: number;
  constructor(settings: Readonly<Pick<Settings, 'sound' | 'music'>>) { this.settings = settings; this.ctx = null; this.musicOn = false; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.connect(this.master);
      this.mus = ctx.createGain(); this.mus.gain.value = 0; this.mus.connect(this.master);
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  applySettings() {
    if (!this.ctx) return;
    this.sfx.gain.value = this.settings.sound ? 1 : 0;
    if (this.settings.music && this.wantMusic) this.startMusic(); else this.stopMusic();
  }
  tone(f: number, dur: number, type: OscillatorType, gain: number, f2?: number, delay?: number) {
    if (!this.ctx || !this.settings.sound) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }
  breath(dur: number, f0: number, f1: number, gain: number, q?: number, delay?: number) {
    if (!this.ctx || !this.settings.sound) return;
    const t = this.ctx.currentTime + (delay || 0);
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q || 1;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  move() { this.tone(540, 0.035, 'sine', 0.035); }
  rotate() { this.tone(660, 0.06, 'triangle', 0.05, 880); }
  hold() { this.tone(420, 0.08, 'sine', 0.06, 300); }
  lock() { this.tone(160, 0.11, 'sine', 0.16, 80); }
  hard() { this.tone(120, 0.16, 'sine', 0.24, 48); this.breath(0.09, 1400, 300, 0.06, 0.8); }
  clear(n: number, tspin: number) {
    // içeri derin nefes + damlacıklar
    this.breath(0.38 + 0.12 * n, 300, 1300 + 350 * n, 0.1 + 0.025 * n, 1.1);
    for (let i = 0; i < 2 + n * 2; i++) this.tone(800 + Math.random() * 700, 0.09, 'sine', 0.045, 260, 0.06 + i * 0.045);
    if (n >= 4 || tspin) {
      const ch = tspin ? [587, 740, 880] : [523, 659, 784, 1047];
      ch.forEach((f, i) => this.tone(f, 0.9, 'sine', 0.05, 0, 0.12 + i * 0.05));
    }
  }
  cyc() {
    this.breath(1.3, 180, 2200, 0.12, 0.9);
    for (let i = 0; i < 10; i++) this.tone(500 + Math.random() * 900, 0.12, 'sine', 0.035, 1400, 0.1 + i * 0.07);
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.3, 'sine', 0.04, 0, 0.3 + i * 0.08));
  }
  syn() { this.breath(0.35, 3000, 900, 0.14, 2.5); this.tone(900, 0.12, 'square', 0.03, 1800); }
  warn() { this.tone(220, 0.25, 'triangle', 0.08, 180); this.tone(208, 0.25, 'triangle', 0.08, 170, 0.2); }
  level() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, 0, i * 0.07)); }
  over() { this.tone(330, 0.7, 'triangle', 0.12, 82); this.breath(0.9, 900, 160, 0.06, 0.7); }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx, t = ctx.currentTime;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setTargetAtTime(0.32, t, 1.2);
    if (!this.musNodes) {
      // rüzgâr / nefes: filtrelenmiş gürültü + yavaş LFO
      const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.07;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.035; lfo2.connect(lg2); lg2.connect(ng.gain);
      n.connect(bp); bp.connect(ng); ng.connect(this.mus);
      n.start(); lfo.start(); lfo2.start();
      // yumuşak pad
      this.padLP = ctx.createBiquadFilter(); this.padLP.type = 'lowpass'; this.padLP.frequency.value = 900;
      this.padLP.connect(this.mus);
      this.musNodes = true;
      this.chordIdx = 0;
    }
    const chords = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
    const play = () => {
      if (!this.musicOn) return;
      const c = chords[this.chordIdx++ % chords.length], t0 = ctx.currentTime;
      c.forEach((f) => {
        for (let d = -1; d <= 1; d += 2) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f; o.detune.value = d * 6;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.03, t0 + 2.5);
          g.gain.linearRampToValueAtTime(0.0001, t0 + 8.5);
          o.connect(g); g.connect(this.padLP); o.start(t0); o.stop(t0 + 8.6);
        }
      });
    };
    play();
    this.musTimer = setInterval(play, 7000);
  }
  stopMusic() {
    if (!this.ctx || !this.musicOn) return;
    this.musicOn = false;
    clearInterval(this.musTimer);
    this.mus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.mus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }
  setMusic(want: boolean) { this.wantMusic = want; this.applySettings(); }
}
