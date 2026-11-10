/* =====================================================================
   NS4-44 ek · VİRÜS AVI sahnesi: laboratuvar beheri çerçevesi, tahtanın
   üstündeki damlalık ve sağ üstteki Doktor Elif.
   - Elif "Sıradaki" panelinin yerindedir; sıradaki kapsül kaldırdığı
     işaret parmağının ucunda durur (çizim VirusView'de, konum burada).
   - Yeni kapsül gerekince parmaktan damlalığa yay çizerek zıplar
     (FLIGHT_IN_MS), damlalık sıkışır, kapsül ucundan tahtaya girer
     (FLIGHT_OUT_MS). Yalnızca görsel: oyun zamanlaması değişmez.
   - Bölüm temizlenince Elif alkışlar, son 15 saniyede telaşlanır.
   ===================================================================== */
import { $, place } from '../ui/dom';
import type { Layout, Pt, Rect } from '../types/layout';
import { ELIF_FINGER, ELIF_VIEW, NARRATOR, type ElifPose } from './elif';
import type { VirusState } from './VirusGame';

/** Parmak → damlalık ağzı uçuşu ve damlalık ucundan tahtadaki yerine iniş (ms). */
export const FLIGHT_IN_MS = 260;
export const FLIGHT_OUT_MS = 140;
/** Damlalık sıkışması süresi (ms). */
export const SQUEEZE_MS = 220;

export interface SideElifInput {
  readonly state: VirusState;
  readonly warn?: boolean;
}

/**
 * Elif'in pozu: bölüm sonunda alkış; oyun sonu/boşta bekler (boş parmak kaldırmaz); son saniyelerde kapsülü
 * bırakmadan telaşlanır; aksi hâlde sıradaki kapsülü parmağında tutar.
 */
export function sideElifPose(i: SideElifInput): ElifPose {
  if (i.state === 'levelclear') return 'alkis';
  if (i.state === 'over' || i.state === 'idle') return 'bekle';
  return i.warn ? 'telas' : 'tut';
}

/** Sağ üst: yatayda Sıradaki panelinin yerinden süre kartının üstüne kadar; portrede Sıradaki karesi. */
export function elifSideRect(L: Layout): Rect {
  if (L.portrait) return L.next;
  return { x: L.next.x, y: L.next.y, w: L.next.w, h: L.cong.y - 12 - L.next.y };
}

/** Elif çiziminin kutudaki yeri (altta ortalı, en-boy oranı korunur; CSS `.virus-elif-side svg`). */
function elifBox(L: Layout): { left: number; top: number; scale: number } {
  const r = elifSideRect(L);
  const scale = Math.min(r.h / ELIF_VIEW.h, r.w / ELIF_VIEW.w);
  return { left: r.x + (r.w - ELIF_VIEW.w * scale) / 2, top: r.y + r.h - ELIF_VIEW.h * scale, scale };
}

/** Sıradaki kapsülün oturduğu parmak ucu (ekran koordinatı). */
export function fingerPoint(L: Layout): Pt {
  const b = elifBox(L);
  return { x: b.left + ELIF_FINGER.x * b.scale, y: b.top + ELIF_FINGER.y * b.scale };
}

function dropperRect(L: Layout): Rect {
  const w = Math.round(L.cell * 1.3),
    h = Math.round(w * 1.5);
  const y = L.portrait
    ? Math.max(L.board.y - h * 0.55, L.cong.y + L.cong.h + 2) // portrede süre kartının altında kalmasın
    : Math.max(0, L.board.y - h * 0.55);
  return { x: L.board.x + L.board.w / 2 - w / 2, y, w, h };
}

/** Damlalığın ağzı (hazne üstü) ve ucu (viewBox 40×60: hazne üstü y≈4, uç y≈56). */
export function dropperPoints(L: Layout): { readonly top: Pt; readonly tip: Pt } {
  const d = dropperRect(L);
  const cx = d.x + d.w / 2;
  return { top: { x: cx, y: d.y + (d.h * 4) / 60 }, tip: { x: cx, y: d.y + (d.h * 56) / 60 } };
}

/** Beher: tahtanın çevresinde cam duvar, sol üstte ağız çıkıntısı, sağda ölçü çizgileri (px ölçülü SVG). */
function beakerSvg(w: number, h: number, m: number, cell: number): string {
  const r = Math.min(w, h) * 0.12;
  const x0 = m,
    x1 = w - m,
    y0 = m * 0.4,
    y1 = h - m * 0.5;
  const lip = m * 1.1;
  const wall =
    `M${x0 - lip} ${y0 - m * 0.2}` +
    `Q${x0} ${y0} ${x0} ${y0 + m}` +
    `L${x0} ${y1 - r}Q${x0} ${y1} ${x0 + r} ${y1}` +
    `L${x1 - r} ${y1}Q${x1} ${y1} ${x1} ${y1 - r}` +
    `L${x1} ${y0 + m * 0.4}Q${x1} ${y0} ${x1 + m * 0.5} ${y0 - m * 0.1}`;
  const marks: string[] = [];
  for (let k = 2; k < 20; k += 2) {
    const y = y0 + m + (k * (y1 - y0 - m)) / 20;
    const len = k % 4 === 0 ? cell * 0.9 : cell * 0.5;
    marks.push(`<line class="bk-mark" x1="${x1 - 4}" y1="${y}" x2="${x1 - 4 - len}" y2="${y}"/>`);
  }
  const shine = `M${x0 + m * 0.5} ${y0 + m * 2.2}L${x0 + m * 0.5} ${y1 - r * 1.4}`;
  return (
    `<svg viewBox="0 0 ${w} ${h}" focusable="false">` +
    `<path class="bk-edge" d="${wall}"/><path class="bk-glass" d="${wall}"/>` +
    marks.join('') +
    `<path class="bk-shine" d="${shine}"/></svg>`
  );
}

export interface VirusStage {
  layout(L: Layout): void;
  /** Her kare (Virüs Avı açıkken): Elif pozu ve son saniyelerde telaş. */
  sync(i: SideElifInput): void;
  /** Yeni kapsül doğdu: kapsül damlalığa varınca (hareketi azaltta hemen) damlalık sıkışır. */
  onSpawn(reducedMotion: boolean): void;
}

export function createVirusStage(): VirusStage {
  let pose: ElifPose | undefined;
  let squeeze: ReturnType<typeof setTimeout> | undefined;
  let arrive: ReturnType<typeof setTimeout> | undefined;
  const squeezeNow = () => {
    const d = $('virus-dropper');
    d.classList.add('is-squeeze');
    clearTimeout(squeeze);
    squeeze = setTimeout(() => d.classList.remove('is-squeeze'), SQUEEZE_MS);
  };
  return {
    layout(L) {
      const m = Math.round(L.cell * 0.55);
      const r = { x: L.board.x - m, y: L.board.y - m * 0.6, w: L.board.w + m * 2, h: L.board.h + m * 1.2 };
      const bk = $('virus-beaker');
      place(bk, r);
      bk.innerHTML = beakerSvg(r.w, r.h, m, L.cell);
      place($('virus-dropper'), dropperRect(L));
      place($('virus-elif-side'), elifSideRect(L));
    },
    sync(i) {
      const el = $('virus-elif-side');
      el.hidden = false;
      const p = sideElifPose(i);
      if (p === pose) return;
      pose = p;
      el.dataset['pose'] = p;
      el.innerHTML = NARRATOR.svg(p);
    },
    onSpawn(reducedMotion) {
      clearTimeout(arrive);
      if (reducedMotion) squeezeNow();
      else arrive = setTimeout(squeezeNow, FLIGHT_IN_MS);
    },
  };
}
