# NS4-08 · Tek görsel tema ve tasarım tokenları

Oyun artık tek, sabit bir görsel temayla çalışır. Açık/koyu tema altyapısı kaldırıldı, bütün renkler ve ortak stil değerleri `src/styles.css` başındaki tek `:root` token bloğunda toplandı. Ekran yerleşimleri, ölçüler, içerik, sağlık metinleri, fontlar, Pixi blok renkleri (`COLORS`) ve oyun mekaniği değişmedi. JS bundle içeriği NS4-07 ile bayt bayt aynı.

## Kaldırılan tema altyapısı

- `@media (prefers-color-scheme: dark)` bloğu ve `:root[data-theme='dark']` bloğu (16'şar değişkenlik iki kopya).
- `:root:not([data-theme='light'])` seçicisi; HTML ve TypeScript içinde `data-theme`, `matchMedia` veya tema takibi yoktu, eklenmedi.
- `color-scheme: light` → `color-scheme: only light` (tarayıcının otomatik koyu mod dönüştürmesi de devre dışı). `index.html`'e `<meta name="color-scheme" content="only light">` eklendi. `theme-color` koyu `#0b3a42` yerine tema arka planı `#d9f4f1`.
- localStorage'a tema alanı, ayarlar ekranına tema seçeneği eklenmedi.

## Token grupları

| Grup                  | Tokenlar                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Arka plan             | `--color-bg-top`, `--color-bg-bottom`, `--color-bg-glow`                                                       |
| Metin                 | `--color-text`, `--color-text-muted`, `--color-on-accent`                                                      |
| Panel yüzeyi/kenarlık | `--color-surface`, `--color-surface-strong`, `--color-border`, `--color-border-strong`, `--blur-surface`       |
| Oyun alanı / ızgara   | `--color-board`, `--color-board-grid`                                                                          |
| Sıklamen              | `--color-cyclamen`, `--color-cyclamen-strong`, `--color-cyclamen-soft`                                         |
| Ferahlık / turkuaz    | `--color-fresh`, `--color-fresh-strong`                                                                        |
| Başarı / uyarı        | `--color-success`, `--color-warning`                                                                           |
| Rebound / tehlike     | `--color-danger`, `--color-danger-strong`, `--color-danger-soft`, `--color-danger-bright`                      |
| Butonlar / odak       | `--color-btn-bg`, `--color-btn-text`, `--color-btn-locked-bg`, `--color-btn-locked-text`, `--color-focus-ring` |
| Gölgeler              | `--shadow-control`, `--shadow-float`, `--shadow-sheet`, `--shadow-board`, `--shadow-text`                      |
| Köşeler               | `--radius-board`, `--radius-control`, `--radius-button`, `--radius-panel`, `--radius-sheet`, `--radius-pill`   |
| Süreler               | `--dur-press`, `--dur-state`, `--dur-fade`, `--dur-meter`                                                      |
| Tipografi             | `--font-display`, `--font-body` (Fredoka / Nunito, değişmedi)                                                  |

Eski kısa adlar (`--bg-a`, `--ink`, `--cyc`, `--teal`, `--warn`, `--sheet`…) bire bir yeni adlara taşındı. Selector yapısı korundu. Bileşenlerde kalan tek sabit renkler geliştirici FPS göstergesindedir (bilinçli, tema dışı).

## Sabit görsel yön

Önceki açık tema temel alındı ve tek tema olarak sabitlendi: açık turkuaz → pembe hava gradyanı, koyu teal oyun tahtası, pembe sıklamen vurgusu, turkuaz ferahlık vurgusu. Görünür değişiklikler kontrollü ve küçüktür:

- Arka plana üstten yumuşak bir “nefes” ışığı (radyal beyaz parlama) eklendi.
- HUD panelleri (Beklet / Sıradaki) yumuşak cam yüzey kazandı (`backdrop-filter: blur`).
- Kilitli güçlendirici butonu artık `opacity: 0.38` ile soluklaşmıyor. Kendi açık yüzeyi, okunur ikincil metni ve gri ikonu var.
- Güçlendirici durumları ayrıştı: sıklamen “×2 etkin” pembe yüzey ve kenarlık, “kullanıldı” pembe tonlu kenarlık. Sentetik “rebound riski” kırmızı-turuncu tonlu kenarlık, “rebound sürüyor” kırmızı-turuncu yüzey ve kenarlık. Alt metinler bu durumlarda koyu sıklamen veya koyu tehlike rengiyle yazılır.
- Rebound/tehlike rengi `#d93a48` → `#cf3f2b`: sıklamen pembesinden (yaklaşık 331°) belirgin biçimde ayrılan kırmızı-turuncu ton (yaklaşık 8°). Rebound rozeti, vinyet ve sentetik buton vurgusu bunu kullanır.
- CTA butonu (oyun sonu) `--color-fresh` yerine daha koyu `--color-fresh-strong` (beyaz metin kontrastı 3,32 → 4,87). Odak halkası da bu tonu kullanır.
- İkincil metin `#4c6f75` → `#45666c` (biraz daha koyu); ipucu başlıkları koyu sıklamen.
- Kazanılmamış rozetler (oyun sonu) `opacity: 0.4` yerine şeffaf zemin, kenar çizgisi ve ikincil metinle gösterilir.

Pixi tarafı: blok renkleri, texture yaşam döngüsü ve efektler değişmedi. Tahta arka planı DOM'da `--color-board` ile çizilir ve önceki değerle aynıdır.

## Kontrast kontrolleri

Kontrastlar `tests/ui/theme.test.ts` içinde doğrudan token değerlerinden (WCAG göreli parlaklık formülü) hesaplanır:

| Ön plan / zemin                                  | Oran        | Eşik |
| ------------------------------------------------ | ----------- | ---- |
| Metin / kart yüzeyi                              | 11,6        | 7    |
| İkincil metin / kart yüzeyi                      | 5,9         | 4,5  |
| İkincil metin / arka plan üstü                   | 5,4         | 4,5  |
| Buton metni / buton yüzeyi                       | 12,2        | 7    |
| Kilitli buton metni / kilitli yüzey              | 5,6         | 4,5  |
| Beyaz / sıklamen (birincil buton, ×2 rozeti)     | 4,5         | 4,5  |
| Beyaz / koyu turkuaz (CTA)                       | 4,9         | 4,5  |
| Beyaz / tehlike (Rebound rozeti)                 | 4,8         | 4,5  |
| Koyu sıklamen alt metin / buton ve kilitli yüzey | 6,2 / ≥ 5,5 | 4,5  |
| Koyu tehlike alt metin / buton ve kilitli yüzey  | 6,6 / ≥ 5,9 | 4,5  |
| Odak halkası / arka plan                         | 4,2         | 3    |

Sıklamen ile tehlike tonları arasında en az 30° fark aranır. Renk körlüğü için blok desenleri bu görevin kapsamı dışında bırakıldı.

## Testler

Toplam **169 test** (NS4-07: 146; +23, `tests/ui/theme.test.ts`). Değişiklikten önce 23 testin 22'si başarısızdı. Tema için localStorage alanı olmadığını doğrulayan koruma testi baştan beri geçiyor. Gameplay testleri değişmeden geçiyor.

Kapsam: `prefers-color-scheme`, `data-theme` ve `matchMedia` kullanılmaması (CSS, HTML, bütün `src/**/*.ts`); `color-scheme: only light` ve meta etiketleri; tema ayarı veya localStorage anahtarı olmaması; 39 temel tokenın tanımlı olması; eski değişkenlerin kalmaması; 13 kontrast eşiği; sıklamen/tehlike ton farkı; kilitli butonun düşük opaklıkla gösterilmemesi; NS4-07 durumlarının ayrı stilleri; focus-visible odak halkası; birincil, CTA ve rozet tokenları.

Sistem açık/koyu tercihinde hesaplanmış stillerin aynı olması tarayıcıda ölçülür; depoya bir E2E aracı eklenmedi.

## Doğrulama sonuçları

| Komut                  | Sonuç                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `npm run typecheck`    | geçti                                                       |
| `npm run lint`         | geçti (0 uyarı)                                             |
| `npm run format:check` | geçti                                                       |
| `npm test`             | 15 dosya, 169/169                                           |
| `npm run build`        | geçti; JS 518,39 kB (gzip 157,71), CSS 13,43 kB (gzip 3,54) |
| `npm run check`        | geçti                                                       |

Bundle farkı (NS4-07'ye göre): JS içeriği bayt bayt aynı (yalnızca dosya adı hash'i değişti). CSS +2,72 kB (gzip +0,40 kB): uzun token adları, durum kuralları, `backdrop-filter`. `index.html` +0,15 kB.

Headless tarayıcı (Playwright, Edge; gerçek cihaz yok, yalnızca emülasyon), proje dışındaki betiklerle:

- Smoke: dev 104/104, production preview 104/104. Sayfa hatası, konsol hatası ve başarısız istek yok. İki tema kontrolü tek temaya göre yeniden yazıldı: koyu sistem tercihinde aynı token ve kart rengi. Bir kontrol eklendi: localStorage'da yalnızca `fn_meta` / `fn_settings`.
- Açık ↔ koyu sistem tercihi: beş görünümün her birinde (390×844, 844×390, 768×1024, 1366×768, 1920×1080) başlangıç, Ayarlar ve pause ekranları iki tercihte piksel piksel aynı (eşik 0). 19 öğe × 11 özellikte hesaplanmış stiller de aynı; dev ve production'da ikişer çalıştırma.
  - Pause görüntüsünde Pixi sahnesi gizlenerek karşılaştırıldı. Sahne temadan bağımsızdır ve otomatik mola anındaki kare zamanlaması çalıştırmadan çalıştırmaya değişir.
  - Aynı karşılaştırma NS4-07 build'inde bütün ekranlarda fark buluyor.
- NS4-07 ile görsel karşılaştırma: başlangıç, Ayarlar ve Nasıl oynanır ekranlarının geometrisi aynı, algısal fark yok veya ihmal edilebilir (768×1024'te 65 px). Oyun içi buton dikdörtgenleri ve metinleri aynı. Farklar kilitli butonlarda, ikincil etiketlerde, rebound renginde, oyun sonu rozetleri ve CTA'da (beklenen tasarım değişiklikleri).
- Referans skorlar tarayıcıda ve testte değişmedi: +138, +1732, +3800, 538 / 638 / 738.

## Sonraki tasarım aşamalarına bırakılanlar

- Dar ekranlarda gizlenen güçlendirici alt metinleri (responsive HUD aşaması).
- Renk körlüğü için blok desenleri ve genel erişilebilirlik turu.
- Ana menü ve HUD yerleşiminin yeniden tasarımı, onboarding.
- Pixi blok paletinin DOM tokenlarıyla ortak bir kaynaktan üretilmesi (şimdilik `COLORS` ayrı ve değişmedi).
- Tipografi ölçeğinin (font boyutları) tokenlaştırılması; bu görevde yalnızca font aileleri token.
