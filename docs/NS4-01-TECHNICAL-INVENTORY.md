# NS4-01 · Teknik Envanter

**Proje:** Ferah Nefes · Sinüs Bulmacası (Nasodren dördüncü tarayıcı oyunu)
**Görev:** NS4-01: Kaynak kod envanteri ve güvenli başlangıç
**Tarih:** 2026-10-17
**İncelenen commit:** `f5707b6` (branch `main`)
**İncelenen kaynak:** `Ferah Nefes · Sinüs Bulmacası.html` (1596 satır, SHA-256 `bd358624e215e9e3a5247b622ec6a44dbc27f7d33c60518e4b7abf09111d03cb`)

Bu görevde kaynak koda hiçbir değişiklik yapılmadı. Satır numaraları yukarıdaki commit'teki HTML dosyasına göredir.

### Etiketler

| Etiket | Anlamı |
|---|---|
| **DOĞRULANDI** | Gerçek tarayıcıda (headless Microsoft Edge/Chromium, Playwright 1.48.2, `http://127.0.0.1` üzerinden) çalıştırılarak gözlemlendi |
| **KOD ÜZERİNDEN İNCELENDİ** | Yalnızca kaynak kod okunarak belirlendi, çalışma anında doğrulanmadı |
| **TEST EDİLEMEDİ** | Mevcut test ortamında doğrulanamadı |
| **RİSK** | Sonraki aşamalarda sorun çıkarabilecek durum |
| **ÖNERİ** | Uygulanmamış öneri (bu görevde hiçbir öneri uygulanmadı) |

---

## 1. Repository ve Git durumu

| Kontrol | Sonuç | Etiket |
|---|---|---|
| Git repository mi? | Evet | DOĞRULANDI |
| Aktif branch | `main` | DOĞRULANDI |
| Remote | `origin` → `https://github.com/Eranorr/nasodren4.git` (fetch/push) | DOĞRULANDI |
| Yerel ve remote farkı | `git fetch` sonrası `main...origin/main` = 0 ileri / 0 geri | DOĞRULANDI |
| Commit edilmemiş değişiklik | Yok | DOĞRULANDI |
| Untracked dosya | Yok | DOĞRULANDI |
| Çalışma ağacı | Görev başında temiz | DOĞRULANDI |
| Son commit | `f5707b6` "main" (HTML dosyasını ekliyor); ondan önce `819edba` "Initial commit" (`.gitattributes`) | DOĞRULANDI |
| Secret, API anahtarı, credential | `api key / secret / token / password / bearer` desenleriyle yapılan taramada eşleşme yok. Kodda yalnızca herkese açık CDN, Google Fonts ve CTA adresleri var | DOĞRULANDI |

### Depodaki dosyalar (tam liste)

| Dosya | İçerik |
|---|---|
| `.gitattributes` | `* text=auto` (LF normalleştirme) |
| `Ferah Nefes · Sinüs Bulmacası.html` | Oyunun tamamı: HTML, inline CSS ve inline JS tek dosyada |

Depoda **bulunmayanlar** (DOĞRULANDI): README, `package.json`, lock dosyası, asset/ikon/görsel/ses klasörü, favicon, GitHub Actions (`.github/`), hosting/dağıtım yapılandırması, `.env` veya ortam dosyası, önceki rapor.

### Depo dışında sağlanan kaynaklar

Aşağıdaki iki dosya bu görev için konuşmaya ek olarak verildi. **Depoda bulunmuyorlar.**

| Kaynak | Durum | İçerik özeti |
|---|---|---|
| `Ferah Nefes · Sinüs Bulmacası.md` | Tamamı okundu | HTML'in statik metinlerinin Markdown dökümü (HUD etiketleri, başlangıç, nasıl oynanır, mola, oyun sonu ve ayarlar ekranları). JS, ipucu metni veya HTML'de olmayan bir bilgi içermiyor. Metinler HTML ile birebir uyumlu |
| `Tetris Temalı Oyunlaştırma Araştırması.pdf` | 16 sayfanın tamamı okundu | Strateji ve GDD araştırma raporu: sinüs/sıklamen metaforları, 7-bag, ghost, hold, T-spin, SRS, DAS/ARR, "günde tek doz" güçlendirici fikri, Octalysis, haptik ve ses yönergeleri, CTA yerleşimi, TİTCK kapsamında markasızlaştırma, analitik |

**PDF ve kod arasındaki farklar** (KOD ÜZERİNDEN İNCELENDİ; bilgi amaçlı, değişiklik önerisi değildir):

| Konu | PDF | Mevcut kod |
|---|---|---|
| Sentetik açıcının rebound süresi | "2 dakika", 1.5× hız, "daha karmaşık şekiller" | İkinci kullanımdan itibaren `40 sn × (kullanım − 1)`, 1.5× hız, her 10 sn'de alttan çöp satırı. Şekiller değişmiyor (`CFG.reboundMs`, satır 309; `finishPending`, satır 622-625) |
| Sıklamen | Alt yarıyı temizler, "puanlar katlanır", oyun başına 1 kez | Alt 10 satırdaki dolu satırlar temizlenir, 30 sn boyunca satır puanı ×2, oyun başına 1 kez |
| Seviye/rekor ekranında CTA | Öneriliyor | Yok. CTA yalnızca mola ve oyun sonu ekranlarında var |
| Liderlik tablosu, banner, sanal para, kozmetik | Öneriliyor | Yok. Brief'e göre mağaza, sanal para ve kozmetik kapsam dışı; global skor ileride eklenecek |
| Marka adı | Oyunda hiç geçmemeli | HTML'de "Nasodren" geçmiyor (DOĞRULANDI, büyük/küçük harf duyarsız `grep` sonucu 0) |

---

## 2. Çalıştırma yöntemi ve sonucu

- **Yöntem:** Geçici bir `python -m http.server 8765 --bind 127.0.0.1 --directory <repo>` sunucusu kullanıldı. Bu sunucu yalnızca okuma yapar ve depoya dosya yazmaz. Testler Playwright ile headless Microsoft Edge'de (Chromium motoru, WebGL) yapıldı. Playwright ve test betikleri depo dışındaki geçici bir klasöre kuruldu. **DOĞRULANDI**
- **Sonuç:** Oyun localhost üzerinden sorunsuz açıldı. PixiJS 7.4.2 yüklendi, renderer WebGL. Hiç `pageerror` ve yakalanmamış promise reddi görülmedi. **DOĞRULANDI**
- `file://` ile açma test edilmedi. Kodda `file://` ile çalışmayı engelleyen bir yapı yok, ama CDN ve font yüklemesi için ağ bağlantısı gerekiyor. **KOD ÜZERİNDEN İNCELENDİ**

### Gerçekten test edilen ekran boyutları

Her boyutta menü ve oyun ekranının görüntüsü alındı, HUD öğelerinin konumu ölçüldü (ekran dışına taşma, çakışma, yatay kaydırma) ve viewport döndürülerek resize davranışı test edildi.

| Viewport | Emülasyon | Yön / hücre | Sonuç | Etiket |
|---|---|---|---|---|
| 390 × 844 | mobil, dokunmatik, DPR 2 | portre, hücre 32 px, kompakt butonlar, 2 next slotu | HUD çakışması yok, ekran dışına taşma yok, yatay kaydırma yok. Dokunmayla döndürme çalıştı (rot 0→1) | DOĞRULANDI |
| 844 × 390 | mobil, dokunmatik, DPR 2 | yatay, hücre 18 px, 5 next slotu | Oyun ekranı düzgün. **Başlangıç kartı yüksekliğe sığmıyor**: "Nasıl oynanır / Ayarlar" satırı kesik, kart içinde kaydırma gerekiyor. Dokunmayla döndürme çalıştı | DOĞRULANDI |
| 768 × 1024 | dokunmatik, DPR 2 | portre, hücre 41 px | Sorun yok. Dokunmayla döndürme çalıştı | DOĞRULANDI |
| 1366 × 768 | masaüstü, DPR 1 | yatay, hücre 37 px | Sorun yok. Tam akış testi bu boyutta yapıldı | DOĞRULANDI |
| 1920 × 1080 | masaüstü, DPR 1 | yatay, hücre 40 px | Sorun yok | DOĞRULANDI |
| Döndürmeler (844×390↔390×844, 768×1024→1024×768, 1366×768→768×1366, 1920×1080→1080×1920) | aynı bağlam | portre/yatay geçişi doğru, hücre boyutu yeniden hesaplandı | Hata yok | DOĞRULANDI |

Bunlar emülasyonla yapıldı, **gerçek cihazlarda** test edilmedi. iOS Safari (WebKit), gerçek Android Chrome, gerçek dokunmatik gecikmesi ve safe-area çentikleri **TEST EDİLEMEDİ**.

---

## 3. Konsol ve ağ kontrolü

| Mesaj | Sınıf | Açıklama | Etiket |
|---|---|---|---|
| `Failed to load resource: 404` (her sayfa yüklemesinde 1 kez) | Tarayıcı kısıtlamasından kaynaklanan beklenen mesaj / Uyarı | Sunucu kaydına göre tek kaynak `GET /favicon.ico`. Depoda favicon yok ve HTML'de `<link rel="icon">` tanımlı değil. İşlevsel etkisi yok | DOĞRULANDI |
| `[track] {...}` (`console.debug`) | Bilgilendirme/debug | `window.dataLayer` olmadığında analitik olayları konsola yazılıyor | DOĞRULANDI |
| JS runtime hatası | Yok | | DOĞRULANDI |
| Unhandled promise rejection | Yok | | DOĞRULANDI |
| PixiJS yükleme hatası ve deprecation uyarısı | Yok | `PIXI.VERSION` = 7.4.2 | DOĞRULANDI |
| Font yükleme hatası, CORS hatası | Yok | Fredoka ve Nunito woff2 dosyaları `fonts.gstatic.com`'dan yüklendi | DOĞRULANDI |
| Web Audio uyarısı ("AudioContext was not allowed to start") | Görülmedi | AudioContext yalnızca kullanıcı etkileşiminde oluşturuluyor (`Sound.unlock`) | DOĞRULANDI (headless) |
| localStorage hatası | Yok | Bozuk JSON ile yeniden yükleme de hatasız (bkz. §H) | DOĞRULANDI |
| Resize ve pause/resume sonrası hata | Yok | | DOĞRULANDI |
| Console warning | Hiç görülmedi | | DOĞRULANDI |

**Ağ istekleri** (DOĞRULANDI): sayfanın kendisi; `fonts.googleapis.com/css2?...`; `cdnjs.cloudflare.com/ajax/libs/pixi.js/7.4.2/pixi.min.js`; `fonts.gstatic.com` üzerinden 3-4 woff2 dosyası; `favicon.ico` (404). Başka bir harici istek yok.

**Ses çıkışı** gerçekten duyularak kontrol edilmedi (headless). **Titreşim** gerçek cihazda hissedilerek kontrol edilmedi. **TEST EDİLEMEDİ**

---

## 4. Teknik envanter

### A. Teknoloji yığını (KOD ÜZERİNDEN İNCELENDİ, yükleme kısmı DOĞRULANDI)

| Katman | Ayrıntı | Konum |
|---|---|---|
| HTML | Tek dosya, `lang="tr"`, viewport `viewport-fit=cover`, `theme-color #0b3a42` | 1-10 |
| CSS | Inline `<style>`, CSS değişkenleri, `color-mix()`, `env(safe-area-inset-*)`, `prefers-reduced-motion`, `prefers-color-scheme` | 11-151 |
| JS | Tek inline `<script>`, IIFE ve `'use strict'`, modül yok, build adımı yok | 294-1593 |
| PixiJS | **7.4.2**, cdnjs'den global `PIXI` olarak yükleniyor. **SRI (`integrity`) yok** | 293 |
| Web Audio | Tamamen sentezlenmiş ses (oscillator ve noise buffer), ses dosyası yok | 696-816 |
| localStorage | `fn_` önekli JSON anahtarları | 316-321 |
| Haptics | `navigator.vibrate` | 821-828 |
| Fontlar | Google Fonts: Fredoka 500/600/700, Nunito 500/700/800, `display=swap`, preconnect | 8-10 |
| Diğer bağımlılık | Yok | |

### B. Oyun motoru: `class Game` (370-691) (KOD ÜZERİNDEN İNCELENDİ; işaretli kısımlar DOĞRULANDI)

| Konu | Uygulama |
|---|---|
| Board | `COLS=10, ROWS=22, HIDDEN=2, VIS=20` (301). `Uint8Array(220)`, satır öncelikli dizilim (`y*COLS+x`). Hücre değerleri: 0 boş, 1-7 parça tipi, 8 çöp (inflamasyon), 9 sınır dışı sentinel (`cell`, 406) |
| Tetrominolar | `SHAPES` (344-352). Tipler 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L. Her tipin 4 rotasyonu `[x,y]` hücre listesi olarak tanımlı |
| 7-bag | `fillQueue` (395-404): Fisher-Yates karıştırma ve `Math.random`; kuyruk her zaman 8 elemanda tutuluyor. **Seed yok** |
| Rotation / SRS | `rotate(dir)` (439-452). Guideline SRS tekmeleri: `KICK_JLSTZ` (354-359) ve `KICK_I` (360-365). Y ekseni ters çevrilerek uygulanıyor. O parçası dönmüyor. 180° dönüş yok. Döndürme DOĞRULANDI (CW ve CCW) |
| Collision | `fits()` (408-412) ve `cell()`. Gizli satırların üstü (y<0) boş kabul ediliyor |
| Spawn | `spawn()` (414-423): x=3, y=0. Uygunsa 1 satır aşağı iniyor (guideline). Sığmazsa `blockout` |
| Gravity | `gravityMs()` (482-487): `(0.8 − l·0.007)^l · 1000` ms, l = seviye−1, tavan 20. Rebound sırasında ÷1.5. Birikimli `gAcc`, kare başına en fazla ROWS adım (673-684) |
| Lock delay | 500 ms, 15 hareket sıfırlaması. Daha alçak bir satıra inince sıfırlama hakkı yenileniyor. Sıfırlamalar bitince 100 ms içinde kilitleniyor (686-689) |
| Soft drop | Gravity ×20, adım başına +1 puan (673, 678). Jestle `softStep()` ile, yine +1 (454-458). DOĞRULANDI (5 satır → +5) |
| Hard drop | `hardDrop()` (462-469): satır başına +2, ardından anında kilit. DOĞRULANDI |
| Hold | `doHold()` (471-480): parça başına 1 kez. Kilitlenince yeniden açılıyor. Hold alanı `canHold=false` iken %35 opak gösteriliyor. DOĞRULANDI (ikinci deneme engellendi) |
| Ghost | `ghostY()` (460). `settings.ghost` ile kapatılabiliyor. DOĞRULANDI (4 sprite görünür) |
| Satır temizleme | `lock()` (498-529): dolu satırlar tespit ediliyor, 300 ms `clearing` durumu, sonra `finishPending` → `removeRows` (555-567). DOĞRULANDI |
| Skorlama | `scoreClear()` (531-553). Normal: [0,100,300,500,800]×seviye. Mini T-spin: [100,200,400,400]. T-spin: [400,800,1200,1600]. B2B ×1.5 (floor). Combo: +50×combo×seviye. Sıklamen aktifken ×2 (drop puanlarına uygulanmıyor). DOĞRULANDI: tek satır, Tetris, TSD ve combo değerleri formülle birebir tuttu |
| Combo | `combo` −1'den başlıyor. Temizleme olunca ++, olmayan kilitte −1'e dönüyor. `maxCombo` takip ediliyor ama hiçbir yere raporlanmıyor |
| Back-to-back | Tetris veya satır temizleyen T-spin "zor" sayılıyor. Arka arkaya gelirse ×1.5. DOĞRULANDI (Tetris → TSD: "Art arda") |
| T-spin | `tspinKind()` (489-496): 3 köşe kuralı; ön iki köşe doluysa veya son tekme 5. tekmeyse (index 4) tam, değilse mini. Son hareket rotasyon olmalı. DOĞRULANDI (iç durum enjeksiyonuyla TSD, kind=2) |
| Seviye | `1 + floor(lines/10)`, en fazla 20. DOĞRULANDI (9→10 satır: seviye 2) |
| Game over | `blockout` (spawn sığmıyor), `lockout` (parçanın tamamı gizli satırlarda kilitlendi), `overlap` (güç veya çöp sonrası aktif parça sığmıyor), `garbage` (çöp satırı eklenirken en üst satır dolu). DOĞRULANDI (`lockout` gözlendi) |

### C. Tematik mekanikler (KOD ÜZERİNDEN İNCELENDİ; çalışma anı DOĞRULANDI)

| Mekanik | Uygulama | Doğrulama |
|---|---|---|
| Tıkanıklık | `congestion() = min(1, stackHeight/20)`. `boardVer` ile önbellekleniyor (575). HUD'da dikey metre olarak gösteriliyor. %70 ve üstünde kırmızı vinyet (`#danger`) | Metre ve vinyet DOĞRULANDI |
| Güç kilidi | Tıkanıklık ≥ 0.35 (`CFG.powerThreshold`) olunca iki buton açılıyor. İlk açılışta "Sinüslerin dolmaya başladı. Sıklamen özütü hazır." toast'u çıkıyor | DOĞRULANDI |
| Sıklamen özütü | `useCyc()` (590-599): oyun başına 1 kez. Alt 10 satırdaki dolu satırlar 800 ms `draining` ile siliniyor. +150×satır×seviye, ardından 30 sn ×2 satır puanı | DOĞRULANDI (8 satır → +1200, `multT` ≈ 30 sn, rozet "Ferah nefes ×2 · 30 sn", ikinci kullanım engellendi) |
| Sentetik açıcı | `useSyn()` (601-610): sınırsız kullanım. En alttaki 3 dolu satır siliniyor (260 ms). +50×satır×seviye | DOĞRULANDI |
| Rebound | 2. ve sonraki kullanımlarda `reboundT = 40 sn × (kullanım−1)`, gravity ×1.5. İlk çöp 5 sn sonra, sonra her 10 sn'de (`addGarbage`, 640-649; tek rastgele delikli gri satır). Popup ve toast gösteriliyor | DOĞRULANDI (rozet "Rebound … · 40 sn", 5,6 sn içinde alt satır `8888880888` oldu) |
| Ozmotik etki | 4 satır temizliği: popup "TETRİS / Ozmotik etki: dört satır birden" ve rozet `ozmotik`. Sıklamen popup'ı "Ozmotik drenaj başladı" | DOĞRULANDI |
| Nörorefleks etki | Satır temizleyen veya temizlemeyen T-spin popup'ı "Nörorefleks etki". Satır temizleyen T-spin `noro` rozetini veriyor | DOĞRULANDI |
| Drenaj mesajları | "Çift/Üçlü drenaj", "Kombo ×n", "Nefes seviyesi n / Mukus daha hızlı birikiyor" (`scored`/`levelup` olayları, 1348-1366) | DOĞRULANDI (seviye ve Tetris popup'ları) |

### D. Render sistemi: `class View` (846-1151) (KOD ÜZERİNDEN İNCELENDİ)

- **Pixi Application** (1221-1226): `backgroundAlpha:0`, `antialias:false`, `autoDensity`, `resolution=min(DPR,2)`, `powerPreference:'high-performance'`. Canvas `#stage` içine ekleniyor, `ticker.maxFPS` bilerek ayarlanmamış (1228-1229). DOĞRULANDI (DPR 2'de canvas 780×1688).
- **Katman sırası:** DOM `#under` (board zemini, metre, hold/next panelleri, istatistikler) → şeffaf Pixi canvas → DOM `#over-hud` (butonlar, popup, toast) → `#danger` → `.screen` overlay'leri (52-56).
- **Sprite havuzu:** 200 hücre, 4 aktif, 4 ghost, 4 hold ve 5×4 next sprite'ı, 10 flaş sprite'ı, 420 parçacık (`ParticleContainer`). Kare başına sprite oluşturulmuyor (860-883).
- **Texture atlas** (`buildTextures`, 895-960): canvas 2D ile 8 blok ve 8 ghost karosu tek bir `BaseTexture`'da (tek draw call). Damla texture'ı ve sıklamen dalgası için `TilingSprite`. Her `layout()` çağrısında yeniden üretiliyor, eskileri sync'ten sonra `destroy` ediliyor (956-959).
- **Senkronizasyon:** `pieceVer`, `boardVer` ve `queueVer` sayaçlarıyla kirli bayrak (dirty flag) mantığı (`View.update`, 1076-1078).
- **Efektler:** kilitlenince yaylanma (140 ms), satır flaşı ve damla parçacıkları (sentetikte kırmızı ton), sıklamende yükselen ve geri çekilen sıvı dalgası, oyun sonunda yığının alttan yukarı griye dönmesi, hard drop ve çöpte sarsıntı (`shake`, 1145-1149).
- **Resize** (`doLayout`, 1236-1265; `computeLayout`, 1156-1211): `portrait = W/H < 0.95 || W < 600`. Portrede hücre 12-44 px, yatayda 12-40 px. DOM öğeleri `place()` ile mutlak konumlandırılıyor. `resize` ve `ResizeObserver` ikisi de tek bir rAF'a toplanıyor (1266-1269). DOĞRULANDI.
- **CSS animasyonları:** `pop`, `readyPulse`, `breathe`, `prefers-reduced-motion` ile kısılıyor (146-150). Reduced-motion Pixi efektlerini (sarsıntı, parçacık) etkilemiyor. **KOD ÜZERİNDEN İNCELENDİ**

### E. Input sistemi (1390-1481)

| Giriş | Davranış | Etiket |
|---|---|---|
| Klavye | ←/→ hareket, ↑/X/x CW, Z/z/**Control** CCW, ↓ soft drop, Boşluk hard drop, C/c/Shift hold, 1 sıklamen, 2 sentetik, Esc/P/p mola veya devam. `e.repeat` yalnızca ↓ için işleniyor. Oyun sırasında ok tuşları ve boşluk için `preventDefault` | ←, ↑, Z, C, Boşluk, ↓, Esc, 1, 2 DOĞRULANDI |
| DAS / ARR | `input.update` (1394-1401). Varsayılan DAS 167 ms, ARR 33 ms. ARR=0 anında duvara kaydırıyor. Ayarlardan 50-300 ve 0-100 aralığında değiştirilebiliyor | → basılı 450 ms: x 3→6 DOĞRULANDI |
| Pointer / jest | Yalnızca canvas üzerinde. `setPointerCapture`, 0.45 hücre eşiğinden sonra eksen kilidi | KOD ÜZERİNDEN İNCELENDİ |
| Tap rotation | 320 ms altında ve eksen seçilmemişse. Canvas'ın sol üçte biri CCW, kalanı CW | DOĞRULANDI (3 viewport'ta CW tap) |
| Swipe | Yatayda 0.9 hücre başına 1 sütun. Aşağı sürüklemede 0.9 hücre başına `softStep` | KOD ÜZERİNDEN İNCELENDİ |
| Flick | Son 90 ms'deki hız: vy > 0.75 px/ms ve dy > 1.2 hücre ise hard drop. vy < −0.6 ve dy < −1.4 hücre ise hold | KOD ÜZERİNDEN İNCELENDİ (gerçek dokunmatikte TEST EDİLEMEDİ) |
| HUD butonları | `bindBtn`: `pointerdown` ve `preventDefault`, ayrıca klavye için Enter/Boşluk | Mola ve devam butonları DOĞRULANDI |
| Otomatik mola | `visibilitychange` (gizlenince) ve `window blur` (1566-1567) | `blur` DOĞRULANDI |

### F. Ses ve haptik (KOD ÜZERİNDEN İNCELENDİ)

- `Sound.unlock()` (698-712): ilk kullanıcı etkileşiminde AudioContext oluşturuluyor (webkit önekli yedeğiyle birlikte). Zincir master 0.8 → sfx / müzik gain. 2 sn'lik noise buffer var. Askıya alınmışsa `resume()` çağrılıyor. Her tuşa basışta ve butonda yeniden çağrılıyor.
- **Efektler:** move, rotate, hold, lock, hard, clear(n, tspin), cyc, syn, warn, level, over. Hepsi oscillator ve bandpass noise ile üretiliyor.
- **Ortam müziği** (767-807): filtrelenmiş rüzgâr gürültüsü ve LFO, artı 7 sn'de bir değişen 4 akorluk pad. Nodlar bir kez oluşturuluyor, mola ve menüde gain 0'a iniyor.
- **Ayarlar:** `sound` sfx gain'ini ve `tone/breath` çağrılarını, `music` ise `wantMusic && settings.music` koşulunu kontrol ediyor.
- **Autoplay:** etkileşimden önce ses yok, beklenen davranış bu. DOĞRULANDI (uyarı görülmedi).
- **Haptik** (821-828): lock 12 ms, hard 24 ms, satır sayısına göre desen, over, syn, cyc, çöp 30 ms. `canVibrate` yoksa ayarda "Bu cihaz/tarayıcı titreşimi desteklemiyor" yazıyor. iOS Safari desteklemiyor (kod yorumu). Gerçek cihazda **TEST EDİLEMEDİ**.

### G. Kullanıcı arayüzü

| Ekran | id | Durum |
|---|---|---|
| Başlangıç | `scr-start` (195-208) | Oyna, Nasıl oynanır, Ayarlar, rastgele ipucu ve tıbbi uyarı notu. DOĞRULANDI |
| Nasıl oynanır | `scr-how` (211-240) | `data-back` ile geri dönüyor. DOĞRULANDI |
| Mola | `scr-pause` (243-254) | Devam et, Ayarlar, Ana menü, CTA. DOĞRULANDI |
| Oyun bitti | `scr-over` (257-275) | Yeni rekor etiketi, puan/drenaj/rekor, rozetler, CTA, Tekrar oyna, Ana menü, ipucu. 950 ms gecikmeyle açılıyor. DOĞRULANDI |
| Ayarlar | `scr-set` (278-290) | Ses, müzik, titreşim, ghost, DAS, ARR, FPS. "Kaydet" yalnızca geri dönüyor; kayıt her `input` olayında anında yapılıyor. DOĞRULANDI |
| HUD | `#under` ve `#over-hud` (156-189) | Skor (`tr-TR` binlik ayırıcı, ör. "1.957"), seviye, drenaj, metre, butonlar. DOĞRULANDI |
| CTA | `#cta-pause`, `#cta-over` | `target=_blank rel=noopener`. URL'ler §I'de. DOĞRULANDI |
| Rozetler | `BADGES` (1319-1325) | ozmotik, noro, akis (5'li kombo), dogal (sentetik kullanmadan 5. seviye), derin (toplam 100 satır) |
| Toast ve popup | `toast()` (1302-1305), `popup()` (1306-1314) | Toast tekil. Popup'ta en fazla 3 öğe, `textContent` ile XSS'e karşı güvenli |
| İpuçları | `TIPS` (1486-1493), `setTip` | 6 sağlık ipucu, sırayla dönüyor. Metinler bu görevde değiştirilmedi |

**Mevcut tema sistemi** (KOD ÜZERİNDEN İNCELENDİ, ikisi de DOĞRULANDI):
- Açık tema varsayılan değişkenlerle tanımlı: `:root` (12-25).
- Koyu tema iki yoldan geliyor: `@media (prefers-color-scheme: dark)` ve `:root:not([data-theme="light"])` (26-36), ayrıca `:root[data-theme="dark"]` (37-45). İki blok birebir aynı.
- JS hiçbir yerde `data-theme` atamıyor. Tema yalnızca işletim sistemi tercihine göre değişiyor. `color-scheme: light|dark` da tanımlı.
- Pixi blok renkleri (`COLORS`, 833), SVG ikon renkleri (`#d6337f`, `#1d9a6c`, `#d93a48`), metre gradyanı ve `theme-color` meta etiketi temadan bağımsız.
- DOĞRULANDI: açık temada `--bg-a = #d9f4f1`, `colorScheme: dark` emülasyonunda `#07262d`.

### H. Veri saklama (DOĞRULANDI)

| Anahtar | Değer | Ne zaman yazılıyor |
|---|---|---|
| `fn_settings` | `{"sound":true,"music":true,"haptics":true,"ghost":true,"fps":false,"das":167,"arr":33}` | Ayar değiştiğinde |
| `fn_meta` | `{"best":number,"totalLines":number,"badges":string[]}` | Rozet kazanıldığında ve oyun sonunda |

- İlk açılışta localStorage boş, anahtarlar ancak ilk yazmada oluşuyor. DOĞRULANDI
- Rekor ve `totalLines` **yalnızca game-over'da** güncelleniyor. Oyun ortasında Ana menü'ye dönmek veya sekmeyi kapatmak skoru ve satırları kaydetmiyor. **KOD ÜZERİNDEN İNCELENDİ**
- Bozuk veri testleri: `fn_meta='{bad json'` ve `fn_settings='"str"'` ile oyun hatasız açıldı. `fn_meta='null'` ve `'{"best":5}'` da sorunsuz. DOĞRULANDI
- **RİSK (KOD ÜZERİNDEN İNCELENDİ):** `fn_meta` içinde `badges` dizi değilse (ör. `{"badges":null}`), `award()` ve `showOver()` içindeki `meta.badges.includes` çağrısı hata verir. `best` veya `totalLines` sayı değilse karşılaştırmalar bozulur. Şema doğrulaması veya sürüm alanı yok.
- `store` erişimi `try/catch` ile sarılmış; erişim engellenirse sessizce varsayılana düşüyor.

### I. Analitik (DOĞRULANDI ve KOD ÜZERİNDEN İNCELENDİ)

`track(name, data)` (326-330): olay `{event:'fn_'+name, t:Date.now(), ...data}` biçiminde hazırlanıyor. `window.dataLayer` bir dizi ise `push` ediliyor, değilse `console.debug('[track]', ev)`.

| Olay | Payload | Tetikleyici |
|---|---|---|
| `fn_game_start` | `best` | `start()` |
| `fn_game_over` | `reason, score, level, lines, dur_s, cyc_used, syn_uses, tetrises` | gameover olayı |
| `fn_powerup_use` | `kind:'siklamen', level, congestion` / `kind:'sentetik', uses, level` | `useCyc` / `useSyn` |
| `fn_level_up` | `level` | levelup |
| `fn_badge` | `id` | `award()` |
| `fn_cta_click` | `placement:'game_over', score` / `placement:'pause_menu'` | CTA tıklaması |

- **UTM** (`ctaUrl`, 331-338): `utm_source=ferah_nefes_oyun`, `utm_medium=advergame`, `utm_campaign=sinus_bulmaca`, `utm_content=game_over|pause_menu`. Hedef `CFG.cta = https://www.yasasinsaglik.com/`. Oluşan URL DOĞRULANDI.
- Oyundan çıkış (quit), mola ve ayar değişikliği için olay yok. **KOD ÜZERİNDEN İNCELENDİ**
- **RİSK:** `dataLayer` sonradan yüklenirse (ör. GTM geç gelirse), o ana kadarki olaylar yalnızca konsola gider ve kaybolur.
- **Global skor için temas noktaları:** `game.on('gameover')` işleyicisi (1375-1385), `showOver()` (1521-1534), `scr-over` ve `scr-start` DOM'u. Ayrıntılar risk analizi belgesinin §3 bölümünde.

---

## 5. Tespit edilen hata ve gözlemler

Bu görevde hiçbiri düzeltilmedi.

| # | Bulgu | Etiket | Konum |
|---|---|---|---|
| 1 | Mola ve devam sonrasında tıkanıklık ≥ %70 olsa bile kırmızı vinyet geri gelmiyor: `pause()` `hud.danger=null` yapıyor, ama vinyet yalnızca tıkanıklık değeri değiştiğinde yeniden değerlendiriliyor. Test: tıkanıklık 0.8 iken devam sonrası `danger.on = false` | DOĞRULANDI | 1282-1286, 1518 |
| 2 | Moladan açılan Ayarlar ekranında Esc'ye basınca oyun doğrudan devam ediyor (ayarlar kapanıyor). `screenStack` içinde bayat bir `scr-pause` girdisi kalıyor | DOĞRULANDI | 1406, 1503 |
| 3 | 844×390 mobil yatayda başlangıç kartı ekrana sığmıyor; alt butonlar kesik ve kart içinde kaydırma gerekiyor | DOĞRULANDI (ekran görüntüsü) | 109-112 |
| 4 | Game-over overlay'inin arkasında "Ferah nefes ×2 · n sn" ve "Rebound … n sn" rozetleri son değerleriyle donmuş halde görünmeye devam ediyor | DOĞRULANDI (ekran görüntüsü) | 1294-1297 |
| 5 | Favicon yok, her yüklemede 404 | DOĞRULANDI | |
| 6 | `meta.badges` dizi değilse çökme riski | RİSK (KOD) | 1328, 1527 |
| 7 | Ana menü ile çıkılan oyunun skoru, satırları ve analitik olayı kaydedilmiyor | KOD ÜZERİNDEN İNCELENDİ | 1520 |
| 8 | `Control` tuşu CCW döndürüyor; "Nasıl oynanır" ekranında belgelenmemiş | KOD ÜZERİNDEN İNCELENDİ | 1415 |
| 9 | `View.onLock` içindeki `pendingBoardSync` hiçbir yerde okunmuyor (ölü kod). `KEYS` içindeki `'Space'` değeri `e.key` ile hiçbir zaman eşleşmez (zararsız) | KOD ÜZERİNDEN İNCELENDİ | 1044, 1403 |
| 10 | Rebound sayacı `clearing/draining` sırasında durmuyor ama azalmıyor da (erken `return`); `multT` ise azalmaya devam ediyor. Küçük asimetri | KOD ÜZERİNDEN İNCELENDİ | 657-665 |
| 11 | Pixi CDN script'inde SRI (`integrity`) yok; CDN veya fontlar erişilemezse oyun açılmaz veya yedek fonta düşer | RİSK | 293, 10 |
| 12 | Oyun bir iframe içine gömülürse `window blur` olayı sık sık otomatik mola tetikleyebilir | RİSK (TEST EDİLEMEDİ) | 1567 |
| 13 | `window.__fn` üretimde de açık; konsoldan skor değiştirmek mümkün. Global skor için önemli | RİSK | 1592 |
| 14 | `prefers-reduced-motion` yalnızca CSS'i etkiliyor; Pixi sarsıntısı ve parçacıklar açık kalıyor | KOD ÜZERİNDEN İNCELENDİ | 146-150 |
