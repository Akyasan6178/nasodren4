// NS4-08/09: src/styles.css için küçük statik okuma yardımcıları (yorumlar atılır).
import css from '../../src/styles.css?raw';

export const plainCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** `scope` içinde seçici listesi tam olarak `selector` olan ilk kuralın gövdesi (iç içe kurallara inmez). */
export function rule(selector: string, scope: string = plainCss): string {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  let depth = 0;
  let start = 0;
  for (let i = 0; i < scope.length; i++) {
    const ch = scope[i];
    if (ch === '{') {
      if (depth === 0) {
        const sel = norm(scope.slice(start, i));
        const end = scope.indexOf('}', i);
        if (sel === norm(selector)) return scope.slice(i + 1, end);
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) start = i + 1;
    } else if (ch === ';' && depth === 0) start = i + 1;
  }
  throw new Error('kural yok: ' + selector);
}

/** `@media …` başlığı tam olarak `query` olan bloğun içi (süslü parantezler hariç); yoksa ''. */
export function mediaBlock(query: string): string {
  const at = plainCss.indexOf(query + ' {');
  if (at < 0) return '';
  const open = plainCss.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < plainCss.length; i++) {
    if (plainCss[i] === '{') depth++;
    else if (plainCss[i] === '}' && --depth === 0) return plainCss.slice(open + 1, i);
  }
  return '';
}

/** `px` değerini sayı olarak okur (ör. "min-height: 56px" → 56); yoksa NaN. */
export function px(body: string, prop: string): number {
  const m = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([\\d.]+)px`).exec(body);
  return m?.[1] ? Number(m[1]) : NaN;
}
