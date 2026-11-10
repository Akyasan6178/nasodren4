/* =====================================================================
   NS4-44 · VİRÜS AVI saf kuralları (durumsuz; VirusGame bunları çağırır).
   - Renksiz 4'lü: bir sırada ya da sütunda kesintisiz 4+ dolu hücre
     (kapsül yarısı ya da virüs) silinir; renk/tür fark etmez.
   - Düşme: virüs hiç düşmez; bağlı kapsül birlikte düşer (yatay: iki
     yarının da altı boşsa; dikey: alt yarının altı boşsa); tek yarı
     kendi başına düşer. Her çağrı en çok bir sıra düşürür.
   ===================================================================== */
import { COLS, VIS } from '../config/gameConfig';
import { levelParams } from './config';

export const EMPTY = 0,
  CAPSULE = 1,
  VIRUS = 2;

/** link: eş yarının yönü (0 yukarı, 1 sağ, 2 aşağı, 3 sol), -1 eş yok. */
export interface Grid {
  readonly kind: Uint8Array;
  readonly tint: Uint8Array;
  readonly link: Int8Array;
}

const DX = [0, 1, 0, -1] as const,
  DY = [-1, 0, 1, 0] as const;

export function newGrid(): Grid {
  return {
    kind: new Uint8Array(COLS * VIS),
    tint: new Uint8Array(COLS * VIS),
    link: new Int8Array(COLS * VIS).fill(-1),
  };
}

export function clearGrid(g: Grid): void {
  g.kind.fill(EMPTY);
  g.tint.fill(0);
  g.link.fill(-1);
}

/** Yön d'deki komşu hücrenin indeksi. */
export function neighbor(i: number, d: number): number {
  const x = (i % COLS) + (DX[d] ?? 0),
    y = Math.floor(i / COLS) + (DY[d] ?? 0);
  return y * COLS + x;
}

/** Kesintisiz 4+ dolu hücre dizilerindeki bütün indeksler (artan, tekrarsız). */
export function findRuns(g: Grid): number[] {
  const hit = new Uint8Array(COLS * VIS);
  const scan = (len: number, at: (k: number) => number) => {
    let run = 0;
    for (let k = 0; k <= len; k++) {
      if (k < len && g.kind[at(k)] !== EMPTY) run++;
      else {
        if (run >= 4) for (let j = k - run; j < k; j++) hit[at(j)] = 1;
        run = 0;
      }
    }
  };
  for (let y = 0; y < VIS; y++) scan(COLS, (x) => y * COLS + x);
  for (let x = 0; x < COLS; x++) scan(VIS, (y) => y * COLS + x);
  const out: number[] = [];
  for (let i = 0; i < hit.length; i++) if (hit[i]) out.push(i);
  return out;
}

/** Hücreleri siler; eş yarıların bağını koparır. Silinen virüsleri döndürür. */
export function removeCells(g: Grid, idx: readonly number[]): { viruses: { i: number; type: number }[] } {
  const viruses: { i: number; type: number }[] = [];
  for (const i of idx) {
    const kind = g.kind[i];
    if (kind === VIRUS) viruses.push({ i, type: g.tint[i] ?? 0 });
    const d = g.link[i] ?? -1;
    if (kind === CAPSULE && d >= 0) g.link[neighbor(i, d)] = -1;
    g.kind[i] = EMPTY;
    g.tint[i] = 0;
    g.link[i] = -1;
  }
  return { viruses };
}

function moveDown(g: Grid, i: number): void {
  const j = i + COLS;
  g.kind[j] = g.kind[i] ?? EMPTY;
  g.tint[j] = g.tint[i] ?? 0;
  g.link[j] = g.link[i] ?? -1;
  g.kind[i] = EMPTY;
  g.tint[i] = 0;
  g.link[i] = -1;
}

/** Tek düşme adımı (alttan yukarı, her hücre en çok bir sıra). Bir şey düştüyse true. */
export function fallStep(g: Grid): boolean {
  let moved = false;
  const free = (i: number) => i < COLS * VIS && g.kind[i] === EMPTY;
  for (let y = VIS - 2; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (g.kind[i] !== CAPSULE) continue;
      const d = g.link[i] ?? -1;
      if (d === -1) {
        if (free(i + COLS)) {
          moveDown(g, i);
          moved = true;
        }
      } else if (d === 1) {
        const p = i + 1;
        if (free(i + COLS) && free(p + COLS)) {
          moveDown(g, i);
          moveDown(g, p);
          moved = true;
        }
      } else if (d === 0) {
        // alt yarı (eşi yukarıda): alt boşsa önce kendisi, sonra eşi iner
        if (free(i + COLS)) {
          moveDown(g, i);
          moveDown(g, i - COLS);
          moved = true;
        }
      }
      // d === 3 (eşi solda) ve d === 2 (eşi aşağıda) eşleriyle birlikte işlenir
    }
  }
  return moved;
}

/** (x, y) hücresinden geçen sıra ya da sütunda kesintisiz dolu uzunluk ≥ 4 mü? */
function makesRun(g: Grid, x: number, y: number): boolean {
  const filled = (cx: number, cy: number) => cx >= 0 && cx < COLS && cy >= 0 && cy < VIS && g.kind[cy * COLS + cx] !== EMPTY;
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
  ] as const) {
    let n = 1;
    for (let k = 1; filled(x + dx * k, y + dy * k); k++) n++;
    for (let k = 1; filled(x - dx * k, y - dy * k); k++) n++;
    if (n >= 4) return true;
  }
  return false;
}

/** Bölümün virüslerini alt bölgeye yerleştirir (başlangıçta 4'lü yok). Yerleştirilen sayıyı döndürür. */
export function placeViruses(g: Grid, level: number, rnd: () => number): number {
  const { count, maxHeight } = levelParams(level);
  const top = VIS - maxHeight;
  let placed = 0;
  for (let n = 0; n < count; n++) {
    for (let tries = 0; tries < 2000; tries++) {
      const x = Math.floor(rnd() * COLS),
        y = top + Math.floor(rnd() * maxHeight);
      const i = y * COLS + x;
      if (g.kind[i] !== EMPTY) continue;
      g.kind[i] = VIRUS;
      if (makesRun(g, x, y)) {
        g.kind[i] = EMPTY;
        continue;
      }
      g.tint[i] = n % 3;
      g.link[i] = -1;
      placed++;
      break;
    }
  }
  return placed;
}
