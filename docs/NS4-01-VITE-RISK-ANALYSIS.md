# NS4-01 · Vite Geçişi Risk Analizi ve Global Skor Ön İncelemesi

**Referans:** commit `f5707b6`, `Ferah Nefes · Sinüs Bulmacası.html`
**Kapsam:** Yalnızca analiz. Bu görevde Vite, TypeScript, npm ve backend kurulmadı; hiçbir kod değişikliği yapılmadı. Aşağıdaki önlemlerin hepsi **ÖNERİ** niteliğindedir.

## 1. Özet

Kod tek bir IIFE içinde, global `PIXI` dışında başka bir global'e bağımlı değil ve büyük ölçüde katmanlara ayrılmış durumda:

```
Game (saf mantık) → View (Pixi) → Sound → computeLayout → HUD/DOM → input → screens → ticker
```

`Game` sınıfı, `track()` çağrıları dışında DOM ve Pixi'ye bağımlı değil. Bu yapı modüllere ayırmayı kolaylaştırıyor. Ana riskler; yükleme sırası, CDN'den npm'e geçiş ve localStorage, UTM ve CTA sözleşmelerinin korunması.

## 2. Risk tablosu

| # | Konu | Mevcut durum (KOD ÜZERİNDEN İNCELENDİ) | Risk | Önerilen önlem (ÖNERİ) |
|---|---|---|---|---|
| 1 | Inline script → module scope | IIFE ve `'use strict'` (295-1593). Fonksiyon bildirimleri hoisting'e dayanıyor: `input`, satır 1390'da tanımlanmasına rağmen 1377'deki `gameover` işleyicisinde kullanılıyor; `gesture` ise 1429'da `let` ile tanımlanıyor ve `input.reset()` içinde kullanılıyor | Orta. ES module de strict olduğu için davranış aynı kalır. Dosya bölünürken TDZ (`let/const` başlatılmadan erişim) ve döngüsel import riski var | İlk adımda dosyayı **tek bir `main.js` modülü** olarak birebir taşı, davranış referansını doğrula, ancak bundan sonra böl. `input` ve `gesture` ile `game.on(...)` bağlarının sırası korunmalı |
| 2 | PixiJS global → npm | `<script>` ile cdnjs 7.4.2. Kodda `PIXI.Container`, `Sprite`, `Texture`, `BaseTexture`, `Rectangle`, `ParticleContainer`, `TilingSprite`, `BLEND_MODES`, `utils.string2hex`, `Texture.WHITE`, `Application` kullanılıyor | Yüksek. Sürüm değişirse API kırılır (v8'de `Application.init` asenkron, `BaseTexture`/`ParticleContainer` değişti, `utils` kaldırıldı) | `pixi.js@7.4.2` sürümünü **tam olarak** sabitle. İlk adımda `import * as PIXI from 'pixi.js'` ile mevcut kodu değiştirmeden kullan. v8 yükseltmesi ayrı bir görev olmalı |
| 3 | DOM hazır olma sırası | Script `</body>` öncesinde, DOM'dan sonra çalışıyor; `$('stage')` gibi erişimler anında yapılıyor | Orta. Vite'ın `type="module"` script'i ertelenmiş (defer) çalışır, sorun beklenmez; ancak script `<head>`'e konursa yine güvenli olur. Elle `DOMContentLoaded` sarmalayıcısı eklemek sırayı değiştirebilir | `<script type="module" src="/src/main.js">` etiketini `body` sonunda tut |
| 4 | CSS'in ayrılması | Inline `<style>` (11-151). Pixi canvas DOM katmanları arasında z-index'e bağlı | Düşük-orta. CSS geç yüklenirse ilk `doLayout` ölçümleri yanlış olabilir ve kısa bir FOUC görülebilir | CSS'i `main.js` içinde `import` et (Vite üretimde `<link>` olarak ekler) ya da `index.html`'de `<link>` olarak bırak. İlk layout öncesi stil yüklenmiş olmalı |
| 5 | Google Fonts | Harici CSS, `display=swap`. `document.fonts.ready` 1200 ms'lik yarışla layout'u yeniliyor (1589-1591) | Orta. Gizlilik/KVKK (kullanıcı IP'si Google'a gidiyor), çevrimdışı açılış ve CSP | Fontları self-host etmek (`@fontsource` veya woff2 dosyalarını asset olarak eklemek) değerlendirilebilir. `fontsReady` mantığı korunmalı |
| 6 | Asset yolları | Harici asset yok; SVG'ler inline, texture'lar runtime'da canvas ile çiziliyor, ses sentezleniyor | Düşük | Gelecekte asset eklenirse `import url from './x.png'` ya da `public/` kullan; mutlak `/` yollarından kaçın |
| 7 | Production base path | Yok (tek dosya, göreli) | Orta. GitHub Pages'de `/<repo>/` alt yolu kullanılır ve yanlış `base` olursa script 404 verir | `vite.config` içinde `base` değerini ortam değişkeniyle ayarla ya da `base: './'` kullan. Dağıtım hedefi NS4-02'de netleştirilmeli |
| 8 | Hosting ortamları | Hosting yapılandırması ve GitHub Actions yok | Orta | `dist/` statik çıktısı her ortamda çalışır. Pages için ayrı bir workflow gerekecek. Önbellek başlıkları (hash'li dosyalar ve `index.html` için no-cache) ayarlanmalı |
| 9 | Dosya adı | Kaynak `Ferah Nefes · Sinüs Bulmacası.html` (boşluk, `·`, Türkçe karakter) | Orta. URL kodlaması gerekiyor ve bazı araçlarda sorun çıkabilir | Vite girişi `index.html` olmalı. Eski dosya NS4-02'de referans olarak saklanmalı (silinmemeli) |
| 10 | localStorage anahtarları | `fn_settings`, `fn_meta` ve bunların JSON şeması | Yüksek. Anahtar veya şema değişirse mevcut oyuncuların rekor, rozet ve ayarları kaybolur | Anahtar adlarını ve öneki **birebir koru**. İleride şema değişecekse sürüm alanı ve göç fonksiyonu ekle. `meta.badges`'in dizi olduğunu doğrula (bkz. envanter §H) |
| 11 | Başlangıç sırası | `new Game` → `new Sound` → `new PIXI.Application` → `new View` → `doLayout` → olay bağları → `setTip` → `fontsReady` → `window.__fn` | Orta. `doLayout`, `view.layout` içinde texture üretiyor ve `View.update`, `L` olmadan erken çıkıyor. Sıra değişirse null erişimi oluşabilir | Bu sırayı açık bir `boot()` fonksiyonunda koru. HUD ve olay bağları `view` oluşturulduktan sonra yapılmalı |
| 12 | ResizeObserver | `#stage` gözleniyor, `resize` ile birlikte rAF'ta birleştiriliyor | Düşük. HMR sırasında gözlemci ve dinleyiciler çoğalabilir | HMR kullanılacaksa `import.meta.hot.dispose` ile dinleyicileri temizle ya da HMR'ı tam yeniden yüklemeyle sınırla |
| 13 | AudioContext | Kullanıcı etkileşiminde lazy oluşturuluyor, `webkitAudioContext` yedeği var | Düşük. Modül yapısında değişmez. HMR'da birden fazla context oluşabilir | Tekil `Sound` örneğini koru; HMR'da `ctx.close()` çağır |
| 14 | Pointer olayları | Canvas üzerinde `pointerdown/move/up/cancel` ve `setPointerCapture`; butonlarda `pointerdown` ile `preventDefault` | Orta. Canvas Pixi tarafından oluşturuluyor, dinleyiciler `app.view`'e bağlanıyor. Pixi v8'de `app.canvas` olur. CSS'teki `touch-action:none` ayrılırsa kaydırma ve zoom geri gelir | `#stage canvas{touch-action:none}` ve `.gbtn{touch-action:manipulation}` kurallarını koru. Gerçek iOS ve Android cihazda test et (bu görevde TEST EDİLEMEDİ) |
| 15 | `document.fonts.ready` | 1200 ms zaman aşımıyla `Promise.race` | Düşük | Aynı şekilde taşı. Fontlar self-host edilirse süre kısalır |
| 16 | URL ve UTM üretimi | `new URL(CFG.cta)` ve `searchParams.set` (331-338) | Orta. Ortam değişkenine taşınırken değer boş kalırsa `new URL` hata verir ve boot çöker | CTA tabanını `import.meta.env.VITE_CTA_URL` gibi bir değişkenle **varsayılan değerle birlikte** sağla. UTM değerlerini birim testiyle sabitle |
| 17 | `window.__fn` | Üretimde de açık (1592) | Orta. Global skor gelince manipülasyon kolaylaşır | Yalnızca `import.meta.env.DEV` iken aç. Test otomasyonu için ayrı bir test kancası tanımla |
| 18 | Inline SVG'ler | Butonlarda ve başlangıç çiçeğinde (175-197) sabit renklerle | Düşük | `index.html` içinde aynen kalabilir. Bileşenlere taşınırsa `viewBox` ve `aria-hidden` korunmalı |
| 19 | TypeScript geçişi | `e.key` karşılaştırmaları, `PointerEvent`, `HTMLInputElement.dataset.k`, `$()` her yerde non-null kabul ediliyor, `Uint8Array` tahta, `track` payload'ları tipsiz | Orta | `$` için `getElementById<T>` ile tip doğrulayan bir yardımcı kullan. Olay payload'ları için `GameEvents` haritası tanımla, ayarlar için `Settings` arayüzü, analitik için birleşik olay tipi. Önce `allowJs` ve `checkJs` ile kademeli geçiş yap |
| 20 | Texture destroy yaşam döngüsü | Her layout'ta atlas yeniden üretiliyor, eskileri sync'ten **sonra** destroy ediliyor (954-959); `Texture.from(canvas)` global cache'e ekleniyor | Orta. Sıra bozulursa yok edilmiş texture'a erişim olur ve siyah kare görünür; cache'den silinmezse bellek sızar | Sırayı (yeni texture → sync → eski destroy) koru. Pixi yükseltmesinde `destroy(true)` semantiğini yeniden doğrula. Uzun resize stres testi yap |
| 21 | Tema kodunun kaldırılması | Koyu tema iki tekrarlanmış blokta (26-45), JS kullanmıyor | Düşük-orta. Koyu blok silinirse koyu modlu cihazlar açık temaya geçer. `color-scheme: light` sabitlenmezse form kontrolleri (checkbox, range) sistem koyu temasında farklı görünebilir | Tek sabit tema belirlendikten sonra iki bloğu kaldır ve `:root{color-scheme:light}` değerini koru. `theme-color` meta etiketini tema rengiyle uyumlu yap. Görsel karşılaştırma ekran görüntüsüyle doğrula. Bu görev NS4-02'nin dışında, ayrı yapılmalı |
| 22 | Global skor API katmanı | Ağ kodu yok; skor `Game` içinde, kalıcılık `gameover` işleyicisinde | Orta | Bkz. §3: `ScoreService` arayüzünü oyun motorundan ayır |
| 23 | Harici CDN güvenliği | SRI yok | Orta | npm bundle'a geçince bu risk ortadan kalkar; CDN kullanımı sürerse `integrity` ve `crossorigin` ekle |
| 24 | Favicon 404 | Favicon yok | Düşük | Vite `public/` altına favicon ekle (görsel karar gerektirir) |
| 25 | Davranış regresyonu | Otomatik test yok | Yüksek | `Game` sınıfı DOM'dan bağımsız olduğu için `NS4-01-BEHAVIOR-BASELINE.md` maddeleri Vitest birim testlerine çevrilebilir (skor, SRS, T-spin, sıklamen, rebound). UI akışları için bu görevde kullanılan türden bir Playwright smoke testi düşünülebilir |

## 3. Global yüksek skor: ön mimari notlar

Bu bölüm servis seçimi veya backend kurulumu içermez.

**Skor ne zaman kesinleşiyor?** (KOD ÜZERİNDEN İNCELENDİ)
`Game.gameOver(reason)` (651-655), `state='over'` yaptıktan sonra `game.score` bir daha değişmez, çünkü `update()` `over` durumunda erken döner ve tüm eylemler `state==='play'` kontrolü yapar. Kesinleşme anı `emit('gameover')` olayıdır. Ana menüye çıkışta (`toMenu`) skor kesinleşmez ve hiçbir yere yazılmaz.

**Game-over anında mevcut veriler:** `reason`, `score`, `level`, `lines`, `elapsed` (ms), `cycUsed`, `synUses`, `tetrises`, `tspins`, `maxCombo`, `combo`, `b2b`, ve `meta` içinde `best`, `totalLines`, `badges`; ayrıca `newBadges`. Seed ve hamle kaydı **yok**.

**Entegrasyon noktası:** `game.on('gameover', …)` işleyicisi (1375-1385). Yerel kayıttan **sonra** asenkron bir `scoreService.submit(result)` çağrılabilir. Sonuç `showOver()` içinde (950 ms gecikmenin ardından) gösterilebilir. Gönderim başarısız olsa bile game-over akışı, yerel rekor ve CTA etkilenmemelidir.

**Yerel ve global skorun ayrılması:**
- `fn_meta.best` yerel kalmalı ve global sonuçtan bağımsız olmalı.
- Global veriler (ör. takma ad, gönderilmemiş skor kuyruğu) **ayrı** anahtarlarda tutulmalı (ör. `fn_global_*`). Mevcut `fn_meta` şemasına alan eklenmemeli.

**Oyun motorundan izolasyon:**
- `Game` hiçbir ağ çağrısı bilmemeli.
- `ScoreService` arayüzü (`submit(result)`, `top(n)`) olsun ve bir `noop`/yerel uygulamayla başlasın.
- `GameResult` adında, sadece veri taşıyan donmuş bir nesne `gameover` anında üretilsin; `track('game_over')` ile aynı kaynaktan beslensin.
- Ağ hataları UI'ya yalnızca bilgi olarak yansısın.

**Manipülasyona karşı dikkat edilecek alanlar:**
- `window.__fn` üretimde kapatılmalı.
- İstemcide hesaplanan skor tek başına güvenilir değil; sunucu tarafında makul sınırlar kontrol edilmeli (ör. `score`'un `lines`, `level`, `dur_s` ve `tetrises` ile tutarlılığı; süre başına azami skor).
- İleride seed'li 7-bag ve girdi kaydı (replay) doğrulaması değerlendirilebilir. Bugün `Math.random` kullanıldığı için bu mümkün değil.
- Gönderim için oran sınırlama ve tek kullanımlık oturum belirteci gerekebilir.

**Kullanıcıdan istenecek minimum bilgi:**
- Yalnızca bir **takma ad** (kısa, filtrelenmiş).
- E-posta veya hesap istenmemeli.
- Takma ad ve skor saklama için KVKK aydınlatma metni ve açık onay gerekebilir; bu hukuki değerlendirme gerektirir.
- Takma ad kullanıcıya görünen içerik olduğu için küfür ve marka filtresi gerekebilir.

**Tablonun gösterileceği yer:**
- Game-over ekranında, `stat-grid` ile CTA arasında "sıralaman / ilk N" alanı.
- Başlangıç ekranında `row2` butonlarının yanına bir "Skor tablosu" butonu ve `screenStack`/`openSub` ile açılan yeni bir `scr-board` overlay'i. Mevcut "Nasıl oynanır" ekranının kalıbı bunun için uygun.

**Hazırlık:**
- `showOver()` içindeki DOM doldurma işlemi ayrı bir render fonksiyonuna ayrılabilir.
- Game-over sheet'i halihazırda `overflow-y:auto` olduğu için yeni bir blok sığar. Ancak 844×390 yatayda başlangıç kartı zaten taşıyor (DOĞRULANDI). Yeni içerik eklenirken küçük yatay ekranlar mutlaka test edilmeli.

## 4. NS4-02 için önerilen sıra

1. Vite iskeleti kurulsun; `index.html` mevcut HTML'in birebir kopyası olsun.
2. Script tek modül halinde taşınsın, PixiJS `pixi.js@7.4.2` olarak npm'den gelsin.
3. Davranış referansı ve 5 viewport smoke testi tekrarlansın.
4. Ancak bunlardan sonra dosya bölme, TypeScript ve tema temizliği ayrı adımlarda yapılsın.
5. Bilinen sorunlar (Not A-E) ayrı bir hata düzeltme görevinde ele alınsın.
