/* =====================================================================
   PIECES + SRS: tetromino kimlikleri, şekiller ve duvar tekmesi tabloları
   NS4-03: main.ts'ten taşındı; koordinatlar ve tablolar değişmedi.
   ===================================================================== */
// type ids: 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L, 8 garbage (inflamasyon)
// Tahta (Uint8Array) bu sayısal değerleri saklar; 0 boş, 9 yalnızca Game.cell() sınır dışı sentinel'i.
import type {
  BlockId,
  KickTable,
  PieceRotations,
  RotationDirection,
  RotationState,
  RotationTransition,
  TetrominoType,
} from '../types/game';

export const PIECE = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7, GARBAGE: 8 } as const satisfies Readonly<
  Record<string, BlockId>
>;

// prettier-ignore
export const SHAPES: Readonly<Record<TetrominoType, PieceRotations>> = {
  1: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
  2: [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]],
  3: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
  4: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
  5: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
  6: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
  7: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]]
};
// SRS kick tabloları (wiki: +y yukarı). Uygularken y ters çevrilir.
// prettier-ignore
export const KICK_JLSTZ: KickTable = {
  '01': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], '10': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '12': [[0,0],[1,0],[1,-1],[0,2],[1,2]],     '21': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '23': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],    '32': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '30': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  '03': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};
// prettier-ignore
export const KICK_I: KickTable = {
  '01': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]], '10': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '12': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]], '21': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '23': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]], '32': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '30': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]], '03': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

/** Bir sonraki rotasyon durumu: (rot + dir + 4) & 3 her zaman 0..3 üretir. */
export function nextRotation(rot: RotationState, dir: RotationDirection): RotationState {
  return ((rot + dir + 4) & 3) as RotationState;
}

/** SRS tekme tablosu anahtarı. dir yalnızca ±1 olduğu için from→to her zaman komşu bir geçiştir. */
export function kickKey(from: RotationState, to: RotationState): RotationTransition {
  return ('' + from + to) as RotationTransition;
}
