// Oyun motoru domain tipleri (NS4-04). Yalnızca derleme zamanında vardır; runtime değerleri
// (tahtadaki sayılar, durum dizeleri) NS4-01 davranış referansıyla aynıdır.
// NS4-09: bölüm (sinüs) modu için tıkanıklık (9) ve mikrop (10) hücreleri, 'won' durumu eklendi.

/** Tetrominolar: 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L. */
export type TetrominoType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Çöp (inflamasyon) hücresi. */
export type GarbageCell = 8;
/** Bölüm başında sinüsü dolduran yapışkan mukus tıkacı. */
export type ClogCell = 9;
/** İçinde mikrop olan tıkaç hücresi (temizlenince bonus). */
export type GermCell = 10;
/** Dokusu ve rengi olan her hücre değeri. */
export type BlockId = TetrominoType | GarbageCell | ClogCell | GermCell;
/** Tahta (Uint8Array) hücresi: 0 boş. */
export type CellValue = 0 | BlockId;
/** Aktif / bekletilen parça: 0 = yok. */
export type PieceSlot = TetrominoType | 0;

export type RotationState = 0 | 1 | 2 | 3;
/** Tek adım: yatay hareket (-1 sol, 1 sağ) veya rotasyon yönü (-1 CCW, 1 CW). */
export type Step = 1 | -1;
export type RotationDirection = Step;
/** SRS geçiş anahtarı ('01' = 0'dan 1'e). */
export type RotationTransition = '01' | '10' | '12' | '21' | '23' | '32' | '30' | '03';

/** [x, y] hücre ofseti (şekil) veya tekme ofseti. */
export type Offset = readonly [x: number, y: number];
export type PieceShape = readonly [Offset, Offset, Offset, Offset];
export type PieceRotations = readonly [PieceShape, PieceShape, PieceShape, PieceShape];
export type KickTable = Readonly<Record<RotationTransition, readonly Offset[]>>;

/** Game.state: 'idle' yalnızca sayfa açılışında, ilk start() öncesindedir. 'won': bölümün bütün tıkacı temizlendi. */
export type GameState = 'idle' | 'play' | 'clearing' | 'draining' | 'over' | 'won';
/** Oyun modu: sinüs haritasındaki bölümler veya sonsuz serbest oyun. */
export type GameMode = 'adventure' | 'endless';

/** Bir bölümün (sinüs aşaması) motor tanımı. Metinler content/stages.ts içindedir. */
export interface StageRules {
  /** Alttan tıkaçla dolu satır sayısı. */
  readonly rows: number;
  /** Her tıkaç satırındaki boşluk sayısı (boşluklar yan yana: kuyu genişliği). */
  readonly holes: number;
  /** Tıkaç içine yerleştirilen mikrop sayısı. */
  readonly germs: number;
  /** Sabit hız seviyesi (bölüm içinde seviye atlanmaz). */
  readonly speed: number;
  /** 3 yıldız için en fazla parça. */
  readonly par: number;
  /** Tıkaç yerleşimi tohumu (bölüm her denemede aynıdır). */
  readonly seed: number;
  /** Bu bölümde açık güçler. */
  readonly cyc: boolean;
  readonly syn: boolean;
  /** Sıklamen gücünün başlangıç şarjı (0..1). */
  readonly charge: number;
}
export type GameOverReason = 'blockout' | 'lockout' | 'overlap' | 'garbage';
/** 'lines' satır temizleme, 'cyc' sıklamen özütü, 'syn' sentetik açıcı. */
export type PendingClearKind = 'lines' | 'cyc' | 'syn';
export type PowerupKind = Exclude<PendingClearKind, 'lines'>;
/** 0 yok, 1 mini, 2 tam T-spin. */
export type TSpinKind = 0 | 1 | 2;
