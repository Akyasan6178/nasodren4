// NS4-06: UI modüllerinin (hud, screens, InputController, lifecycle) Node'da test edilebilmesi için
// en küçük sahte DOM. Yalnızca bu modüllerin kullandığı API yüzeyini taklit eder; render, CSS veya
// layout hesabı yoktur. jsdom gibi bir kütüphane eklenmemiştir. vi.stubGlobal ile kurulan globaller
// vitest.config.ts'teki unstubGlobals ile her testten sonra geri alınır.
import { vi } from 'vitest';

type Listener = (e: unknown) => void;

export class FakeEventTarget {
  private readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: Listener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, fn: Listener): void {
    const list = this.listeners.get(type);
    if (list)
      this.listeners.set(
        type,
        list.filter((f) => f !== fn),
      );
  }
  /** Olayı dinleyicilere iletir; `preventDefault` çağrısı kaydedilir. */
  dispatch(type: string, init: Record<string, unknown> = {}): { defaultPrevented: boolean } {
    const ev = {
      type,
      repeat: false,
      defaultPrevented: false,
      preventDefault() {
        ev.defaultPrevented = true;
      },
      ...init,
    };
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(ev);
    return ev;
  }
}

class FakeClassList {
  private readonly set = new Set<string>();
  add(...c: string[]): void {
    for (const x of c) this.set.add(x);
  }
  remove(...c: string[]): void {
    for (const x of c) this.set.delete(x);
  }
  toggle(c: string, force?: boolean): boolean {
    const on = force ?? !this.set.has(c);
    if (on) this.set.add(c);
    else this.set.delete(c);
    return on;
  }
  contains(c: string): boolean {
    return this.set.has(c);
  }
}

export class FakeElement extends FakeEventTarget {
  /** NS4-10: odak takibi için kurulu sahte document (focus/blur activeElement'i günceller). */
  static doc: { activeElement: FakeElement | null } | null = null;
  readonly classList = new FakeClassList();
  inert = false;
  private readonly attrs = new Map<string, string>();
  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  tabIndex = 0;
  readonly isConnected = true;
  readonly style: Record<string, string> = {};
  readonly dataset: Record<string, string | undefined> = {};
  readonly children: FakeElement[] = [];
  textContent = '';
  disabled = false;
  className = '';
  title = '';
  constructor(readonly id = '') {
    super();
  }
  /** Yalnızca screens.ts'in kullandığı iki sorgu: [data-focus] ve 'button,a' (ilk çocuk düzeyi). */
  querySelector(sel: string): FakeElement | null {
    if (sel === '[data-focus]') return this.children.find((c) => c.dataset['focus'] !== undefined) ?? null;
    if (sel.includes('button')) return this.children.find((c) => c instanceof FakeButton) ?? null;
    return null;
  }
  contains(el: unknown): boolean {
    for (let p = el instanceof FakeElement ? el : null; p; p = p.parent) if (p === this) return true;
    return false;
  }
  querySelectorAll(): FakeElement[] {
    return [];
  }
  parent: FakeElement | null = null;
  append(...els: FakeElement[]): void {
    for (const el of els) this.appendChild(el);
  }
  appendChild(el: FakeElement): FakeElement {
    el.parent = this;
    this.children.push(el);
    return el;
  }
  set innerHTML(_v: string) {
    this.replaceChildren();
  }
  // NS4-07: popup kutusu (notifications.ts) için çocuk yönetimi
  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }
  get childElementCount(): number {
    return this.children.length;
  }
  replaceChildren(): void {
    for (const c of this.children) c.parent = null;
    this.children.length = 0;
  }
  remove(): void {
    const p = this.parent;
    if (!p) return;
    const i = p.children.indexOf(this);
    if (i >= 0) p.children.splice(i, 1);
    this.parent = null;
  }
  focus(): void {
    if (FakeElement.doc) FakeElement.doc.activeElement = this;
  }
  blur(): void {
    if (FakeElement.doc?.activeElement === this) FakeElement.doc.activeElement = null;
  }
  /** [data-back] gibi tıklama dinleyicilerini tetikler. */
  click(): void {
    this.dispatch('click');
  }
}
class FakeButton extends FakeElement {}
class FakeOther {}

/** index.html'deki ekran kimlikleri (class="screen"). */
export const SCREEN_IDS = ['scr-start', 'scr-how', 'scr-pause', 'scr-over', 'scr-set'] as const;
const BUTTON_IDS = ['btn-hold', 'btn-cyc', 'btn-syn', 'btn-pause'];
const ELEMENT_IDS = [
  'hud-score',
  'hud-level',
  'hud-lines',
  'meter-cover',
  'danger',
  'cyc-sub',
  'syn-sub',
  'badge-mult',
  'badge-rebound',
  'toast',
  'popups',
  'tip-start',
  'tip-pause',
  'tip-over',
  'cyc-chip',
  'syn-chip',
  'fx-badges',
  // oyun sonu ekranı (renderGameOver)
  'o-score',
  'o-lines',
  'o-best',
  'newbest',
  'o-badges',
];
/** Ekranların odaklanabilir çocukları (index.html sırasıyla; ilk buton ekran açılınca odak alır). */
const SCREEN_BUTTONS: Record<string, readonly string[]> = {
  'scr-start': ['b-play', 'b-how', 'b-set1'],
  'scr-pause': ['b-resume', 'b-set2', 'b-quit'],
  'scr-over': ['b-again', 'b-menu'],
};

export interface FakeDom {
  readonly window: FakeEventTarget & { dataLayer: unknown[] };
  readonly document: FakeEventTarget & { hidden: boolean; activeElement: FakeElement | null };
  readonly canvas: FakeElement;
  /** Kimliğe göre eleman (yoksa hata). */
  el(id: string): FakeElement;
  /** Görünen ekranın kimliği (`.screen.on`), yoksa null. */
  visibleScreen(): string | null;
  /** Ekranın [data-back] butonu. */
  backButton(screenId: string): FakeElement;
}

/** Sahte DOM'u kurar ve DOM globallerini (document, window, HTMLElement...) taklit eder. */
export function installFakeDom(): FakeDom {
  const byId = new Map<string, FakeElement>();
  const backButtons: FakeElement[] = [];
  // NS4-10: #stage, canvas ve HUD butonlarını içerir (overlay açıkken inert olur)
  const stage = new FakeElement('stage');
  byId.set('stage', stage);
  for (const id of BUTTON_IDS) byId.set(id, stage.appendChild(new FakeButton(id)));
  for (const id of ELEMENT_IDS) byId.set(id, new FakeElement(id));
  for (const id of SCREEN_IDS) {
    const s = new FakeElement(id);
    s.classList.add('screen');
    byId.set(id, s);
    if (id === 'scr-over') {
      const sheet = new FakeElement('scr-over-sheet');
      sheet.dataset['focus'] = '';
      s.appendChild(sheet);
    }
    for (const b of SCREEN_BUTTONS[id] ?? []) byId.set(b, s.appendChild(new FakeButton(b)));
  }
  for (const id of ['scr-how', 'scr-set']) {
    const b = new FakeButton(id + '-back');
    b.dataset['back'] = '';
    backButtons.push(b);
    byId.get(id)?.appendChild(b);
  }
  byId.get('scr-start')?.classList.add('on'); // index.html: başlangıç ekranı açık gelir
  const screens = () => SCREEN_IDS.map((id) => byId.get(id)).filter((s): s is FakeElement => !!s);

  const doc = Object.assign(new FakeEventTarget(), {
    hidden: false,
    activeElement: null as FakeElement | null,
    getElementById: (id: string) => byId.get(id) ?? null,
    createElement: () => new FakeElement(),
    querySelectorAll: (sel: string): FakeElement[] => {
      if (sel === '.screen') return screens();
      if (sel === '[data-back]') return backButtons;
      return [];
    },
    querySelector: (sel: string): FakeElement | null => {
      if (sel === '.screen.on') return screens().find((s) => s.classList.contains('on')) ?? null;
      return null;
    },
  });
  // dataLayer: analytics.track() olayları console yerine buraya yazar
  const win = Object.assign(new FakeEventTarget(), { dataLayer: [] as unknown[] });
  FakeElement.doc = doc;
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('HTMLElement', FakeElement);
  vi.stubGlobal('HTMLButtonElement', FakeButton);
  vi.stubGlobal('HTMLAnchorElement', FakeOther);
  vi.stubGlobal('HTMLInputElement', FakeOther);
  vi.stubGlobal('SVGElement', FakeOther);
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
    fn();
    return 0;
  });

  return {
    window: win,
    document: doc,
    canvas: stage.appendChild(new FakeElement('canvas')),
    el(id) {
      const e = byId.get(id);
      if (!e) throw new Error('sahte DOM: #' + id + ' yok');
      return e;
    },
    visibleScreen: () => screens().find((s) => s.classList.contains('on'))?.id ?? null,
    backButton(screenId) {
      const b = backButtons.find((x) => x.id === screenId + '-back');
      if (!b) throw new Error('sahte DOM: ' + screenId + ' geri butonu yok');
      return b;
    },
  };
}
