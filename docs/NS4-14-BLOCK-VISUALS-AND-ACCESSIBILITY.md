# NS4-14 · Blok görünümü ve renk dışı ayırt ediciler

Bloklar daha kontrollü bir derinlik ve yüzey kazandı. Yedi tetromino türü artık renkten bağımsız, türe özgü küçük bir yüzey işaretiyle de ayırt edilir.

- Tetromino şekilleri, kimlikleri, blok paleti (`COLORS`), mekanik, skor, HUD, menüler ve efektler değişmedi.
- Çizim yalnızca `src/rendering/textures.ts` içinde. `GameView` yalnızca aktif parça için yeni atlas satırını kullanır.
- Haricî görsel veya bağımlılık eklenmedi.

## Yeni blok görsel yaklaşımı

- **Sabit blok:** aynı yuvarlatılmış, yumuşak degradeli gövde. Ek olarak:
  - alt kenarda hafif bir iç gölge (kontrollü derinlik);
  - aynı tonun koyusuyla kenar ayrımı.
  - Parlama lekesi ve radyal parlaklık bir kademe yumuşatıldı (0,55 / 0,75 → 0,45 / 0,62), bloklar daha az “jel/plastik” görünür.
- **Aktif (düşen) parça:** aynı gövde, biraz daha parlak, ek **açık iç kenar** (beyaz, %85). Sabit bloklardan şekil düzeyinde ayrılır.
- **Hayalet (iniş önizlemesi):** yarı saydam dolgu, **kesik kenar** ve %50 opak soluk işaret. Aktif parçanın düz, dolu görünümüyle karışmaz; baskın değildir.
- **Garbage / inflamasyon:** parlama lekesi ve işaret yok, daha düz degrade, iki ince **çapraz tarama** çizgisi. Gri ton korunur; normal türlerden doku düzeyinde ayrılır, tıbben gerçekçi değildir.

## Tetromino işaretleri

| Tür | Renk    | İşaret          |
| --- | ------- | --------------- |
| I   | turkuaz | kısa çizgi (—)  |
| O   | sarı    | nokta (●)       |
| T   | pembe   | dikey yay ( ) ) |
| S   | yeşil   | halka (○)       |
| Z   | mercan  | çapraz (×)      |
| J   | mavi    | çift nokta (••) |
| L   | turuncu | üçgen (▲)       |

- İşaretler her hücrenin ortasında, hücrenin yaklaşık üçte biri boyutunda. Harf yoktur.
- Sprite'lar döndürülmediği için işaret parçanın yönünü ima etmez.
- Mürekkep blok renginin koyu tonudur (renk × 0,32, %90 opak). Her türde blok rengine karşı ≥ 3,4:1 (en düşük pembe T 3,48:1); gri tonlamada da geçerli.
- T için önce yatay yay denendi. Parlama lekesiyle birlikte “gülen yüz” izlenimi verdiği (çocuk oyuncağı görünümü) için dikey yaya çevrildi.
- **Hold ve Next:** aynı sabit blok dokusu ölçeklenerek kullanılır. 18 px'lik en küçük oyun hücresinde ve ~11–15 px'lik önizlemelerde işaretler okunur kalıyor; ayrı bir sadeleştirme gerekmedi. Parçalar panellerin içinde (NS4-11 kontrolü yeniden geçti).

## Gri tonlama ve renk görme emülasyonu

Tarayıcıda Chrome DevTools `Emulation.setEmulatedVisionDeficiency` ile ölçüldü: yok, akromatopsi (gri tonlama), döteranopi, protanopi, tritanopi. 1366×768 ve 390×844'te, DPR 2.

Vitrin tahtası geçicidir (yalnızca bu ölçüm için, dev `window.__fn`): 7 tür + garbage sütunları, aktif parça ve hayalet. Her türün hücresinde işaret pikselleri ayrıştırılıp türler arası örtüşme (IoU) hesaplandı:

| Mod                                                       | En benzer çift (IoU) | İşaret pikselleri (tür başına) | Garbage'da işaret |
| --------------------------------------------------------- | -------------------- | ------------------------------ | ----------------- |
| normal / akromatopsi / döteranopi / protanopi / tritanopi | O–L, 0,52–0,53       | her türde ≥ 64 piksel          | 0                 |

- Bütün modlarda yedi işaret de seçilebilir durumda; en benzer çift (nokta–üçgen) bile yarıdan fazla farklı. Görüntüler gözle de incelendi.
- Gri tonlamada türler yalnızca işaretle ayrılabiliyor.
- Hayalet kesik kenarı, aktif açık iç kenarı ve garbage taraması renkten bağımsız olarak ayrılıyor.
- Sıklamen ve rebound renkleri yalnızca DOM rozet ve butonlarında kullanılır (metinli). Tahtadaki pembe T ve mercan Z ile karışma riski yok.
- Kullanıcıya ayrı bir renk körlüğü ayarı eklenmedi; yeni görünüm tek ve varsayılan görünümdür.

## Performans ve texture

- **Atlas:** tek atlas, 8 sütun × 3 satır (sabit / hayalet / aktif). Karo adımı `px + 4`, `px = round(hücre × DPR)`.
  - Örnek ölçüler: 390×844 DPR 2 → 64 px karo, 544×204 atlas; 1920×1080 DPR 2 → 104 px karo, 864×324 atlas; 2560×1440 DPR 2 → 112 px karo, 928×348 atlas.
- **Batch:** tahta hücreleri, aktif, hayalet, Hold ve Next sprite'ları aynı taban dokuyu kullanır (tek batch). Sprite havuzu ve sayısı değişmedi (sahnede 672).
- **Ek doku:** yalnızca 8 aktif karo dokusu (aynı atlas üzerinde dikdörtgen); her karede yeni doku veya graphics oluşturulmaz. Atlas yalnızca yerleşimde (hücre/DPR değişince) yeniden üretilir; eski atlas ve dokular (aktif dahil) serbest bırakılır.
- **Resize probu:** dev, `window.__fn`; dpr 1 ve 2; 9 adımlık resize dizisi. Sonuç 132/132:
  - DOM tahtası = layout tahtası;
  - karo = hücre × DPR;
  - atlas 8×3;
  - önceki atlas serbest;
  - sabit / aktif / hayalet / Hold-Next dokuları doğru satırdan;
  - tek taban doku;
  - sprite sayısı sabit (672);
  - GPU doku sayısı her adımda sabit (2).

## Testler

Toplam **397 test** (NS4-13: 376; +21), `tests/rendering/textures.test.ts`. Node'da canvas olmadığı için çizim komutlarını kaydeden bir 2D bağlam taklidi kullanılır:

- yedi türün benzersiz işareti;
- her işaretin farklı çizimi;
- işaretin ortada ve küçük olması;
- 6 hücre/DPR kombinasyonunda atlas ölçüleri ve 24 karo yeri;
- sabit / hayalet / aktif varyantlarının her türde farklı olması;
- sabit blokların renk dışında da benzersiz olması;
- hayaletin kesik kenarı ve aktifin açık iç kenarı;
- garbage'ın parlaklık ve işaret yerine tarama taşıması;
- paletin değişmemesi;
- yedi türde işaret kontrastı ≥ 3:1.

Hold/Next, DPR değişimi, resize temizliği, sprite/doku sayıları ve renk görme emülasyonu tarayıcıda ölçüldü (yukarıda). Mevcut 376 test değişmeden geçiyor.

## Doğrulama

| Komut                  | Sonuç                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                          |
| `npm run lint`         | geçti (0 uyarı)                                                |
| `npm run format:check` | geçti                                                          |
| `npm test`             | 27 dosya, 397/397                                              |
| `npm run build`        | geçti; JS 526,42 kB (gzip 160,64), CSS 20,10 kB, HTML 16,12 kB |
| `npm run check`        | geçti                                                          |

Bundle farkı (NS4-13'e göre): JS +1,92 kB (gzip +0,62 kB); CSS ve HTML aynı.

Headless tarayıcı (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

- **Smoke:** dev 104/104, production 104/104. Sayfa hatası, konsol hatası ve başarısız istek yok.
- **Klavye:** Tab sırası ve odak 34/34. **Öğretici E2E** (klavye + dokunmatik): dev ve production 61/61. **Gerçek dokunma emülasyonu** (390×844, 844×390, 768×1024): 36/36. **Ana menü erişilebilirlik:** 35/35.
- **Yedi hedef görünüm** (390×844, 844×390, 768×1024, 1366×768, 1600×900, 1920×1080, 2560×1440): HUD denetiminde taşma, çakışma veya kesilen metin yok. Görüntüler incelendi.
- **Referans skorlar** tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.
