/* =====================================================================
   STORAGE: localStorage sarmalayıcısı ('fn_' önekli JSON)
   Erişim engellenirse veya JSON bozuksa sessizce varsayılana düşer.
   NS4-03: main.ts'ten taşındı; davranış değişmedi.
   ===================================================================== */
export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('fn_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('fn_' + k, JSON.stringify(v)); } catch (e) {} }
};
