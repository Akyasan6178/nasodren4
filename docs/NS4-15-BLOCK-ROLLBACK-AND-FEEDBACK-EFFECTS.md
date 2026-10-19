# NS4-15 · Blok görsellerinin geri alınması ve geri bildirim efektleri

## 1. NS4-14 blok görselleri geri alındı

NS4-14'te (`bea7f1a`) yapılan blok görsel değişiklikleri kullanıcı tarafından beğenilmedi. Bunların tamamı **geri alındı**. Bloklar yeniden NS4-13 sonundaki `a700ca8` görünümündedir.

- **Yöntem:** git reset, revert commit veya geçmiş değişikliği kullanılmadı.
  - `src/rendering/textures.ts` ve `src/rendering/GameView.ts` dosyaları `a700ca8` içeriğine seçici olarak döndürüldü (`git show a700ca8:<dosya>`).
  - Efekt çalışması bu temelin üzerine yapıldı.
- **Geri alınanlar:**
  - tür işaretleri (`TYPE_MARK`, `drawMark`);
  - aktif parçanın açık iç kenarı ve atlasın 3. satırı (`activeTex`);
  - iç gölge, parlama ve gölge ayarları;
  - hayaletin kesik kenarı ve işareti;
  - garbage çapraz taraması;
  - NS4-14'e özgü testler.
- `docs/NS4-14-BLOCK-VISUALS-AND-ACCESSIBILITY.md` tarihsel kayıt olarak yerinde bırakıldı. İçindeki blok görünümü artık geçerli değildir.

### `a700ca8` ile eşitlik doğrulaması

Geri alma, efekt çalışmasından önce doğrulandı. Efektler bittikten sonra aynı doğrulama yeniden yapıldı.

- **Kaynak:**
  - `git diff a700ca8 -- src/rendering/textures.ts` boş.
  - `GameView` içindeki blok çizen yöntemler `a700ca8` ile karakter düzeyinde aynı: `buildTextures`, `syncBoard`, `syncPiece`, `placeMini`, `syncQueue`, `setSize`, `mkMini`.
- **Paket:** Geri alma sonrası ve efektlerden önce production JS, `a700ca8` derlemesiyle bayt düzeyinde aynıydı (`index-Ctnyt2lO.js`).
- **Piksel:** Tohumlu vitrin tahtası; 1366×768 ve 390×844, DPR 2.
  - Tahta, Hold ve 1366 Next görüntüleri `a700ca8` dev sunucusuyla **0 piksel** fark verdi.
  - Bu sonuç normal görüş ile akromatopsi, döteranopi ve tritanopi emülasyonlarında geçerli.
  - Kalan küçük farklar ölçüm gürültüsüdür:
    - 390×844 Next: 1409 px;
    - protanopi/tritanopi emülasyonu: 21–23 px.
  - Aynı farklar `a700ca8`'in kendisi iki kez çekildiğinde de (1409 px) ve yeni sürüm iki kez çekildiğinde de (23 px) çıkıyor.
- **Test:** `tests/rendering/textures.test.ts` artık bir regresyon korumasıdır.
  - Atlas 8 sütun × 2 satır (blok + hayalet).
  - Kesik kenar, kırpma veya 3. satır yok.
  - Bütün çizim komut dizisinin parmak izi `a700ca8` çizimine sabitlendi (3 ölçü).
  - Palet değişmedi.
  - Bu test NS4-14 kodunda başarısız olur.

## 2. Geri bildirim efektleri

Kapsam ve sınırlar:

- Bütün efektler yalnızca şunları kullanır: mevcut 420'lik parçacık havuzu, mevcut 10 satır flaşı, sıvı dalga ve `Texture.WHITE` katmanları.
  - Yeni katmanlar: dalga tepesi, tahta ışıması, 4 kenar şeridi, alt bant.
  - Yeni doku, görsel varlık veya bağımlılık yok.
  - Her karede doku oluşturulmuyor.
- Blok dokuları, atlas, hayalet, garbage dokusu ve tetromino renkleri değişmedi.
- Mekanik süreler değişmedi: `lineClearMs` 300, `synClearMs` 260, `drainMs` 800. Bir sonraki hamle gecikmez.
- Efekt tarifleri saf veri olarak `src/rendering/effects.ts` içindedir. Uygulama `GameView` içindedir.

| Olay                          | Görsel dil                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tek/çift/üçlü drenaj          | Açık turkuaz-beyaz flaş. Blok renginde sıçrayan damlalar (eski davranış) ve satırın altından süzülen küçük damlalar. Hücreler aşağı sıkışarak boşalır.                                                                                                                                                                                                                      |
| Tetris – **Ozmotik etki**     | Satır flaşı yüksekliği ~1,9 katına açılır (zar/şişme). Hücreler tahtanın ortasına süzülür. Hücre başına 3 damla (blok rengi / beyaz / turkuaz) kenarlara açılır. Tek vuruşluk turkuaz tahta ışıması ve belirgin sarsıntı (0,5).                                                                                                                                             |
| T-spin – **Nörorefleks etki** | Farklı hareket dili: yerçekimsiz, hızla sönümlenen düz kıvılcımlar. T'nin kilit merkezinden 12 radyal kıvılcım, satırlarda T sütunundan dışa giden mor/pembe/beyaz yatay çizgiler, titreşimli (çok vuruşlu) flaş ve hafif mor ışıma. Satırsız T-spin'de yalnızca küçük bir kıvılcım.                                                                                        |
| Sıklamen                      | Pembe/turkuaz yükselen dalga korunur; üstüne parlak pembe tepe şeridi eklenir. Sıvıya giren her hücre bir kez pembe/turkuaz çözünme parçacığı salar, pembeleşerek erir ve hafifçe yükselir. Bu yalnızca sprite rengidir; doku aynı kalır. Bitişte ×2 başlangıcı: tek pembe vuruş, alttan yükselen kabarcıklar ve “Puan ×2 · 30 sn · sıklamen tek kullanımlık” durum mesajı. |
| Sentetik                      | Hızlı ve keskin: kırmızı flaş daha hızlı söner. Hücreler yatay bir çizgiye sıkışır. İki yana kısa beyaz/pembe çizgiler. Küçük sarsıntı.                                                                                                                                                                                                                                     |
| Rebound                       | Kısa ve kontrollü kırmızı-turuncu uyarı: 640 ms'de iki vuruş, tahta kenarında belirgin çerçeve ve çok hafif zemin. Tam ekran değildir. İlk denemedeki tam tahta örtüsü bulanık kahverengi göründüğü için çerçeveye çevrildi.                                                                                                                                                |
| Garbage gelişi                | Alt satırda kısa gri bant, yukarı itilen gri toz ve sarsıntı (0,35; eskisiyle aynı). Garbage dokusu aynı.                                                                                                                                                                                                                                                                   |

**Ses, haptik ve metin:**

- Ses ve haptik değişmedi.
- Sağlık metinleri, HUD ve menüler değişmedi.
- Tek yeni metin sıklamen bitişindeki ×2 durum mesajıdır (popup).

## 3. Reduced motion

`src/app/motion.ts`, işletim sistemindeki `prefers-reduced-motion: reduce` tercihini okur ve canlı değişikliği izler. CSS tarafı zaten aynı sorguyu kullanıyordu.

NS4-08 tek tema testi güncellendi. İzin verilen tek medya sorgusu bu hareket sorgusudur; tema sorgusu hâlâ yasaktır.

Reduced motion altında:

| Ne                    | Etki                                                               |
| --------------------- | ------------------------------------------------------------------ |
| Sarsıntı              | %25'e iner (hard drop, Tetris, rebound, garbage, oyun sonu dahil). |
| Parçacıklar           | %30'a iner (kesir birikimli, deterministik bütçe).                 |
| Işımalar              | %60'a iner.                                                        |
| Titreşimli flaşlar    | Tek, yumuşak vuruşa iner (Nörorefleks, rebound).                   |
| Ozmotik flaş büyümesi | Yarıya iner.                                                       |
| Durum mesajları       | Aynı.                                                              |
| Mekanik süreler       | Aynı.                                                              |

Örnek ölçüm (tarayıcı, 7 görünüm): Tetris'te canlı parçacık sayısı 160 → 48, en yüksek sarsıntı 0,5 → 0,125.

## 4. Performans ve temizlik

**Parçacık havuzu:** halka tampon, 420 sabit; taşma yok. En yoğun anlar: sıklamen ~230, Tetris 160 canlı parçacık.

**Temizlik:**

- Her efekt bitince flaşlar gizlenir ve yükseklikleri sıfırlanır.
- Işıma, bant ve kenar şeritleri kapanır; dalga ve tepe şeridi kapanır.
- Parçacıklar söner, sarsıntı 0'a iner ve tahta konumu sıfırlanır.
- Hücreler tam boy, opak, renksiz ve atlas dokusunda kalır.
- Yeni oyunda `view.resetFx()` süren her efekti temizler.

**Sahne ve GPU:** sahne düğüm sayısı ve GPU doku sayısı efektlerden sonra sabit kalır. `WHITE`, damla ve dalga dokuları ilk çizimde bir kez yüklenir.

**Resize:** süren efektte eski ölçüdeki parçacıklar bırakılır. Flaş, ışıma, kenar ve dalga yeni hücre boyutuna uyar.

**Paket farkı** (NS4-13 / `a700ca8` derlemesine göre):

| Dosya | Fark                                                          |
| ----- | ------------------------------------------------------------- |
| JS    | 524,51 → 531,28 kB (+6,77 kB; gzip 160,02 → 162,52, +2,50 kB) |
| CSS   | aynı (20,10 kB)                                               |
| HTML  | aynı (16,12 kB)                                               |

## 5. Dev efekt gösterimi

Yalnızca development'ta, tarayıcı konsolunda `__fn.fx` vardır:

```js
__fn.fx.all(); // bütün efektler sırayla (~13 sn)
__fn.fx.drain(1 | 2 | 3);
__fn.fx.tetris();
__fn.fx.tspin(0 | 1 | 2 | 3);
__fn.fx.syn();
__fn.fx.rebound();
__fn.fx.garbage();
__fn.fx.cyc();
__fn.fx.reduced(true); // reduced motion önizlemesi (sayfa yenilenince işletim sistemi tercihine döner)
```

- `src/dev/fxDemo.ts` dosyası `import.meta.env.DEV` dalında dinamik olarak yüklenir. Production paketinde yer almaz; `__fn` production'da yoktur.
- Skor, istatistik, rozet veya storage'a yazmaz; mekanik çalıştırmaz.
- Tahtanın alt satırları geçici olarak doldurulur, efekt bitince eski tahta geri yazılır.
- Oyun sürerken kullanılabilir. Parça kilitlenmesin diye yeni bir oyunun başında kullanmak en iyisidir.

## 6. Testler

Toplam **413 test** (geri alma sonrası 387; +26):

- **`tests/rendering/effects.test.ts`** (20 test). GameView, Node'da gerçek Pixi sahne nesneleri ve sahte canvas ile kurulur (`tests/helpers/pixiView.ts`). Kapsam:
  - tarifler;
  - her efektin başlaması, bitmesi ve temizliği;
  - Ozmotik, Nörorefleks ve sentetik dilleri;
  - sıklamen çözünmesi ve ×2 vuruşu;
  - rebound kenar çerçevesi;
  - garbage;
  - reduced motion (parçacık ≤ %35, sarsıntı ≤ %30, tek vuruş, aynı mekanik süre);
  - havuz taşmaması (25 Tetris + sıklamen + garbage);
  - efekt sırasında resize;
  - `resetFx`;
  - mekanik sürelerin değişmemesi.
- **`tests/ui/feedback-wiring.test.ts`** (6 test):
  - `scored → view.onScored` bağlantısının `clearstart`'tan önce çalışması;
  - rebound ve garbage bağlantıları;
  - ×2 durum mesajı;
  - `resetFx`;
  - hareket tercihinin okunması ve canlı değişimi.
- **`tests/rendering/textures.test.ts`:** `a700ca8` blok regresyon koruması (yukarıda).

## 7. Doğrulama

| Komut                                         | Sonuç             |
| --------------------------------------------- | ----------------- |
| `npm run typecheck` / `lint` / `format:check` | geçti             |
| `npm test`                                    | 29 dosya, 413/413 |
| `npm run build` / `npm run check`             | geçti             |

Headless tarayıcıda yapılan kontroller (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

- **Efekt probu** (dev): 7 görünüm × normal/reduced; 10 efekt; donmuş ara kareler ve görüntüler; temizlik, doku ve düğüm sayısı; efekt sırasında resize; `fx.all()` ve storage. Sonuç 473/473; sayfa ve konsol hatası yok. Görüntüler gözle incelendi.
- **Diğer kontroller:**

  | Kontrol                  | Sonuç                                                                                  |
  | ------------------------ | -------------------------------------------------------------------------------------- |
  | Smoke                    | dev 104/104, production 104/104; hata ve başarısız istek yok; production'da `__fn` yok |
  | Resize (8×2 atlas)       | 132/132                                                                                |
  | Klavye Tab               | 34/34                                                                                  |
  | Öğretici                 | dev ve production 61/61                                                                |
  | Dokunma                  | 36/36                                                                                  |
  | Ana menü erişilebilirlik | 35/35                                                                                  |
  | HUD denetimi (7 görünüm) | sorun yok                                                                              |

- **Referans skorlar** değişmedi: +138, +1732, +3800, 538 / 638 / 738.
- `legacy/Ferah Nefes · Sinüs Bulmacası.html` SHA-256 değeri değişmedi.
