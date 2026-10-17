/* =====================================================================
   STORAGE: localStorage sarmalayıcısı ('fn_' önekli JSON)
   Erişim engellenirse veya JSON bozuksa sessizce varsayılana düşer
   (bilinçli fallback; NS4-01 davranışı).
   NS4-04: get() artık `unknown` döndürür. Değer DOĞRULANMAZ; tipini kabul
   eden çağıran taraftır (bkz. storage/settings.ts, storage/progress.ts).
   ===================================================================== */
export const store = {
  /** fn_<k> değerinin JSON.parse sonucu; anahtar yoksa veya okuma/parse başarısızsa `fallback`. */
  get(k: string, fallback: unknown): unknown {
    try {
      const v = localStorage.getItem('fn_' + k);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown): void {
    try {
      localStorage.setItem('fn_' + k, JSON.stringify(v));
    } catch {
      /* bilinçli: depolama kapalı/dolu ise kayıt atlanır */
    }
  },
};
