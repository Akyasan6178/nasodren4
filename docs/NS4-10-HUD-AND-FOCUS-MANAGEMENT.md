# NS4-10 · Oyun HUD'ı ve ekranlara göre odak yönetimi

Bu görev, overlay ekranları açıkken arkadaki oyun alanını etkileşime kapatır, ekran geçişlerinde odağı mantıklı yere taşır ve HUD'ın okunabilirliğini iyileştirir:

- güçlendirici durumları dar ekranlarda da metinle okunur,
- ×2 / Rebound rozetleri dar tahtada taşmaz,
- skor hiyerarşisi daha net.

Oyun mekaniği, NS4-07 durum ve metin mantığı, ana menü kartı, Pause / Ayarlar / Nasıl oynanır / Game-over kartları, sağlık metinleri ve Pixi blokları değişmedi. Tahta ölçüleri bütün görünümlerde aynı kaldı.

## Odak ve etkileşim yönetimi

- **`#stage` inert:** canvas ve bütün HUD butonları `#stage` içindedir, overlay ekranları onun kardeşidir. Başlangıç, Ayarlar, Nasıl oynanır, Pause veya Game-over ekranı açıkken `#stage` `inert` olur (`src/ui/screens.ts`). Böylece HUD butonları Tab sırasına girmez, canvas ve butonlar işaretçi olaylarını almaz, arka plan yardımcı teknolojiden gizlenir. `index.html` başlangıç ekranı açık geldiği için `#stage` işaretlemede de `inert` başlar; `initScreens()` açılışta eşitler.
- **Overlay açılınca:** ekranın `[data-focus]` öğesi (Game-over kartı) veya ilk butonu odak alır (mevcut 30 ms gecikme korundu).
- **Overlay kapanınca:** odak oyun alanına (`#stage`, `tabindex="-1"`: programla odaklanır, Tab sırasında değil) döner. Odak bilinçli olarak HUD butonuna geri verilmez: klavyeyle Duraklat'a basılıp Escape ile dönüldüğünde Space yeniden pause yapmaz, hard drop yapar. Oyun alanındaki odakta halka gösterilmez; Tab ile HUD butonlarına geçildiğinde onların odak halkası görünür.
- **Alt ekranlar (Ayarlar, Nasıl oynanır):** geri butonu veya Escape ile dönüldüğünde odak, alt ekranı açan butona (ör. pause'daki “Ayarlar”) geri gelir.
- **Oyun sırasında:** `#stage` inert değildir. Tab sırası Beklet → (etkinse Sıklamen, Sentetik) → Duraklat; devre dışı güçlendiriciler atlanır. Escape / P / geri dönüş davranışları değişmedi. Sayfanın dışına Tab yapmak `window` blur'u ile mevcut otomatik molayı tetikler (önceki davranış).
- Oyun sonu ekranı 950 ms sonra açılır; o süre boyunca oyun durumu “over”dır ve HUD kilitlenmez, ekran açılınca kilitlenir.

## HUD ve responsive değişiklikler

- **Skor birincil:** 28 → 32 px (dar düzende 24 → 27 px), hafif negatif harf aralığı. Nefes seviyesi ve Drenaj ikincil satırda aynen kaldı.
- **×2 / Rebound rozetleri:**
  - Önce: tahtanın alt kenarına göre sabit ofsetlerle, ortalanmış ve `nowrap` idi. 844×390'da (tahta 180 px) Rebound rozeti tahtadan taşıp tıkanıklık etiketinin ve Duraklat'ın üzerine biniyordu.
  - Şimdi: tahta genişliğinde (kenarlardan 8 px içeride), alt kenara hizalı bir sütunda (`#fx-badges`). Dar tahtada metin satır kırar.
  - Metinler ve renkler aynı.
- **Dar düzen butonları:** ikon 19 → 16 px, iç boşluk ve aralık bir kademe küçüldü; kısa durum etiketine yer açıldı. Buton dikdörtgenleri (`computeLayout`) değişmedi.
- **Tahta büyüklüğü:** 390×844 ve 844×390'da tahta zaten ekran yüksekliğiyle sınırlı. 1920×1080'de hücre üst sınırı (40 px) nedeniyle tahta 400×800. Bu sınırı yükseltmek Pixi oyun görünümünü değiştireceği için bu görevde değiştirilmedi; ayrı bir karar gerektirir.
- Safe-area kuralları (`:root` padding `env(safe-area-inset-*)`) değişmedi.

## Dar ekran güçlendirici çözümü

Geniş düzende buton alt metni (NS4-07 metinleri) okunur. Dar (compact) düzende alt metin mevcut CSS ile gizli olduğundan, her güçlendirici butonuna kısa bir durum etiketi (`.chip`) eklendi. Etiket yalnızca dar düzende görünür:

| Durum           | Sıklamen   | Sentetik açıcı  | Etiket görünümü                          |
| --------------- | ---------- | --------------- | ---------------------------------------- |
| Kilitli         | Kilitli    | Kilitli         | gri zemin, ince kenar                    |
| Hazır           | Hazır      | Hazır           | beyaz zemin, turkuaz metin ve kenar      |
| Kullanıldı      | Kullanıldı | —               | beyaz zemin, sıklamen metin ve kenar     |
| ×2 etkin        | ×2 etkin   | —               | dolu koyu sıklamen, beyaz metin          |
| Rebound riski   | —          | Rebound riski   | beyaz zemin, koyu tehlike metni ve kenar |
| Rebound sürüyor | —          | Rebound sürüyor | dolu koyu tehlike, beyaz metin           |

- Durum her zaman metinle ifade edilir; renk ve kenar çizgisi ek ipucudur.
- Butonların erişilebilir adı durumla güncellenir: `aria-label` = “Sıklamen özütü: Hazır · oyunda 1 kez”, “Sentetik açıcı: Rebound sürüyor” gibi. Etiket metni `aria-hidden`'dır, böylece tekrar okunmaz.
- Kısa etiketler `src/ui/powerups.ts` içinde (`CYC_SHORT`, `SYN_SHORT`). Durum mantığı NS4-07 ile aynı.
- 390×844'te en uzun etiket (“Rebound sürüyor”) buton içinde kesilmeden sığıyor; tarayıcıda ölçüldü.

## Testler

Toplam **222 test** (NS4-09: 177; +45). Düzeltmeden önce yeni 20 davranış testinin hepsi başarısızdı. 25 yerleşim testi ise mevcut yerleşimi doğrulayıp kilitleyen koruma testleri olarak baştan geçti.

| Dosya                         | Test | Kapsam                                                                                                                                                                                                                                              |
| ----------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/ui/focus.test.ts`      | 12   | `#stage` başlangıçta inert; menü, Pause, Game-over, Ayarlar ve Nasıl oynanır açıkken inert, oyunda değil; ilk öğeye odak; alt ekrandan açan butona dönüş; Escape akışları; resume sonrası odak oyun alanında (Space pause yapmaz); ana menüye dönüş |
| `tests/ui/hud-states.test.ts` | 8    | Sıklamen ve sentetik bütün durumlarda kısa etiket ve erişilebilir ad; menüye dönüşte sıfırlanma; işaretleme; etiket yalnızca dar düzende; durumların kenar çizgisiyle de ayrılması; rozet sütunu ve satır kırma                                     |
| `tests/game/layout.test.ts`   | 25   | Beş görünümde (390×844, 844×390, 768×1024, 1366×768, 1920×1080): tahta ölçüsü değişmedi; HUD öğeleri ekranda; butonlar ve paneller tahtaya ve birbirine çakışmıyor; Duraklat ve dokunma hedefleri ≥ 44 px                                           |

Sahte DOM (`tests/helpers/fakeDom.ts`) odak takibi, `#stage` / ekran çocukları, `contains`, `setAttribute` ve oyun sonu alanlarıyla genişletildi. Mevcut 177 test değişmeden geçiyor.

## Doğrulama

| Komut                  | Sonuç                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                                                  |
| `npm run lint`         | geçti (0 uyarı)                                                                        |
| `npm run format:check` | geçti                                                                                  |
| `npm test`             | 19 dosya, 222/222 (art arda 3 çalıştırma)                                              |
| `npm run build`        | geçti; JS 519,04 kB (gzip 157,96), CSS 18,59 kB (gzip 4,54), HTML 15,38 kB (gzip 4,48) |
| `npm run check`        | geçti                                                                                  |

Bundle farkı (NS4-09'a göre): JS +0,65 kB (gzip +0,25 kB), CSS +1,43 kB (gzip +0,19 kB), HTML +0,42 kB (gzip +0,11 kB).

Headless tarayıcı (Playwright + Chromium 153; headless Edge bu oturumda da başlatılamadı; gerçek cihaz yok, yalnızca emülasyon), proje dışındaki betiklerle:

- **Smoke:** dev 104/104, production preview 104/104. Sayfa hatası, konsol hatası ve başarısız istek yok.
- **Gerçek klavye Tab sırası** (1366×768 ve 390×844, dev ve production, 34/34):
  - başlangıç: Oyna › Nasıl oynanır › Ayarlar (HUD yok);
  - oyun: Beklet › Duraklat;
  - Pause, Ayarlar, Nasıl oynanır ve Game-over: Tab yalnızca açık ekranda dolaşıyor.
  - Escape alt ekrandan açan butona dönüyor; resume sonrası odak oyun alanında, Space hard drop yapıyor; menü açıkken tahta alanı overlay ile kaplı.
  - NS4-09'da not edilen sorun giderildi: başlangıçta ilk Tab doğrudan Oyna'ya gidiyor.
- **Ana menü erişilebilirlik ölçümü** (beş görünüm, dev ve production): 35/35.
- **Beş görünüm HUD denetimi:** tahtaya, birbirine veya ekran dışına taşan öğe yok; kesilen metin yok (kısa etiketler dahil); Duraklat görünür. 844×390'da Rebound rozeti iki satıra kırılıp tahta içinde kalıyor.
- **Pixi oyun görünümü:** beş görünümde tohumlu tahta görüntüsü NS4-09 ile piksel piksel aynı.
- **Ana menü:** kart geometrisi aynı. Kart görüntüsü dört görünümde aynı. 844×390'da yalnızca metin kenar yumuşatması farkı var (HUD gizlenerek ölçüldü; yarı saydam kartın arkasında değişen HUD görünür).
- **Referans skorlar** tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.
