// computeLayout() sonucunun tipi: Pixi görünümü ve DOM HUD yerleşimi bu veriyi paylaşır.
export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

export interface Layout {
  W: number; H: number; portrait: boolean; cell: number; mini: number; miniBig: number;
  board: Rect; meter: Rect; hold: Rect; next: Rect; stats: Rect;
  btnHold: Rect; btnCyc: Rect; btnSyn: Rect; btnPause: Rect;
  holdSlot: Pt; nextSlots: Pt[]; compactBtns: boolean; compactStats: boolean;
}
