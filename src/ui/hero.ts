/* =====================================================================
   SIKLAMEN (NS4-09): oyunun ana karakteri
   Yukarı kıvrık taç yapraklı, kalp yaprak kollu bir sıklamen çiçeği. Tek bir
   SVG şablonu oyun HUD'unda (güç butonu), başlangıç, bölüm sonu ve oyun sonu
   ekranlarında kullanılır. Yüz ifadesi (mood), göz kırpma, sallanma ve güç
   halkası CSS ile anime edilir (styles.css "Sıklamen karakteri" bölümü).
   Oyun durumunu bilmez; app/events.ts ve ui/hud.ts çağırır.
   ===================================================================== */
import { $ } from './dom';

export type Mood = 'idle' | 'happy' | 'cheer' | 'worried' | 'sad' | 'spray' | 'ready';

/** Güç halkasının çevresi (r = 55). */
const RING = 2 * Math.PI * 55;
const PETAL = 'M0 0 C -10 -14 -9 -36 0 -46 C 9 -36 10 -14 0 0 Z';
const LEAF = 'M0 6 C -10 -5 -24 4 -15 15 L 0 26 L 15 15 C 24 4 10 -5 0 6 Z';

/** Karakter SVG'si (statik şablon, kullanıcı verisi içermez). `uid` gradyan kimliklerini benzersiz yapar. */
export function heroSvg(uid: string): string {
  const petals = [-44, -22, 0, 22, 44]
    .map((a) => `<path d="${PETAL}" transform="translate(60 46) rotate(${a})" fill="url(#hp-${uid})"/>`)
    .join('');
  return `<svg class="hero-svg" viewBox="0 0 120 120" aria-hidden="true">
<defs>
<linearGradient id="hp-${uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d6337f"/><stop offset="1" stop-color="#ff8cc0"/></linearGradient>
<radialGradient id="hf-${uid}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff2f8"/><stop offset="1" stop-color="#ffc4dd"/></radialGradient>
</defs>
<circle class="ring-bg" cx="60" cy="62" r="55"/>
<circle class="ring" cx="60" cy="62" r="55" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${RING.toFixed(1)}" transform="rotate(-90 60 62)"/>
<g class="hero-body">
<path class="stem" d="M60 118 C 61 104 56 96 60 82"/>
<g class="leaf leaf-l"><path d="${LEAF}" transform="translate(40 92) rotate(-58) scale(.85)"/></g>
<g class="leaf leaf-r"><path d="${LEAF}" transform="translate(80 92) rotate(58) scale(.85)"/></g>
<g class="petals">${petals}</g>
<circle class="head" cx="60" cy="62" r="23" fill="url(#hf-${uid})"/>
<g class="face">
<g class="brows"><path d="M47 52 L55 54"/><path d="M73 52 L65 54"/></g>
<g class="eyes"><ellipse cx="52" cy="61" rx="3.4" ry="4.4"/><ellipse cx="68" cy="61" rx="3.4" ry="4.4"/>
<circle class="glint" cx="53.2" cy="59.4" r="1.2"/><circle class="glint" cx="69.2" cy="59.4" r="1.2"/></g>
<g class="happy-eyes"><path d="M48 62 Q52 57 56 62"/><path d="M64 62 Q68 57 72 62"/></g>
<ellipse class="blush" cx="46" cy="69" rx="4.5" ry="2.6"/><ellipse class="blush" cx="74" cy="69" rx="4.5" ry="2.6"/>
<path class="m m-smile" d="M54 70 Q60 75.5 66 70"/>
<path class="m m-open" d="M53 68.5 Q60 80 67 68.5 Z"/>
<path class="m m-worry" d="M53 72 Q56.5 69 60 72 T 67 72"/>
<path class="m m-sad" d="M54 74 Q60 68 66 74"/>
<path class="m m-o" d="M57 71 a3 3.6 0 1 0 6 0 a3 3.6 0 1 0 -6 0"/>
</g>
<path class="sweat" d="M82 50 C 79 55 79 58 82 58 C 85 58 85 55 82 50 Z"/>
<g class="sparks"><path d="M18 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/><path d="M100 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"/></g>
</g>
</svg>`;
}

/** Bir kapsayıcıya karakteri yerleştirir (başlangıç / bölüm sonu / oyun sonu ekranları). */
export function mountHero(el: HTMLElement, uid: string, mood: Mood = 'idle'): void {
  el.innerHTML = heroSvg(uid);
  el.dataset['mood'] = mood;
}

/* ---- HUD karakteri (güç butonu #btn-cyc içindeki #hero) ---- */
let baseMood: Mood = 'idle';
let tempMood: Mood | null = null;
let tempTimer: ReturnType<typeof window.setTimeout> | undefined;
let shownMood: Mood | null = null;

function apply(): void {
  const m = tempMood ?? baseMood;
  if (m === shownMood) return;
  shownMood = m;
  $('hero').dataset['mood'] = m;
}

/** Sürekli ruh hali (tıkanıklık, güç hazır): geçici tepki bitince buna döner. */
export function setBaseMood(m: Mood): void {
  baseMood = m;
  apply();
}

/** Geçici tepki (ör. sevinç, hapşırık). */
export function react(m: Mood, ms = 1300): void {
  tempMood = m;
  clearTimeout(tempTimer);
  tempTimer = setTimeout(() => {
    tempMood = null;
    apply();
  }, ms);
  apply();
}

/** Güç halkası doluluğu (0..1). */
export function setCharge(p: number): void {
  const ring = document.querySelector('#hero .ring');
  if (ring instanceof SVGElement) ring.style.strokeDashoffset = (RING * (1 - Math.max(0, Math.min(1, p)))).toFixed(1);
}

/** Yeni oyun: tepkiler ve önbellek sıfırlanır. */
export function resetHero(): void {
  clearTimeout(tempTimer);
  tempMood = null;
  baseMood = 'idle';
  shownMood = null;
  apply();
  setCharge(0);
}

/* ---- konuşma balonu ---- */
let sayTimer: ReturnType<typeof window.setTimeout> | undefined;

/** Sıklamen konuşur: balon `ms` sonra kaybolur. */
export function say(text: string, ms = 4200): void {
  const el = $('say');
  $('say-text').textContent = text;
  el.classList.add('show');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function hideSay(): void {
  clearTimeout(sayTimer);
  sayTimer = undefined;
  $('say').classList.remove('show');
}
