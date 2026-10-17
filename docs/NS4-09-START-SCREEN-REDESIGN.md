# NS4-09 · Başlangıç ekranı yeniden tasarımı

Ana menü (`#scr-start`) daha net bir hiyerarşi, yeni bir sıklamen çizimi ve hafif bir “hava akışı” atmosferiyle yenilendi. Değişiklikler yalnızca başlangıç ekranını kapsar: HUD, oyun, Pause, Ayarlar, Nasıl oynanır ve game-over ekranları aynı. Metinler, sağlık içeriği, fontlar, Pixi blokları ve mekanik değişmedi; JS bundle NS4-08 ile bayt bayt aynı. Yeni bağımlılık veya haricî görsel yok.

## Tasarım kararları

**Hiyerarşi**

- Sıra: çiçek, başlık, açıklama, birincil eylem, ikincil eylemler, ipucu, uyarı.
- Başlık 52 px (büyük ekranda 58 px). “Ferah” koyu metin rengiyle, “Nefes” koyu sıklamen rengiyle yazılır; `<span>` eklendi, metin aynı.
- Açıklama aynen korundu.
- **Oyna** tek güçlü birincil eylem: 56 px yükseklik, sıklamen → koyu sıklamen gradyanı, pembe tonlu gölge.
- **Nasıl oynanır** ve **Ayarlar** ikincil: yarı saydam beyaz yüzey, belirgin kenar çizgisi.
- İpucu kutusu yumuşatıldı. Sağlık uyarısı ince bir ayırıcı çizginin altında, küçük ve ikincil metin renginde: görünür ama Oyna'nın gerisinde.
- Yeni buton, bağlantı veya CTA eklenmedi; marka adı kullanılmadı.

**Sıklamen çizimi** (`index.html` içinde satır içi SVG, `aria-hidden`)

- Aşağı eğik (nodding) çiçek başı, koyu “burun”dan yukarı ve geriye kıvrılan, tabanı daralan beş ayrı taç yaprak.
- Yanda kapalı bir tomurcuk; ince, kıvrık yeşil gövdeler.
- Mermer desenli, kalp biçimli iki yaprak.
- Pembe yapraklar degrade, gövde ve yapraklar doğal yeşil (`--color-leaf`, `--color-leaf-light` tokenları eklendi). Logo veya ambalaj görünümünden kaçınmak için çerçeve, rozet veya yazı yok.

**Atmosfer**

- Ekran zemininde turkuaz (sol üst) ve sıklamen (sağ alt) yumuşak radyal ışıklar.
- Tam ekran, dekoratif bir SVG'de dört ince hava akışı eğrisi.
- Kart hafif cam yüzeyli: %90 opak kart rengi, beyaz kenar parlaması, `backdrop-filter`.
- Hareketler yalnızca `transform` / `opacity` kullanır:
  - hava çizgileri 28 sn'de ±%1,5 süzülür,
  - çiçek 7 sn'de çok hafif “nefes alır”,
  - kart açılışta 0,5 sn yumuşakça belirir.
- `prefers-reduced-motion: reduce` altında üçü de kapanır. Partikül, video, WebGL veya büyük asset yok.

**Responsive**

- 844×390 (kısa yatay) kuralı korundu ve uyarlandı: çiçek ile başlık yan yana dizilir, boşluklar sıkışır. Oyna, Nasıl oynanır ve Ayarlar kaydırmadan görünür; ipucu ve uyarı kart içinde kaydırılarak okunur.
- 1600×900 ve üstünde kart 480 px'e ve başlık 58 px'e çıkar.

Bütün renkler NS4-08 tokenlarından gelir. Başlangıç ekranı CSS kurallarında sabit renk yoktur; yalnızca SVG degrade duraklarında çizim renkleri vardır.

## Responsive sonuçlar

Tarayıcı: Playwright + Chromium 153 (headless). Bu oturumda headless Edge başlatılamadı; karşılaştırmalar aynı tarayıcıyla NS4-08 build'ine karşı yapıldı. Gerçek cihaz yok, yalnızca emülasyon.

| Görünüm   | Kart (px) | Oyna / ikincil hedef (px) | Oyna, Nasıl oynanır, Ayarlar kaydırmadan | Uyarı kaydırarak |
| --------- | --------- | ------------------------- | ---------------------------------------- | ---------------- |
| 390×844   | 354 × 632 | 296×56 / 143×52           | evet                                     | evet             |
| 844×390   | 440 × 370 | 394×56 / 192×52           | evet                                     | evet             |
| 768×1024  | 440 × 615 | 382×56 / 186×52           | evet                                     | evet             |
| 1366×768  | 440 × 615 | 382×56 / 186×52           | evet                                     | evet             |
| 1920×1080 | 480 × 622 | 414×56 / 202×52           | evet                                     | evet             |

- HUD ve oyun görünümü: beş görünümde tohumlu oyun içi görüntüler NS4-08 ile piksel piksel aynı (0 px). Buton dikdörtgenleri ve metinleri aynı. Pause ekranında 0 px fark var; geometri/stil farkları yalnızca başlangıç kartında. Game-over görüntüsündeki küçük fark rastgele “Sıradaki” önizlemesinden gelir.
- Açık ↔ koyu sistem tercihi: hesaplanmış stiller her çalıştırmada aynı. Piksel düzeyinde, bu Chromium sürümü bazı yakalamalarda en fazla 3/255'lik GPU gradyan gürültüsü üretiyor. Aynı gürültü NS4-08 build'inde de görülüyor; karşılaştırma bu yüzden ≤ 4/255 toleransla yapıldı ve iki çalıştırmada da geçti.

## Erişilebilirlik ve hareket

Beş görünümde, proje dışındaki betikle (dev ve production, 35/35):

- Varsayılan hareket tercihinde başlangıç ekranında en az iki hafif animasyon çalışıyor; `reduced motion` altında hiç animasyon yok.
- Klavye: Tab ile Oyna'ya gelindiğinde `:focus-visible` ve 3 px düz odak halkası görünüyor; Enter oyunu başlatıyor.
- Hedef boyutları: bütün eylemler en az 143×52 px, Oyna 56 px yüksek.
- Kart üzerindeki hesaplanmış metin kontrastı: başlık 11,5; “Nefes” 5,9; açıklama 5,9; uyarı 5,9; ipucu 11,5 (hepsi ≥ 4,5).

Not (kapsam dışı, değiştirilmedi): Tab sırası Oyna'dan önce menünün arkasındaki HUD butonlarından (Beklet, Duraklat) geçiyor. HUD veya odak yönetimi aşamasında ele alınmalı.

## Testler

Toplam **177 test** (NS4-08: 169; +8, `tests/ui/start-screen.test.ts`). Ortak CSS okuma yardımcıları `tests/helpers/css.ts`'e alındı.

| Test                                                                                                | Önce      |
| --------------------------------------------------------------------------------------------------- | --------- |
| Başlık, açıklama ve uyarı metni NS4-08 ile aynı                                                     | geçti     |
| Tam olarak üç eylem (Oyna birincil; Nasıl oynanır ve Ayarlar ikincil); bağlantı/CTA yok             | geçti     |
| Marka adı, `<img>`/video/canvas ve haricî `url()` yok                                               | geçti     |
| Dekoratif SVG'ler `aria-hidden`; sıklamen taç yaprak, gövde ve yaprak içerir; hava akışı SVG'si var | başarısız |
| Oyna ≥ 56 px, ortak buton ≥ 48 px yüksekliğinde                                                     | başarısız |
| Başlangıç ekranındaki her animasyon reduced motion bloğunda kapatılıyor                             | başarısız |
| Başlangıç ekranı kuralları yalnızca token kullanıyor (sabit renk yok)                               | geçti     |
| Başlangıç ekranında odak halkası geçersiz kılınmıyor                                                | geçti     |

Mevcut 169 test değişmeden geçiyor; 844×390 CSS sözleşme testi güncellenmeden geçiyor.

| Komut                  | Sonuç                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                                                  |
| `npm run lint`         | geçti (0 uyarı)                                                                        |
| `npm run format:check` | geçti                                                                                  |
| `npm test`             | 16 dosya, 177/177 (art arda 3 çalıştırma)                                              |
| `npm run build`        | geçti; JS 518,39 kB (gzip 157,71), CSS 17,16 kB (gzip 4,35), HTML 14,96 kB (gzip 4,37) |
| `npm run check`        | geçti                                                                                  |

Bundle farkı (NS4-08'e göre): JS aynı. CSS +3,73 kB (gzip +0,81 kB) ve HTML +3,90 kB (gzip +0,92 kB); fark satır içi SVG çiziminden ve başlangıç ekranı kurallarından geliyor.

Smoke: dev 104/104, production preview 104/104. Sayfa hatası, konsol hatası ve başarısız istek yok. Koyu tercih kontrolü, sabit kart rengi yerine açık ve koyu bağlamın hesaplanmış stillerini karşılaştıracak şekilde güncellendi; kart artık yarı saydam. Referans skorlar tarayıcıda değişmedi: +138, +1732, +3800, 538 / 638 / 738.
