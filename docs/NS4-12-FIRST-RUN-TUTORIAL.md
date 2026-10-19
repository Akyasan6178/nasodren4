# NS4-12 · İlk oyun için etkileşimli öğretici

İlk oyunda temel kontrolleri oynarken öğreten kısa, atlanabilir bir öğretici eklendi. Öğretici oyunu değiştirmez:

- yalnızca mevcut Game olaylarını dinler (`move`, `rotate`, `harddrop`, `hold`, `scored`, `spawn`);
- input katmanından tek bir isteğe bağlı bildirim alır (yavaş indirme);
- yerçekimi, skor, tahta, parça dizilimi, kontroller ve güçlendirici mekaniği aynıdır;
- `src/game/` ve `src/config/` değişmedi.

## Adımlar

Her adım tek bir eylemle tamamlanır; yanlış eylem adımı ilerletmez. Kart adım sayacını metinle gösterir (“Öğretici · 2/6”).

| #   | Adım         | Klavye                       | Dokunmatik                         | İlerleten olay                                        |
| --- | ------------ | ---------------------------- | ---------------------------------- | ----------------------------------------------------- |
| 1   | Kaydır       | ← →                          | sağa-sola sürükle                  | başarılı `move`                                       |
| 2   | Döndür       | ↑ veya X (Z: ters)           | kısa dokunma                       | başarılı `rotate`                                     |
| 3   | Yavaş indir  | ↓ basılı                     | aşağı yavaşça sürükle              | input `onSoftDrop` (↓ tuşu / sürüklemeyle inen satır) |
| 4   | Anında bırak | Boşluk                       | aşağı fırlat                       | `harddrop`                                            |
| 5   | Beklet       | C veya Shift                 | yukarı fırlat ya da Beklet'e dokun | `hold`                                                |
| 6   | Drenaj       | “Tam satır = drenaj” bilgisi | aynı                               | ilk satır temizleme veya “Tamam”                      |

- Metinler “Nasıl oynanır” ekranındaki kontrol anlatımlarıyla aynı dili kullanır; sağlık içeriği yoktur. Sıklamen ve sentetik açıcı öğretilmez: %35 eşiğindeki mevcut toast ve buton durumları korunur.
- Döndürme adımında aktif blok kare (O) ise blok dönmediği için kart “Kare blok dönmez; sonraki blokla dene.” notunu ekler; yeni blok gelince not kalkar. Bu durum tarayıcı testinde gerçekten yaşandı: O bloğu adımı kilitliyordu.
- Tamamlanınca kısa bir toast gösterilir: “Öğretici tamamlandı. İyi oyunlar!”.

## Masaüstü ve dokunmatik

- Başlangıç anlatımı: dokunmatik ekranlı cihazda (`navigator.maxTouchPoints > 0`) jest, değilse klavye.
- Anlatım son kullanılan girişe göre anında değişir: oyun sırasında bir tuşa basmak klavye, tahtaya dokunmak (`pointerType: touch`) dokunmatik anlatımına geçirir. Fare ile tıklama anlatımı değiştirmez.

## Görsel davranış ve yerleşim

Yerleşim `tutorialRect()` (`src/rendering/layout.ts`) ile hesaplanır:

- **Yan boşluk** (yatay düzen, Sıradaki panelinin sağında ≥ 160 px): kart oraya yerleşir; tahta, HUD ve butonlar tamamen açık kalır. 844×390, 1366×768, 1600×900, 1920×1080, 2560×1440 böyledir.
- **Tahtanın orta bandı** (portre ve dar yatay, ör. 390×844, 768×1024, 667×375): kart tahtanın 4–15. satırları arasında. Parçanın doğduğu üst satırlar ile indiği alt satırlar (hayalet parça dahil) görünür kalır; HUD panellerine, alt butonlara ve Duraklat'a binmez.
- Kart işaretçi olaylarını oyuna bırakır (`pointer-events: none`); yalnızca “Atla” ve “Tamam” tıklanabilir. Tahtanın üzerindeki kartın altında dokunmatik jestler çalışır.
- Tek tema tokenları kullanılır. Giriş animasyonu (`opacity` / `transform`, 0,25 sn) `prefers-reduced-motion` altında kapalıdır.
- Kart odak çalmaz; oyun alanı odakta kalır. Tab sırası: Beklet › (etkinse güçlendiriciler) › Duraklat › Atla.
- Adım metni `aria-live="polite"` ile duyurulur.

## Kullanıcı kontrolü ve kayıt

- **Atla:** kart kapanır ve öğretici bir daha otomatik açılmaz.
- **Tamamlama:** aynı kayıt.
- **Yeniden başlatma:** “Nasıl oynanır” ekranındaki **Öğreticiyle oyna** (Tamam'dan sonra) öğreticiyi baştan göstererek yeni oyun başlatır. Kayıt değişmez; istek tek seferliktir.
- **Kayıt:** ayrı anahtar `fn_tutorial` = `{"done":true}`. `fn_meta` / `fn_settings` şemalarına alan eklenmedi. Yalnızca `done === true` tamamlanmış sayılır. Kayıt yoksa, JSON bozuksa veya biçim farklıysa (`"evet"`, `[true]`, `{"done":"true"}` …) öğretici tamamlanmamış sayılır ve oyun çökmez.

## Oturum davranışı

- **Pause** (Escape / P / buton / otomatik mola): kart gizlenir, adım korunur. **Resume:** aynı adımdan devam.
- **Ana menüye dönüş:** kart kapanır; yarım öğretici tamamlanmış sayılmaz. Aynı oturumda yeni oyun, kalınan adımdan sürer; sayfa yeniden yüklenirse baştan başlar (ilerleme yalnızca bellekte tutulur).
- **Game-over:** kart kapanır, öğretici bozuk durumda kalmaz; yeni oyunda yeniden görünür.
- Bütün overlay'ler kapandığında ekran yığını temizlenir. Böylece “Nasıl oynanır”dan oyun başlatmak eski bir geri dönüş kaydı bırakmaz.

## Testler

Toplam **333 test** (NS4-11: 265; +68).

| Dosya                                | Test | Kapsam                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/tutorial/tutorial.test.ts`    | 14   | İlk oyunda açılma; tamamlanmışsa açılmama; her adımın doğru eylemle ilerlemesi; yanlış ve başarısız eylemin ilerletmemesi; kare blok notu; “Tamam”; Atla; yeniden başlatma; giriş tipi değişimi; pause/resume; ana menü; game-over; klavye/dokunmatik metinleri                             |
| `tests/tutorial/tutorial-ui.test.ts` | 19   | Gerçek lifecycle + InputController + DOM kartı: klavye akışı ve kayıt; Atla; Escape ile pause/resume; ana menü; game-over; kontrollerin, skorun ve yerçekiminin değişmemesi; dokunmatik anlatım ve aşağı sürükleme; bozuk kayıtlar; diğer kayıtlara dokunmama; işaretleme, Tab sırası, odak |
| `tests/tutorial/placement.test.ts`   | 35   | 8 görünümde kart yeri, ekrana sığma, HUD/buton/Duraklat'a binmeme, tahtada yalnızca orta bant; işaretçi olayları, reduced motion, buton hedefleri ve odak halkası                                                                                                                           |

Ayrıca öğretici kodunda 10 küçük bozma (adım kontrolü, kayıt, pause gizleme, menü dönüşü, kayıt doğrulaması, input bildirimleri, Tamam görünürlüğü, yerleşim eşiği) tek tek denendi; 10'unu da testler yakaladı.

## Doğrulama

| Komut                  | Sonuç                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                                                  |
| `npm run lint`         | geçti (0 uyarı)                                                                        |
| `npm run format:check` | geçti                                                                                  |
| `npm test`             | 24 dosya, 333/333                                                                      |
| `npm run build`        | geçti; JS 522,91 kB (gzip 159,42), CSS 20,10 kB (gzip 4,79), HTML 16,12 kB (gzip 4,68) |
| `npm run check`        | geçti                                                                                  |

Bundle farkı (NS4-11'e göre): JS +3,84 kB (gzip +1,44 kB), CSS +1,51 kB (gzip +0,25 kB), HTML +0,74 kB (gzip +0,20 kB).

Headless tarayıcı (Playwright + Chromium 153; gerçek cihaz yok, dokunmatik emülasyon), proje dışındaki betiklerle:

- **Öğretici E2E:** dev ve production'da 61/61. Sayfa hatası, konsol hatası ve başarısız istek yok. Dev'deki bir çalıştırmada geçici bir `ERR_NETWORK_CHANGED` görüldü; tekrar çalıştırmada temiz.
  - Klavye akışı (1366×768): yanlış eylem, pause/resume, ↓ basılı tutma, kare blok notu, kayıt; `fn_meta` korunuyor; yeniden yüklemede açılmama; “Öğreticiyle oyna”; Atla.
  - Dokunmatik akış (390×844): `pointerType: touch` ile sürükleme, dokunma, yavaş sürükleme, aşağı/yukarı fırlatma, Tamam.
  - 8 görünümde kart HUD, buton ve Duraklat'a binmiyor, metin kesilmiyor, tahtada yalnızca orta bantta. Reduced motion altında animasyon yok.
- **Smoke:** dev 104/104, production 104/104. **Tab sırası ve odak:** 34/34. **Ana menü erişilebilirlik:** 35/35.
- **Pixi tahtası:** öğretici kapalıyken 7 görünümde NS4-11 ile piksel piksel aynı. Ana menü kart geometrisi aynı. Oyun katmanı gizli kart görüntüsü 6 görünümde aynı; 1920×1080'de farkların neredeyse tamamı 1/255'lik degrade gürültüsü.
- **Referans skorlar** tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.
