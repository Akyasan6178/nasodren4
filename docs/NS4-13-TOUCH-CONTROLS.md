# NS4-13 · Dokunmatik kontrollerin güvenilirliği

Mobilde yanlış döndürme, istemsiz hard drop, kazara hold ve sürükleme tutarsızlıkları azaltıldı. Jest kuralları saf bir modüle taşındı (`src/input/gestures.ts`, `GestureTracker`). `InputController` yalnızca pointer olaylarını bu modüle iletir.

Klavye kontrolleri, DAS/ARR, oyun mekaniği, denge, HUD ve öğretici metinleri değişmedi. Yeni buton, joystick veya kontrol katmanı eklenmedi; görsel geri bildirim gerekmedi.

## Değiştirilen jest kuralları

| Konu                       | Önce                                                                                    | Sonra                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Dokunma (döndürme)         | Eksen kilitlenmemiş (oynama < 0,45 hücre) ve < 320 ms                                   | Oynama ≤ **0,3** hücre, ≤ **300 ms**, tek parmak. 0,3–0,45 hücre arası titreşim yok sayılır (ne hareket ne döndürme). |
| Bırakış noktası            | Yok sayılıyordu; ara `pointermove` gelmeyen hızlı kaydırma dokunma sayılıp döndürüyordu | Bırakış noktası son hareket olarak işlenir; kaydırma dokunma sayılmaz                                                 |
| Eksen kilidi               | 0,45 hücre, baskın eksen, jest sonuna kadar                                             | Aynı (yatay kilitliyken yavaş indirme ve fırlatma olmaz)                                                              |
| Yatay adım / yavaş indirme | 0,9 hücre                                                                               | Aynı. Tam adım katlarındaki kayan nokta hatası giderildi (ör. 2,7 / 0,9 = 2,999…).                                    |
| Hard drop                  | Son ~90 ms hız > 0,75 px/ms ve toplam > 1,2 hücre                                       | Son 100 ms hız ≥ **0,030 hücre/ms** (32 px hücrede 0,96 px/ms), son 100 ms'de ≥ **1,5 hücre** ve toplam ≥ **2 hücre** |
| Hold                       | Hız < −0,6 px/ms ve toplam < −1,4 hücre                                                 | Hız ≥ **0,028 hücre/ms** yukarı (32 px hücrede ~0,9 px/ms), son 100 ms'de ≥ **1,5 hücre** ve toplam ≥ **2 hücre**     |
| Özel eylem                 | Jest başına bir (bırakışta)                                                             | Aynı; jest bittikten sonra gelen olaylar etkisiz                                                                      |
| Zaman                      | `performance.now()`                                                                     | Pointer olayının `timeStamp` değeri (testlerde deterministik)                                                         |

**Neden hücre/ms:** Diğer bütün jest mesafeleri hücre cinsindendir. Mutlak px/ms eşiği küçük hücreli düzende (844×390, 18 px) fırlatmayı gereğinden zorlaştırıyordu: eski 0,75 px/ms orada 0,042 hücre/ms, 32 px hücrede ise 0,023 hücre/ms ediyordu. Artık aynı jest her ölçekte aynı sonucu verir.

**İstemsiz hard drop:** Eski kuralda yavaş aşağı sürüklemenin sonundaki kısa bir sıçrama (ör. son 20 ms'de 0,9 hücre) hard drop yapıyordu, çünkü toplam mesafe zaten büyüktü. Artık hızlı kısmın kendisi de en az 1,5 hücre olmalı. Durup bırakma da fırlatma sayılmaz.

## Çoklu dokunma, iptal ve tahta dışı

- **Tek aktif pointer:** jest sürerken gelen ikinci parmak yok sayılır, hareketleri etkisizdir ve jestin dokunma/fırlatma sonucunu iptal eder. O ana kadar yapılan kaydırma ve indirme kalır. Önceden ikinci parmak aktif jestin üzerine yazılıyordu.
- **Birincil olmayan pointer** (`isPrimary === false`) yeni jest başlatmaz.
- **İptal:** `pointercancel`, `lostpointercapture`, `window` `resize` / `orientationchange`, her yeniden yerleşim (`bootstrap` doLayout → `input.cancelGesture()`), pause ve odak kaybı (`lifecycle.pause` → `resetInput`). Pause dışındayken gelen bırakış da jesti sonuçsuz kapatır.
- **Tahta dışından başlayan jest** oyunu kontrol etmez: jest yalnızca tahta dikdörtgeni ± yarım hücre içinde başlar (`getBoard`). Önceden canvas bütün sahneyi kapladığı için yan paneller ve boşluklar da jest başlatıyordu.

## Döndürme yönü

Kural korundu: sol üçte bir ters, kalanı normal döndürme. Ancak ölçü **ekrandan tahtaya** taşındı. Jestler artık yalnızca tahtada başladığı için yatay düzende ekranın sol üçte biri tahtanın dışında kalıyordu; 844×390'da tahta x 332–512, ekranın üçte biri 281'de bitiyor. Ters döndürme dokunmayla erişilemez olurdu.

Portrede tahta ekran genişliğine yakın olduğundan davranış pratikte aynıdır. “Nasıl oynanır” ekranındaki açıklama buna göre tek kelimeyle düzeltildi: “ekranın sol üçte biri” → “tahtanın sol üçte biri”. O parçasının dönmemesi hata üretmez.

## Öğretici uyumu

Öğretici değişmedi: kaydırma (`move`), döndürme (`rotate`), yavaş indirme (`onSoftDrop`), hard drop (`harddrop`) ve hold (`hold`) aynı olaylarla ilerler. Titreşim ve yanlış jest adımı ilerletmez; testle doğrulandı. Dokunmatik anlatım geçişi (`pointerType: touch`) aynı.

## Testler

Toplam **376 test** (NS4-12: 333; +43). Testler gerçek zaman beklemez; zaman damgaları ve koordinatlar deterministiktir.

| Dosya                          | Test | Kapsam                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/input/gestures.test.ts` | 22   | İki yönde dokunma; 0,3 hücreye kadar titreşimde dokunma, 0,3–0,45 arasında hiçbir şey; uzun basma; ara hareketsiz hızlı kaydırma; yatay sütun sayısı ve geri sürükleme; duvar; eksen kilidi; yavaş indirme; hard drop hız/son mesafe/toplam eşikleri ve yavaş sürükleme sonundaki sıçrama; hold eşikleri; sabit eşikler; jest başına tek özel eylem; ikinci parmak; iptal                                                           |
| `tests/input/touch.test.ts`    | 21   | Gerçek InputController + lifecycle + öğretici: tahtanın sol üçte biriyle iki yönde döndürme; O parçası; titreşim; sütun sayısı; tahta dışı başlangıç; yavaş indirme, hard drop, hold ve kısa yukarı hareket; hold sonrası ikinci işlem yok; ikinci parmak; `pointercancel`, `lostpointercapture`, pause, resize ve yeniden yerleşim iptali; öğretici adımları; 390×844, 844×390, 768×1024 hücreleriyle emülasyon; klavye regresyonu |

- Aynı entegrasyon testleri NS4-12'deki eski input koduna karşı çalıştırıldığında 21 testin 13'ü başarısız oluyor. Eski kod duvar saatini (`performance.now`) kullandığı için yavaş sürükleme gibi bazı farklar kısmen bundan da kaynaklanır.
- Jest modülünde 13 küçük bozma (eşikler, ikinci parmak, bırakış noktası işleme, aktif pointer filtresi, eksen kontrolü) tek tek denendi; 13'ünü de testler yakaladı.

## Doğrulama

| Komut                  | Sonuç                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                          |
| `npm run lint`         | geçti (0 uyarı)                                                |
| `npm run format:check` | geçti                                                          |
| `npm test`             | 26 dosya, 376/376                                              |
| `npm run build`        | geçti; JS 524,50 kB (gzip 160,02), CSS 20,10 kB, HTML 16,12 kB |
| `npm run check`        | geçti                                                          |

Bundle farkı (NS4-12'ye göre): JS +1,59 kB (gzip +0,60 kB); CSS ve HTML boyutu aynı.

Headless tarayıcı (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

- **Gerçek dokunma emülasyonu:** Chrome DevTools `Input.dispatchTouchEvent`, tarayıcının ürettiği `pointerType: touch` olaylarıyla; dev, `window.__fn` ile oyun durumu okunarak. 390×844, 844×390 ve 768×1024'te 36/36, iki çalıştırmada:
  - iki yönde dokunma, titreşim, 2,2 hücre sürükleme, yavaş indirme;
  - hızlı aşağı fırlatma → hard drop; durup bırakma → hard drop yok;
  - kısa yukarı → hold yok; hızlı yukarı → hold;
  - ikinci parmak, tahta dışı başlangıç, jest sırasında resize.
- **Ölçüm notu:** Emülasyonda olaylar ~30–40 ms aralıkla gelir. Gerçek fırlatmada parmak son hareketin hemen ardından kalktığı için betik de böyle uygular; durup bırakma ayrıca test edilir.
- **Öğretici E2E** (NS4-12; dokunmatik akış dahil): dev ve production 61/61.
- **Smoke:** dev 104/104, production 104/104; sayfa hatası, konsol hatası ve başarısız istek yok.
- **Klavye ile Tab sırası ve odak:** 34/34. **Ana menü erişilebilirlik:** 35/35.
- **Referans skorlar** tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.
