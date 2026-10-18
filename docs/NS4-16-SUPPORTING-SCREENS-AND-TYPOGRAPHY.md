# NS4-16 · Yardımcı ekranlar ve tipografi

Bu görevde değişmeyenler:

- sağlık metinleri, tetromino/blok görünümü, efektler, ses/haptik ve oyun mekanikleri;
- font aileleri, tek tema ve ana menü (başlangıç ekranı);
- `fn_settings` anahtarları, CTA metinleri, URL ve UTM değerleri.

Yeni bağımlılık eklenmedi.

## 1. Kaldırılan izinsiz metin

NS4-15'te sıklamen bitişine eklenen popup kaldırıldı:

> “Puan ×2 · 30 sn · sıklamen tek kullanımlık”

- `src/app/events.ts` içindeki satır silindi; yerine yeni metin eklenmedi.
- Korunanlar:
  - onaylı “Sıklamen özütü / Ozmotik drenaj başladı” popup'ı;
  - “Ferah nefes ×2 · N sn” rozeti ve sayacı;
  - sıklamen görsel efekti (`GameView.cycBoost`).
- `docs/NS4-15-…` raporu tarihsel kayıt olarak değiştirilmedi. O rapordaki popup satırı artık geçerli değildir.

## 2. Ekranlar

Görünür metinler `a67fe7f` ile birebir aynıdır (testle sabitlendi). Tek ekleme, görevin istediği Ayarlar grup başlıklarıdır: **Ses**, **Oynanış**, **İleri ayarlar**.

Dört ekranın ortak özellikleri:

- Oyunun üstünde koyu turkuaz, hafif bulanık bir arka plan (`.screen-dim`) kullanılır. Açık kart, tahta ve bloklarla karışmaz.
- Odak davranışı NS4-10'daki gibidir: ilk buton (Oyun sonunda kart) odak alır ve kapanınca açan öğeye döner.
- Escape akışı NS4-06'daki gibidir.

### Mola

- “Mola” başlığının hemen altında **Devam et**: daha yüksek (58 px), ana eylem.
- Ardından ikincil satır: Ayarlar / Ana menü (çerçeveli).
- Sonra ipucu kutusu (sağlık bilgisi; içerik aynı).
- En altta üçüncül, altı çizili “Sinüs sağlığı rehberi” bağlantısı ve yeni sekme işareti.
- Tab sırası değişmedi: Devam et → Ayarlar → Ana menü → rehber.

### Ayarlar

- Üç grup, her biri açık turkuaz bir zemin üzerinde ve büyük harfli küçük başlıklı (`fieldset` / `legend`):

  | Grup          | Ayarlar                     |
  | ------------- | --------------------------- |
  | Ses           | Ses efektleri, Ortam müziği |
  | Oynanış       | Titreşim, Hayalet parça     |
  | İleri ayarlar | DAS, ARR, FPS göstergesi    |

- **FPS** daha küçük ve soluk yazıyla geri planda.
- **DAS/ARR** açıklamaları ve sınırları aynı (50–300, 0–100, adım 1).
- Kontroller yerel checkbox ve range öğeleridir; etiket içindedir, klavye ile kullanılır.
- “Kaydet” kartın altında sabit durur; uzun içerik gövdede kayar.
- Tema seçeneği yok.

### Nasıl oynanır

- **Dokunmatik** ve **Klavye** iki grup halinde gösterilir. 760 px ve üstünde yan yana durur.
- Her kontrol çifti ince çizgiyle ayrılır. Tuşlar `kbd` tuş görünümündedir; metin aynıdır.
- İçerik kart gövdesinde kayar:
  - dokunmatikte doğal kaydırma (`touch-action: pan-y`, `overscroll-behavior: contain`);
  - klavyede odaklanabilir bölge (`tabindex="0"`, başlıkla adlandırılmış `region`).
- Eylemler altta sabit ve ayrı ağırlıktadır: **Tamam** (geri dönüş, çerçeveli) / **Öğreticiyle oyna** (oyunu başlatır, dolu).

### Oyun sonu

Sıralama:

1. Yeni rekor.
2. Skor / Drenaj / Rekor. Skor ayrı vurgulanır.
3. Rozetler.
4. Sağlık yönlendirmesi.
5. **Tekrar oyna**: ana eylem, 56 px, dolu.
6. Ana menü (çerçeveli).

Ayrıntılar:

- **Sağlık yönlendirmesi:** metin ve CTA hafif turkuaz bir kutu içindedir. CTA beyaz zeminli ve turkuaz çerçevelidir; dolu reklam bandı değildir.
- **Rozetler:**

  | Durum      | Görünüm                                             |
  | ---------- | --------------------------------------------------- |
  | Kazanılmış | dolu açık pembe, onay işaretli daire                |
  | Yeni       | koyu pembe, beyaz halka                             |
  | Kilitli    | şeffaf zemin, kesik kenarlık, soluk yazı, boş daire |

  Her rozet `data-state` taşır.

- **Kısa yatay ekran** (≤ 520 px yükseklik, ör. 844×390): kart iki sütundur. Özet soldadır; sağlık, eylemler ve ipucu sağdadır. Önceden kaydırma gereken **Tekrar oyna** artık hemen görünür.

## 3. Tipografi

**Ortak tokenlar** (`:root`):

| Kademe         | Token                     | Değer |
| -------------- | ------------------------- | ----- |
| Görünür başlık | `--fs-display`            | 44    |
| Başlık         | `--fs-title`              | 28    |
| Bölüm          | `--fs-section`            | 17    |
| Giriş          | `--fs-lead`               | 16    |
| Gövde          | `--fs-body`               | 15    |
| Arayüz         | `--fs-ui`                 | 14    |
| Yardımcı       | `--fs-caption`            | 12    |
| Buton          | `--fs-button`             | 18    |
| İstatistik     | `--fs-stat`               | 22    |
| HUD            | `--fs-hud-*`, `--fs-pop*` | —     |

Ölçek 1'deki değerler önceki sabit değerlerle aynıdır.

**Yardımcı ekran kartları (`--ui-scale`):** büyük ekranlarda medya sorgusuyla büyür.

| Görünüm     | Ölçek |
| ----------- | ----- |
| ≥ 1500×860  | 1,12  |
| ≥ 1880×1020 | 1,25  |
| ≥ 2400×1340 | 1,45  |

Başlangıç ekranı (ana menü, kapsam dışı) ölçeklenmez.

**HUD (`--hud-scale`):** `ui/hud.ts` tahta hücresine göre atar: `hudScale = hücre / 40`, 1 ile 1,4 arasında. Portrede her zaman 1 olduğundan mobil ölçüler aynı kalır.

| Görünüm                                 | Hücre | Ölçek | Skor      | İkincil satır | Buton     | Alt metin |
| --------------------------------------- | ----- | ----- | --------- | ------------- | --------- | --------- |
| 390×844 / 844×390 / 768×1024 / 1366×768 | —     | 1     | aynı      | aynı          | aynı      | aynı      |
| 1600×900                                | 43    | 1,075 | 32 → 34,4 | 13 → 14       | 14 → 15,1 | 11 → 11,8 |
| 1920×1080                               | 52    | 1,3   | 32 → 41,6 | 13 → 16,9     | 14 → 18,2 | 11 → 14,3 |
| 2560×1440                               | 56    | 1,4   | 32 → 44,8 | 13 → 18,2     | 14 → 19,6 | 11 → 15,4 |

Bütün görünümlerde HUD metinleri kutularının içinde kalır.

## 4. Görsel eşitlik (`a67fe7f` ile)

Tohumlu karşılaştırma, reduced motion altında, 7 görünümde yapıldı.

**Ana menü kartı:** 7 görünümde de **0 piksel** fark.

- 1600 px ve üstünde fark yalnızca kartın dışında, yarı saydam menü arka planının arkasında görünen HUD'dadır (HUD büyüdüğü için).

**Oyun içi HUD** (390×844, 844×390, 768×1024, 1366×768): ölçek 1'de, renk kanalı farkı en fazla 1 olan yumuşatma gürültüsü dışında aynı.

## 5. Dev ekran gösterimi

Yalnızca development'ta, tarayıcı konsolunda `__fn.ui` vardır (`src/dev/screensDemo.ts`):

```js
__fn.ui.pause(); // Mola (menüdeyse önce oyun başlatılır)
__fn.ui.settings(); // Ayarlar
__fn.ui.how(); // Nasıl oynanır
__fn.ui.over(); // Oyun sonu: yeni rekor + yeni/kazanılmış/kilitli rozet örneği
__fn.ui.over({ best: false, badges: 'none' }); // rekorsuz, bütün rozetler kilitli ('all': hepsi kazanılmış)
```

- Production paketinde yer almaz; dinamik import yalnızca `import.meta.env.DEV` dalındadır.
- Storage'a yazmaz: oyun sonu örneği gerçek kayıt akışını çalıştırmaz, yalnızca ekranı örnek değerlerle çizer.

## 6. Testler

Toplam **440 test** (NS4-15: 413; +27). `tests/ui/supporting-screens.test.ts` kapsamı:

- izinsiz metnin hiçbir kaynakta olmaması;
- onaylı sıklamen popup'ı ve ×2 rozet metni;
- dört ekranın görünür metninin `a67fe7f` ile aynı olması;
- Mola: eylem hiyerarşisi, Tab sırası, koyu arka plan; Escape → Mola (odak Devam et) → Ayarlar → Escape → Mola → Escape → oyun;
- Ayarlar: gruplar ve anahtarlar, yerel kontroller, sınırlar, kalıcılık (`fn_settings` yazma ve yeniden yükleme);
- Nasıl oynanır: kayan gövde, sabit eylemler, klavye bölgesi, iki grup, `kbd`;
- Oyun sonu: hiyerarşi, sakin CTA, kısa yatay iki sütun;
- CTA URL ve UTM değerleri (`game_over`, `pause_menu`);
- rozet durumları ve sınıfları;
- tipografi tokenları, HUD ölçeği (7 görünüm, monoton, ≤ 1,4), kart ölçeği ve mobil taşma kuralları.

`tests/ui/feedback-wiring.test.ts` güncellendi. Sıklamen bitişinde popup eklenmediğini ve ×2 rozetinin ve sayacının (30 → 20 sn → kapanır) çalıştığını doğrular.

## 7. Doğrulama

| Komut           | Sonuç                                                    |
| --------------- | -------------------------------------------------------- |
| `npm run check` | geçti (typecheck, lint, format, 30 dosya 440/440, build) |

Headless tarayıcıda (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

| Kontrol                                 | Sonuç                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Smoke                                   | dev 104/104, production 104/104; sayfa ve konsol hatası, başarısız istek yok; production'da `__fn` yok |
| Klavye Tab                              | dev ve production 34/34                                                                                |
| Öğretici                                | dev ve production 61/61                                                                                |
| Dokunma                                 | 36/36                                                                                                  |
| Ana menü erişilebilirlik                | 35/35                                                                                                  |
| Yardımcı ekran denetimi                 | 126/126                                                                                                |
| Ayarlar ve Nasıl oynanır klavye/dokunma | 16/16                                                                                                  |
| HUD denetimi                            | 7 görünümde sorun yok                                                                                  |

- **Yardımcı ekran denetimi** (7 görünüm × Mola / Ayarlar / Nasıl oynanır / Oyun sonu): kart ekran içinde; yatay taşma veya kesilen metin yok; butonlar ≥ 44 px; ana eylem kaydırmadan görünür; Escape akışı doğru. Görüntüler gözle incelendi.
- **Ayarlar ve Nasıl oynanır, klavye ve dokunma:**
  - Ayarlar'da Tab döngüsü grup sırasıyla ilerler. Space checkbox'ı değiştirir, ok tuşları DAS'ı değiştirir. Değerler kaydedilir ve yeniden yüklemede korunur.
  - Nasıl oynanır'da Tab sırası Tamam → Öğreticiyle oyna → içerik bölgesidir; End tuşuyla kayar. 390×844 ve 844×390'da gerçek dokunma sürüklemesi içeriği sona kadar kaydırır; eylemler görünür kalır.
  - Dev gösterimi dört ekranı açar ve storage'a yazmaz.

**Mekanik referanslar** değişmedi: +138, +1732, +3800, 538 / 638 / 738.

**Paket farkı** (`a67fe7f`'e göre):

| Dosya | Fark                                                              |
| ----- | ----------------------------------------------------------------- |
| JS    | +0,16 kB                                                          |
| CSS   | 20,10 → 27,62 kB (+7,5 kB; gzip +1,5 kB)                          |
| HTML  | 16,47 → 18,67 kB (+2,2 kB; yeni yapı, tuş işaretleri ve yorumlar) |

`legacy/Ferah Nefes · Sinüs Bulmacası.html` SHA-256 değeri değişmedi.
