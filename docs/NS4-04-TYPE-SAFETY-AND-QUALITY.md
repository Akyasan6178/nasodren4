# NS4-04 · TypeScript Tip Güvenliği ve Kod Kalitesi

**Tarih:** 2026-10-17 · **Başlangıç commit'i:** `f789e0e` (NS4-03) · **Etiketler:** DOĞRULANDI (tarayıcıda çalıştırılarak) · KOD ÜZERİNDEN İNCELENDİ · TEST EDİLEMEDİ

## 1. Görevin amacı

Modüler mimariyi koruyarak tip güvenliğini artırmak, belirsiz tipleri ve assertion'ları azaltmak, ESLint ve Prettier kurmak, kalite komutlarını düzenlemek ve NS4-05 otomatik testleri için güvenilir bir temel bırakmak. Oyun mekaniği, görsel tasarım, görünür metinler ve sağlık içeriği **bilinçli olarak değiştirilmedi**; bilinen hatalar düzeltilmedi.

## 2. Başlangıç durumu

| Kontrol                                         | Sonuç                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Branch / son commit                             | `main` / `f789e0e refactor(ns4-03): modularize game architecture` |
| `origin/main` farkı                             | 0 / 0, çalışma ağacı temiz                                        |
| `src/main.ts`                                   | 9 satır                                                           |
| `npm install` / typecheck                       | 0 açık / 0 hata                                                   |
| Build                                           | JS 515,68 kB (gzip 156,71 kB), CSS 10,45 kB                       |
| Dev smoke (70 kontrol)                          | 70/70; runtime hatası, debug dışı konsol mesajı ve 4xx/5xx yok    |
| ESLint (kurulumdan hemen sonra, kod değişmeden) | 16 bulgu (bkz. §18)                                               |

## 3. TypeScript katılık seçenekleri

Her seçenek tek başına açılıp hata sayısı ölçüldü; ölçütler: gerçek hata sınıfını önlüyor mu, Vite/PixiJS ile uyumlu mu, anlamsız assertion gerektiriyor mu, davranışı değiştirmeden uygulanabiliyor mu.

| Seçenek                                                                           | Ölçülen hata          | Karar                                                          |
| --------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------- |
| `strict` (noImplicitAny, strictNullChecks, useUnknownInCatchVariables …)          | 0                     | Zaten açık, korundu                                            |
| `noFallthroughCasesInSwitch`, `isolatedModules`, `verbatimModuleSyntax`, `noEmit` | 0                     | Zaten açık, korundu                                            |
| `noImplicitReturns`                                                               | 0                     | **Açıldı**                                                     |
| `noImplicitOverride`                                                              | 0                     | **Açıldı** (kalıtım yok; gelecek için koruma)                  |
| `noUnusedLocals`, `noUnusedParameters`                                            | 0 (temizlikten sonra) | **Açıldı**                                                     |
| `exactOptionalPropertyTypes`                                                      | 0                     | **Açıldı**                                                     |
| `noPropertyAccessFromIndexSignature`                                              | 1 (`inp.dataset.k`)   | **Açıldı**; `dataset['k']` ile dinamik anahtar görünür kılındı |
| `noUncheckedSideEffectImports`                                                    | 0                     | **Açıldı** (`import './styles.css'` Vite tipleriyle çözülüyor) |
| `allowUnreachableCode: false`, `allowUnusedLabels: false`                         | 0                     | **Açıldı**                                                     |
| `noUncheckedIndexedAccess`                                                        | **111**               | **Açılmadı** (bkz. §5)                                         |

## 4. Etkinleştirilen compiler seçenekleri

`tsconfig.json`: `noImplicitReturns`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`, `allowUnreachableCode: false`, `allowUnusedLabels: false`. `strict` ve önceki bütün seçenekler korundu; katılık hiçbir yerde düşürülmedi.

## 5. Etkinleştirilmeyen seçenekler ve nedenleri

- **`noUncheckedIndexedAccess`**: 111 hata; 84'ü `GameView` sprite havuzlarında (`cells[r * COLS + col]`, `parts[i]`, `flashes[i]`), 19'u `Game` içindeki `Uint8Array` tahta ve şekil ofseti erişimlerinde. Bu indeksler döngü sınırlarıyla (0..199, 0..3, 0..419) garanti altında; seçeneği açmak sıcak döngülere ~100 assertion veya runtime kontrolü eklemeyi gerektirir. Gerçek hata önleme değeri düşük, maliyeti ve davranış riski yüksek → teknik borç olarak NS4-05 testleriyle (sınır testleri) karşılanması önerilir.
- **`erasableSyntaxOnly`**, **`isolatedDeclarations`**: kütüphane/declaration üretimi yapılmadığı için gereksiz.

## 6. Başlangıç assertion/any envanteri

Yorumlar hariç, depo dışındaki envanter betiğiyle (`src/**/*.ts`):

| Kategori                                            | Başlangıç | Son | Not                                                                                                                                                      |
| --------------------------------------------------- | --------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` (tip)                                         | 0         | 0   | Sayaçtaki 3 eşleşme `Game.nonEmptyBottomRows` içindeki `any` adlı yerel boolean değişken; tip değil. `JSON.parse`'ın gizli `any` dönüşü kaldırıldı (§11) |
| `as Tip` assertion                                  | 9         | 3   |                                                                                                                                                          |
| non-null `!` (ifade)                                | 16        | 4   |                                                                                                                                                          |
| definite assignment `!:` (alan)                     | 48        | 42  | Sound'dan 6 alan kalktı (§15)                                                                                                                            |
| `unknown`                                           | 5         | 5   | Hepsi dış veri sınırı (storage, dataLayer, Promise<unknown>)                                                                                             |
| `Record<string, …>`                                 | 8         | 1   | Kalan: `PIECE … satisfies Readonly<Record<string, BlockId>>` (yalnızca değer denetimi)                                                                   |
| `as const`                                          | 2         | 5   | Sabit tuple/literal'ler (BLOCK_IDS, BADGE_IDS, olay adı)                                                                                                 |
| `@ts-ignore/expect-error/nocheck`, `eslint-disable` | 0         | 0   |                                                                                                                                                          |

## 7. Son assertion/any envanteri ve gerekçeleri

| Yer                               | İfade                                                                            | Sınıf                        | Gerekçe                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `game/pieces.ts` `nextRotation`   | `((rot + dir + 4) & 3) as RotationState`                                         | Gerekli ve güvenli           | Bit maskesi her zaman 0..3 üretir                                                                        |
| `game/pieces.ts` `kickKey`        | `('' + from + to) as RotationTransition`                                         | Gerekli ve güvenli           | `dir` yalnızca ±1 → her zaman komşu geçiş                                                                |
| `rendering/GameView.ts` `asBlock` | `v as BlockId`                                                                   | Platform sınırı (Uint8Array) | Tahtaya yalnızca Game 0..8 yazar; yalnızca 0 olmayan hücrelerde çağrılır                                 |
| `game/Game.ts`                    | `this.bag.pop()!`, `this.queue.shift()!`                                         | Gerekli ve güvenli           | Bag/kuyruk bir satır önce doldurulur (8 eleman)                                                          |
| `game/Game.ts`                    | `this.pending!`                                                                  | Teknik borç                  | `finishPending` yalnızca `clearing/draining` iken çağrılır                                               |
| `app/bootstrap.ts`                | `L!.cell`                                                                        | Teknik borç                  | Pointer olayları ilk layout'tan sonra gelir; sıfır boyutlu sahnede orijinal davranış (TypeError) korunur |
| Definite assignment `!:`          | Game (10 satır), GameView (`tex`, `ghostTex`, `dropTex`, `waveTex`, `wave`, `L`) | Gerekli                      | `reset()` constructor'dan; `buildTextures()` ilk `layout()`'tan çağrılır                                 |

**Kaldırılan assertion ve `!`'ler:** `{ W, H, portrait } as Layout` (layout iki tam nesneye ayrıldı), `el as T` (`$` artık `instanceof` ile doğrular), `fn as EventListener` (×2, `listen` overload'ları), `hud as Record<string, unknown>` (`Object.assign(hud, initialHud())`), `document.activeElement as HTMLElement` (`instanceof`), `dataset.k as keyof Settings` (tip koruyucu), `h[i](a as never)` ve handler dizisi cast'i (tipli olay haritası), `sh!` ×2 (aliased narrowing), `p.base!` (alan zorunlu), `getContext('2d')!` ×3 (`context2d()`), `querySelector(...)!` ×4 ve `firstChild!` (DOM doğrudan kurulur), NS4-03'teki `$<HTMLButtonElement>` / `$<HTMLAnchorElement>` generic cast'leri.

## 8. Game domain tipleri (`types/game.ts`)

`TetrominoType = 1..7`, `GarbageCell = 8`, `BlockId`, `CellValue = 0 | BlockId`, `PieceSlot = TetrominoType | 0`, `RotationState = 0..3`, `Step = 1 | -1` (`RotationDirection`), `RotationTransition` (8 SRS geçişi), `Offset`/`PieceShape`/`PieceRotations`/`KickTable` (readonly tuple'lar), `GameState = 'idle' | 'play' | 'clearing' | 'draining' | 'over'`, `GameOverReason = 'blockout' | 'lockout' | 'overlap' | 'garbage'`, `PendingClearKind = 'lines' | 'cyc' | 'syn'`, `PowerupKind`, `TSpinKind = 0 | 1 | 2`.

- Runtime sayısal değerler ve `Uint8Array` tahta değişmedi; enum kullanılmadı (çıktıyı değiştirirdi).
- `SHAPES: Readonly<Record<TetrominoType, PieceRotations>>`, `KICK_*: KickTable` — koordinatlar aynı, `// prettier-ignore` ile hizalama korundu.
- `Game.type: PieceSlot`; şekil tablosu yalnızca `TetrominoType` ile indekslenir. Aktif parça yollarında `private get piece()` 0'ı açıkça reddeder (orijinalde bu ulaşılamaz yol `SHAPES[0]` üzerinden TypeError verirdi; ulaşılabilir yollarda davranış aynı).
- **Tip denetiminin yakaladığı ince nokta:** `update()` içinde `addGarbage()` sonrası `state === 'over'` kontrolü, TypeScript'in yöntem çağrısı sonrası daraltmayı sıfırlamaması yüzünden "imkânsız karşılaştırma" olarak işaretlendi. Kontrol gerçekte gereklidir (çöp satırı oyunu bitirebilir); cast yerine `isOver()` ile durum yeniden okunuyor.

## 9. Event sistemi tipleri (`types/events.ts`)

- `GameEvents` haritası; payload'sız olaylar `void`. `GameEventArgs<K>` payload'sız olaylarda argümansız `emit('spawn')` / `() => void` dinleyici, payload'lı olaylarda tek argüman zorunlu kılar.
- `on()` olay adını ve dinleyici tipini birlikte denetler, handler dizisi `private readonly`; `on()` artık kaldırma fonksiyonu döndürür (mevcut çağıranlar kullanmaz). Olay adları, payload alanları, kayıt ve çağrı sırası değişmedi.
- `PendingClear` (readonly kind/rows), `ScoredEvent` (`tspin: TSpinKind`), `PowerDoneEvent` (`cyc` | `syn` + `rebound` ayrışan union), `gameover: GameOverReason`.

## 10. Layout tipleri (`types/layout.ts`, `rendering/layout.ts`)

`Rect`, `Pt` (readonly), `Layout = PortraitLayout | LandscapeLayout` (`portrait: true | false` ile ayrışır; portrede `compactStats: true`). `computeLayout` artık `portraitLayout()` / `landscapeLayout()` saf fonksiyonlarından tam nesne döndürür; aritmetik ifadeler ve işlem sırası aynı. `nextSlots: readonly Pt[]` (2 veya 5) — `syncQueue` indeks dışını `Pt | undefined` olarak ele alır. **DOĞRULANDI:** 5 viewport'taki bütün HUD dikdörtgenleri, hücre boyutu ve kompakt modlar NS4-03 ile birebir aynı.

## 11. Storage tipleri ve doğrulanmamış JSON sınırı

- `store.get(k, fallback): unknown` — önceki `get<T>(k, d: T): T` imzası `JSON.parse`'ın `any`'sini sessizce `T`'ye çeviriyordu (doğrulanmış izlenimi). Şimdi doğrulanmamış veri tipte görünür.
- `settings` ve `meta`, `Object.assign(createDefault…(), store.get(...))` ile oluşur: **dış JSON'un `Settings`/`Meta` kabul edildiği tek nokta** burasıdır ve kodda yorumla işaretlidir. Alan tipleri ve fazladan alanlar denetlenmez; `{"badges": null}` gibi bozuk veri kopyalanır (bilinen hata F). **Davranış NS4-01 referansıyla aynıdır; runtime doğrulama ve göç NS4-06 teknik borcudur.**
- Anahtarlar `fn_settings`, `fn_meta` ve JSON şeması değişmedi. `Meta.badges: string[]` (saklanan ham veri), yeni rozetler yalnızca `BadgeId` olarak eklenir.
- `isBooleanSettingKey` / `isNumericSettingKey`: DOM `data-k` değerleri için tip koruyucuları.
- **Bilinçli korunan sessiz fallback'ler:** localStorage okunamazsa/JSON bozuksa varsayılan (`store.get`), yazılamazsa kayıt atlanır (`store.set`), titreşim reddedilirse yok sayılır (`createBuzz`), pointer capture başarısızsa jest yine çalışır (`InputController`). Catch'ler bağlamaz (`catch {}`) ve her birinde gerekçe yorumu vardır.

## 12. Analitik tipleri (`types/analytics.ts`)

`AnalyticsPayloads` haritası; `track<K>(name, data: AnalyticsPayloads[K])`. Payload'lar mevcut çağrılardan birebir çıkarıldı (alan eklenmedi/çıkarılmadı): `game_start {best}`, `powerup_use` (`siklamen {level, congestion}` | `sentetik {uses, level}`), `level_up {level}`, `badge {id: BadgeId}`, `game_over {reason, score, level, lines, dur_s, cyc_used, syn_uses, tetrises}`, `cta_click` (`game_over {score}` | `pause_menu`). `AnalyticsRecord<K>` gönderilen kayıttır (`event: \`fn_${K}\``). `fn_`öneki,`dataLayer`/`console.debug`davranışı değişmedi.`window.dataLayer?: unknown[]`(dış kuyruk; yalnızca`Array.isArray` sonrası push).

## 13. DOM tipleri (`ui/dom.ts`)

- `$(id)` → `HTMLElement`; `$(id, HTMLButtonElement)` → `HTMLButtonElement` (`instanceof` ile doğrulanır; eleman yoksa veya türü yanlışsa açık hata). Kullanılan türler: Button (güç butonları, HUD), Anchor (CTA), Input (ayarlar), Canvas (Pixi).
- `listen()` overload'ları olay tipini hedeften çıkarır (Window/Document/HTMLElement event map'leri); çağıranlarda elle generic yok.
- Popup ve ipucu kutuları `innerHTML` şablonu + `querySelector!` yerine aynı DOM yapısını doğrudan kurar (`<span class="big">`, `<b>` + `<span>`). DOM cache eklenmedi: çağrılar değişiklik kapılıdır ve `getElementById` O(1).

## 14. Input tipleri (`input/InputController.ts`)

`Direction = -1 | 0 | 1`, `GestureAxis = 0 | 1 | 2`, `GestureSample = readonly [x, y, t]`, `Gesture` (readonly `id/x0/y0/t0`), `InputDeps` (readonly erişimciler ve callback'ler). Event cast'leri kalktı (`listen` çıkarımı). Eşikler, tuşlar ve tekrar kuralları aynı. Kullanılmayan `dx` (endGesture) kaldırıldı.

## 15. Audio/platform tipleri

- `Sound`: AudioContext'e bağlı düğümler tek bir `AudioGraph | null` alanında (unlock öncesi gerçekten yok); `master!/sfx!/mus!/noise!/padLP!/chordIdx!` kalktı, `musNodes` bayrağı `pad: BiquadFilterNode | null` ile birleşti. `musTimer: ReturnType<typeof window.setInterval> | undefined` (NodeJS tipi yok). `ctx.resume()` sonucu bilinçli olarak beklenmez (`void`).
- **DOĞRULANDI (Web Audio çağrı izi):** açılış, müzik kurulumu, hareket, döndürme, hold, hard drop, pause/resume ve ses/müzik ayar değişikliklerini kapsayan 289 kayıtlık iz (düğüm oluşturma, `type`/`value` atamaları, AudioParam çağrıları, connect/start/stop, setInterval) NS4-03 ile **birebir aynı**.
- `Buzz = (p: VibratePattern) => void`; `HAPTIC` alanları salt-okunur. `window.webkitAudioContext?` yalnızca eski Safari için.

## 16. PixiJS tipleri

`TextureMap = Readonly<Record<BlockId, PIXI.Texture>>` (`blockRecord()` ile, `{} as …` olmadan bütün anahtarlar doldurulur), `Particle` (`base` zorunlu, ilk değer 0), `ClearAnim` (`kind: PendingClearKind`), `BounceState`, `SeenVersions`; sabit sahne düğümleri ve havuzlar `readonly`. Atlas `Object.keys(COLORS)` yerine aynı sıradaki `BLOCK_IDS` ile kurulur. **Texture yok etme sırası (yeni → `syncAll()` → eski destroy) değişmedi.** Not: blok ve hayalet karoları artık iki ayrı geçişte oluşturulur (önce 8 blok, sonra 8 hayalet); görünür etkisi yoktur (ekran görüntüleri 0 piksel fark). Import biçimi (`import * as PIXI`) değişmedi.

## 17. Content tipleri (`types/content.ts`)

`HealthTip = readonly [title, body]`, `BadgeId = 'ozmotik' | 'noro' | 'akis' | 'dogal' | 'derin'`, `BadgeDefinition {id, name, desc}`. `BADGES: Readonly<Record<BadgeId, BadgeDefinition>>` (her kimlik tam bir kez), `BADGE_IDS` oyun sonu sırası. Metinlerin hiçbir karakteri değişmedi; `\u2019` kaçış dizileri yerinde (bayt düzeyinde denetlendi).

## 18. ESLint kurulumu

**Uyumluluk engeli ve çözüm:** `typescript-eslint` (8.71.x, canary dahil) yalnızca TypeScript `>=4.8.4 <6.1.0` destekler; projedeki TypeScript 7.0.2 (Go-native) klasik derleyici API'sini sunmaz. npm `overrides` (ERESOLVE) ve workspace (alt bağımlılık `ts-api-utils` köke taşınıp TS 7'yi yüklüyor) denendi ve çalışmadı. Proje sahibinin onayıyla **ayrık lint araç zinciri** kuruldu:

- `tools/eslint/package.json` + kendi `package-lock.json`'ı: `eslint 10.12.0`, `@eslint/js 10.0.1`, `typescript-eslint 8.71.0`, `globals 17.13.0`, `eslint-config-prettier 10.1.8` ve **yalnızca lint parser'ı için** `typescript 6.0.3`. Proje derleyicisi kökteki TypeScript 7.0.2 olarak kalır.
- Kökteki `eslint.config.js` asıl yapılandırmayı (`tools/eslint/eslint.config.js`) yeniden export eder; böylece taban yol depo köküdür, paketler TS 6'nın yanından çözülür.
- Kök `npm install` → `postinstall: npm ci --prefix tools/eslint` (cross-platform).
- Sürümler en az ~2 haftalık seçildi; peer'ler uyumlu, `npm audit` iki tarafta 0 açık.

**Kurallar (flat config):** `js.configs.recommended` + `tseslint.configs.recommendedTypeChecked` (gerçek hatalar, `no-explicit-any`, `no-unsafe-*`, `no-floating-promises`, `no-misused-promises`, `no-unnecessary-type-assertion`), ek olarak `consistent-type-imports`, `switch-exhaustiveness-check`, `consistent-type-assertions` (`as` stili, nesne literal'i üzerine assertion yok), `no-unused-vars` (`caughtErrors: all`), `reportUnusedDisableDirectives`. Biçim kuralı yok; `eslint-config-prettier` en sonda. Yapılandırma dosyaları Node ortamında, type-aware olmadan lint edilir.

**Type-aware performans:** `projectService` ile 32+2 dosya ~3 sn (Windows, Node 22).

**Başlangıçta yakalanan 16 bulgu ve çözümleri:** `store.get` gizli `any` dönüşü (→ `unknown`); `document.fonts.ready` Promise'inin koşulda kullanılması ve beklenmeyen promise'ler (`void` ile bilinçli işaretlendi, eski tarayıcı koruması `FontFaceSet | undefined` ile korundu); `view.wave && (…)` ve ternary ifade deyimleri (eşdeğer `if`); kullanılmayan değişkenler (`onLock` içindeki `c`, `endGesture` içindeki `dx`, catch bağlamaları); boş catch blokları (gerekçe yorumu); `{…} as Layout`. Son durum: **0 bulgu, 0 `eslint-disable`**.

## 19. Prettier kurulumu

`prettier 3.9.9` (kök devDependency). `.prettierrc.json`: `singleQuote`, `semi`, `printWidth: 120`, `trailingComma: all`, `endOfLine: lf`. `.prettierignore`: `dist`, `node_modules`, lock dosyaları, **`legacy/`** (prototip değişmedi, SHA-256 `bd358624…d03cb`), **önceki NS4-01/02/03 raporları** (geçmiş kayıt). Kapsam: `src/**/*.ts`, `src/styles.css`, `index.html`, config dosyaları, README ve bu belge. Tabloların hizası için `SHAPES` / `KICK_*` `// prettier-ignore`.

**Formatlamanın nötr olduğunun kanıtı (DOĞRULANDI):**

- JS bundle içeriği formatlama öncesi ve sonrası **byte düzeyinde aynı** (SHA-256 `1e200ed8…`; dosya adı yalnızca CSS dosya adına bağlı olduğu için değişti).
- CSS bundle'ındaki tek fark: `var()` içeren değerlerde virgül sonrası boşluk (küçültücü `var()` değerlerini olduğu gibi bırakır). Hesaplanan stiller aynı (172 değer, 0 fark).
- `index.html`: 167 elemanın metin ve öznitelik dökümü aynı (tek fark rastgele seçilen ipucu metni), sayfa başlığı aynı; ekran görüntüleri 0 piksel fark.

## 20. Package script'leri

| Script                      | Komut                                                   |
| --------------------------- | ------------------------------------------------------- |
| `postinstall`               | `npm ci --prefix tools/eslint --no-audit --no-fund`     |
| `dev` / `build` / `preview` | değişmedi                                               |
| `typecheck`                 | `tsc --noEmit`                                          |
| `lint`                      | `node tools/eslint/node_modules/eslint/bin/eslint.js .` |
| `lint:fix`                  | aynı + `--fix`                                          |
| `format`                    | `prettier --write .`                                    |
| `format:check`              | `prettier --check .`                                    |
| `check`                     | `typecheck && lint && format:check && build`            |

Hepsi `node <yol>` ve `&&` ile cross-platform; kabuğa özgü komut yok.

## 21. Davranış doğrulaması

Headless Microsoft Edge 155 (Chromium) + Playwright 1.48.2, emülasyon; **gerçek cihaz kullanılmadı**. Test betikleri depo dışında.

| Kontrol                                                                                                                             | Dev                           | Prod (preview)    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------- |
| 70 kontrollük DOM smoke (NS4-02/03 ile aynı, gevşetilmedi)                                                                          | **70/70**                     | **70/70**         |
| Runtime hatası / debug dışı konsol / 4xx-5xx / Pixi CDN                                                                             | 0 / yok / 0 / yok             | 0 / yok / 0 / yok |
| `window.__fn`                                                                                                                       | var                           | yok               |
| Dinleyici sayıları (hedef × olay türü)                                                                                              | NS4-03 ile aynı               | NS4-03 ile aynı   |
| Eylem başına: oscillator (hareket/döndürme), titreşim (hard drop), `fn_game_start`, canlı müzik zamanlayıcısı, canvas, AudioContext | 1 / 1, `[24, 12]`, 1, 1, 1, 1 | aynı              |

**Mekanik sayısal sonuçlar** (NS4-01 iç durum enjeksiyon testi, dev; NS4-01/02/03 ile aynı):

| Senaryo                                                        | Sonuç                            |
| -------------------------------------------------------------- | -------------------------------- |
| Tek satır, seviye 1, 19 satır hard drop, 9→10 satır (seviye 2) | **+138**                         |
| Tetris (I dikey), seviye 2, combo 1                            | **+1732**                        |
| T-spin double, seviye 2, B2B + combo 2                         | **+3800**                        |
| Ardışık tekli satırlar, combo 3 / 4 / 5                        | **+538 / +638 / +738**           |
| Damla parçacık tint'leri                                       | `[0x3fd2de, 0xff7868, 0xffffff]` |

Diğer akışlar (DOĞRULANDI): başlatma, hareket, döndürme, hold (+ engel), soft/hard drop, ghost, next, sıklamen (×2, ikinci kullanım engeli), sentetik ×2 → rebound 40 sn, çöp satırı, pause/resume, blur pause, game over, yerel rekor, rozetler, tekrar oyna, ana menü, ayar kalıcılığı, eski biçimli `fn_settings`/`fn_meta` okuma, CTA/UTM, tema değişkenleri, 5 viewport + döndürmeler.

## 22. Görsel doğrulama

Seed'li RNG + reduced-motion, pixelmatch (eşik 0.1), NS4-03 ile karşılaştırma:

| Ekran                            | Dev 390×844 / 1366×768 | Prod 390×844 / 1366×768 |
| -------------------------------- | ---------------------- | ----------------------- |
| Menü, HUD, Pause                 | 0 / 0 px               | 0 / 0 px                |
| Game-over                        | 0 / 0 px               | 0 px / %0,3             |
| 172 geometri/stil/storage değeri | 0 fark                 | 0 fark                  |

Prod 1366×768 game-over farkı yalnızca "Sıradaki" kuyruğunda (diff görüntüsüyle doğrulandı): sarsıntının her karede `Math.random()` çağırması zamanlamaya bağlı RNG farkı üretir; NS4-02'de orijinalin kendisiyle karşılaştırılmasında da görülmüştü. Formatlama öncesi/sonrası karşılaştırması da aynı tabloyu verdi.

## 23. Bundle karşılaştırması

|        | JS        | JS gzip   | CSS      |
| ------ | --------- | --------- | -------- |
| NS4-03 | 515,68 kB | 156,71 kB | 10,45 kB |
| NS4-04 | 516,44 kB | 157,07 kB | 10,47 kB |

+0,76 kB JS: yeni runtime yardımcıları (`$` `instanceof` doğrulaması, `piece` getter'ı, `isOver`, `blockRecord`, `context2d`, ayar anahtarı koruyucuları, popup/ipucu DOM kurulumu). Tipler bundle'a girmez; ESLint/Prettier yalnızca development. CSS +0,02 kB: yalnızca boşluk (§19). 500 kB chunk uyarısı (PixiJS) sürüyor; bu görevde engel değil.

## 24. Bilinen hatalar (düzeltilmedi, değişmediği DOĞRULANDI)

|     | Hata                                          | NS4-04 gözlemi                                                                                                     |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A   | Pause/resume sonrası tehlike vinyeti          | Tıkanıklık 0,8 iken resume sonrası `on = false` (NS4-03 ile aynı)                                                  |
| B   | Pause → Ayarlar'da Escape oyunu devam ettirir | dev ve prod'da aynı                                                                                                |
| C   | 844×390 başlangıç kartı taşması               | NS4-03 görüntüsüyle 0 piksel fark                                                                                  |
| D   | Game-over arkasında ×2 ve Rebound rozetleri   | Overlay açıkken `badge-mult` görünür, sayaç donmuş                                                                 |
| E   | Ana menüye çıkılan skor kaydedilmez           | 130/132 puan sonrası çıkışta `fn_meta = null` (NS4-03 ile aynı)                                                    |
| F   | `meta.badges` bozuk veri                      | `{"badges":null}` → oyun sonunda aynı `TypeError … reading 'includes'`, game-over ekranı açılmaz (NS4-03 ile aynı) |

Not: Bu raporda C/D, görev metnindeki sıralamaya göre etiketlenmiştir (NS4-01'de C donmuş rozetler, D 844×390 idi).

## 25. Ertelenen teknik borçlar

- **Doğrulanmamış JSON sınırı** (`storage/settings.ts`, `storage/progress.ts`): runtime şema doğrulaması + göç (NS4-06; F hatasının çözümüyle birlikte).
- **`noUncheckedIndexedAccess`** kapalı (§5).
- Kalan assertion'lar `this.pending!` ve `L!.cell` (§7); definite assignment alanları (Game `reset()` deseni, GameView texture yaşam döngüsü).
- **Lint araç zincirinde ikinci TypeScript (6.0.3):** `typescript-eslint` TS 7'yi desteklediğinde `tools/eslint` köke alınmalı ve tek TypeScript'e dönülmeli. Type-aware lint TS 6 semantiğiyle çalışır; proje tipleri TS 7 ile denetlenir (bu görevde iki tarafta da 0 hata).
- Bootstrap düzeyindeki dinleyiciler için `dispose` yok (NS4-03'ten).
- Bundle 500 kB uyarısı, Google Fonts'un harici olması.

## 26. NS4-05 için önerilen test sınırları

- **Birim (DOM'suz):** `game/Game.ts` (skor tabloları, B2B, combo, T-spin köşe kuralı, SRS tekmeleri, lock delay, gravity eğrisi, sıklamen/sentetik/rebound, çöp satırı, game-over nedenleri; bu belgedeki +138/+1732/+3800/538-638-738 senaryoları), `game/pieces.ts` (`nextRotation`, `kickKey`), `rendering/layout.ts` (5 viewport ölçüleri), `analytics/cta.ts` (UTM), `storage/*` (localStorage mock'u: bozuk JSON, null, eksik alan), `content/*` (metin anlık görüntüsü), `types/events` sözleşmesi (`on/emit` sırası, unsubscribe).
- **DOM/entegrasyon:** `ui/hud.ts` (önbellek, vinyet), `ui/settingsPanel.ts` (tip koruyucuları), `ui/screens.ts` (yığın, ipucu).
- **Uçtan uca (tarayıcı):** NS4-02/03/04'te depo dışında kullanılan 70 kontrollük smoke, mekanik enjeksiyon, Web Audio çağrı izi ve dinleyici sayımı betikleri kalıcı test altyapısına taşınabilir.
- Bilinen hatalar A–F için önce **başarısız olan** regresyon testleri yazılıp NS4-06'da düzeltilmesi önerilir.
