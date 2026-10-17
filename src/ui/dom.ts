// Küçük DOM yardımcıları (UI framework değildir).
import type { Rect } from '../types/layout';

/** Typed getElementById; eleman yoksa açık hata verir (bütün id'ler index.html'de mevcut). */
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} bulunamadı`);
  return el as T;
};

/** Mutlak konumlu bir DOM elemanını layout dikdörtgenine yerleştirir. */
export function place(el: HTMLElement, r: Rect) { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; }

export type Off = () => void;

/** addEventListener + aynı dinleyiciyi kaldıran fonksiyon (dispose için). */
export function listen<E extends Event>(target: EventTarget, type: string, fn: (e: E) => void): Off {
  target.addEventListener(type, fn as EventListener);
  return () => target.removeEventListener(type, fn as EventListener);
}
