/* =====================================================================
   DOKUNMATİK JEST TAKİBİ (NS4-13)
   Saf, DOM bilmeyen jest durum makinesi. Zaman, pointer olayının
   timeStamp'inden gelir (testlerde deterministik). Mesafeler ve hızlar hücre
   (L.cell) cinsindendir: aynı jest her ekran ölçeğinde aynı sonucu verir.
   Eylemler dışarıdan verilir.

   Kurallar:
   - Eksen kilidi: başlangıçtan 0,45 hücre uzaklaşınca baskın eksen kilitlenir
     ve jest sonuna kadar değişmez.
   - Yatay: her 0,9 hücre bir sütun (başlangıca göre; duvarda sayaç eşitlenir).
   - Dikey aşağı: her 0,9 hücre bir yavaş indirme satırı.
   - Dokunma (döndürme): eksen kilitlenmemiş, en fazla 0,3 hücre oynama,
     en fazla 300 ms, tek parmak. 0,3–0,45 hücre arası titreşim yok sayılır.
   - Fırlatma (bırakışta): son 100 ms'deki hız ve mesafe + toplam mesafe.
     Aşağı: hız ≥ 0,030 hücre/ms (32 px hücrede 0,96 px/ms), son 100 ms'de
     ≥ 1,5 hücre, toplam ≥ 2 hücre → hard drop.
     Yukarı: hız ≥ 0,028 hücre/ms (32 px hücrede 0,9 px/ms), son 100 ms'de
     ≥ 1,5 hücre, toplam ≥ 2 hücre → hold.
   - Jest başına en fazla bir özel eylem (dokunma / hard drop / hold).
   - Jest sürerken gelen ikinci parmak yok sayılır ve jestin dokunma/fırlatma
     sonucunu iptal eder (o ana kadar yapılan kaydırma/indirme kalır).
   - Bırakış noktası son hareket olarak işlenir: ara pointermove gelmese de
     hızlı kaydırma dokunma sayılmaz.
   ===================================================================== */
import type { RotationDirection, Step } from '../types/game';

export const GESTURE = {
  /** Eksen kilidi eşiği (hücre). */
  axisLock: 0.45,
  /** Dokunmada izin verilen en fazla oynama (hücre). */
  tapSlop: 0.3,
  /** Dokunmanın en uzun süresi (ms). */
  tapMaxMs: 300,
  /** Yatay sütun ve yavaş indirme satırı adımı (hücre). */
  step: 0.9,
  /** Fırlatma hızı ölçüm penceresi (ms). */
  flickWindowMs: 100,
  /** Hızlar hücre/ms. */
  hardVy: 0.03,
  hardRecent: 1.5,
  hardTotal: 2,
  holdVy: 0.028,
  holdRecent: 1.5,
  holdTotal: 2,
} as const;

export interface GestureActions {
  move(d: Step): boolean;
  softStep(): boolean;
  rotate(dir: RotationDirection): void;
  hardDrop(): void;
  hold(): void;
  /** Yavaş indirme satırı uygulandığında (öğretici bildirimi). */
  onSoftDrop?(): void;
}

export type GestureResult = 'tap' | 'hard' | 'hold' | null;

type Sample = readonly [x: number, y: number, t: number];

interface Active {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  readonly t0: number;
  cols: number;
  rows: number;
  /** 0 henüz yok, 1 yatay, 2 dikey. */
  axis: 0 | 1 | 2;
  /** Başlangıçtan en büyük uzaklık (px). */
  maxDist: number;
  /** Jest sırasında ikinci bir parmak geldi. */
  multi: boolean;
  readonly hist: Sample[];
}

export class GestureTracker {
  private g: Active | null = null;

  constructor(private readonly actions: GestureActions) {}

  get active(): boolean {
    return this.g !== null;
  }
  get pointerId(): number | null {
    return this.g ? this.g.id : null;
  }

  /** Yeni jest. Bir jest sürerken çağrılırsa ikinci parmak sayılır: yok sayılır ve sonuç iptal edilir. */
  start(id: number, x: number, y: number, t: number): boolean {
    if (this.g) {
      if (id !== this.g.id) this.g.multi = true;
      return false;
    }
    this.g = { id, x0: x, y0: y, t0: t, cols: 0, rows: 0, axis: 0, maxDist: 0, multi: false, hist: [[x, y, t]] };
    return true;
  }

  move(id: number, x: number, y: number, t: number, cell: number): void {
    const g = this.g;
    if (!g || id !== g.id) return; // aktif pointer dışındaki hareketler yok sayılır
    g.hist.push([x, y, t]);
    if (g.hist.length > 12) g.hist.shift();
    const dx = x - g.x0,
      dy = y - g.y0;
    g.maxDist = Math.max(g.maxDist, Math.hypot(dx, dy));
    if (!g.axis) {
      const lock = cell * GESTURE.axisLock;
      if (Math.abs(dx) > lock || Math.abs(dy) > lock) g.axis = Math.abs(dx) >= Math.abs(dy) ? 1 : 2;
      else return;
    }
    const step = cell * GESTURE.step;
    // tam adım katlarında kayan nokta hatası (ör. 2,7 / 0,9 = 2,999…) sütun kaybettirmesin
    const steps = (d: number) => (d / step) * (1 + 1e-9);
    if (g.axis === 1) {
      const want = Math.trunc(steps(dx));
      while (g.cols < want) {
        if (!this.actions.move(1)) {
          g.cols = want;
          break;
        }
        g.cols++;
      }
      while (g.cols > want) {
        if (!this.actions.move(-1)) {
          g.cols = want;
          break;
        }
        g.cols--;
      }
    } else if (dy > 0) {
      const want = Math.floor(steps(dy));
      while (g.rows < want) {
        if (!this.actions.softStep()) {
          g.rows = want;
          break;
        }
        g.rows++;
        this.actions.onSoftDrop?.();
      }
    }
  }

  /**
   * Jesti bitirir. Bırakış noktası önce son hareket olarak işlenir; sonra en fazla bir özel eylem uygulanır.
   * `rotateDir`: dokunmada kullanılacak yön (çağıran ekranın sol üçte birine göre belirler).
   */
  end(id: number, x: number, y: number, t: number, cell: number, rotateDir: RotationDirection): GestureResult {
    const g = this.g;
    if (!g || id !== g.id) return null;
    this.move(id, x, y, t, cell);
    this.g = null;
    if (g.multi) return null;
    if (!g.axis && g.maxDist <= cell * GESTURE.tapSlop && t - g.t0 <= GESTURE.tapMaxMs) {
      this.actions.rotate(rotateDir);
      return 'tap';
    }
    if (g.axis !== 2) return null;
    let ref = g.hist[0] ?? [g.x0, g.y0, g.t0];
    for (const h of g.hist)
      if (t - h[2] <= GESTURE.flickWindowMs) {
        ref = h;
        break;
      }
    const recent = y - ref[1],
      vy = recent / Math.max(1, t - ref[2]) / cell,
      total = y - g.y0;
    if (vy >= GESTURE.hardVy && recent >= cell * GESTURE.hardRecent && total >= cell * GESTURE.hardTotal) {
      this.actions.hardDrop();
      return 'hard';
    }
    if (vy <= -GESTURE.holdVy && -recent >= cell * GESTURE.holdRecent && -total >= cell * GESTURE.holdTotal) {
      this.actions.hold();
      return 'hold';
    }
    return null;
  }

  /** Aktif jesti sonuçsuz bırakır (pointercancel, odak kaybı, pause, resize). */
  cancel(): void {
    this.g = null;
  }
}
