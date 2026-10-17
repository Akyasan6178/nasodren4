/* =====================================================================
   INPUT: klavye (DAS/ARR) + dokunmatik jestler + HUD butonları + otomatik mola
   NS4-03: main.ts'ten taşındı. Tuşlar, eşikler (0.45 / 0.9 hücre, 320 ms,
   90 ms hız penceresi, 0.75 / -0.6 px/ms) ve tekrar kuralları değişmedi.
   Bağımlılıklar açıkça verilir; dispose() bağlanan bütün dinleyicileri kaldırır.
   ===================================================================== */
import type { Game } from '../game/Game';
import type { AppState } from '../types/app';
import type { Settings } from '../types/settings';
import { $, listen, type Off } from '../ui/dom';

export interface InputDeps {
  game: Game;
  /** Pixi canvas'ı (jestler yalnızca bunun üzerinde dinlenir). */
  canvas: HTMLCanvasElement;
  settings: Readonly<Pick<Settings, 'das' | 'arr'>>;
  getState: () => AppState;
  /** Güncel layout hücre boyutu (px). */
  getCell: () => number;
  pause: () => void;
  resume: () => void;
  unlockAudio: () => void;
}

type Gesture = { id: number; x0: number; y0: number; t0: number; cols: number; rows: number; axis: number; hist: number[][] };

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Space']);

export class InputController {
  dir = 0; left = false; right = false; dasT = 0; arrT = 0;
  private gesture: Gesture | null = null;
  private readonly offs: Off[] = [];
  private readonly deps: InputDeps;

  constructor(deps: InputDeps) {
    this.deps = deps;
    this.bindKeyboard();
    this.bindPointer();
    this.bindButtons();
    this.bindAutoPause();
  }

  reset() { this.dir = 0; this.left = this.right = false; this.deps.game.softDrop = false; this.gesture = null; }
  press(d: number) { this.dir = d; this.dasT = 0; this.arrT = 0; this.deps.game.move(d); }
  update(dt: number) {
    const game = this.deps.game, settings = this.deps.settings;
    if (!this.dir || game.state !== 'play') return;
    this.dasT += dt;
    if (this.dasT < settings.das) return;
    if (settings.arr === 0) { while (game.move(this.dir)); return; }
    this.arrT += dt;
    while (this.arrT >= settings.arr) { this.arrT -= settings.arr; if (!game.move(this.dir)) { this.arrT = 0; break; } }
  }

  /** Bağlanan bütün DOM dinleyicilerini kaldırır (yeniden başlatma / HMR için). */
  dispose() { for (const off of this.offs.splice(0)) off(); }

  private bindKeyboard() {
    const game = this.deps.game;
    this.offs.push(listen<KeyboardEvent>(window, 'keydown', (e) => {
      const appState = this.deps.getState();   // işleyici içinde durum değiştiren çağrılardan önce okunur
      if (KEYS.has(e.key) && appState === 'playing') e.preventDefault();
      if (appState === 'paused' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) { this.deps.resume(); return; }
      if (appState !== 'playing') return;
      if (e.repeat && e.key !== 'ArrowDown') return;
      this.deps.unlockAudio();
      switch (e.key) {
        case 'ArrowLeft': this.left = true; this.press(-1); break;
        case 'ArrowRight': this.right = true; this.press(1); break;
        case 'ArrowDown': game.softDrop = true; break;
        case 'ArrowUp': case 'x': case 'X': game.rotate(1); break;
        case 'z': case 'Z': case 'Control': game.rotate(-1); break;
        case ' ': game.hardDrop(); break;
        case 'c': case 'C': case 'Shift': game.doHold(); break;
        case '1': game.useCyc(); break;
        case '2': game.useSyn(); break;
        case 'Escape': case 'p': case 'P': this.deps.pause(); break;
      }
    }));
    this.offs.push(listen<KeyboardEvent>(window, 'keyup', (e) => {
      if (e.key === 'ArrowLeft') { this.left = false; this.dir = this.right ? 1 : 0; this.dasT = 0; }
      else if (e.key === 'ArrowRight') { this.right = false; this.dir = this.left ? -1 : 0; this.dasT = 0; }
      else if (e.key === 'ArrowDown') game.softDrop = false;
    }));
  }

  private bindPointer() {
    const game = this.deps.game, cv = this.deps.canvas;
    this.offs.push(listen<PointerEvent>(cv, 'pointerdown', (e) => {
      if (this.deps.getState() !== 'playing') return;
      this.deps.unlockAudio();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      this.gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), cols: 0, rows: 0, axis: 0, hist: [[e.clientX, e.clientY, performance.now()]] };
    }));
    this.offs.push(listen<PointerEvent>(cv, 'pointermove', (e) => {
      const g = this.gesture; if (!g || e.pointerId !== g.id || this.deps.getState() !== 'playing') return;
      const now = performance.now();
      g.hist.push([e.clientX, e.clientY, now]); if (g.hist.length > 6) g.hist.shift();
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0, c = this.deps.getCell();
      if (!g.axis) {
        if (Math.abs(dx) > c * 0.45 || Math.abs(dy) > c * 0.45) g.axis = Math.abs(dx) >= Math.abs(dy) ? 1 : 2;
        else return;
      }
      if (g.axis === 1) {
        const step = c * 0.9;
        const want = Math.trunc(dx / step);
        while (g.cols < want) { if (!game.move(1)) { g.cols = want; break; } g.cols++; }
        while (g.cols > want) { if (!game.move(-1)) { g.cols = want; break; } g.cols--; }
      } else if (dy > 0) {
        const want = Math.floor(dy / (c * 0.9));
        while (g.rows < want) { if (!game.softStep()) { g.rows = want; break; } g.rows++; }
      }
    }));
    const endGesture = (e: PointerEvent) => {
      const g = this.gesture; if (!g || e.pointerId !== g.id) return;
      this.gesture = null;
      if (this.deps.getState() !== 'playing') return;
      const now = performance.now(), dx = e.clientX - g.x0, dy = e.clientY - g.y0, c = this.deps.getCell();
      let ref = g.hist[0]; for (const h of g.hist) if (now - h[2] <= 90) { ref = h; break; }
      const vdt = Math.max(1, now - ref[2]), vy = (e.clientY - ref[1]) / vdt;
      if (!g.axis && now - g.t0 < 320) {
        const r = cv.getBoundingClientRect();
        game.rotate(e.clientX - r.left < r.width / 3 ? -1 : 1);
      } else if (g.axis === 2) {
        if (vy > 0.75 && dy > c * 1.2) game.hardDrop();
        else if (vy < -0.6 && dy < -c * 1.4) game.doHold();
      }
    };
    this.offs.push(listen<PointerEvent>(cv, 'pointerup', endGesture));
    this.offs.push(listen<PointerEvent>(cv, 'pointercancel', (e) => { if (this.gesture && e.pointerId === this.gesture.id) this.gesture = null; }));
  }

  private bindBtn(id: string, fn: () => unknown) {
    this.offs.push(listen<PointerEvent>($(id), 'pointerdown', (e) => { e.preventDefault(); this.deps.unlockAudio(); fn(); }));
    this.offs.push(listen<KeyboardEvent>($(id), 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(); } }));
  }

  private bindButtons() {
    const game = this.deps.game, playing = () => this.deps.getState() === 'playing';
    this.bindBtn('btn-hold', () => playing() && game.doHold());
    this.bindBtn('btn-cyc', () => playing() && game.useCyc());
    this.bindBtn('btn-syn', () => playing() && game.useSyn());
    this.bindBtn('btn-pause', () => playing() && this.deps.pause());
  }

  // sekme gizlenince/odak kaybında otomatik mola
  private bindAutoPause() {
    this.offs.push(listen(document, 'visibilitychange', () => { if (document.hidden) this.deps.pause(); }));
    this.offs.push(listen(window, 'blur', () => this.deps.pause()));
  }
}
