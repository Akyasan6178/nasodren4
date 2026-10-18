# NS4-11 · Responsive tahta ölçeklendirmesi

Büyük ekranlarda tahta artık mevcut alanı kullanıyor. Mobil, tablet ve 1366×768 düzenleri piksel düzeyinde aynı kaldı. Değişiklik yalnızca `src/rendering/layout.ts` içinde. Oyun mekaniği, hızlar, HUD tasarımı, menü/overlay kartları, Pixi blok paleti, device pixel ratio sınırı ve input eşikleri değişmedi.

## Eski ve yeni yaklaşım

Yatay düzende hücre zaten kullanılabilir alandan hesaplanıyordu:

```
cell = floor(min((H − 2·pad) / 20, (W − 2·pad − 56) / (10 + 2·6)))
```

Ancak sonuç sabit `min(…, 40)` ile kesiliyordu. 1600×900'de 43, 1920×1080'de 52, 2560×1440'ta 70 olması gereken hücre 40'ta kalıyor, tahta 400×800'de donuyordu.

Yeni yaklaşım:

- **Hücre:** aynı yükseklik/genişlik hesabı korunur; üst sınır `MAX_CELL = 56` px, alt sınır `MIN_CELL = 12` px. Sınır yalnızca çok büyük ekranlarda (2560×1440 ve üstü) devreye girer ve tahtanın kontrolsüz büyümesini engeller. Tahta yatay düzende ekran alanının en fazla ~%26'sını kaplar (test sınırı %30).
- **Yan butonlar:** yükseklik hücreyle orantılı ama 52..72 px aralığında (`cell × 1,6`). Önceden yalnızca alt sınır vardı; büyük hücrede butonlar gereksiz uzayacaktı.
- **Sıradaki paneli:** 13 → 13,6 hücre. Beşinci parça 12,6 + 0,62 = 13,22 hücreye iniyor ve paneli 0,22 hücre (1366×768'de ~8 px) taşıyordu. Bu NS4-10'da da var olan bir taşmaydı. Slot konumları ve parça boyutları aynı kaldı.
- **Portre:** telefon/tablet düzeni ve 44 px üst sınırı değişmedi.

Hold, Next, istatistik ve buton alanları hücreyle orantılı (yan sütun 6 hücre) büyür. Boş yatay alan, tahta ortada kalacak şekilde iki yana eşit dağılır.

## Viewport ölçüleri

| Viewport  | Düzen  | Hücre (önce → sonra) | Tahta (sonra) | Tahta x, y | Not                                           |
| --------- | ------ | -------------------- | ------------- | ---------- | --------------------------------------------- |
| 390×844   | portre | 32 → 32              | 320×640       | 35, 114    | aynı                                          |
| 844×390   | yatay  | 18 → 18              | 180×360       | 332, 15    | aynı (Next paneli taşmayı önlemek için uzadı) |
| 768×1024  | portre | 41 → 41              | 410×820       | 179, 115   | aynı                                          |
| 1366×768  | yatay  | 37 → 37              | 370×740       | 498, 14    | aynı (Next paneli uzadı)                      |
| 1600×900  | yatay  | 40 → 43              | 430×860       | 585, 20    | büyüdü                                        |
| 1920×1080 | yatay  | 40 → 52              | 520×1040      | 700, 20    | büyüdü (400×800 sınırı kalktı)                |
| 2560×1440 | yatay  | 40 → 56              | 560×1120      | 1000, 160  | `MAX_CELL` ile sınırlı                        |

## Mobilde korunanlar

- 390×844, 844×390 ve 768×1024'te tahta, hücre ve Pixi görüntüsü NS4-10 ile piksel piksel aynı.
- Alt kontrol butonları, Pause, dar düzen etiketleri ve safe-area kuralları değişmedi.
- Dokunmatik eşikler her olayda güncel `L.cell` üzerinden hesaplanıyor (0,45 hücre eksen seçimi, 0,9 hücre adım). Testle doğrulandı: 2,2 hücrelik sürükleme her ölçekte 2 sütun, 0,4 hücre hiç hareket; resize sonrası yeni hücre boyutu kullanılıyor.

## Ölçek, texture ve resize

`GameView.layout()` her yeniden yerleşimde blok atlasını `cell × resolution` çözünürlüğünde yeniden üretir ve eski atlas/doku/dalga dokularını serbest bırakır; bu davranış değişmedi.

Tarayıcıda gerçek resize ile kontrol edildi: dev, `window.__fn`; dpr 1 ve 2; 1920×1080 → 1366×768 → 2560×1440 → 1600×900 → 1080×1920 → 390×844 → 844×390 → 768×1024 → 1920×1080. Sonuç 130/130:

- DOM tahtası layout tahtasıyla aynı; 10×20 oranı korunuyor.
- Canvas arka tamponu = sahne × resolution.
- Blok dokusu = hücre × resolution (dpr 2'de 1920×1080'de 104 px, 2560×1440'ta 112 px). Bulanıklık yok.
- Bir önceki atlas her resize'da serbest bırakılıyor, güncel atlas geçerli.
- Sahnedeki sprite sayısı bütün adımlarda 672: çift render yok.
- Next ve Hold parçalarının Pixi sınırları panellerin içinde.
- Portre/yatay bayrağı doğru; resize sonrası oyun klavyeye yanıt veriyor.

## Testler

Toplam **265 test** (NS4-10: 222; +43).

| Dosya                            | Test | Kapsam                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/game/scaling.test.ts`     | 28   | 7 viewport'ta 10×20 oranı, sınırlar ve ekrana sığma; `MAX_CELL` (2560×1440, 3840×2160, 5120×2880); mobil/tablet/1366 ölçüleri ve düzen bayrakları; 1600+ büyüme, 1920×1080 = 520×1040; aynı oranda monoton büyüme; tahta alanı ≤ %30; yan buton 52..72 px; Hold/Next parçaları panel içinde; resize ve portre/yatay geçişi |
| `tests/ui/pointer-scale.test.ts` | 5    | 4 ölçekte pointer sürüklemenin hücre cinsinden aynı sonuç vermesi; resize sonrası güncel hücre                                                                                                                                                                                                                             |
| `tests/game/layout.test.ts`      | +10  | 1600×900 ve 2560×1440 eklendi (taşma, çakışma, hedef boyutu). 1920×1080 tahta beklentisi bilinçli olarak 400×800 → 520×1040 güncellendi                                                                                                                                                                                    |

Değişiklikten önce yeni testlerin 15'i başarısızdı; Next paneli taşması 5 yatay viewport'ta testle yakalandı.

## Doğrulama

| Komut                  | Sonuç                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                          |
| `npm run lint`         | geçti (0 uyarı)                                                |
| `npm run format:check` | geçti                                                          |
| `npm test`             | 21 dosya, 265/265 (art arda 3 çalıştırma)                      |
| `npm run build`        | geçti; JS 519,07 kB (gzip 157,98), CSS 18,59 kB, HTML 15,38 kB |
| `npm run check`        | geçti                                                          |

Bundle farkı (NS4-10'a göre): JS +0,03 kB (gzip +0,02 kB); CSS ve HTML aynı.

Headless tarayıcı (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

- Smoke: dev 104/104, production preview 104/104. Sayfa hatası, konsol hatası ve başarısız istek yok.
- Gerçek klavye Tab sırası ve odak (NS4-10 betiği): dev ve production 34/34. Ana menü erişilebilirlik ölçümü 35/35.
- 7 viewport HUD denetimi: tahtaya, birbirine veya ekran dışına taşan öğe yok; kesilen metin yok; Pause görünür. Rozetler tahta içinde.
- Pixi tahtası: 390×844, 844×390, 768×1024 ve 1366×768'de NS4-10 ile piksel piksel aynı; 1600+ beklenen şekilde büyük.
- Ana menü kartı:
  - geometri bütün viewport'larda aynı;
  - oyun katmanı gizlenince kart görüntüsü 6 viewport'ta aynı;
  - 1366×768'deki 284 px fark aynı build'in iki çalıştırması arasında da görülüyor (yakalama gürültüsü).
  - Oyun katmanı açıkken farklar, yarı saydam kartın arkasında büyüyen tahta ve uzayan Next panelinden geliyor.
- Referans skorlar tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.

## Sonraya bırakılanlar

- DOM HUD yazıları (skor, etiketler, buton metinleri) sabit piksel boyutunda; 1920×1080 ve üstünde tahtaya göre küçük kalıyor. Tipografi ölçeğinin hücreyle birlikte büyütülmesi HUD tasarım aşamasına bırakıldı.
- Portre üst sınırı (44 px) dikey masaüstü monitörlerde tahtayı sınırlayabilir; telefon/tablet düzenini korumak için değiştirilmedi.
