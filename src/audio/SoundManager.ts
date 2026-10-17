/* =====================================================================
   AUDIO (WebAudio sentezi; harici dosya yok)
   NS4-03: main.ts'ten taşındı (sınıf adı Sound korundu). AudioContext yalnızca
   unlock() ile, kullanıcı etkileşiminde oluşturulur. Ses parametreleri değişmedi.
   DOM veya ayar paneline erişmez; ayarları constructor'dan alır.
   NS4-04: AudioContext'e bağlı düğümler tek bir `AudioGraph | null` alanında
   tutulur (unlock() öncesi gerçekten yoklar); Web Audio çağrı sırası aynıdır.
   ===================================================================== */
import type { Settings } from '../types/settings';

/** unlock() ile oluşturulan temel ses grafiği. */
interface AudioGraph {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly sfx: GainNode;
  readonly mus: GainNode;
  /** 2 sn'lik beyaz gürültü (nefes efektleri ve rüzgâr). */
  readonly noise: AudioBuffer;
}

type IntervalId = ReturnType<typeof window.setInterval>;
type AudioSettings = Readonly<Pick<Settings, 'sound' | 'music'>>;

export class Sound {
  private audio: AudioGraph | null = null;
  musicOn = false;
  /** Uygulama müzik istiyor mu (oyun sırasında true); ayarla birlikte değerlendirilir. */
  private wantMusic = false;
  /** Ortam müziği pad filtresi; null ise müzik düğümleri henüz kurulmadı (eski musNodes + padLP). */
  private pad: BiquadFilterNode | null = null;
  private chordIdx = 0;
  private musTimer: IntervalId | undefined;
  private readonly settings: AudioSettings; // NS4-03: ayar nesnesi dışarıdan verilir

  constructor(settings: AudioSettings) {
    this.settings = settings;
  }

  unlock(): void {
    if (!this.audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      const sfx = ctx.createGain();
      sfx.connect(master);
      const mus = ctx.createGain();
      mus.gain.value = 0;
      mus.connect(master);
      const len = ctx.sampleRate * 2,
        buf = ctx.createBuffer(1, len, ctx.sampleRate),
        d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.audio = { ctx, master, sfx, mus, noise: buf };
      this.applySettings();
    }
    // resume() sonucu beklenmez (orijinal davranış); reddedilirse tarayıcı sesi kapalı tutar.
    if (this.audio.ctx.state === 'suspended') void this.audio.ctx.resume();
  }
  applySettings(): void {
    if (!this.audio) return;
    this.audio.sfx.gain.value = this.settings.sound ? 1 : 0;
    if (this.settings.music && this.wantMusic) this.startMusic();
    else this.stopMusic();
  }
  tone(f: number, dur: number, type: OscillatorType, gain: number, f2?: number, delay?: number): void {
    const a = this.audio;
    if (!a || !this.settings.sound) return;
    const t = a.ctx.currentTime + (delay || 0);
    const o = a.ctx.createOscillator(),
      g = a.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(a.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  breath(dur: number, f0: number, f1: number, gain: number, q?: number, delay?: number): void {
    const a = this.audio;
    if (!a || !this.settings.sound) return;
    const t = a.ctx.currentTime + (delay || 0);
    const s = a.ctx.createBufferSource();
    s.buffer = a.noise;
    const bp = a.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q || 1;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(a.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  move() {
    this.tone(540, 0.035, 'sine', 0.035);
  }
  rotate() {
    this.tone(660, 0.06, 'triangle', 0.05, 880);
  }
  hold() {
    this.tone(420, 0.08, 'sine', 0.06, 300);
  }
  lock() {
    this.tone(160, 0.11, 'sine', 0.16, 80);
  }
  hard() {
    this.tone(120, 0.16, 'sine', 0.24, 48);
    this.breath(0.09, 1400, 300, 0.06, 0.8);
  }
  clear(n: number, tspin: number) {
    // içeri derin nefes + damlacıklar
    this.breath(0.38 + 0.12 * n, 300, 1300 + 350 * n, 0.1 + 0.025 * n, 1.1);
    for (let i = 0; i < 2 + n * 2; i++)
      this.tone(800 + Math.random() * 700, 0.09, 'sine', 0.045, 260, 0.06 + i * 0.045);
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
  syn() {
    this.breath(0.35, 3000, 900, 0.14, 2.5);
    this.tone(900, 0.12, 'square', 0.03, 1800);
  }
  warn() {
    this.tone(220, 0.25, 'triangle', 0.08, 180);
    this.tone(208, 0.25, 'triangle', 0.08, 170, 0.2);
  }
  level() {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, 0, i * 0.07));
  }
  over() {
    this.tone(330, 0.7, 'triangle', 0.12, 82);
    this.breath(0.9, 900, 160, 0.06, 0.7);
  }

  startMusic(): void {
    const a = this.audio;
    if (!a || this.musicOn) return;
    this.musicOn = true;
    const ctx = a.ctx,
      t = ctx.currentTime;
    a.mus.gain.cancelScheduledValues(t);
    a.mus.gain.setTargetAtTime(0.32, t, 1.2);
    if (!this.pad) {
      // rüzgâr / nefes: filtrelenmiş gürültü + yavaş LFO
      const n = ctx.createBufferSource();
      n.buffer = a.noise;
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = ctx.createGain();
      lg.gain.value = 260;
      lfo.connect(lg);
      lg.connect(bp.frequency);
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 0.07;
      const lg2 = ctx.createGain();
      lg2.gain.value = 0.035;
      lfo2.connect(lg2);
      lg2.connect(ng.gain);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(a.mus);
      n.start();
      lfo.start();
      lfo2.start();
      // yumuşak pad
      const padLP = ctx.createBiquadFilter();
      padLP.type = 'lowpass';
      padLP.frequency.value = 900;
      padLP.connect(a.mus);
      this.pad = padLP;
      this.chordIdx = 0;
    }
    const pad = this.pad;
    const chords = [
      [220, 277.2, 329.6],
      [196, 246.9, 293.7],
      [174.6, 220, 261.6],
      [196, 246.9, 329.6],
    ];
    const play = () => {
      if (!this.musicOn) return;
      const c = chords[this.chordIdx++ % chords.length],
        t0 = ctx.currentTime;
      c.forEach((f) => {
        for (let d = -1; d <= 1; d += 2) {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          o.detune.value = d * 6;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.03, t0 + 2.5);
          g.gain.linearRampToValueAtTime(0.0001, t0 + 8.5);
          o.connect(g);
          g.connect(pad);
          o.start(t0);
          o.stop(t0 + 8.6);
        }
      });
    };
    play();
    this.musTimer = setInterval(play, 7000);
  }
  stopMusic(): void {
    const a = this.audio;
    if (!a || !this.musicOn) return;
    this.musicOn = false;
    clearInterval(this.musTimer);
    a.mus.gain.cancelScheduledValues(a.ctx.currentTime);
    a.mus.gain.setTargetAtTime(0, a.ctx.currentTime, 0.4);
  }
  setMusic(want: boolean): void {
    this.wantMusic = want;
    this.applySettings();
  }
}
