/* =====================================================================
   NS4-31: sinüs haritası: yüz silüetinde bölümler (index.html'de iki
   kopya: oda açılış kartı #rmap, final ekranı #fmap). Her bölümün durumu
   kapsayıcının data-<bölüm id> niteliğine yazılır (ör. data-yanak-sol);
   renk ve hareket CSS'tedir (SVG öğelerine doğrudan dokunulmaz).
   NS4-46: 8 bölüm (sol/sağ ayrı); açılan bölümün boşluk görseli varsa kart
   haritanın yerine onu gösterir (kırmızıdan ferah tona döner, CSS).
   ===================================================================== */
import { ROOMS } from '../config/gameConfig';
import { ROOM_NEXT_FINAL, roomArtUrl, roomClearTitle, roomText } from '../content/rooms';
import { $ } from './dom';
import { fmt } from './hud';

/** kapalı (tıkalı leylak) · sıradaki (sıklamen nabzı) · şimdi açılıyor (büyüyüp turkuaz olur) · açık (turkuaz). */
export type SinusState = 'closed' | 'next' | 'opening' | 'open';

/** `opening` indeksli oda şimdi açılıyor: öncekiler açık, bir sonraki "sıradaki", gerisi kapalı. */
export function mapStates(opening: number): SinusState[] {
  return ROOMS.map((_, i) =>
    i < opening ? 'open' : i === opening ? 'opening' : i === opening + 1 ? 'next' : 'closed',
  );
}

/** "yanak-sol" → "yanakSol" (dataset anahtarı; nitelik data-yanak-sol). */
export const datasetKey = (id: string): string => id.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

export function renderMap(el: HTMLElement, states: readonly SinusState[]): void {
  ROOMS.forEach((r, i) => {
    el.dataset[datasetKey(r.id)] = states[i] ?? 'closed';
  });
}

/** Oda açılış kartı: "Sinüs açıldı!", oda adı + bonus, harita ve sıradaki oda (geçiş boyunca). */
export function showRoomMap(room: number, bonus: number): void {
  renderMap($('rmap'), mapStates(room));
  $('rm-title').textContent = roomClearTitle(room);
  const art = $('rm-art'),
    url = roomArtUrl(room);
  art.hidden = !url;
  $('rmap').hidden = !!url;
  if (url) art.setAttribute('src', url);
  $('rm-sub').textContent = `${roomText(room).name} ferahladı · +${fmt(bonus)}`;
  $('rm-next').textContent = room + 1 < ROOMS.length ? `Sıradaki: ${roomText(room + 1).name}` : ROOM_NEXT_FINAL;
  $('room-map').classList.add('on');
}
export function hideRoomMap(): void {
  $('room-map').classList.remove('on');
}

/** Final ekranı: bütün sinüsler açık, o ana kadarki puan ve drenaj. */
export function renderFinal(r: { readonly score: number; readonly lines: number }): void {
  renderMap(
    $('fmap'),
    ROOMS.map(() => 'open'),
  );
  $('f-score').textContent = fmt(r.score);
  $('f-lines').textContent = String(r.lines);
}
