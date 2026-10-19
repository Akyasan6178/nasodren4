// NS4-09: bölüm başı tıkaç yerleşimi (saf). Alttan `rows` satır yapışkan mukusla dolar; her satırda `holes`
// boşluk kalır. Boşluklar 2-4 satır boyunca aynı sütunda durur ("kuyu"), sonra yer değiştirir: rastgele dağınık
// boşluklar sıradan oyuncu için fazla zordu (bkz. NS4-09 belgesi, kalibrasyon). Mikroplar üst tıkaç
// satırlarına öncelikle yerleşir: oyuncu onları baştan görür. Yerleşim tohumludur: bölüm her denemede aynıdır.
import { COLS, ROWS } from '../config/gameConfig';
import { mulberry32 } from './rng';
import type { StageRules } from '../types/game';

export const CLOG = 9,
  GERM = 10;

export function buildClog(board: Uint8Array, r: StageRules): void {
  const rand = mulberry32(r.seed);
  const rows = Math.min(r.rows, ROWS - 6);
  const clogCells: number[] = [];
  // boşluklar 2-4 satırlık hizalı "kuyular" halinde: dikey bir parça birkaç satırı birden açar
  let holes = new Set<number>();
  let run = 0;
  for (let k = 0; k < rows; k++) {
    const y = ROWS - 1 - k;
    if (run <= 0) {
      const prev = holes;
      holes = new Set<number>();
      // boşluklar yan yana: 2 hücrelik kuyuya O, L, J, I gibi birçok parça girer (1 hücrelik yalnızca I)
      while (holes.size === 0 || [...holes].some((h) => prev.has(h))) {
        const h0 = (rand() * (COLS - r.holes + 1)) | 0;
        holes = new Set(Array.from({ length: r.holes }, (_, j) => h0 + j));
      }
      run = 2 + ((rand() * 3) | 0);
    }
    run--;
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      board[i] = holes.has(x) ? 0 : CLOG;
      if (!holes.has(x)) clogCells.push(i);
    }
  }
  // mikroplar: üstten başlayarak (indeks küçükten büyüğe = üst satırlar önce), satır başına en fazla 2
  const perRow = new Map<number, number>();
  const sorted = clogCells.sort((a, b) => a - b);
  let placed = 0;
  for (let pass = 0; pass < 4 && placed < r.germs; pass++)
    for (const i of sorted) {
      if (placed >= r.germs) break;
      const y = (i / COLS) | 0;
      if (board[i] === GERM || (perRow.get(y) ?? 0) >= 2 || rand() > 0.22) continue;
      board[i] = GERM;
      perRow.set(y, (perRow.get(y) ?? 0) + 1);
      placed++;
    }
}
