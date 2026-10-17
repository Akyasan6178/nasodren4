# NS4-01 · Mevcut Davranış Referansı

**Amaç:** NS4-02 (Vite taşıması) ve sonraki aşamalarda davranış kaybını önlemek için oyunun bugünkü davranışını kayıt altına almak.
**Referans:** commit `f5707b6`, `Ferah Nefes · Sinüs Bulmacası.html`. Satır numaraları bu dosyaya göredir.
**Etiketler:** DOĞRULANDI · KOD ÜZERİNDEN İNCELENDİ · TEST EDİLEMEDİ · RİSK · ÖNERİ (ayrıntı: `NS4-01-TECHNICAL-INVENTORY.md`)

Taşıma sırasında her maddedeki **"Korunacak"** satırı bir kabul ölçütü olarak kullanılabilir.

## Sabitler (değerleri değişmemeli)

```
COLS=10 ROWS=22 HIDDEN=2 VIS=20
lockDelay=500 maxLockResets=15 lineClearMs=300 synClearMs=260 drainMs=800
softDropFactor=20 maxLevel=20 linesPerLevel=10 powerThreshold=0.35
cycMultMs=30000 cycMult=2 reboundMs=40000 reboundSpeed=1.5 reboundGarbageEvery=10000
DAS varsayılan 167 ms · ARR varsayılan 33 ms · danger eşiği 0.70
```

---

### 1. Oyunu başlatma
- **Tetikleme:** Başlangıç ekranında "Oyna" (`#b-play`) ya da oyun sonunda "Tekrar oyna" (`#b-again`).
- **Davranış:** Ses açılır, `game.reset()` çalışır, HUD sıfırlanır, `newBadges` boşaltılır, View'deki dalga, flaş ve oyun sonu griliği temizlenir, `syn-sub` metni sıfırlanır, overlay kapanır, müzik başlar ve `fn_game_start {best}` gönderilir.
- **Kod:** `start()` 1506-1517, `Game.reset()` 375-393.
- **Korunacak:** Sıklamen ve sentetik kullanım sayaçları yeni oyunda sıfırlanır (DOĞRULANDI: `cyc:false, syn:0`). Sayfa açılışında `Game` bir kez `reset()` edilir, ardından `state='idle'` olur. Menü arkasında görünen next kuyruğu bu ilk reset'ten gelir.
- **Durum:** DOĞRULANDI.

### 2. Piece spawn
- **Tetikleme:** Kilitlenme, satır temizlemenin bitmesi veya hold.
- **Davranış:** Parça x=3, y=0'da doğar; sığıyorsa hemen bir satır aşağı iner (y=1). Sığmazsa `blockout`. Kuyruk 8 elemanlı 7-bag'den beslenir; ekranda portrede 2, yatayda 5 next gösterilir.
- **Kod:** `spawn()` 414-423, `fillQueue()` 395-404, `computeLayout` `nextSlots` 1178 ve 1206.
- **Korunacak:** Spawn konumu ve "1 satır in" kuralı; 7-bag'in `Math.random` Fisher-Yates uygulaması.
- **Durum:** DOĞRULANDI (başlangıçta x=3, y=1).

### 3. Hareket
- **Tetikleme:** ← / → tuşları, yatay sürükleme.
- **Davranış:** 1 hücre hareket edilir. Basılı tutulunca DAS gecikmesinden sonra ARR aralığıyla tekrar eder (ARR=0 ise duvara kadar gider). İki yön tuşu birlikte basılıysa en son basılan geçerlidir; bırakılınca diğerine döner. Zemindeki parça hareket edince lock sayacı sıfırlanır (en fazla 15 kez).
- **Kod:** `move()` 433-437, `onMoved()` 427-431, `input` 1390-1402, keyup 1423-1427, pointermove 1446-1450.
- **Korunacak:** Yatay sürüklemede adım 0.9 hücredir; eksen kilidi 0.45 hücrede devreye girer.
- **Durum:** Klavye DOĞRULANDI (tek basış x 3→2; DAS ile 450 ms'de x 3→6). Sürükleme KOD ÜZERİNDEN İNCELENDİ.

### 4. Rotation
- **Tetikleme:** ↑, X, x (CW); Z, z, Control (CCW); dokunma (canvas'ın sol üçte biri CCW, diğer kısmı CW; 320 ms'den kısa, hareketsiz).
- **Davranış:** SRS tekmeleri sırayla denenir; ilk uyan uygulanır. O parçası dönmez. `lastRot` ve `lastKick` T-spin tespitinde kullanılır.
- **Kod:** `rotate()` 439-452, `KICK_*` 354-365, `endGesture` 1463-1465.
- **Korunacak:** Tekme tablolarındaki y işaret dönüşümü (`ny = y − kick[1]`).
- **Durum:** DOĞRULANDI (CW, CCW ve 3 mobil viewport'ta tap ile CW).

### 5. Hold
- **Tetikleme:** C, c, Shift; "Beklet" butonu; yukarı flick.
- **Davranış:** Hold boşsa mevcut parça saklanır ve kuyruktan yeni parça gelir; doluysa ikisi yer değiştirir. Parça başına bir kez kullanılabilir (kilitlenince yeniden açılır). Kullanılamazken hold önizlemesi %35 opaklıkta görünür.
- **Kod:** `doHold()` 471-480, `syncQueue()` 1018-1027.
- **Durum:** DOĞRULANDI (hold = önceki parça, yeni parça = kuyruğun ilk elemanı, ikinci deneme engellendi).

### 6. Soft drop
- **Tetikleme:** ↓ basılı tutma; aşağı sürükleme.
- **Davranış:** Klavyede gravity ×20 olur ve her inilen satır +1 puan verir. Sürüklemede 0.9 hücre başına `softStep` (+1 puan) çalışır.
- **Kod:** `update()` 673-678, `softStep()` 454-458, pointermove 1451-1454.
- **Durum:** Klavye DOĞRULANDI (5 satır → +5). Sürükleme KOD ÜZERİNDEN İNCELENDİ.

### 7. Hard drop
- **Tetikleme:** Boşluk; hızlı aşağı flick (vy > 0.75 px/ms ve dy > 1.2 hücre).
- **Davranış:** Parça ghost konumuna iner, satır başına +2 puan alınır, sarsıntı (0.25 + d·0.04) olur ve anında kilitlenir.
- **Kod:** `hardDrop()` 462-469, `onHard` 1047, `endGesture` 1467.
- **Durum:** Klavye DOĞRULANDI. Flick TEST EDİLEMEDİ (gerçek dokunmatik gerekli).

### 8. Line clear
- **Tetikleme:** Kilitlenen parçanın satır tamamlaması.
- **Davranış:** Puan anında eklenir. 300 ms `clearing` sırasında aktif parça gizlenir, satırlar flaş, ölçek ve damla parçacıklarıyla kaybolur. Sonra satırlar silinir ve yeni parça doğar. Ses ve haptik satır sayısına göre değişir.
- **Kod:** `lock()` 514-528, `finishPending()` 612-631, `removeRows()` 555-567, `View.onClearStart` 1049-1067.
- **Korunacak:** Skor `clearing` başında yazılır, satırlar sonunda silinir.
- **Durum:** DOĞRULANDI (tek satır ve Tetris; satır silindikten sonra alt satır boş).

### 9. Score
- **Formül:** `scoreClear()` 531-553. Normal tablo [0,100,300,500,800], mini T-spin [100,200,400,400], T-spin [400,800,1200,1600]; hepsi × seviye. Zor temizlik arka arkaya gelirse ×1.5 (floor). Combo ≥ 1 ise +50×combo×seviye. Sıklamen etkisi aktifse satır puanı ×2. Soft drop +1/satır, hard drop +2/satır. Sıklamen +150×satır×seviye, sentetik +50×satır×seviye (çarpan uygulanmaz).
- **Görüntü:** `toLocaleString('tr-TR')`, ör. "1.957".
- **Durum:** DOĞRULANDI. Ölçülen değerler formülle birebir tuttu: tek satır seviye 1'de +138 (100 + 19×2), Tetris seviye 2'de +1732 (1600 + combo 100 + drop 32), TSD seviye 2'de B2B ve combo 2 ile +3800, ardışık tekli satırlarda combo 3/4/5 için +538/638/738.

### 10. Level up
- **Davranış:** `level = min(20, 1 + floor(lines/10))`. Seviye atlayınca popup ("Nefes seviyesi n / Mukus daha hızlı birikiyor"), ses ve `fn_level_up` gelir. Sentetik hiç kullanılmadan seviye 5'e ulaşılırsa `dogal` rozeti verilir.
- **Kod:** 549-551, olay 1362-1366, `gravityMs()` 482-487.
- **Durum:** DOĞRULANDI (9→10 satır: seviye 2 ve popup).

### 11. T-spin
- **Davranış:** Yalnızca T parçasında ve son hareket rotasyonsa geçerlidir. 3 köşe kuralı uygulanır: ön iki köşe doluysa ya da son tekme 5. tekmeyse (index 4) tam T-spin, değilse mini. Satır temizlemeyen T-spin de popup ve ses verir. Satır temizleyen T-spin B2B için "zor" sayılır ve `noro` rozetini verir.
- **Kod:** `tspinKind()` 489-496, `scored` olayı 1348-1361.
- **Durum:** DOĞRULANDI (iç durum enjekte edilerek: kind=2, popup "T-spin çift / Art arda · Nörorefleks etki · kombo ×2"). Gerçek oyun içi manevrayla T-spin TEST EDİLEMEDİ.

### 12. Sıklamen kullanımı
- **Tetikleme:** 1 tuşu veya "Sıklamen özütü" butonu. Tıkanıklık ≥ 0.35, `state==='play'` ve bu oyunda henüz kullanılmamış olmalı.
- **Davranış:** 800 ms `draining`: sıvı dalga animasyonu, ses, haptik ve "Sıklamen özütü / Ozmotik drenaj başladı" popup'ı. Alt 10 satırdaki dolu satırlar silinir, +150×satır×seviye eklenir ve 30 sn ×2 çarpan rozeti çıkar. Buton metni "Bu oyunda kullanıldı" olur. Aktif parça çakışırsa en fazla 4 satır yukarı itilir; yine sığmazsa `overlap` game over olur. `fn_powerup_use {kind:'siklamen'}` gönderilir.
- **Kod:** `useCyc()` 590-599, `finishPending()` 616-619, `fixActiveOverlap()` 633-638, HUD 1288-1295.
- **Korunacak:** Tıkanıklık ilk kez eşiği geçince bir kerelik toast "Sinüslerin dolmaya başladı. Sıklamen özütü hazır."
- **Durum:** DOĞRULANDI (8 satır → +1200; çarpan ≈ 30 sn; ikinci kullanım engellendi; toast görüldü).

### 13. Sentetik açıcı kullanımı
- **Tetikleme:** 2 tuşu veya "Sentetik açıcı" butonu. Tıkanıklık ≥ 0.35 olmalı; kullanım sınırı yok.
- **Davranış:** 260 ms kırmızı tonlu temizleme. En alttaki 3 dolu satır silinir, +50×satır×seviye eklenir. İlk kullanımda popup "3 satır açıldı / Tekrarlarsan geri tepebilir" çıkar. Buton alt metni "Kullanım: n" olur. `fn_powerup_use {kind:'sentetik', uses}` gönderilir.
- **Kod:** `useSyn()` 601-610, `finishPending()` 620-626, `powerdone` 1367-1373.
- **Durum:** DOĞRULANDI.

### 14. Rebound
- **Tetikleme:** Sentetiğin 2. ve sonraki kullanımları.
- **Davranış:** `reboundT = 40 sn × (kullanım − 1)` ayarlanır (sayaç yeniden başlar). Gravity ÷1.5 olur, uyarı sesi çalar, popup "Rebound / Sık kullanım tıkanıklığı geri getirdi" ve uyarı toast'u çıkar. Rozet "Rebound: tıkanıklık geri tepiyor · n sn" olarak görünür.
- **Kod:** 622-625, 666-670, HUD 1296-1297.
- **Durum:** DOĞRULANDI (2. kullanımda 40 sn rozet).

### 15. Garbage row
- **Davranış:** Rebound sırasında ilk çöp satırı 5 sn sonra, sonrakiler 10 sn arayla eklenir. Tahta 1 satır yukarı kayar, en alta rastgele tek delikli tip-8 satır eklenir, sarsıntı, uyarı sesi ve 30 ms titreşim olur. En üst satır doluysa `garbage` game over olur.
- **Kod:** `addGarbage()` 640-649, olay 1374.
- **Durum:** DOĞRULANDI (5,6 sn içinde alt satır `8888880888`).

### 16. Pause
- **Tetikleme:** Esc, P, p; mola butonu; sekme gizlenmesi; pencere odağını kaybetme (`blur`).
- **Davranış:** Bir sonraki rAF'ta `app.ticker.stop()` çalışır. Input sıfırlanır, ipucu değişir, `scr-pause` açılır, müzik kapanır ve tehlike vinyeti kaldırılır.
- **Kod:** `pause()` 1518, 1566-1567.
- **Sorun:** Bkz. Not A (vinyet) ve Not B (Ayarlar'da Esc).
- **Durum:** DOĞRULANDI (Esc, buton ve blur; `ticker.started=false`).

### 17. Resume
- **Tetikleme:** "Devam et", ya da mola ekranındayken Esc, P, p.
- **Davranış:** Ticker başlar, overlay kapanır ve müzik başlar.
- **Kod:** `resume()` 1519, keydown 1406.
- **Durum:** DOĞRULANDI.

### 18. Ana menüye dönüş
- **Tetikleme:** Moladan veya oyun sonundan "Ana menü".
- **Davranış:** Ticker başlar, `appState='menu'` olur, başlangıç ekranı açılır ve müzik kapanır. Oyun nesnesi sıfırlanmaz ve skor kaydedilmez.
- **Kod:** `toMenu()` 1520.
- **Durum:** DOĞRULANDI (geçiş). Skorun kaydedilmemesi KOD ÜZERİNDEN İNCELENDİ.

### 19. Game over
- **Tetikleme:** `blockout`, `lockout`, `overlap` veya `garbage`.
- **Davranış:** Oyun sonu sesi, haptik ve sarsıntı olur, yığın alttan yukarı griye döner, müzik kapanır ve input sıfırlanır. `appState='over'` olur. `meta.totalLines += lines`; toplam ≥ 100 ise `derin` rozeti verilir. Rekor kontrol edilip `fn_meta` kaydedilir ve `fn_game_over` gönderilir. **950 ms** sonra `showOver()` çalışır.
- **Kod:** `gameOver()` 651-655, olay 1375-1385, `showOver()` 1521-1534.
- **Sorun:** Bkz. Not C (donmuş rozetler).
- **Durum:** DOĞRULANDI (`lockout`; ekran, puan, rekor ve "Yeni rekor" etiketi).

### 20. Local high score
- **Davranış:** `game.score > meta.best` ise rekor güncellenir ve "Yeni rekor" etiketi gösterilir. Eşit skor rekor sayılmaz.
- **Kod:** 1381-1382, 1522-1523.
- **Durum:** DOĞRULANDI (`fn_meta.best = 1957`).

### 21. Badge award
- **Davranış:** `award(id)` her rozeti yalnızca bir kez verir: `meta.badges`'e ve `newBadges`'e eklenir, anında `fn_meta`'ya yazılır, "Rozet kazandın: …" toast'u ve `fn_badge` gelir. Oyun sonunda rozetler üç durumda listelenir: yeni (`new`), sahip olunan (sınıfsız), kilitli (`locked`). `title` alanında açıklama bulunur.
- **Koşullar:** `ozmotik` 4 satır; `noro` satır temizleyen T-spin; `akis` combo ≥ 5; `dogal` sentetiksiz seviye 5; `derin` toplam 100 satır (oyun sonunda kontrol edilir).
- **Kod:** 1319-1332, 1358-1365, 1380, 1524-1531.
- **Durum:** `ozmotik` ve `noro` DOĞRULANDI (`fn_meta.badges = ["ozmotik","noro"]`, toast). Diğerleri KOD ÜZERİNDEN İNCELENDİ.

### 22. CTA
- **Davranış:** `#cta-over` ("Rahat nefes rehberini aç") ve `#cta-pause` ("Sinüs sağlığı rehberi") yeni sekmede açılır (`noopener`). `href` sayfa açılışında bir kez atanır. Tıklama `fn_cta_click` gönderir.
- **URL:** `https://www.yasasinsaglik.com/?utm_source=ferah_nefes_oyun&utm_medium=advergame&utm_campaign=sinus_bulmaca&utm_content=game_over` (pause için `utm_content=pause_menu`).
- **Kod:** `ctaUrl()` 331-338, 1544-1547.
- **Korunacak:** UTM parametre adları, değerleri ve sırası.
- **Durum:** URL üretimi DOĞRULANDI. Tıklama ile analitik olayı KOD ÜZERİNDEN İNCELENDİ (dış siteye gidilmedi).

### 23. Settings persistence
- **Davranış:** Her `input` olayında `settings[k]` güncellenir ve hemen `fn_settings`'e yazılır. Ses ve müzik ayarı anında uygulanır, FPS göstergesi anında açılıp kapanır, ghost bir sonraki karede değişir. "Kaydet" yalnızca geri döner. Varsayılanlar `Object.assign` ile birleştirilir, yani eksik anahtarlar varsayılan değeri alır.
- **Kod:** 320, 1550-1563.
- **Durum:** DOĞRULANDI (ghost kapat ve aç; JSON doğru yazıldı).

### 24. Responsive resize
- **Davranış:** `resize` ve `ResizeObserver(#stage)` olayları tek bir rAF'ta toplanıp `doLayout()` çağrılır. `W/H < 0.95` veya `W < 600` ise portre düzeni kullanılır. Texture atlas yeni hücre boyutu ve çözünürlüğe göre yeniden üretilir. Portrede metre etiketi gizlenir. Kompakt buton ve istatistik sınıfları eşiklere göre uygulanır. Fontlar yüklendiğinde (en fazla 1200 ms beklenir) layout yeniden hesaplanır.
- **Kod:** `computeLayout()` 1156-1211, `doLayout()` 1236-1265, 1266-1269, 1589-1591.
- **Durum:** DOĞRULANDI (5 viewport ve 5 döndürme; hata yok).

---

## Gözlemlenen sorun notları (düzeltilmedi)

- **Not A: Vinyet.** Tıkanıklık ≥ 0.7 iken mola ve devamdan sonra `#danger` geri gelmiyor; ancak tıkanıklık değeri değişince yeniden görünüyor. DOĞRULANDI.
- **Not B: Ayarlar'da Esc.** Moladan açılan Ayarlar ekranında Esc oyunu devam ettiriyor ve Ayarlar kapanıyor. DOĞRULANDI.
- **Not C: Donmuş rozetler.** Game-over overlay'i arkasında ×2 ve Rebound rozetleri son değerleriyle görünmeye devam ediyor. DOĞRULANDI.
- **Not D: Mobil yatay menü.** 844×390'da başlangıç kartı kaydırma gerektiriyor. DOĞRULANDI.
- **Not E: Menüye çıkış.** Ana menü ile çıkılan oyunun skoru ve satırları kaydedilmiyor, analitik olayı da yok. KOD ÜZERİNDEN İNCELENDİ.
- **ÖNERİ:** Vite taşıması sırasında bu davranışlar **bilinçli olarak aynı bırakılmalı**. Düzeltmeler ayrı bir görevde, ayrı commit'lerle yapılmalı; böylece taşımadan kaynaklanan regresyonlar bilinçli değişikliklerden ayırt edilebilir.
