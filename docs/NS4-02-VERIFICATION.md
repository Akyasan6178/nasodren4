# NS4-02 · Doğrulama Raporu

**Tarih:** 2026-10-17
**Ortam:** Windows 11 Pro, Node.js 22.17.1, npm 10.9.2
**Tarayıcı:** Microsoft Edge 155.0.4283.45 (Chromium), headless, Playwright 1.48.2 üzerinden, WebGL renderer

Test betikleri ve ekran görüntüleri depo dışında, geçici bir klasörde tutuldu; depoya eklenmedi.

**Etiketler:** DOĞRULANDI (tarayıcıda çalıştırılarak) · KOD ÜZERİNDEN İNCELENDİ · TEST EDİLEMEDİ

## 1. Başlangıç kontrolleri

| Kontrol | Sonuç |
|---|---|
| Branch | `main` |
| Son commit | `3c17aed docs(ns4-01): audit existing game and establish baseline` |
| `origin/main` farkı | `git fetch` sonrası 0 / 0 |
| Çalışma ağacı | Temiz |
| Kaynak SHA-256 | `bd358624e215e9e3a5247b622ec6a44dbc27f7d33c60518e4b7abf09111d03cb` (görev sonunda `legacy/` altında aynı değer; Git blob `cb7068d` değişmedi) |
| Geçiş öncesi referans | Orijinal HTML geçici localhost sunucusunda açıldı. 0 runtime hatası; tek konsol mesajı `favicon.ico` 404'ü. 390×844 ve 1366×768'de 8 ekran görüntüsü alındı |

## 2. Zorunlu komutlar (son durumda, legacy taşımasından sonra, sırayla)

| # | Komut | Sonuç |
|---|---|---|
| 1 | `npm install` | Başarılı, 0 güvenlik açığı. `package-lock.json` mevcut (65.843 bayt) |
| 2 | `npm run typecheck` (`tsc --noEmit`) | **0 hata**, çıkış kodu 0 |
| 3 | `npm run build` | Başarılı (Vite 8.3.4, 428 modül). Çıktılar: `dist/index.html` 9,10 kB; `dist/assets/index-DIzIiKUb.css` 10,45 kB; `dist/assets/index-DTl14b6g.js` 513,60 kB (gzip 156,03 kB); `dist/favicon.svg`. Tek uyarı: 500 kB chunk uyarısı (PixiJS; bkz. migration §11) |
| 4 | `npm run preview` | `http://127.0.0.1:4173/` üzerinde açıldı ve smoke testi geçti (bkz. §4) |

**Not (dürüstlük kaydı):** Son kontrol turunda `npm run preview` ve `npm run dev` ilk denemede "port kullanımda" hatasıyla açılmadı. Neden: daha önce durdurulan npm süreçlerinin alt `vite` süreçleri arka planda çalışmaya devam ediyordu. Bu süreçler sonlandırıldı, iki sunucu temiz biçimde yeniden başlatıldı ve bütün son testler yeni süreçler üzerinde tekrarlandı. Aşağıdaki sonuçlar bu tekrara aittir.

### `dist` denetimi

| Kontrol | Sonuç |
|---|---|
| Gerekli JS ve CSS | Var (`./assets/index-*.js`, `./assets/index-*.css`) |
| Bağlantılar göreli (`base: './'`) | `./assets/…`, `./favicon.svg` |
| Legacy dosyası veya kaynak HTML kopyası | Yok. `dist`'te yalnızca 4 dosya var |
| PixiJS CDN script'i | Yok (`cdnjs` / `pixi.min.js` eşleşmesi 0) |
| `__fn` dizesi bundle'da | Yok |

## 3. Development server (`npm run dev`, `http://127.0.0.1:5173/`)

- **DOM smoke testi** (§5'teki 70 kontrol): **70/70 geçti**. Runtime hatası yok, debug dışı konsol mesajı yok, 4xx/5xx yanıt yok.
- **`window.__fn`:** mevcut (`game, view, app`). `window.PIXI`: tanımsız (beklenen).
- **NS4-01 ayrıntılı mekanik testleri** (`__fn` ile iç durum enjeksiyonu). Değerler NS4-01'dekiyle **birebir aynı**:

| Test | NS4-01 (orijinal) | NS4-02 (dev) |
|---|---|---|
| Tek satır, seviye 1, 19 satır hard drop | +138, lines 10, level 2 | +138, lines 10, level 2 |
| Tetris, seviye 2 | +1732, b2b true | +1732, b2b true |
| T-spin double (B2B ve combo 2) | kind 2, +3800 | kind 2, +3800 |
| Ardışık tekli combo 3/4/5 | +538 / +638 / +738 | +538 / +638 / +738 |
| Popup metinleri | "TETRİS / Ozmotik etki…", "T-spin çift / Art arda · Nörorefleks etki · kombo ×2" | aynı |
| Rozetler | `["ozmotik","noro"]`, toast "Rozet kazandın: Nörorefleks uzmanı" | aynı |
| Damla parçacık tint'leri (geçiş düzeltmesi, migration §8) | — | `[0x3fd2de, 0xff7868, 0xffffff]`, beklenenle eşleşti |
| Sıklamen | 8 satır → +1200, ×2 ≈ 30 sn | +1200, ×2 ≈ 30 sn |
| Sentetik ×2 → rebound | 40 sn rozet, 5,6 sn içinde çöp satırı | 40 sn rozet, çöp satırı `8880888888` |
| Layout (5 viewport, hücre, DOM konumları) | | NS4-01 tablosundaki piksel değerleriyle aynı |
| Bozuk localStorage ile yeniden yükleme | hatasız | hatasız |

## 4. Production preview (`npm run preview`, `http://127.0.0.1:4173/`)

- **DOM smoke testi: 70/70 geçti** (son temiz sunucuda iki kez tekrarlandı).
- İlk son-kontrol turunda bir kontrol başarısız oldu: 844×390'da "pointer tap rotate". Neden: test, tahta piksellerinin değişip değişmediğine bakıyordu ve aktif parça rastgele O çıktığında (O dönmez) görüntü değişmiyordu. Aynı viewport'ta dev koşusunda da `type 2 (O), rotAfter 0` gözlendi. Test, değişim olmazsa sıradaki parçayla yeniden deneyecek şekilde düzeltildi; oyun kodu değişmedi. Düzeltilmiş test iki kez 70/70 geçti.
- `window.__fn`: **yok**. `window.PIXI`: yok.
- Runtime hatası yok, konsol mesajı yok (deprecation uyarısı dahil), 404 yok.

## 5. Davranış eşdeğerliği kontrol listesi (dev ve prod ayrı ayrı, ikisi de DOĞRULANDI)

| Alan | Kontroller |
|---|---|
| **A. Başlatma** | Ana menü açılıyor; Pixi canvas oluşuyor ve sıfırdan büyük ölçüde (her viewport'ta); runtime hatası yok; favicon isteği `GET /favicon.svg` 200, `favicon.ico` isteği yok |
| **B. Ekranlar** | Ana menü, Nasıl oynanır (aç/geri), Ayarlar (aç/geri), Pause, Game-over |
| **C. Oyun** | Başlatma; ←, ↑, Z; soft drop (skor artıyor); hard drop (skor artıyor); hold (C: hold kutusu doluyor); ghost ve next (dev'de `__fn` ile: ghost 4 sprite, hold = önceki parça, yeni = kuyruk başı); satır temizleme, skor ve seviye (dev mekanik testleri) |
| **D. Tematik** | Güçlerin açılması ve toast; sıklamen (skor, "Ferah nefes ×2 · n sn" rozeti, "Bu oyunda kullanıldı"); sentetik ×2 (rebound rozeti, "Kullanım: 2"); rebound sırasında çöp satırı (alt satır pikselleri değişiyor) |
| **E. Kalıcılık** | Eski sürüm biçimindeki `fn_settings` okunuyor (ghost/müzik kapalı, DAS 200, ARR 20, etiketler 200/20); ayar değişikliği anında yazılıyor; yeniden yüklemede korunuyor; eski `fn_meta` (best 1957, totalLines 42, rozetler `ozmotik`, `noro`) okunuyor; rekor korunuyor veya güncelleniyor; rozetler "sahip olunan" olarak listeleniyor; totalLines eski değerin üstüne ekleniyor |
| **F. Ses ve input** | AudioContext etkileşimden önce 0, "Oyna" tıklamasından sonra 1 kez oluşuyor (constructor sayacıyla); klavye bağlı; pointer bağlı (3 dokunmatik viewport'ta tap ile döndürme); `blur` otomatik pause |
| **G. CTA** | game_over: `https://www.yasasinsaglik.com/?utm_source=ferah_nefes_oyun&utm_medium=advergame&utm_campaign=sinus_bulmaca&utm_content=game_over`; pause_menu: aynı, `utm_content=pause_menu`; ikisinde de `target=_blank`, `rel=noopener` |
| **H. Responsive** | 5 viewport'ta board oranı 1:2; yatay kaydırma yok; 5 döndürmede yeniden layout ve döndürme sonrası oyun çalışıyor (hard drop skoru artırıyor) |
| **Tema** | Açık `--bg-a #d9f4f1`; `prefers-color-scheme: dark` emülasyonunda `#07262d` (korundu) |

## 6. Test edilen viewport'lar

| Viewport | Emülasyon | Dev | Prod |
|---|---|---|---|
| 390 × 844 | mobil, dokunmatik, DPR 2 | DOĞRULANDI | DOĞRULANDI |
| 844 × 390 | mobil, dokunmatik, DPR 2 | DOĞRULANDI | DOĞRULANDI |
| 768 × 1024 | dokunmatik, DPR 2 | DOĞRULANDI | DOĞRULANDI |
| 1366 × 768 | masaüstü, DPR 1 | DOĞRULANDI | DOĞRULANDI |
| 1920 × 1080 | masaüstü, DPR 1 | DOĞRULANDI | DOĞRULANDI |

Bunların hepsi **emülasyon**. Gerçek cihazda test **yapılmadı**.

## 7. Görsel karşılaştırma (orijinal ve yeni)

**Yöntem:** Her iki sürümde `Math.random` aynı tohumla değiştirildi (parça sırası ve ipucu aynı olsun diye) ve `prefers-reduced-motion: reduce` kullanıldı. Görüntüler `pixelmatch` (eşik 0.1) ile karşılaştırıldı. Ayrıca 17 elemanın konumu, boyutu, fontu, rengi ve z-index'i, canvas boyutu, sheet kutusu, yüklenen fontlar, CSS değişkenleri ve localStorage sonucu (toplam 172 değer) karşılaştırıldı.

| Ekran | 390×844 dev / prod | 1366×768 dev / prod |
|---|---|---|
| Ana menü | 0 px / 0 px | 0 px / 0 px |
| Oyun HUD | 0 px / 0 px | 0 px / 0 px |
| Pause | 0 px / 0 px | 0 px / 0 px |
| Game-over | %0,23 / %0,22 | %0,33 / %0,38 |
| 172 geometri, stil ve storage değeri | 0 fark / 0 fark | 0 fark / 0 fark |

Game-over farkının tamamı "Sıradaki" kuyruğunda; board, skor, rekor, rozetler, overlay ve CTA aynı. Neden: sarsıntı efekti her karede `Math.random()` çağırıyor. Kare sayısı zamanlamaya bağlı olduğu için tohumlu RNG farklı noktaya ilerliyor ve bir sonraki 7-bag farklı karılıyor.

**Kontrol testi:** orijinal kendisiyle karşılaştırıldığında da game-over'da %0,04 ve %0,26 fark ve 0 geometri farkı çıktı. Fark geçişten kaynaklanmıyor.

Font, renk, panel ve oyun alanı ölçüleri, buton konumları, blok dokusu, hold/next alanları ve overlay sırasında görünür bir fark yok.

## 8. Console ve network

| | Orijinal (NS4-01 ve bu görevin başı) | Dev | Prod |
|---|---|---|---|
| Runtime hatası | 0 | 0 | 0 |
| Konsol (debug dışı) | `favicon.ico` 404 | yok | yok |
| `[track]` debug olayları | var | var (değişmedi) | var (değişmedi) |
| PixiJS deprecation uyarısı | yok | geçişte ortaya çıktı, **düzeltildi**, şimdi yok | düzeltildi, yok |
| PixiJS CDN isteği | `cdnjs…/pixi.min.js` | **yok** (Vite pre-bundle `/node_modules/.vite/deps/pixi__js.js`) | **yok** (bundle içinde) |
| Favicon | 404 | `favicon.svg` 200 | `favicon.svg` 200 |
| Harici istekler | Google Fonts CSS ve woff2, cdnjs | Google Fonts CSS ve 4 woff2 | Google Fonts CSS ve 4 woff2 |

## 9. Debug erişimi

| Ortam | `window.__fn` | Etiket |
|---|---|---|
| Development | `{ game, view, app }` mevcut; NS4-01 betikleri bununla çalıştı | DOĞRULANDI |
| Production preview | `undefined`; bundle'da `__fn` dizesi yok | DOĞRULANDI |

## 10. Bilinen mevcut hatalar (düzeltilmedi; geçişle değişmedi)

| NS4-01 notu | Yeni sürümdeki durum | Etiket |
|---|---|---|
| A. Pause/resume sonrası vinyet gelmiyor | Tıkanıklık 0,8 iken resume sonrası `danger.on = false` (dev); NS4-01 ile aynı | DOĞRULANDI |
| B. Pause → Ayarlar'da Esc oyunu devam ettiriyor | Dev ve prod'da aynı | DOĞRULANDI |
| C. Game-over arkasında ×2 ve Rebound rozetleri donmuş | Prod ekran görüntüsünde aynı | DOĞRULANDI |
| D. 844×390'da başlangıç kartı kesik | Prod ekran görüntüsünde aynı | DOĞRULANDI |
| E. Ana menüye çıkışta skor kaydedilmiyor | Kod değişmedi | KOD ÜZERİNDEN İNCELENDİ |
| #6. `meta.badges` dizi değilse çökme | Kod değişmedi; NS4-06'ya bırakıldı | KOD ÜZERİNDEN İNCELENDİ |

## 11. Legacy prototip

`legacy/Ferah Nefes · Sinüs Bulmacası.html` yeni konumundan localhost ile açıldı: PixiJS 7.4.2 (CDN) yüklendi, "Oyna" sonrası `state = play`, 0 runtime hatası. DOĞRULANDI. Production build'e dahil değil.

## 12. Test edilemeyen alanlar

- **Gerçek cihazlar:** iOS Safari (WebKit), gerçek Android Chrome, gerçek dokunmatik gecikmesi, safe-area çentikleri. Hiçbiri test edilmedi.
- **Jestler:** swipe ve flick (hard drop / hold) yalnızca kod düzeyinde aynı. Gerçek dokunmatikte ölçülmedi.
- **Ses ve titreşim:** sesin duyulması ve titreşimin hissedilmesi (headless).
- **Firefox ve WebKit** motorları (yalnızca Chromium tabanlı Edge kullanıldı).
- **HMR davranışı** (bkz. migration §11).
- **Hosting ortamında çalışma** (deploy yapılmadı).
