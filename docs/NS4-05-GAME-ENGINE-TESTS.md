# NS4-05 · Oyun motoru regresyon testleri

Bu görev, saf oyun motorunu (`src/game/Game.ts`, `src/game/pieces.ts`) Vitest ile kalıcı test altına alır. Oyun davranışı, tasarım, metinler, denge değerleri ve bilinen hatalar (A–F) değiştirilmedi. `src/` altında hiçbir dosya değişmedi.

## Vitest sürümü ve uyumluluk kararı

| Paket      | Sürüm  | Not                                               |
| ---------- | ------ | ------------------------------------------------- |
| vitest     | 4.1.11 | devDependency, tam sürüm (`-E`)                   |
| vite       | 8.3.4  | değişmedi; Vitest aynı kopyayı kullanır (deduped) |
| typescript | 7.0.2  | değişmedi                                         |
| pixi.js    | 7.4.2  | değişmedi; runtime bağımlılığı eklenmedi          |

Gerekçe:

- Vitest 4.1.11'in peer aralığı `vite ^6 || ^7 || ^8`, Node aralığı `^20 || ^22 || >=24`; projenin Vite 8.3.4'ü ve `engines` alanı (`^20.19.0 || >=22.12.0`) ile uyumlu.
- Vitest 5.x Node `^22.12` istiyor; projenin desteklediği Node 20.19 hattını dışarıda bırakacağı için seçilmedi.
- Testler TypeScript'i Vite'ın dönüştürücüsüyle (oxc) çalıştırır; `tsc` gerekmez. Tip kontrolü ayrı olarak `npm run typecheck` ile yapılır (tsconfig `include` alanına `tests` ve `vitest.config.ts` eklendi).
- Ortam `node`; jsdom veya başka bir DOM kütüphanesi eklenmedi. Motor DOM, PixiJS, ses, depolama bilmediği için buna gerek yok.

### npm kurulum notu

npm 10.9.2, `npm install -D vitest@4.1.11` sırasında arborist hatası veriyor (`Cannot read properties of null (reading 'edgesOut')`, Vitest'in isteğe bağlı peer bağımlılıkları çözümlenirken). Bu yüzden ekleme bir kerelik `--legacy-peer-deps` ile yapıldı. Lock dosyası oluştuktan sonra normal `npm install` ve `npm ci` sorunsuz çalışıyor ve lock dosyasını değiştirmiyor (kontrol edildi). `npm audit`: 0 açık. Vitest'i ileride güncellerken aynı bayrak yine gerekebilir.

## Dosyalar

| Dosya                             | İçerik                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `vitest.config.ts`                | `environment: 'node'`, `include: tests/**/*.test.ts`, `restoreMocks`              |
| `tests/helpers/gameHelpers.ts`    | Tohumlu `Math.random`, tahta kurulum yardımcıları, olay kaydedici                 |
| `tests/game/board.test.ts`        | Başlangıç durumu, reset, `cell`/`fits`, spawn, 7-bag                              |
| `tests/game/movement.test.ts`     | Hareket, duvar, rotasyon, SRS tekmeleri, O, soft/hard drop, ghost, hold           |
| `tests/game/scoring.test.ts`      | Satır temizleme, sıkıştırma, combo, B2B, T-spin, seviye, yerçekimi, referans dizi |
| `tests/game/gravity-lock.test.ts` | Kilit gecikmesi, sıfırlama limiti, blockout, lockout                              |
| `tests/game/powers.test.ts`       | Tıkanıklık, siklamen, sentetik, rebound, çöp satırı, çöp oyun sonu                |
| `tests/game/events.test.ts`       | Olay adları, sıraları, payload'lar, `on()` aboneliği                              |

Ayrıca: `package.json` (`test`, `test:watch`, `check` içine test adımı), `tsconfig.json` (`include`), `tools/eslint/eslint.config.js` (type-aware blok `tests/**/*.ts` ve `vitest.config.ts` dosyalarını da kapsıyor).

## Test sayısı

6 dosya, **78 test**, tamamı geçiyor (yaklaşık 0,3 sn).

| Dosya                | Test |
| -------------------- | ---- |
| board.test.ts        | 15   |
| movement.test.ts     | 15   |
| scoring.test.ts      | 24   |
| gravity-lock.test.ts | 9    |
| powers.test.ts       | 10   |
| events.test.ts       | 5    |

## Test edilen mekanikler

- **Tahta:** boş başlangıç ve `idle` durum; `reset()` sonrası `play` ve sıfır sayaçlar; oynanmış oyunun reset ile temizlenmesi; tahta dışı hücre değerleri (yanlar/taban 9, üst 0); duvar ve dolu hücre çarpışması.
- **Spawn:** x=3, rot=0, mümkünse bir sıra aşağıda doğma; altı doluysa y=0; `spawn(type)` kuyruğa dokunmaz; kuyruk hep 8 eleman.
- **7-bag:** beş farklı tohumla her 7'li grup yedi farklı parça; aynı tohum aynı sıra; `Math.random` = 0 iken bilinen sıra.
- **Hareket:** sağa/sola kayma ve `move` olayı; duvarda ve dolu hücrede başarısız hareket (konum ve olay değişmez).
- **Rotasyon:** CW/CCW döngüsü; JLSTZ yatay tekme (sol duvar, 1→2); JLSTZ dikey bileşenli tekme (y işaret dönüşümü); I tekmeleri (sağ duvar 1→2, sol duvar 3→2); O dönmez; tüm adaylar kapalıyken başarısız rotasyon.
- **Düşüş:** `softStep` +1 ve tabanda başarısız; soft drop yerçekimi ×20 ve sıra başına +1; ghost Y; hard drop +2/sıra, `harddrop` mesafesi, kilitlenen hücre indeksleri.
- **Hold:** ilk hold; aynı düşüşte ikinci hold engeli; kilitten sonra hakkın geri gelmesi; takasın kuyruktan çekmemesi ve doğma noktası.
- **Satır temizleme:** 1/2/3/4 satır taban puanları (100/300/500/800), `clearstart` satırları, `lineClearMs` sonunda bitiş; bitişik olmayan satırlarda doğru sıkıştırma.
- **Combo ve B2B:** combo bonusu (+50 × combo × seviye), temizlemesiz kilitle sıfırlanma, `maxCombo`; art arda Tetris ×1,5, zor olmayan temizlemenin zinciri koparması.
- **T-spin:** rotasyonla tam T-spin double; mini T-spin (3 köşe, eksik ön köşe); 5. tekme adayı (`lastKick` 4) ile tam sayılma; iki köşede T-spin olmaması; son hareket rotasyon değilse, parça T değilse veya hard drop ile inmişse T-spin olmaması; temizlemesiz T-spin için `scored` olayı.
- **Seviye ve yerçekimi:** 10 satırda seviye artışı ve `levelup`; seviye 20 sınırı; seviye 1/2/5/10/20 yerçekimi aralıkları; seviye artınca daha sık düşme.
- **Kilit:** 500 ms kilit gecikmesi; havada sayaç birikmemesi; yerde hareketle sıfırlama; 15 sıfırlamadan sonra sıfırlamama ve 100 ms'de kilit; yeni en alt satırda sıfırlama hakkının yenilenmesi.
- **Oyun sonu:** blockout, lockout, kısmen görünür parçanın lockout sayılmaması, oyun sonrası `update` ve girdilerin etkisizliği, `gameover` olayının bir kez yayınlanması.
- **Güçler:** tıkanıklık hesabı; %35 altında siklamen/sentetik açılmaması, %35'te açılması; siklamenin satır 12..21 penceresi, drenaj süresi, puanı (150 × satır × seviye), tek kullanım, 30 sn ×2 penceresi; sentetiğin en alttaki 3 satırı temizlemesi ve puanı; ikinci kullanımda rebound, üçüncüde 80 sn; rebound yerçekimi ×1,5 ve bitince normale dönüş; 5 sn sonra ve sonra her 10 sn'de tek delikli çöp satırı; üst satır doluyken `garbage` oyun sonu.
- **Olaylar:** 13 olay adı; satır temizlemede `harddrop → lock → scored → levelup → clearstart`, sonra `clearend → spawn`; güçlerde `powerdone → clearend`; tam bir oturumda tüm olayların üretilmesi; payload'sız olayların argümansız çağrılması; `on()` kayıt sırası ve dönen abonelik iptali.

### Referans değerler

`scoring.test.ts` içindeki "NS4-01 referans skor dizisi" testi, NS4-01 doğrulama betiğindeki senaryoyu tek bir oyunda aynen kurar: tekli **+138**, Tetris **+1732**, T-spin double **+3800**, combo tekliler **538 / 638 / 738**. T-spin double adımında `lastRot` elle atanmak yerine gerçek bir rotasyon (1→2) kullanılır; sonuç aynıdır. Aynı değerler tarayıcıda (dev, `window.__fn`) da yeniden ölçüldü ve eşleşti.

## Deterministik rastgelelik

- `createGame(seed)` motoru kurmadan önce `vi.spyOn(Math, 'random')` ile tohumlu bir LCG kurar; parça sırası tohuma göre sabittir.
- Çöp satırı deliği gibi tek değer gereken yerlerde `mockReturnValue` kullanılır (ör. 0,55 → sütun 5).
- `vitest.config.ts` içindeki `restoreMocks: true`, `vi.spyOn` ile kurulan taklitleri her testten sonra özgün hâline döndürür.
- Gerçek zamanlayıcı yok: zaman yalnızca `game.update(dt)` ile ilerletilir (süreler `CFG` değerlerinden okunur). Fake timer gerekmedi.
- Her test kendi tahtasını kurar; testler birbirinin durumuna bağlı değildir. `window.__fn` kullanılmaz; snapshot testi yoktur.

### Testlerin etkinliği

Testlerin gerçekten regresyon yakaladığını görmek için depo dışındaki bir kopyada `Game.ts` üzerinde 26 küçük değişiklik (B2B çarpanı, combo bonusu, tekme y yönü, kilit limitleri, rebound hızı, çöp deliği, siklamen penceresi vb.) tek tek denendi; 26'sının 26'sı en az bir testi düşürdü. İlk turda kalan 3 boşluk (5. tekme kuralı, 3 köşe alt sınırı, siklamen satır penceresi) için test eklendi.

## Kayda geçen mevcut davranış

- Zor olmayan bir temizlemeden sonra `game.b2b` `false` yerine `0` olur (`difficult` ifadesi `n === 4 || (tspin && n > 0)`). Davranış değiştirilmedi; test bunu olduğu gibi doğrular.

## Kapsam dışı

UI/DOM testleri, PixiJS render, ses ve titreşim, E2E testleri (depoya eklenmedi), global skor, tasarım ve metin değişiklikleri, tema kaldırma, bilinen A–F hatalarının düzeltilmesi, denge ve sabitlerin değiştirilmesi.

## Çalıştırılan komutlar

| Komut                  | Sonuç                                                  |
| ---------------------- | ------------------------------------------------------ |
| `npm run typecheck`    | geçti                                                  |
| `npm run lint`         | geçti (0 uyarı)                                        |
| `npm run format:check` | geçti                                                  |
| `npm test`             | 6 dosya, 78/78 geçti (art arda 5 çalıştırma)           |
| `npm run build`        | geçti; JS 516,44 kB (gzip 157,07), CSS 10,47 kB        |
| `npm run check`        | geçti (typecheck → lint → format:check → test → build) |

Build çıktısı NS4-04 (c4ca53b) ile karşılaştırıldı: JS ve CSS dosyaları bayt bayt aynı; `index.html` ve `favicon.svg` yalnızca satır sonu (autocrlf) farkı gösteriyor, içerik aynı.

Tarayıcı doğrulaması (Playwright, Edge headless; gerçek cihaz yok, yalnızca emülasyon):

- 70 maddelik smoke: dev 70/70, production preview 70/70; sayfa hatası, konsol hatası ve başarısız istek yok.
- Beş görünüm (390×844, 844×390, 768×1024, 1366×768, 1920×1080): NS4-04 ile 172 geometri/stil kaydında 0 fark; ekran görüntülerinde fark yalnızca rastgele "Sıradaki" önizlemesinde (aynı kodun iki çalıştırması arasında da görülüyor).
- Bilinen hatalar A, B, E, F tarayıcıda yeniden denendi, davranışları aynı; C ve D'nin bağlı olduğu layout ve bundle değişmedi.

## Ertelenen teknik borç

- `noUncheckedIndexedAccess` hâlâ kapalı (NS4-04'ten).
- Testler motorun public alanlarına (`type`, `x`, `y`, `lines` vb.) doğrudan yazarak tahta kurar. Motor ileride kapsüllenirse `placePiece` ve benzeri yardımcılar güncellenmeli.
- Kapsam (coverage) raporu eklenmedi; `@vitest/coverage-v8` yeni bir bağımlılık olacağı için ertelendi.
- `b2b` alanının `boolean | 0` tipi ve bilinen A–F hataları sonraki görevlere bırakıldı.
