/* =====================================================================
   NS4-44 · VİRÜS AVI dokuları: kapsül yarıları (jöle dili, textures.ts
   ile aynı) ve virüs görselleri (tools/viruses çıktısı). Kapsül renkleri
   yalnızca görünüştür; kurala etkisi yoktur. Kırmızı/sarı/mavi üçlüsü
   kullanılmaz: pembe, leylak, turkuaz, şeftali.
   ===================================================================== */
import { context2d, loadImage, shade } from '../rendering/textures';

export const CAPSULE_COLORS = [0xe05a9c, 0x9b7fd0, 0x2fb8ad, 0xf2a07b] as const;
/** Görüntü yüklenmeden önce virüs hücresinin yedek rengi (tür 0 yeşil, 1 kırmızı, 2 sarı). */
export const VIRUS_FALLBACK = [0x3fae5f, 0xd93a3a, 0xf2c230] as const;
export const VIRUS_ART_URLS = [1, 2, 3].map((n) => `${import.meta.env.BASE_URL}images/virus/virus-${n}.webp`);

/** NS4-44 ek: kollu bacaklı animasyon şeridi (tools/viruses/sheet.py): 6 kare, kare boyu 192 px. */
export const VIRUS_SHEET_URLS = [1, 2, 3].map((n) => `${import.meta.env.BASE_URL}images/virus/virus-${n}-sheet.webp`);
export const VIRUS_FRAMES = 6;
export const VIRUS_FRAME_PX = 192;
/** Şeritte gövdenin kare içindeki oranı (gövde 128 / kare 192): hücrede gövde aynı boyda kalsın diye. */
export const VIRUS_BODY_RATIO = 128 / 192;
export const VIRUS_DANCE = [0, 1, 2, 3] as const;
export const VIRUS_BLINK = 4;
export const VIRUS_FLINCH = 5;
/** Dans karesinin süresi (ms). */
export const VIRUS_DANCE_MS = 180;
const BLINK_MS = 130;

/**
 * O anki kare: her virüs kendi fazında dans eder (0-3) ve kendi aralığıyla göz kırpar (4).
 * Hareketi azaltta dans yok (kare 1), göz kırpma kalır.
 */
export function virusFrame(tMs: number, phase: number, reduced: boolean): number {
  const cycle = 2600 + (phase % 5) * 390;
  if ((tMs + phase * 977) % cycle < BLINK_MS) return VIRUS_BLINK;
  if (reduced) return 1;
  return VIRUS_DANCE[(Math.floor(tMs / VIRUS_DANCE_MS) + phase) % 4] ?? 1;
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

/**
 * Kapsül yarısı: `side` eşin bulunduğu yön (0 yukarı, 1 sağ, 2 aşağı, 3 sol); o kenar düz, diğerleri yuvarlak.
 * `-1`: eşi kopmuş tek yarı (yuvarlak hap).
 */
export function createCapsuleHalfCanvas(px: number, color: number, side: -1 | 0 | 1 | 2 | 3): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const x = context2d(cv);
  const c = hex(color);
  const ins = px * 0.06,
    w = px - ins * 2,
    R = w * 0.5,
    r = px * 0.08;
  // köşeler: sol üst, sağ üst, sağ alt, sol alt
  const flat: readonly (readonly number[])[] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];
  const rad = [R, R, R, R];
  if (side >= 0) for (const k of flat[side] ?? []) rad[k] = r;
  // düz kenar eşe kadar uzansın (iki yarı arasında boşluk kalmasın)
  const ext = [0, 0, 0, 0];
  if (side >= 0) ext[side] = ins;
  const x0 = ins - (ext[3] ?? 0),
    y0 = ins - (ext[0] ?? 0),
    x1 = px - ins + (ext[1] ?? 0),
    y1 = px - ins + (ext[2] ?? 0);
  const path = () => {
    const [tl = R, tr = R, br = R, bl = R] = rad;
    x.beginPath();
    x.moveTo(x0 + tl, y0);
    x.arcTo(x1, y0, x1, y1, tr);
    x.arcTo(x1, y1, x0, y1, br);
    x.arcTo(x0, y1, x0, y0, bl);
    x.arcTo(x0, y0, x1, y0, tl);
    x.closePath();
  };
  let g = x.createLinearGradient(0, 0, 0, px);
  g.addColorStop(0, shade(c, 0.3));
  g.addColorStop(0.55, c);
  g.addColorStop(1, shade(c, -0.22));
  path();
  x.fillStyle = g;
  x.fill();
  x.lineWidth = Math.max(1, px * 0.04);
  x.strokeStyle = shade(c, -0.35);
  x.globalAlpha = 0.6;
  x.stroke();
  x.globalAlpha = 1;
  g = x.createRadialGradient(px * 0.35, px * 0.3, 0, px * 0.35, px * 0.3, px * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  path();
  x.fillStyle = g;
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.7)';
  x.beginPath();
  x.ellipse(px * 0.32, px * 0.26, px * 0.1, px * 0.055, -0.5, 0, Math.PI * 2);
  x.fill();
  return cv;
}

/** Görsel yüklenemezse virüs hücresi: koyu konturlu yuvarlak, iki göz. */
export function createVirusFallbackCanvas(px: number, type: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const x = context2d(cv);
  const c = hex(VIRUS_FALLBACK[type] ?? VIRUS_FALLBACK[0]);
  x.fillStyle = c;
  x.strokeStyle = shade(c, -0.45);
  x.lineWidth = Math.max(1, px * 0.06);
  x.beginPath();
  x.arc(px / 2, px / 2, px * 0.38, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = '#ffffff';
  for (const ex of [0.38, 0.62]) {
    x.beginPath();
    x.arc(px * ex, px * 0.46, px * 0.09, 0, Math.PI * 2);
    x.fill();
  }
  return cv;
}

/** Üç virüsün animasyon şeridi; biri bile yüklenemezse null (yedek çizim kullanılır). */
export async function loadVirusArt(): Promise<HTMLImageElement[] | null> {
  if (typeof Image === 'undefined') return null;
  try {
    return await Promise.all(VIRUS_SHEET_URLS.map((u) => loadImage(u)));
  } catch {
    return null;
  }
}
