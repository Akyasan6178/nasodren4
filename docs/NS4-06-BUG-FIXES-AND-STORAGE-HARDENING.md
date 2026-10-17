# NS4-06 · Doğrulanmış hataların düzeltilmesi ve localStorage doğrulaması

Bu görev, NS4-01'de doğrulanıp sonraki görevlerde bilerek korunan hataları düzeltir ve `fn_meta` / `fn_settings` okumasını doğrulamalı hâle getirir. Yeni özellik, tasarım veya denge değişikliği yoktur. Her düzeltmeden önce o hatayı yakalayan test yazıldı ve düzeltme öncesi başarısız olduğu görüldü (134 testten 47'si).

## Düzeltilen sorunlar ve kök nedenler

| #   | Sorun (NS4-01 notu)                                        | Kök neden                                                                                                                                                                                                             | Düzeltme                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Resume sonrası tehlike vinyeti geri gelmiyor (Not A)       | `updateHud()` vinyeti yalnızca yuvarlanmış tıkanıklık değeri değişince yeniden hesaplıyordu. `pause()` vinyeti gizleyip önbelleği sıfırlıyor, ama resume sonrası tıkanıklık aynı kaldığı için hesap hiç çalışmıyordu. | Vinyet koşulu (`tıkanıklık ≥ 0.7 && oynuyor`) her karede değerlendirilir; DOM yalnızca değer değişince yazılır (`src/ui/hud.ts`).                                                                        |
| 2   | Pause → Ayarlar → Escape oyunu doğrudan sürdürüyor (Not B) | Klavye işleyicisi `paused` durumunda Escape/P'yi her zaman `resume()` olarak yorumluyordu; açık alt ekranı bilmiyordu.                                                                                                | `closeSub()` (`src/ui/screens.ts`): açık alt ekran varsa geri butonuyla aynı yığın dönüşünü yapar. Escape önce bunu dener; P yalnızca pause ekranı görünürken sürdürür (`src/input/InputController.ts`). |
| 3   | 844×390 başlangıç kartı kesiliyor (Not D)                  | 390 px yükseklikte kartın içeriği (çiçek 64 px, 44 px başlık, iki satır açıklama, butonlar) görünür alandan uzundu; Nasıl oynanır ve Ayarlar kart altında kesiliyordu.                                                | Yalnızca `#scr-start` için `@media (orientation: landscape) and (max-height: 480px)`: daha küçük dış/iç boşluk, 40 px çiçek, 34 px başlık (`src/styles.css`).                                            |
| 4   | Game-over arkasında donmuş ×2 / Rebound rozetleri (Not C)  | Oyun bitince `game.update()` çağrılmadığı için `multT` / `reboundT` donuyor; `updateHud()` 'over' durumunda da çalışıp rozetleri son değerleriyle görünür bırakıyordu.                                                | Rozet sayaçları yalnızca oynarken gösterilir (`playing` değilse 0 kabul edilir). Yeni oyunda `resetHud()` önbelleği zaten sıfırlıyor.                                                                    |
| 5   | Bozuk `fn_meta` oyunu çökertiyor (#6 / F)                  | `Object.assign(varsayılan, kayıt)` kayıtlı değeri doğrulamadan kopyalıyordu; `{"badges":null}` gibi veride `meta.badges.includes` TypeError veriyordu, game-over ekranı açılmıyordu.                                  | `normalizeMeta()` (`src/storage/progress.ts`), kurallar aşağıda.                                                                                                                                         |
| 6   | Bozuk `fn_settings` doğrulanmıyor                          | Aynı `Object.assign` deseni; tip, aralık ve fazladan alan denetimi yoktu.                                                                                                                                             | `normalizeSettings()` (`src/storage/settings.ts`), kurallar aşağıda.                                                                                                                                     |
| 7   | Zor olmayan temizlemeden sonra `b2b` değeri `0` (NS4-05)   | `n === 4 \|\| (tspin && n > 0)` ifadesi `tspin = 0` iken `0` üretiyordu.                                                                                                                                              | `tspin !== 0 && n > 0`; `Game.b2b` tipi `boolean` oldu. Doğruluk değeri aynı olduğu için puan, combo ve B2B sonuçları değişmedi.                                                                         |

## Storage doğrulama kuralları

Her iki kayıt da modül yüklenirken bir kez doğrulanır. Okunan kayıt normalize edilince değiştiyse düzeltilmiş hâli hemen geri yazılır. Geçerli kayıtlar ve kayıt yokken depoya yazılmaz. JSON olarak okunamayan kayıtta (eski davranış gibi) varsayılanlar kullanılır.

`fn_meta`:

- Kayıt nesne değilse (null, sayı, dizi, metin) varsayılan: `{best: 0, totalLines: 0, badges: []}`.
- `best`, `totalLines`: sonlu ve negatif olmayan sayı; değilse 0 (sayısal metin de geçersizdir).
- `badges`: dizi değilse `[]`. Yalnızca `BADGE_IDS` içindeki kimlikler tutulur, tekrarlar kaldırılır, ilk görülen sıra korunur.
- Fazladan alanlar taşınmaz. `Meta.badges` tipi artık `BadgeId[]`.

`fn_settings`:

- Kayıt nesne değilse varsayılanlar (`sound/music/haptics/ghost: true`, `fps: false`, `das: 167`, `arr: 33`).
- Boolean alanlar yalnızca gerçek `boolean` ise alınır; değilse o alan varsayılana döner, diğerleri korunur.
- `das` / `arr`: sonlu sayı değilse varsayılan. Sonlu ama ayar ekranındaki kaydırıcı aralığının dışındaysa sınıra çekilir (DAS 50..300, ARR 0..100) ve tamsayıya yuvarlanır (kaydırıcı adımı 1).
- Fazladan alanlar taşınmaz; alan sırası varsayılanlarınkiyle aynıdır.

## Değişmeden bırakılan davranışlar

- Ana menüye çıkılan yarım oyunun skoru kaydedilmez (Not E); tarayıcıda yeniden doğrulandı (`fn_meta` çıkıştan sonra yine yok).
- Pause ekranındaki Escape/P, oyun sırasındaki Escape/P, geri butonları ve yığın yapısı aynı. Tek ek davranış: başlangıç menüsünden açılan Ayarlar / Nasıl oynanır ekranı Escape ile de başlangıca döner (önceden Escape bu ekranlarda hiçbir şey yapmıyordu); geri butonuyla aynı sonuç.
- Pause'dan ana menüye çıkışta ×2/Rebound rozetleri başlangıç ekranının arkasında görünmeye devam edebilir. Bu görevin kapsamı game-over olduğu için değiştirilmedi; ayrı bir karar gerektirir.
- Oyun kuralları, puan tabloları, sabitler, metinler, tema, PixiJS/Vite/TypeScript sürümleri.
- 844×390 dışındaki bütün görünümler (aşağıdaki karşılaştırma).

## Eklenen testler

Toplam **134 test** (NS4-05: 78; +56). Düzeltme öncesi 47'si başarısızdı.

| Dosya                            | Test | Kapsam                                                                                                                                          |
| -------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/ui/hud.test.ts`           | 5    | Resume sonrası vinyet, resume sonrası düşük tıkanıklıkta kapalı, game-over'da kapalı; game-over'da rozetlerin gizlenmesi, yeni oyunda temiz HUD |
| `tests/ui/screens.test.ts`       | 4    | Başlangıçtan / pause'dan Ayarlar geri dönüşü, `closeSub()`, boş yığında başlangıca dönüş                                                        |
| `tests/ui/keyboard.test.ts`      | 4    | Pause → Ayarlar → Escape → pause → Escape → oyun; Ayarlar açıkken P; pause ekranında Escape/P; başlangıç Ayarlar → Escape                       |
| `tests/ui/landscape-css.test.ts` | 2    | Kısa yatay ekran kuralının varlığı ve yalnızca `#scr-start`'ı hedeflemesi (statik CSS sözleşmesi)                                               |
| `tests/storage/storage.test.ts`  | 40   | Bozuk / eksik / kısmen geçerli `fn_meta` ve `fn_settings`, bilinmeyen ve tekrarlanan rozetler, DAS/ARR sınırları, yükleme ve yeniden kaydetme   |
| `tests/game/scoring.test.ts`     | +1   | Her temizleme türünden sonra `b2b` boolean; mevcut B2B testi `false` bekleyecek şekilde güncellendi                                             |

UI testleri için yeni kütüphane eklenmedi. `tests/helpers/fakeDom.ts`, test edilen modüllerin kullandığı küçük DOM yüzeyini (getElementById, classList, style, olay dinleyicileri, `.screen` sorguları) taklit eder. `tests/helpers/appStubs.ts`, lifecycle için View/Sound/Pixi ticker taklitleridir. Testler gerçek `Game`, `lifecycle`, `screens` ve `InputController` kodunu çalıştırır. Globaller `vi.stubGlobal` ile kurulur ve `unstubGlobals` ile geri alınır. `vitest.config.ts`, CSS sözleşme testinin `src/styles.css`'i `?raw` ile okuyabilmesi için yalnızca bu dosyada CSS işlemeyi açar.

844×390 erişiminin gerçek ölçümü (buton dikdörtgenleri, kaydırma) depoya Playwright gibi bir E2E aracı eklememek için headless smoke'ta yapılır. Depodaki kalıcı test yalnızca CSS kuralını korur.

## Komut ve smoke sonuçları

| Komut                  | Sonuç                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                       |
| `npm run lint`         | geçti (0 uyarı)                                             |
| `npm run format:check` | geçti                                                       |
| `npm test`             | 11 dosya, 134/134 (art arda 3 çalıştırma)                   |
| `npm run build`        | geçti; JS 517,60 kB (gzip 157,46), CSS 10,71 kB (gzip 3,14) |
| `npm run check`        | geçti                                                       |

Bundle farkı (NS4-05'e göre): JS +1,16 kB (gzip +0,39 kB), CSS +0,24 kB (gzip +0,08 kB). Yeni bağımlılık yok.

Headless smoke (Playwright, Edge; gerçek cihaz yok, yalnızca emülasyon), proje dışındaki betikle:

- Dev 93/93, production preview 93/93. 70 eski kontrolün 69'u aynen geçiyor. "KNOWN BUG B unchanged" kontrolü düzeltilen davranışı doğrulayan kontrollerle değiştirildi; 24 yeni kontrol eklendi (5 görünümde başlangıç kartı erişimi, Ayarlar dönüşleri, vinyet, game-over rozetleri, bozuk storage). Sayfa hatası, konsol hatası ve başarısız istek yok.
- Aynı betik NS4-05 build'ine karşı çalıştırıldığında yeni kontroller beklenen yerlerde başarısız oluyor: 844×390 erişim, A, B, D ve başlangıç Ayarlar Escape. B nedeniyle akış sonradan takılıyor.
- Tohumlu ekran görüntüleri, NS4-05 ile beş görünümde (390×844, 844×390, 768×1024, 1366×768, 1920×1080) başlangıç, Ayarlar ve Nasıl oynanır ekranlarında karşılaştırıldı. Yalnızca 844×390 başlangıç ekranı değişti; diğer 14 görüntü piksel piksel aynı. Oyun içi HUD, pause ve game-over görüntülerinde 172 geometri/stil kaydında 0 fark var. 390×844 game-over görüntüsündeki küçük fark rastgele "Sıradaki" önizlemesinden gelir; NS4-05'te aynı kodun iki çalıştırması arasında da görülür.
- 844×390: Oyna, Nasıl oynanır ve Ayarlar kart içinde kaydırmadan görünür (Ayarlar alt kenarı 316 px, kart alt kenarı 380 px). İpucu ve uyarı metni kart içinde kaydırılarak okunur.
- Referans mekanik değerleri tarayıcıda ve testte değişmedi: +138, +1732, +3800, 538 / 638 / 738.
