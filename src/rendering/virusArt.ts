/* =====================================================================
   NS4-45 · virüs hücresi dokusu. Dalgayla düşen virüsler tahtada gri
   hücre gibi davranır (board değeri gri, kaynak ORIGIN.virus + tür); bu
   doku onların görünüşüdür: yalnızca kullanıcının virüs görseli
   (public/images/virus/virus-1..3.webp; tür 0 yeşil, 1 kırmızı, 2 sarı),
   arkasında kare zemin yok: virüs bloğa yapışık değil tek başına görünür
   (kullanıcı isteği 2026-11-13). Görsel yüklenmezse yuvarlak + iki göz.
   ===================================================================== */
import { context2d, loadImage, shade } from './textures';
import { VIRUS_KINDS } from '../game/sinusAttack';

export const VIRUS_ART_URLS = Array.from(
  { length: VIRUS_KINDS },
  (_, i) => `${import.meta.env.BASE_URL}images/virus/virus-${i + 1}.webp`,
);
/** Görsel yüklenmeden önce yedek renkler (tür sırasıyla). */
export const VIRUS_FALLBACK = ['#3fae5f', '#d93a3a', '#f2c230'] as const;
/** Virüs görselinin hücreye oranı (zemin yok; görsel saydam arka planlı). */
export const VIRUS_CELL = { art: 1.04 } as const;

/** Üç virüs görseli; biri bile yüklenemezse (ya da ortamda Image yoksa) null: yedek çizim kullanılır. */
export async function loadVirusArt(): Promise<HTMLImageElement[] | null> {
  if (typeof Image === 'undefined') return null;
  try {
    return await Promise.all(VIRUS_ART_URLS.map((u) => loadImage(u)));
  } catch {
    return null;
  }
}

/** `px` boyutunda virüs hücresi (saydam zemin üstünde görsel ya da yedek çizim). */
export function createVirusCellCanvas(px: number, kind: number, img: HTMLImageElement | null): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const x = context2d(cv);
  if (img && img.width > 0) {
    const s = px * VIRUS_CELL.art,
      k = s / Math.max(img.width, img.height),
      w = img.width * k,
      h = img.height * k;
    x.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
    return cv;
  }
  const c = VIRUS_FALLBACK[kind] ?? VIRUS_FALLBACK[0];
  x.fillStyle = c;
  x.strokeStyle = shade(c, -0.45);
  x.lineWidth = Math.max(1, px * 0.06);
  x.beginPath();
  x.arc(px / 2, px / 2, px * 0.36, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#ffffff';
  for (const ex of [0.39, 0.61]) {
    x.beginPath();
    x.arc(px * ex, px * 0.46, px * 0.085, 0, Math.PI * 2);
    x.fill();
  }
  return cv;
}
