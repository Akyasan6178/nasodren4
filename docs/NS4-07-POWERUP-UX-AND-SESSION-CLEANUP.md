# NS4-07 · Güçlendirici durumları ve oturum temizliği

Bu görev, sıklamen ve sentetik açıcı butonlarının durumunu oyuncuya açıkça gösterir. Ayrıca oturumdan ana menüye dönüşte veya yeni oyunda kalan geçici HUD durumlarını temizler. Oyun kuralları, puanlar, süreler, hızlar ve çöp satırı değerleri değişmedi; `src/game/` ve `src/config/` dokunulmadı. Önce regresyon testleri yazıldı ve düzeltmeden önce başarısız oldukları görüldü (yeni 12 testten 10'u).

## Düzeltilen oturum temizliği

Kök neden: `toMenu()` yalnızca tehlike vinyetini gizliyordu. ×2 / Rebound rozetleri, toast, popup'lar ve güçlendirici buton durumları, ana menü arkasında son oyunun hâliyle kalıyordu. Yeni oyunda `resetHud()` önbelleği sıfırlıyor, ama görünen toast ve popup'lar bir sonraki oyuna taşınabiliyordu.

Yeni `clearSessionHud()` (`src/ui/hud.ts`) şunları yapar:

- ×2 ve Rebound rozetlerini gizler,
- tehlike vinyetini kapatır,
- toast'u ve bekleyen popup'ları kaldırır (`clearNotifications()`, `src/ui/notifications.ts`),
- güçlendirici butonlarını yeni oyun başlangıç durumuna (kilitli) getirir,
- HUD önbelleğini sıfırlar.

`lifecycle.toMenu()` ve `lifecycle.start()` bunu çağırır. Menüde `game.update()` ve `updateHud()` çalışmadığı için oyun nesnesindeki süreler görsel durum üretmez; testte ve tarayıcıda doğrulandı. Yarım bırakılan oyunun skoru ve satırları yine kaydedilmez (NS4-01 Not E korunur). Oyun içinde kazanılan rozetin anında kaydedilmesi de değişmedi.

## Güçlendirici durumları

Durum `src/ui/powerups.ts` içinde Game'den türetilir ve butonda `data-state` olarak, alt metinde yazı olarak gösterilir. Butonun etkin/devre dışı olması ve `ready` vurgusu önceki kuralla aynıdır (sıklamen: `canCyc()`; sentetik: `canSyn()`, vurgu yalnızca ilk kullanımdan önce).

| Buton          | Durum     | Koşul                                       | Alt metin                |
| -------------- | --------- | ------------------------------------------- | ------------------------ |
| Sıklamen özütü | `locked`  | kullanılmadı, tıkanıklık < %35              | Tıkanıklık %35’te açılır |
|                | `ready`   | kullanılabilir                              | Hazır · oyunda 1 kez     |
|                | `active`  | kullanıldı, ×2 sürüyor (oynarken)           | Kullanıldı · ×2 etkin    |
|                | `used`    | kullanıldı (drenaj sırasında ve ×2 bitince) | Bu oyunda kullanıldı     |
| Sentetik açıcı | `locked`  | hiç kullanılmadı, tıkanıklık < %35          | Hızlı rahatlama          |
|                | `ready`   | hiç kullanılmadı, kullanılabilir            | Hazır · hızlı rahatlama  |
|                | `risk`    | en az bir kez kullanıldı, rebound yok       | Tekrarı rebound yapar    |
|                | `rebound` | rebound sürüyor (oynarken)                  | Rebound sürüyor          |

- ×2 ve Rebound kalan süreleri mevcut rozetlerde görünmeye devam eder. Buton metni süreyi tekrar etmez; etki bitince rozet gizlenir ve buton `used` / `risk` durumuna geçer.
- `risk` durumunda ikinci ve sonraki kullanım mümkündür; buton etkin kalır, oyuncunun kararı engellenmez.
- Rebound başladığında popup her rebound kullanımında gösterilmeye devam eder. Dekonjestan uyarı toast'u (onaylı mevcut metin, değişmedi) artık oyunda yalnızca bir kez, rebound'un ilk başladığı ikinci kullanımda gösterilir. Önceden her rebound kullanımında tekrar ediyordu.
- Dar (compact) buton yerleşiminde (ör. 390×844, 844×390) alt metinler mevcut CSS ile zaten gizlidir. Bu görünümlerde durum, değişmeyen devre dışı / `ready` görünümüyle anlaşılır.

## Değiştirilen yardımcı metinler

Yalnızca güçlendirici buton alt metinleri değişti:

| Önce                                           | Sonra                                                         |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Sıklamen hazır: “Hazır”                        | “Hazır · oyunda 1 kez”                                        |
| Sıklamen ×2 sürerken: “Bu oyunda kullanıldı”   | “Kullanıldı · ×2 etkin” (bitince “Bu oyunda kullanıldı”)      |
| Sentetik başlangıç: “Hızlı ama geri tepebilir” | kilitli “Hızlı rahatlama”, hazır “Hazır · hızlı rahatlama”    |
| Sentetik kullanımdan sonra: “Kullanım: N”      | “Tekrarı rebound yapar” / rebound sırasında “Rebound sürüyor” |

`index.html` içindeki ilk (oyun öncesi) metinler, popup metinleri, toast metinleri, sağlık ipuçları ve oyun sonu uyarısı değişmedi. Arayüze marka adı eklenmedi.

## Eklenen testler

Toplam **146 test** (NS4-06: 134; +12).

| Dosya                          | Test | Kapsam                                                                                                                                                                                                 |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/ui/powerups.test.ts`    | 5    | Sıklamen kilitli → hazır → kullanıldı → aktif → kullanıldı; ×2 bitince sayaç temizliği; sentetik ilk/ikinci kullanım metinleri; rebound HUD durumu ve bitişi; uyarı toast'unun bir kez gösterilmesi    |
| `tests/ui/session.test.ts`     | 5    | Pause → ana menü sonrası rozet/vinyet/toast/popup/buton temizliği; menüde zamanlayıcıların görsel durum üretmemesi; yeni oyun ve “Tekrar oyna” sonrası temiz HUD; yarım oyunun skorunun kaydedilmemesi |
| `tests/game/constants.test.ts` | 2    | Tahta boyutları ve bütün süre/hız/güçlendirici sabitleri                                                                                                                                               |

`tests/helpers/uiHarness.ts`, gerçek `lifecycle`, `wireGameEvents` ve `updateHud`'u sahte DOM üzerinde birlikte kurar. `fakeDom.ts` popup kutusu için çocuk yönetimi kazandı. `appStubs.ts`, View ve Sound yöntemlerini genel bir kayıt taklidiyle karşılar. Yeni bağımlılık yok.

## Korunan mekanik değerler

Açılma eşiği %35, sıklamen tek kullanım ve 30 sn ×2, sentetik 3 satır, ikinci kullanımda 40 sn rebound (sonraki kullanımlarda uzayan süre), rebound hızı ×1,5, 5 sn sonra ve sonra her 10 sn'de çöp satırı. `constants.test.ts` ve NS4-05 güç testleri bunları doğrular. Referans skorlar testte ve tarayıcıda değişmedi: **+138, +1732, +3800, 538 / 638 / 738**.

## Doğrulama sonuçları

| Komut                  | Sonuç                                           |
| ---------------------- | ----------------------------------------------- |
| `npm run typecheck`    | geçti                                           |
| `npm run lint`         | geçti (0 uyarı)                                 |
| `npm run format:check` | geçti                                           |
| `npm test`             | 14 dosya, 146/146 (art arda 3 çalıştırma)       |
| `npm run build`        | geçti; JS 518,39 kB (gzip 157,71), CSS 10,71 kB |
| `npm run check`        | geçti                                           |

Bundle farkı (NS4-06'ya göre): JS +0,79 kB (gzip +0,25 kB), CSS değişmedi.

Headless smoke (Playwright, Edge; gerçek cihaz yok, yalnızca emülasyon), proje dışındaki betikle:

- Dev 103/103, production preview 103/103; sayfa hatası, konsol hatası ve başarısız istek yok. NS4-06'daki 93 kontrolden metni değişen 3'ü yeni metinlere göre güncellendi. 10 kontrol eklendi: durum metinleri, metinlerin butona sığması, pause → ana menü temizliği, menüde temiz kalma, yarım oyun skoru, menü sonrası yeni oyun.
- Aynı betik NS4-06 build'ine karşı çalıştırıldığında yalnızca bu 9 güçlendirici/oturum kontrolü başarısız oluyor.
- Beş görünümde (390×844, 844×390, 768×1024, 1366×768, 1920×1080) tohumlu başlangıç ekranı görüntüleri NS4-06 ile piksel piksel aynı. Oyun içi buton bölgesinde fark yalnızca sentetik açıcının alt metninde: buton dikdörtgenleri aynı, metin butona sığıyor. Dar görünümlerde alt metin gizli olduğu için fark 0. Pause ve game-over ekranlarında 172 geometri/stil kaydında 0 fark var; görüntü farkı yalnızca rastgele “Sıradaki” önizlemesinde.
- NS4-06 düzeltmeleri (vinyet, pause → Ayarlar → Escape, bozuk storage) ve Not E (yarım oyun kaydedilmez) tarayıcıda yeniden doğrulandı.
