# NS4-02 · Vite ve TypeScript Geçişi

**Görev:** NS4-02: Vite ve TypeScript altyapısına kayıpsız geçiş
**Tarih:** 2026-10-17
**Başlangıç commit'i:** `3c17aed` (NS4-01)
**Kaynak:** `Ferah Nefes · Sinüs Bulmacası.html`, SHA-256 `bd358624e215e9e3a5247b622ec6a44dbc27f7d33c60518e4b7abf09111d03cb`. Değer görev boyunca değişmedi; dosya şimdi `legacy/` altında.

**Amaç:** oyunun davranışını, görünümünü, dengesini, metinlerini ve kalıcılığını değiştirmeden Vite + TypeScript + npm PixiJS yapısına taşımak.

Bu bir refactor veya hata düzeltme görevi değildi. Geçişin kendisinin yol açtığı tek sorun (bkz. §8) dışında hiçbir davranış bilerek değiştirilmedi.

## 1. Eski ve yeni dosya eşlemesi

| Orijinal (tek HTML) | Yeni konum | Not |
|---|---|---|
| Satır 1-10: `<head>` meta, title, font bağlantıları | `index.html` 1-10 | Birebir aynı (`diff` ile doğrulandı) |
| — | `index.html` 11 | Yeni: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` |
| Satır 11-151: inline `<style>` | `src/styles.css` (139 satır) | `<style>` etiketleri dışındaki 12-150. satırlar birebir. `main.ts` içinden `import './styles.css'` ile yükleniyor |
| Satır 153-291: `<body>` DOM'u | `index.html` 13-151 | Birebir aynı (`diff` ile doğrulandı). Bütün id, aria-label, data-* ve inline SVG değerleri korundu |
| Satır 293: PixiJS CDN `<script>` | kaldırıldı | Yerine `import * as PIXI from 'pixi.js'` |
| Satır 294-1594: inline `<script>` ve IIFE | `src/main.ts` | 298-1592. satırlar aynı sırayla taşındı. IIFE açılışı/kapanışı ve `'use strict'` kaldırıldı (bkz. §4) |
| — | `index.html` 152 | `<script type="module" src="/src/main.ts"></script>` (body sonunda) |
| — | `public/favicon.svg` | Yeni, minimal favicon (bkz. §7) |
| Dosyanın kendisi | `legacy/Ferah Nefes · Sinüs Bulmacası.html` | `git mv` ile taşındı (Git rename olarak algıladı); içerik değişmedi |

Yeni yapılandırma dosyaları: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`.

`src/vite-env.d.ts` oluşturulmadı; Vite tipleri `tsconfig.json` içinde `"types": ["vite/client"]` ile alınıyor. Window genişletmesi `main.ts` içindeki dar kapsamlı `declare global` bloğunda.

## 2. Bağımlılıklar (tam sürüm, `--save-exact`)

| Paket | Sürüm | Tür | Not |
|---|---|---|---|
| `pixi.js` | **7.4.2** | dependency | CDN'deki sürümle birebir aynı. v8'e geçilmedi |
| `vite` | 8.3.4 | devDependency | 2026-10-06'da 8.1, 8.2 ve 8.3 hatlarına aynı anda yama çıkmıştı; en son yama sürümü seçildi. Node gereksinimi `^20.19.0 \|\| >=22.12.0` |
| `typescript` | 7.0.2 | devDependency | Yalnızca `tsc --noEmit` için. Vite TS'i kendi transpiler'ıyla dönüştürür |

`npm install` sonucunda 0 güvenlik açığı raporlandı. UI framework, lint aracı, test aracı veya analitik paketi eklenmedi.

## 3. PixiJS import yaklaşımı

- `import * as PIXI from 'pixi.js'` namespace import'u kullanıldı. Böylece mevcut `PIXI.Application`, `Container`, `Sprite`, `Texture`, `BaseTexture`, `Rectangle`, `ParticleContainer`, `TilingSprite`, `BLEND_MODES` ve `Texture.WHITE` çağrıları hiç değişmedi.
- `new PIXI.Application<HTMLCanvasElement>({...})` biçiminde yalnızca generic parametre eklendi; seçenekler aynı. Bu sayede `app.view` artık `HTMLCanvasElement` tipinde ve pointer olayları ile `getBoundingClientRect` tip açısından doğru.
- **`PIXI.utils.string2hex` değiştirildi** (tek davranış dışı ayar, §8).
- Production'da `window.PIXI` global'i yok. Bu, NS4-01 test betiğinin bir satırını etkiledi (oyunu değil).

## 4. TypeScript dönüşüm kararları

- **`strict: true`.** `@ts-nocheck`, `@ts-ignore` ve `any` kullanılmadı.
- **IIFE kaldırıldı.** Orijinal gövde zaten girintisizdi. ES modülü strict modda çalıştığı ve kendi kapsamına sahip olduğu için davranış aynı. Fonksiyon hoisting'i ve `input`/`gesture` sıralaması modül kapsamında aynı şekilde çalışıyor.
- **Sınıf alanları bildirildi** (`Game`, `Sound`, `View`). `reset()` veya `buildTextures()` içinde atanan alanlar için `!` (definite assignment) kullanıldı. `useDefineForClassFields: true` ile bu alanlar constructor gövdesinden **önce** `undefined` olarak tanımlanır; constructor sırası (`handlers → board → reset() → state='idle'`) değişmedi.
- **Olay tipleri:** `GameEvents` haritası eklendi. `on()` payload tipini olay adıyla denetliyor; `emit()` içinde tek bir `as never` var.
- **Layout tipleri:** `Rect`, `Pt`, `Layout`, `Particle`, `ClearAnim`, `Gesture`, `Pending` tipleri eklendi. Hepsi yalnızca derleme zamanında var.
- **Parametre tipleri** tüm fonksiyon ve metodlara eklendi. İsimler, sıra ve varsayılanlar aynı; tek istisna `placeMini`.
- **`$` yardımcısı:** `<T extends HTMLElement = HTMLElement>(id) => T`. Eleman bulunamazsa açık bir `Error` fırlatıyor (orijinal `null` döndürüp sonraki satırda çöküyordu). `index.html` içindeki bütün id'ler mevcut olduğundan davranış farkı yok. `HTMLButtonElement` (`disabled`) ve `HTMLAnchorElement` (`href`) çağrılarında generic kullanıldı.
- **`textContent = sayı` atamaları** `String(sayı)` yapıldı (`hud-level`, `hud-lines`, `o-lines`, `v-das`, `v-arr`). Range input `value` ataması da `String(...)` oldu. DOM zaten aynı dönüşümü yapıyordu; sonuç birebir aynı.
- **`show()`:** `document.activeElement.blur`, `HTMLElement` tipli bir yerel değişken üzerinden çağrılıyor. Mantık aynı.

### Dar kapsamlı type assertion ve non-null işaretleri (teknik borç)

Hepsi çalışma anında garanti olan bir koşulu tipe bildirir. Hiçbiri çalışma davranışını değiştirmez. NS4-04'te gözden geçirilmeleri önerilir.

| Satır (`src/main.ts`) | İfade | Gerekçe |
|---|---|---|
| 96, 110-111 | `Array<(a: never) => void>`, `h[i](a as never)` | Generic mapped type'ta handler dizisi |
| 140 | `this.bag.pop()!` | Bag boşsa hemen üstte yeniden dolduruluyor |
| 153 | `this.queue.shift()!` | Kuyruk her zaman 8 elemanlı |
| 351 | `this.pending!` | `finishPending` yalnızca `clearing/draining` sırasında çağrılıyor |
| 668, 697, 704 | `getContext('2d')!` | Yeni oluşturulan canvas'ta 2D context her zaman var |
| 758, 762 | `sh!` | `has` true ise `sh` dolu |
| 770 | `placeMini(..., cx = 0, cy = 0, mc = 0, alpha = 1)` | Varsayılanlar yalnızca `type=0` çağrısı için var; o çağrı da hemen erken dönüyor. Tüm gerçek çağrılar bu değerleri açıkça geçiyor |
| 899 | `p.base!` | `life > 0` ise `emitDrop` `base`'i atamış |
| 926 | `{ W, H, portrait } as Layout` | Nesne aşağıdaki satırlarda kademeli dolduruluyor |
| 987 | `el as T` | Typed `$` yardımcısı |
| 1026, 1214, 1233 | `L!` | Closure içinde narrowing kayboluyor. Pointer olayları yalnızca oynarken, layout hesaplandıktan sonra geliyor |
| 1071 | `hud as Record<string, unknown>` | `for...in` ile sıfırlama |
| 1080, 1083, 1268 | `firstChild!`, `querySelector(...)!` | Eleman bir önceki satırda oluşturuluyor |
| 1326, 1331 | `dataset.k as keyof typeof settings`, `settings as Record<...>` | Ayar anahtarları HTML'deki `data-k` değerleri |
| 623, 643 | `this.tex = ... = null` ve `this.wave = null` atamaları kaldırıldı | Alanlar ilk `buildTextures()` çağrısına kadar `null` yerine `undefined`. Bu alanlar yalnızca truthiness ile kontrol ediliyor (`if (o)`, `if (oldDrop)`, `if (this.wave)`, `view.wave && ...`), dolayısıyla sonuç aynı |

## 5. `base` kararı

`vite.config.ts` içinde `base: './'`. Production çıktısında JS, CSS ve favicon bağlantıları göreli (`./assets/…`, `./favicon.svg`; `dist/index.html` incelenerek doğrulandı). Böylece `dist/` hem alan adı kökünde hem `/<repo>/` gibi bir alt dizinde çalışır.

**ÖNERİ:** Dağıtım hedefi seçildiğinde bu karar yeniden doğrulanmalı:
- GitHub Pages repository alt yolu
- Özel domain kökü
- Cloudflare Pages
- Netlify
- Başka bir statik host

Göreli base, SPA yönlendirmesi veya alt sayfalar eklenirse sorun çıkarabilir; oyun şu an tek sayfa. Deploy workflow'u bu görevde kurulmadı.

## 6. localStorage uyumluluğu

- Anahtarlar (`fn_settings`, `fn_meta`), `fn_` öneki, `store.get/set` mantığı ve JSON şemaları **değişmedi**.
- Doğrulama: eski sürümün yazdığı biçimdeki JSON değerleri yeni sürümün origin'ine yazıldı ve sayfa yeniden yüklendi. Ayarlar (ghost kapalı, müzik kapalı, DAS 200, ARR 20), rekor (1.957), toplam drenaj (42 → artarak) ve rozetler (`ozmotik`, `noro` sahip olunan olarak) hem dev'de hem production'da doğru okundu.
- Göç (migration) sistemi eklenmedi.
- `meta.badges` dizi değilse çökme riski (NS4-01 bulgu #6) **bilerek düzeltilmedi**; geçişi engellemiyor. NS4-06'ya bırakıldı.

## 7. Favicon

`public/favicon.svg`: 32×32 viewBox, turkuaz (`#0f9e93`) yuvarlak kare üzerinde soyut, açık pembe (`#ffd3e6`) üç yapraklı çiçek. Oyundaki başlangıç çiçeğinin sadeleştirilmiş hâli; marka logosu değil, harici kaynak kullanmıyor (529 bayt).

`index.html`'e `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` eklendi. Build sırasında `./favicon.svg` olarak yazılıyor. NS4-01'deki `GET /favicon.ico 404` artık oluşmuyor (bkz. doğrulama raporu).

## 8. Geçiş nedeniyle ortaya çıkan ve çözülen sorun

| Sorun | Neden | Çözüm |
|---|---|---|
| İlk satır temizlemede konsola `PixiJS Deprecation Warning: utils.string2hex is deprecated` yazılıyordu (dev ve production) | npm paketindeki `@pixi/utils` `string2hex` çağrısında koşulsuz `deprecation()` basıyor. NS4-01'de CDN `pixi.min.js` ile aynı çağrı uyarı üretmemişti | `PIXI.utils.string2hex(COLORS[v])` yerine `PIXI.Color.shared.setValue(COLORS[v]).toNumber()` yazıldı (`main.ts` 824-826). Bu, `string2hex`'in kendi gövdesindeki ifadedir (`@pixi/utils/lib/color/hex.mjs`). Dönen değer aynı; tarayıcıda parçacık `tint` değerleri `[0x3fd2de, 0xff7868, 0xffffff]` ile birebir eşleşti |

## 9. Debug erişimi

`window.__fn = { game, view, app }` artık yalnızca `if (import.meta.env.DEV)` bloğunda tanımlanıyor (`main.ts` 1366-1369). Değişikliğin amacı production güvenliği: global skor geldiğinde konsoldan oyun durumuna erişimi kapatmak.
- Production bundle'da `__fn` dizesi yok (`grep` ile doğrulandı) ve çalışma anında `window.__fn === undefined`.
- Dev'de erişim çalışıyor; NS4-01 test betikleri dev'de bununla koştu.
- Oyun davranışına etkisi yok.
- Window tipi `main.ts` içindeki `declare global` bloğunda: `__fn?`, `dataLayer?`, `webkitAudioContext?`.

## 10. Bilerek değiştirilmeyen davranışlar

- Bütün sabitler, süreler, skor tabloları, formüller, input eşikleri, haptik desenleri ve ses parametreleri
- Bütün metinler ve sağlık içeriği (TIPS, toast'lar, popup'lar, HTML metinleri)
- Analitik olay adları ve payload'ları, UTM değerleri, CTA hedefi
- Açık/koyu tema CSS'i (`prefers-color-scheme` ve `data-theme`)
- Başlatma sırası: `Game → Sound → Application → canvas → View → (olay bağları) → setTip → doLayout → fontsReady → queueLayout`
- NS4-01'de bilinen hatalar:
  - **A.** Pause/resume sonrası vinyet gelmiyor
  - **B.** Pause → Ayarlar'da Esc oyunu devam ettiriyor
  - **C.** Game-over arkasında rozetler donmuş görünüyor
  - **D.** 844×390'da menü kartı kesik
  - **E.** Ana menüye çıkışta skor kaydedilmiyor
  - **#6.** `meta.badges` dizi değilse çökme riski

  Hepsi yeni sürümde yeniden gözlendi; bkz. `NS4-02-VERIFICATION.md`.
- Ölü kod (`pendingBoardSync`, `KEYS` içindeki `'Space'`) ve belgelenmemiş `Control` tuşu

## 11. Ertelenen teknik borçlar ve sonraki modülerleştirme notları

- **Bundle boyutu:** `dist/assets/index-*.js` yaklaşık 514 kB (gzip 156 kB) ve Vite'ın 500 kB uyarısını tetikliyor. Neredeyse tamamı PixiJS. Code-splitting veya Pixi alt paketlerine (`@pixi/core` ve diğerleri) geçiş bu görevin dışında.
- **Google Fonts** hâlâ harici (gizlilik ve çevrimdışı açılış riski NS4-01 #5).
- **HMR (TEST EDİLMEDİ):** `main.ts` içinde `import.meta.hot` kabulü yok. Vite'ın belgelenmiş davranışına göre bu durumda değişiklik kök modüle kadar yayılıyor ve tam sayfa yenileme yapılıyor, yani dinleyici veya AudioContext birikmesi beklenmiyor. Bu davranış bu görevde ayrıca ölçülmedi. Modüllere bölündükten sonra (NS4-03) yeniden kontrol edilmeli.
- **Modüllere ayırma için önerilen sıra (NS4-03 ve sonrası):**
  1. `config.ts` (COLS…CFG)
  2. `storage.ts`
  3. `pieces.ts` (SHAPES/KICK)
  4. `game.ts` (DOM'suz; birim testlere uygun)
  5. `sound.ts`, `haptics.ts`
  6. `view.ts` ve `layout.ts`
  7. `hud.ts`, `input.ts`, `screens.ts`
  8. `main.ts` (boot)

  `track()` çağrıları `Game`'den bir olay köprüsüyle ayrılmalı.
- **Assertion'lar:** §4'teki listedeki her biri NS4-04'te ayrıntılı tiplerle kaldırılabilir.
- **Test:** NS4-01 ve NS4-02'de kullanılan Playwright betikleri depo dışında. Kalıcı bir test altyapısı ayrı görev olmalı.
