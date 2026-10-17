# NS4-03 · Modüler Kaynak Kod Mimarisi

**Tarih:** 2026-10-17
**Başlangıç commit'i:** `6bb0c7d` (NS4-02)
**Başlangıç `src/main.ts`:** 1369 satır, SHA-256 `8035c54b7b3580c81072a3e1a2f7496d8c62d2404d69709882d48db76c0a70ee`

**Etiketler:** DOĞRULANDI (tarayıcıda çalıştırılarak) · KOD ÜZERİNDEN İNCELENDİ · TEST EDİLEMEDİ

## 1. Görevin amacı

`src/main.ts` içindeki tek parça uygulamayı, davranış ve görünüm değiştirmeden sorumluluklarına göre TypeScript modüllerine ayırmak.

Yeni özellik eklenmedi. Hata düzeltilmedi; tasarım, metin, oyun dengesi ve bağımlılıklar değiştirilmedi. `index.html`, `src/styles.css`, `legacy/` ve `package-lock.json` dosyaları byte düzeyinde aynı kaldı.

## 2. Önceki mimari

NS4-02 sonunda bütün kod tek bir ES modülündeydi: `src/main.ts`, 1369 satır.

Bölümler aynı dosyada şu sırayla duruyordu: CONFIG → STORAGE → ANALYTICS → PIECES → `Game` → `Sound` → HAPTICS → `View` → LAYOUT → BOOT → HUD → BADGES → GAME EVENTS → INPUT → SCREENS → ayarlar → ana döngü.

Sistemler birbirine modül düzeyindeki global değişkenlerle bağlıydı: `settings`, `meta`, `appState`, `L`, `game`, `view`, `sound`, `input`. Ayrıca `Game.useCyc/useSyn` doğrudan `track()` çağırıyordu.

## 3. Yeni klasör ağacı

```
src/
├── main.ts                  # 9 satır: CSS + bootstrap() + başlatma hatası yakalama
├── styles.css               # değişmedi
├── app/
│   ├── bootstrap.ts         # sistemleri oluşturur, başlatma sırasını uygular, ana döngü, layout
│   ├── lifecycle.ts         # appState ve start / pause / resume / toMenu / oyun sonu akışı
│   └── events.ts            # wireGameEvents(): Game olayları → view/ses/haptik/UI/analitik
├── config/
│   └── gameConfig.ts        # COLS/ROWS/HIDDEN/VIS, CFG (as const)
├── content/
│   ├── tips.ts              # TIPS (sağlık ipuçları, birebir)
│   └── badges.ts            # BADGES (rozet tanımları, birebir)
├── game/
│   ├── Game.ts              # saf oyun motoru (on/emit olayları)
│   └── pieces.ts            # PIECE kimlikleri, SHAPES, KICK_JLSTZ, KICK_I
├── rendering/
│   ├── GameView.ts          # class View: sprite havuzları, texture yaşam döngüsü, efektler
│   ├── textures.ts          # COLORS + canvas 2D çizimleri (atlas, damla, dalga)
│   └── layout.ts            # computeLayout()
├── input/
│   └── InputController.ts   # klavye, DAS/ARR, pointer jestleri, HUD butonları, otomatik mola, dispose()
├── audio/
│   └── SoundManager.ts      # class Sound (Web Audio sentezi, müzik zamanlayıcısı)
├── haptics/
│   └── haptics.ts           # canVibrate, HAPTIC desenleri, createBuzz()
├── storage/
│   ├── store.ts             # 'fn_' önekli güvenli get/set
│   ├── settings.ts          # fn_settings: createDefaultSettings, settings, saveSettings
│   └── progress.ts          # fn_meta: createDefaultMeta, meta, saveMeta (yalnızca yerel)
├── analytics/
│   ├── analytics.ts         # track() (dataLayer / console.debug)
│   └── cta.ts               # ctaUrl() + UTM
├── ui/
│   ├── dom.ts               # $ (typed), place, listen (kaldırma fonksiyonu döndürür)
│   ├── hud.ts               # HUD güncelleme/sıfırlama, vinyet, güç etiketleri, applyHudLayout
│   ├── notifications.ts     # toast, popup
│   ├── screens.ts           # show, openSub, ekran yığını, ipuçları, renderGameOver
│   ├── badges.ts            # award, rozet listesi render
│   └── settingsPanel.ts     # ayarlar ekranı ↔ settings bağlama
└── types/
    ├── app.ts               # AppState
    ├── events.ts            # GameEvents, Pending, ScoredEvent, PowerDoneEvent
    ├── layout.ts            # Rect, Pt, Layout
    ├── settings.ts          # Settings (fn_settings), Meta (fn_meta)
    ├── analytics.ts         # AnalyticsEvent, CtaPlacement
    └── platform.ts          # Window genişletmesi (__fn, dataLayer, webkitAudioContext)
```

Toplam 32 TypeScript dosyası, 1742 satır (başlık yorumları ve importlar dahil).

**Önerilen ağaçtan bilerek ayrılan noktalar:**
- `game/rotation.ts`, `game/scoring.ts`, `game/powerups.ts` oluşturulmadı. Kick tabloları parça verileriyle birlikte `pieces.ts`'te tutuldu. Skor ve güç metodları `Game` sınıfının durumunu doğrudan değiştiriyor; onları ayırmak sınıfı fonksiyonlara bölmeyi, yani yeniden yazmayı gerektirirdi.
- `rendering/effects.ts` oluşturulmadı. Efektler View'in sprite havuzlarına sıkı bağlı; ayırmak yaşam döngüsünü parçalardı.
- `input/keyboard.ts` ve `input/pointer.ts` ayrılmadı. İkisi ortak durumu (`dir`, `gesture`) ve `reset()`'i paylaşıyor.
- `app/appState.ts` ayrılmadı. Durum `lifecycle.ts`'in yerel değişkeni, tipi `types/app.ts`'te; ayrı dosya yalnızca yönlendirme olurdu.
- `storage/settings.ts` ve `ui/settingsPanel.ts` ayrı tutuldu: biri veri, diğeri DOM bağlama.
- `src/vite-env.d.ts` gerekmedi; Vite tipleri `tsconfig.json` içindeki `types: ["vite/client"]` ile geliyor.
- Barrel (`index.ts`) dosyası kullanılmadı; bütün importlar doğrudan dosyaya yapılıyor.

## 4. Modül sorumlulukları

| Modül | Sorumluluk | Bilmediği / yapmadığı |
|---|---|---|
| `game/Game.ts` | Tahta, 7-bag, SRS, çarpışma, gravity, lock delay, soft/hard drop, hold, T-spin, satır, skor, combo, B2B, seviye, tıkanıklık, sıklamen, sentetik, rebound, çöp satırı, game over, `update(dt)`, `on/emit` | DOM, Pixi, HTML id, localStorage, CTA, ses, titreşim, ekran, analitik, global skor |
| `game/pieces.ts` | Tetromino kimlikleri (`PIECE`), şekiller, kick tabloları | — |
| `rendering/GameView.ts` | Pixi sahnesi; Game'i okuyup çizer; efektler | Skor, kural, storage, CTA, içerik seçimi |
| `rendering/textures.ts` | Canvas 2D çizimleri (saf) | PIXI |
| `rendering/layout.ts` | Ekran boyutundan Layout hesaplar (saf) | DOM, Pixi |
| `input/InputController.ts` | Klavye, pointer, HUD butonları, blur/visibility → Game eylemleri ve lifecycle çağrıları | appState'i yalnızca `getState()` ile okur; lifecycle'ı import etmez |
| `audio/SoundManager.ts` | Web Audio sentezi, müzik | DOM, ayar paneli (ayarları constructor'dan okur) |
| `haptics/haptics.ts` | Desenler, destek kontrolü, `createBuzz(isEnabled)` | DOM, ayar nesnesi |
| `storage/*` | Güvenli localStorage, varsayılan şekiller, tekil `settings`/`meta` nesneleri | UI, global skor |
| `analytics/*` | `track`, `ctaUrl` | Gerçek servis, consent |
| `ui/*` | DOM okuma/yazma, HUD, bildirimler, ekranlar, rozet listesi, ayar paneli | Oyun kuralı hesabı (Game'den veya olay payload'ından okur) |
| `content/*` | Metin verileri | — |
| `app/lifecycle.ts` | Durum geçişleri ve oyun sonu akışı (yerel kayıt + analitik + sonuç ekranı) | Oyun kuralı |
| `app/events.ts` | Game olay → sistem bağlantıları | Yeni olay adı, event-bus |
| `app/bootstrap.ts` | Nesne oluşturma, bağımlılık geçirme, başlatma sırası, ana döngü | — |

## 5. Bağımlılık yönü

```
types · config · content            (bağımlılıksız; types/platform yalnızca type-only)
        ↓
game · storage · analytics          (game → config, pieces, types)
        ↓
rendering · audio · haptics · input · ui
        ↓
app/lifecycle · app/events → app/bootstrap
        ↓
main
```

- `input` → `ui/dom` (yardımcı fonksiyonlar), `game/Game` (type-only).
- `ui/hud` → `game/Game` (type-only).
- `rendering` → `game/pieces` (veri), `game/Game` (type-only).

**Döngüsel bağımlılık kontrolü (DOĞRULANDI, depo dışındaki import-graf betiğiyle):**
- Runtime import döngüsü: **0**
- Type-only importlar dahil döngü: **0**
- Alt katmanlardan `app/` veya `main` importu: **0**

Görevde özellikle sorulan çiftlerin hiçbirinde iki yönlü import yok: Game ↔ View, UI ↔ lifecycle, Input ↔ lifecycle, Storage ↔ Settings UI, Content ↔ badge logic, Config ↔ Analytics, Rendering ↔ Layout.

## 6. Game motorunun sınırları

`game/Game.ts` yalnızca `config/gameConfig`, `game/pieces` ve `types/events`'i (type-only) import ediyor. Dosyada `document`, `window`, `PIXI`, `localStorage`, `navigator` veya `track` kullanımı yok (KOD ÜZERİNDEN İNCELENDİ, `grep`).

**Taşıma sırasında Game'de yapılan değişiklikler:**
1. `track('powerup_use', …)` çağrıları `useCyc` ve `useSyn`'den çıkarıldı; `app/events.ts`'te ikinci bir `clearstart` işleyicisinden gönderiliyor. Bu işleyici mevcut `clearstart` işleyicisinden **sonra** kaydedildiği için çağrı sırası aynı: önce view, ses ve popup, ardından analitik. Payload da aynı: `congestion` aynı tahta üzerinden hesaplanıyor ve `synUses` zaten artırılmış durumda.
2. `2`, `1`, `3`, `8` sayısal literal'leri aynı değerdeki `PIECE.O / I / T / GARBAGE` sabitleriyle değiştirildi. Tahtadaki sayısal format ve `Uint8Array` aynı.

Olay adları, payload'ları ve `on/emit` mekanizması değişmedi.

## 7. Rendering sınırları

`View`, Game'i ve `Layout`'u okuyor ve PixiJS kullanıyor. Skor hesaplamıyor, storage/CTA'ya erişmiyor, içerik seçmiyor.

Global `settings` yerine constructor'dan `Pick<Settings,'ghost'>` alıyor; uygulama aynı nesneyi verdiği için ayar değişiklikleri anında görülüyor.

`buildTextures()` içindeki çizim komutları `textures.ts`'e taşındı. Pixi texture oluşturma ve eski texture'ları yok etme sırası (yeni texture'lar → `syncAll()` → eskilerin `destroy`'u) View'de kaldı. Doğrulama: 5 viewport'ta ve döndürmelerde hata yok; seed'li ekran görüntüleri NS4-02 ile piksel düzeyinde aynı.

## 8. Input sınırları

`InputController`'ın açık bağımlılıkları:
- `game`, `canvas`, `settings` (das/arr)
- `getState()`, `getCell()`
- `pause()`, `resume()`, `unlockAudio()`

Bütün dinleyiciler `listen()` ile kaydediliyor ve `dispose()` hepsini kaldırıyor: klavye, canvas pointer, HUD butonları, `visibilitychange`, `blur`.

Tuşlar, eşikler ve tekrar kuralları birebir aynı.

`keydown` işleyicisi durumu bir kez okuyor. Orijinalde üç ayrı okuma vardı, ama durum değiştiren çağrılardan önce yapıldıkları için sonuç aynı.

Blur ve visibility kaydı, ayar panelinden önceye (input oluşturulduğu ana) taşındı. Farklı hedef ve olay türleri oldukları için diğer dinleyicilerle sıra etkileşimi yok. Dinleyici sayıları NS4-02 ile birebir aynı (§13).

## 9. UI sınırları

`ui/*` modülleri DOM'a yazıyor ama kural hesaplamıyor.
- `updateHud(game, playing)` artık `appState` global'ini okumuyor; `playing` bilgisini ana döngü `game.update`'ten **sonra** okuyup veriyor (orijinal davranış).
- Güç etiketleri (`resetSynLabel`, `showSynUses`, `showCycUsed`) ve vinyet (`hideDanger`, `forgetDanger`) fonksiyonlara taşındı; metinler aynı.
- `ui/screens.ts → hud (fmt), badges (renderBadges)` bağımlılığı tek yönlü.

## 10. Storage sınırları

- Anahtarlar `fn_settings` ve `fn_meta`, `fn_` öneki ve JSON şemaları değişmedi.
- Varsayılanlar `createDefaultSettings()` ve `createDefaultMeta()` fabrikalarında. Her çağrı yeni bir nesne döndürüyor, böylece `badges` dizisi paylaşılmıyor. Alan sırası ve dolayısıyla kaydedilen JSON aynı (DOĞRULANDI: `{"sound":true,"music":true,"haptics":true,"ghost":false,"fps":false,"das":167,"arr":33}`).
- `progress.ts` yalnızca yerel ilerlemeden sorumlu. Gelecekteki global skor bu modüle eklenmemeli.
- Göç sistemi, yeni anahtar veya `meta.badges` doğrulaması eklenmedi.

## 11. Analitik sınırları

- Olay adları (`game_start`, `powerup_use`, `level_up`, `badge`, `game_over`, `cta_click`) artık `AnalyticsEvent` birleşim tipiyle derleme zamanında denetleniyor. `fn_` öneki, `dataLayer` / `console.debug` davranışı ve UTM değerleri değişmedi.
- `ctaUrl` yalnızca `CtaPlacement` (`game_over | pause_menu`) kabul ediyor.

## 12. App lifecycle ve bootstrap

- `createLifecycle()` durumu (`AppState`) kapalı bir değişkende tutuyor. `getState()`, `start()`, `pause()`, `resume()`, `toMenu()`, `showOver()` ve `handleGameOver()` fonksiyonlarını döndürüyor.
- Lifecycle input'a yalnızca `resetInput` callback'iyle erişiyor; input da lifecycle'a yalnızca callback'lerle. Böylece import döngüsü oluşmuyor.

**`bootstrap()` başlatma sırası** (NS4-01/02 ile aynı):
1. `Game`, ardından `Sound`
2. Pixi `Application` ve canvas'ın stage'e eklenmesi
3. `View`
4. resize ve `ResizeObserver`
5. lifecycle ve olay bağlantıları
6. input
7. `initTips()` ve geri butonları
8. ekran butonları ve CTA
9. ayar paneli
10. ticker
11. `setTip('tip-start')` ve `doLayout()`
12. fontlar hazır olunca `queueLayout()`
13. DEV'de `window.__fn`

**Rastgelelik sırası korundu:** `initTips()` (ipucu indeksi için `Math.random`), orijinaldeki gibi `Game`'in torbayı karmasından **sonra** çağrılıyor. Seed'li görsel karşılaştırmanın 0 piksel fark vermesi bunu doğruluyor.

**`main.ts`:** `bootstrap()` senkron çalıştığı için gereksiz `async` kullanılmadı. Başlatma hatası `try/catch` ile yakalanıp bağlamıyla `console.error`'a yazılıyor.

## 13. Event wiring yaklaşımı

`wireGameEvents()` bütün `game.on(...)` kayıtlarını orijinal sırayla yapıyor:
`move, rotate, hold, lock, harddrop, clearstart, clearstart (analitik, yeni), clearend, scored, levelup, powerdone, garbage, gameover`

Yeni olay adı, event-bus veya kütüphane yok. `gameover` işleyicisi `lifecycle.handleGameOver(reason)`'u çağırıyor; gövdesi orijinal sırayla aynı.

**Çift tetikleme kontrolü (DOĞRULANDI, NS4-02 ve NS4-03 ayrı ayrı ölçüldü, dev ve prod):**
- Açılışta ve oyun sonunda bütün `addEventListener` sayıları (hedef ve olay türüne göre) birebir aynı.
- `ArrowLeft` ve `ArrowUp` başına 1 oscillator.
- Hard drop başına `[24, 12]` titreşim.
- Her başlatma için 1 `fn_game_start`, oyun sonunda 1 `fn_game_over`.
- Müzik zamanlayıcısı: pause/resume sonrası 2 başlatma, 1 temizleme, 1 canlı.
- 1 canvas, 1 AudioContext.

Tek fark oyun sonu toplamlarında ±2 oscillator / ±2 titreşim. Bunun kaynağı, oyun bitene kadar düşen rastgele parça sayısının bir eksik olması; bir parça tam 2 oscillator ve 2 titreşim üretiyor.

## 14. HMR ve cleanup yaklaşımı

**Gözlenen davranış (DOĞRULANDI):** Dev'de `src/game/pieces.ts` ve `src/input/InputController.ts`'e zararsız bir yorum satırı eklendi.
- Vite her iki seferde de tam sayfa yeniledi: sayfadaki işaretçi değişken kayboldu ve `load` olayı tetiklendi. Hiçbir modülde `import.meta.hot.accept` yok, bu yüzden değişiklik kök modüle kadar yayılıyor.
- Yeniden yüklemeden sonra:
  - canvas 1
  - `window:keydown` dinleyicisi 2 (taze açılışla aynı; biri Pixi'ye ait)
  - müzik zamanlayıcısı 1
  - AudioContext 1
  - `ArrowLeft` tam 1 kare kaydırdı ve 1 oscillator üretti
- Değişiklikler geri alındı ve dosya hash'leri eski hallerine döndü.

**Sonuç:** Tam sayfa yenileme eski bağlamı tamamen attığı için ek bir HMR temizlik sistemi kurulmadı. `InputController.dispose()` gelecekteki olası yeniden bootstrap senaryosu için hazır. Resize, ResizeObserver, ekran butonları, ayar paneli ve ticker için dispose yok (teknik borç, §17).

## 15. Global skor için bırakılan entegrasyon sınırı

- Skor `Game.gameOver()` → `emit('gameover')` anında kesinleşiyor. Entegrasyon noktası `app/lifecycle.ts` içindeki `handleGameOver()`; yerel `saveMeta()` çağrısından **sonra** olmalı.
- Gönderim, Game'den bağımsız ayrı bir modül olmalı (ör. ileride `services/` altında). `Game` hiçbir ağ çağrısı bilmemeli.
- Yerel rekor (`storage/progress.ts`, `fn_meta.best`) global sistemden ayrı kalmalı; global veriler ayrı anahtarlarda tutulmalı.
- Global tablo için uygun yerler: başlangıç ekranında `openSub()` ile açılan yeni bir ekran ve `renderGameOver()` içinde bir sonuç alanı.
- Production'da `window.__fn` kapalı (DOĞRULANDI).

## 16. Bilerek değiştirilmeyen hatalar

| # | Hata | NS4-03 durumu |
|---|---|---|
| A | Pause/resume sonrası yüksek tıkanıklıkta vinyet gelmiyor | DOĞRULANDI (dev, 0,8 tıkanıklıkta `on=false`) |
| B | Pause → Ayarlar'da Esc oyunu devam ettiriyor | DOĞRULANDI (dev ve prod) |
| C | Game-over arkasında ×2 ve Rebound rozetleri donmuş görünüyor | DOĞRULANDI (prod ekran görüntüsü) |
| D | 844×390'da başlangıç kartı ekrana sığmıyor | DOĞRULANDI (NS4-02 görüntüsüyle 0 piksel fark) |
| E | Ana menüye çıkılan oyunun skoru kaydedilmiyor | DOĞRULANDI (NS4-02 ve NS4-03'te 128-130 puan sonrası çıkışta `fn_meta` = `null`) |
| #6 | `meta.badges` dizi değilse çökme | DOĞRULANDI (iki sürümde de `{"badges":null}` ile oyun sonunda aynı `TypeError … reading 'includes'` ve game-over ekranı açılmıyor) |

## 17. Ertelenen teknik borçlar

- **Dar assertion'lar** (NS4-02'den kalanlar, NS4-04'e):
  - `this.bag.pop()!`, `this.queue.shift()!`, `this.pending!`
  - `getContext('2d')!` (3 yer, artık `textures.ts`'te)
  - `sh!`, `p.base!`, `{…} as Layout`, `el as T`
  - `hud as Record<string, unknown>`, `querySelector(...)!`
  - `dataset.k as keyof Settings`
  - `L!.cell` (artık yalnızca bootstrap'teki `getCell` callback'inde)
  - `listen()` içinde `fn as EventListener`

  NS4-02'deki `settings as Record<…>` assertion'ı kaldırıldı; yerine `Object.assign(settings, { [k]: … })` kullanılıyor (aynı tek alan ataması).
- **Dispose:** bootstrap düzeyindeki resize, ResizeObserver, ekran butonları, ayar paneli ve ticker için dispose yok. Şu an tek bootstrap ve tam yenileme olduğu için gerek yok.
- **`Game.state`** tipi hâlâ `string`. Birleşim tipe çevrilmesi NS4-04 kapsamında.
- **Bundle:** Vite'ın 500 kB uyarısı sürüyor (PixiJS).
- **Kalıcı test altyapısı yok.** Testler depo dışındaki Playwright betikleriyle yapıldı.

## 18. Davranış doğrulama sonucu

Ayrıntılar §13, §14 ve §16'da. Hepsi headless Microsoft Edge 155 (Chromium) ve Playwright 1.48.2 ile **emülasyonda** yapıldı; gerçek cihaz kullanılmadı.

| Kontrol | Dev | Prod (preview) |
|---|---|---|
| 70 kontrollük DOM smoke seti (NS4-02 ile aynı betik, gevşetilmedi) | **70/70** | **70/70** |
| `__fn` | var | yok |
| Runtime hatası, konsol (debug dışı), 4xx/5xx | 0 / temiz / 0 | 0 / temiz / 0 |
| PixiJS CDN isteği / `window.PIXI` | yok / yok | yok / yok |
| Favicon | `favicon.svg` 200 | `favicon.svg` 200 |

**Mekanik sayısal sonuçlar** (NS4-01 iç durum enjeksiyon testi, dev):

| Senaryo | NS4-01 / NS4-02 | NS4-03 |
|---|---|---|
| Tek satır, seviye 1, 19 satır hard drop, lines 9→10 | +138, seviye 2 | **+138**, seviye 2 |
| Tetris (I dikey, 4 satır), seviye 2, combo 1 | +1732 | **+1732** |
| T-spin double, seviye 2, B2B ve combo 2 | +3800, kind 2 | **+3800**, kind 2 |
| Ardışık tekli satırlar, combo 3/4/5, seviye 2 | +538 / +638 / +738 | **+538 / +638 / +738** |
| Damla tint'leri | `[0x3fd2de, 0xff7868, 0xffffff]` | aynı |

**Diğer akışlar** (DOĞRULANDI): hareket, döndürme, hold (yeniden kullanım engeli dahil), soft/hard drop, ghost, next, sıklamen (×2 rozeti, ikinci kullanım engeli; bu koşuda 9 satır → +1350 = 150×9×1), sentetik ×2 → rebound 40 sn, çöp satırı, pause/resume, blur pause, game over, yerel rekor, tekrar oyna, ana menü, ayarların kalıcılığı, eski sürüm biçimindeki `fn_settings`/`fn_meta`'nın okunması, CTA ve UTM, tema değişkenleri, 5 viewport ve 5 döndürme.

**Görsel karşılaştırma** (NS4-02 ve NS4-03, seed'li RNG ve reduced-motion, pixelmatch eşiği 0.1):

| Ekran | Prod 390×844 | Prod 1366×768 | Dev 390×844 | Dev 1366×768 |
|---|---|---|---|---|
| Menü / HUD / Pause | 0 / 0 / 0 px | 0 / 0 / 0 px | 0 / 0 / 0 px | 0 / 0 / 0 px |
| Game-over | %0,10 | 0 px | %0,21 | %0,29 |
| 172 geometri, stil ve storage değeri | 0 fark | 0 fark | 0 fark | 0 fark |

Game-over farkları yalnızca "Sıradaki" kuyruğunda (diff görüntüsüyle doğrulandı). Nedeni sarsıntı efektinin her karede `Math.random()` çağırması; NS4-02'de orijinal sürüm kendisiyle karşılaştırıldığında da aynı tür fark çıkmıştı.

## 19. Bundle karşılaştırması

| | JS | JS gzip | CSS |
|---|---|---|---|
| NS4-02 (`6bb0c7d`) | 513,60 kB | 156,03 kB | 10,45 kB |
| NS4-03 | 515,68 kB | 156,71 kB | 10,45 kB |
| Fark | +2,08 kB (+%0,4) | +0,68 kB | 0 |

Artışın kaynağı modül sınırlarının bazı inline/minify fırsatlarını engellemesi ve yeni küçük yapılar: `InputController` sınıfı ve `listen` kaldırma fonksiyonları, lifecycle/factory closure'ları, `PIECE` nesnesi. Bilinçli bir optimizasyon yapılmadı; 500 kB uyarısı sürüyor.

## 20. Sonraki aşama notları

- **NS4-04 (tip sertleştirme):**
  - §17'deki assertion'lar
  - `Game.state` ve `Pending.kind` için birleşim tipler
  - `GameEvents` payload'larının daraltılması
  - `track` payload tiplerinin olay başına tanımlanması
- **Birim test için hazır sınırlar:**
  - `game/Game.ts` (DOM'suz)
  - `rendering/layout.ts` (saf)
  - `analytics/cta.ts`
  - `storage/*` (`localStorage` mock'u ile)
  - `ui/hud` mantığı (DOM gerekir)
- **Hata düzeltme aşaması (NS4-06):** A–E ve #6. Her biri bir modüle sınırlı:
  - A, B, C → `ui/hud`, `app/lifecycle`, `input`
  - D → `styles.css`
  - E → `app/lifecycle`
  - #6 → `storage/progress`
- **Global skor:** §15'teki sınırlar.
- **Tek tema geçişi:** yalnızca `styles.css` ve `index.html`'deki `theme-color`'ı ilgilendirir; TS koduna dokunmaz.
