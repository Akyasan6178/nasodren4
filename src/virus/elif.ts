/* =====================================================================
   NS4-44 · DOKTOR ELİF: Virüs Avı anlatıcısı (öğretici ve oyun sonu).
   Seçilen taslak (kart A): topuz saç, beyaz önlük, turkuaz forma, turkuaz
   steteskop, yakada nazar boncuğu. Dört poz: selam, goster, alkis, oops.
   Renkler yalnızca sınıflarla verilir (styles.css `.elif-*`, :root tokenları).
   Anlatıcı tek yerden gelir (NARRATOR): hukuk incelemesi isterse kural koduna
   dokunmadan başka bir anlatıcıya geçilebilir.
   ===================================================================== */

export const ELIF_POSES = ['selam', 'goster', 'alkis', 'oops', 'bekle', 'tut'] as const;
/** NS4-44 ek: `tut` pozunda kaldırılmış işaret parmağının ucu (viewBox 200×240): sıradaki kapsül burada durur. */
export const ELIF_FINGER = { x: 166.5, y: 74 } as const;
export const ELIF_VIEW = { w: 200, h: 240 } as const;
export type ElifPose = (typeof ELIF_POSES)[number];

/** Kol: omuzdan ele kalın, yuvarlak uçlu kol (önlük kolu) ve el. */
function arm(d: string, hand: string): string {
  return `<path class="elif-sleeve-line" d="${d}"/>` + `<path class="elif-sleeve" d="${d}"/>` + hand;
}
const hand = (x: number, y: number, r = 9) =>
  `<circle class="elif-skin" cx="${x}" cy="${y}" r="${r}"/><path class="elif-skin-shade" d="M${x - r * 0.7} ${y + r * 0.3}a${r} ${r} 0 0 0 ${r * 1.4} 0z"/>`;

const ARM_LEFT_DOWN = arm('M60 178 Q50 204 56 224', hand(57, 228));

const ARMS: Readonly<Record<ElifPose, string>> = {
  selam:
    ARM_LEFT_DOWN +
    arm(
      'M140 176 Q164 158 170 120',
      hand(171, 110, 10) +
        `<g class="elif-skin"><rect x="160" y="92" width="5" height="12" rx="2.5"/><rect x="166" y="89" width="5" height="13" rx="2.5"/><rect x="172" y="90" width="5" height="13" rx="2.5"/><rect x="178" y="95" width="5" height="11" rx="2.5"/></g>`,
    ),
  goster:
    ARM_LEFT_DOWN +
    arm(
      'M140 178 Q164 170 182 160',
      hand(186, 158, 9) + `<rect class="elif-skin" x="190" y="152" width="10" height="5" rx="2.5"/>`,
    ),
  alkis:
    arm('M60 178 Q66 200 92 198', hand(94, 196, 9)) +
    arm('M140 178 Q134 200 108 198', hand(106, 194, 9)) +
    `<g class="elif-spark"><path d="M74 194h-9M126 194h9M77 182l-7-5M123 182l7-5"/></g>`,
  oops: ARM_LEFT_DOWN + arm('M140 178 Q158 152 136 134', hand(130, 128, 9)),
  // NS4-44 ek: tahtanın yanında beklerken (iki kol aşağı)
  bekle: ARM_LEFT_DOWN + arm('M140 178 Q150 204 144 224', hand(143, 228)),
  // NS4-44 ek: sıradaki kapsülü kaldırdığı işaret parmağının ucunda tutar
  tut:
    ARM_LEFT_DOWN +
    arm(
      'M140 176 Q160 156 164 116',
      hand(165, 108, 10) +
        `<rect class="elif-skin" x="162.5" y="74" width="8" height="30" rx="4"/>` +
        `<rect class="elif-skin-shade" x="156" y="100" width="7" height="10" rx="3.5"/>`,
    ),
};

const FACES: Readonly<Record<ElifPose, string>> = {
  selam:
    `<ellipse class="elif-eye" cx="82" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="84.6" cy="96.4" r="2.6"/>` +
    `<ellipse class="elif-eye" cx="118" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="120.6" cy="96.4" r="2.6"/>` +
    `<path class="elif-brow" d="M74 85q8-5 16-1M110 84q8-4 16 1"/>` +
    `<path class="elif-mouth" d="M88 115q12 15 24 0z"/><path class="elif-tongue" d="M94 120q6 4 12 0q-6-3-12 0z"/>`,
  goster:
    `<ellipse class="elif-eye" cx="84" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="86.6" cy="96.4" r="2.6"/>` +
    `<ellipse class="elif-eye" cx="120" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="122.6" cy="96.4" r="2.6"/>` +
    `<path class="elif-brow" d="M74 86q8-4 16-1M110 80q8-6 16 0"/>` +
    `<path class="elif-line" d="M90 116q11 9 22-1"/>`,
  alkis:
    `<path class="elif-line elif-line-bold" d="M74 101q8-9 16 0M110 101q8-9 16 0"/>` +
    `<path class="elif-brow" d="M74 84q8-5 16-1M110 83q8-4 16 1"/>` +
    `<path class="elif-mouth" d="M85 112q15 22 30 0z"/><path class="elif-tongue" d="M93 121q7 5 14 0q-7-4-14 0z"/>`,
  oops:
    `<ellipse class="elif-eye-white" cx="82" cy="99" rx="9" ry="10"/><circle class="elif-eye" cx="82" cy="100" r="4.5"/><circle class="elif-eye-shine" cx="83.6" cy="98" r="1.6"/>` +
    `<ellipse class="elif-eye-white" cx="118" cy="99" rx="9" ry="10"/><circle class="elif-eye" cx="118" cy="100" r="4.5"/><circle class="elif-eye-shine" cx="119.6" cy="98" r="1.6"/>` +
    `<path class="elif-brow" d="M73 80q9-7 18-2M109 78q9-5 18 2"/>` +
    `<ellipse class="elif-mouth" cx="100" cy="119" rx="5" ry="6"/>`,
  bekle:
    `<ellipse class="elif-eye" cx="82" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="84.6" cy="96.4" r="2.6"/>` +
    `<ellipse class="elif-eye" cx="118" cy="100" rx="7" ry="9"/><circle class="elif-eye-shine" cx="120.6" cy="96.4" r="2.6"/>` +
    `<path class="elif-brow" d="M74 86q8-4 16-1M110 85q8-3 16 1"/>` +
    `<path class="elif-line" d="M90 115q10 8 20 0"/>`,
  tut:
    `<ellipse class="elif-eye" cx="84" cy="99" rx="7" ry="9"/><circle class="elif-eye-shine" cx="86.8" cy="95" r="2.6"/>` +
    `<ellipse class="elif-eye" cx="120" cy="99" rx="7" ry="9"/><circle class="elif-eye-shine" cx="122.8" cy="95" r="2.6"/>` +
    `<path class="elif-brow" d="M75 85q8-5 16-1M111 83q8-4 16 1"/>` +
    `<path class="elif-mouth" d="M89 115q11 13 22 0z"/>`,
};

const HEAD =
  // arka saç ve topuz
  `<circle class="elif-hair" cx="100" cy="32" r="19"/><path class="elif-hair-shine" d="M90 24q8-8 18-3"/>` +
  `<path class="elif-hair" d="M47 98Q42 40 100 38Q158 40 153 98L155 132Q100 146 45 132Z"/>` +
  // boyun
  `<rect class="elif-skin-shade" x="89" y="128" width="22" height="28" rx="7"/>` +
  // kulaklar ve baş
  `<circle class="elif-skin" cx="51" cy="100" r="8"/><circle class="elif-skin" cx="149" cy="100" r="8"/>` +
  `<circle class="elif-skin" cx="100" cy="94" r="50"/>` +
  `<path class="elif-skin-shade" d="M56 112q10 30 44 32q-30-8-44-32z"/>` +
  // ön saç (perçem)
  `<path class="elif-hair" d="M50 92Q56 44 100 43Q144 44 150 92Q132 70 114 73Q101 59 87 72Q67 69 50 92Z"/>` +
  `<path class="elif-hair-shine" d="M66 70q14-16 30-17"/>` +
  // yanaklar
  `<ellipse class="elif-cheek" cx="68" cy="114" rx="9" ry="5"/><ellipse class="elif-cheek" cx="132" cy="114" rx="9" ry="5"/>`;

const BODY =
  `<path class="elif-coat" d="M38 240C40 196 58 166 100 158C142 166 160 196 162 240Z"/>` +
  `<path class="elif-scrub" d="M83 158L100 190L117 158Z"/><path class="elif-scrub-dark" d="M91 158L100 176L109 158Z"/>` +
  `<path class="elif-coat-line" d="M83 158L95 240M117 158L105 240M60 196q6 20 4 44M140 196q-6 20-4 44"/>` +
  // cep ve kalem
  `<path class="elif-coat-line" d="M116 212h22v14h-22z"/><rect class="elif-scrub" x="120" y="204" width="3.5" height="12" rx="1.5"/>`;

const STETH =
  `<path class="elif-steth" d="M80 158Q75 198 100 203Q125 198 120 158"/>` +
  `<circle class="elif-scrub" cx="100" cy="207" r="7"/><circle class="elif-steth-ring" cx="100" cy="207" r="7"/>`;

const NAZAR =
  `<circle class="elif-nazar-b" cx="136" cy="184" r="8.5"/><circle class="elif-nazar-w" cx="136" cy="184" r="5.8"/>` +
  `<circle class="elif-nazar-l" cx="136" cy="184" r="3.9"/><circle class="elif-nazar-d" cx="136" cy="184" r="1.9"/>`;

/** Bir poz için tam SVG (200×240). */
export function elifSvg(pose: ElifPose): string {
  const front = pose === 'oops' || pose === 'alkis';
  return (
    `<svg class="elif" data-pose="${pose}" viewBox="0 0 200 240" role="img" aria-label="Doktor Elif" focusable="false">` +
    (front ? '' : ARMS[pose]) +
    BODY +
    STETH +
    NAZAR +
    HEAD +
    FACES[pose] +
    (front ? ARMS[pose] : '') +
    `</svg>`
  );
}

/** Öğretici ve oyun sonu anlatıcısı. */
export const NARRATOR = { name: 'Doktor Elif', svg: elifSvg } as const;
