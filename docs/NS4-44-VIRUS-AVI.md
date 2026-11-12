# NS4-44 · Virüs Avı modu

> **Kaldırıldı (2026-11-12, NS4-45).** Müşteri kararıyla ayrı mod yerine klasik oyuna zorlaşan dalgalar geldi: [NS4-45-ZORLASAN-DALGALAR.md](NS4-45-ZORLASAN-DALGALAR.md). Bu belge tarihsel kayıttır; kod git geçmişinde (`7571a6a` ve öncesi). Virüs görselleri klasik moddaki virüs hücresinde kullanılıyor.

Tarih: 2026-11-10. Dal: `feat/ns4-44-virus-avi`. Tasarım ve plan belgeleri NS4-45 ile silindi (git geçmişinde).

## 1. Ne yapıldı

Ana menüden girilen ikinci oyun modu. Türün kapsül + virüs mekaniğinden esinlenir; **renk eşleşme şartı yoktur**. Belli bir oyunun adı, karakteri, büyüteç sahnesi, müziği, kapsül renk üçlüsü ya da formülleri kullanılmadı.

- **Kural:** iki hücreli kapsül düşer. Bir sırada ya da sütunda kesintisiz **4+ dolu hücre** (kapsül yarısı ya da virüs, renk fark etmez) silinir. Altı boşalan kapsüller düşer; yeni 4'lüler zincir olur.
- **Kaybetme:** her bölümün süresi var (`min(45 + 5 × virüs, 300)` sn). Süre biterse ya da yeni kapsül giremezse oyun biter. Renksiz 4'lü tahtanın dolmasını neredeyse imkânsız kıldığı için asıl kaybetme yolu süredir (kullanıcı seçimi).
- **Bölümler:** 20 bölüm; virüs `min(6 + 4·(L−1), 60)`, yükseklik `min(8 + ⌊L/2⌋, 13)` sıra, düşme `max(120, 800·0,92^(L−1))` ms. 20. bölüm bitince "Bütün virüsler temiz!".
- **Puan:** virüs başına `100 × bölüm × [1, 2, 4, 8]` (zincir), bölüm bonusu `500 × bölüm`, süre bonusu `10 × kalan sn × bölüm`. Virüssüz silme puan vermez.
- **Lens:** sol üstte (portrede Beklet paneli yerinde) üç virüs türü, kalan sayıları; silinince irkilir, süre azalınca ya da tahta dolunca kıs kıs güler, türü bitince "pop" ile kaybolur. Hareketi azaltta sallanma yok.
- **Doktor Elif:** özgün anlatıcı (topuz, beyaz önlük, turkuaz forma, nazar boncuğu; 4 poz). **Yalnızca modu ilk kez oynayana** 5 adımlık öğretici; tamamlama ya da Atla kalıcı işaretler (`fn_virus_tutorial`). "Nasıl oynanır" → "Virüs Avı öğreticisini izle" ile yeniden.
- **Skor:** yalnızca yerel, kural seti `virus-avi-v1`; Skorlar → Yerel → Klasik / Virüs Avı seçici. Global gönderim yok.

## 2. Görsel onaylar (kullanıcı)

1. **Virüsler** (`tools/viruses/prepare_viruses.py`, kaynak `public/images/virüsler/`): yeniden çizilmeden boyandı; dişler ağız içine karıştı, ıslak parlaklık azaldı, kızgın virüsün gözleri yuvarlaklaştı. Kullanıcı isteğiyle **tek gözlü virüs yaprak yeşili** kaldı (yeşil yasağına bilinçli istisna); diğerleri pembe ve bordo. Onaylandı.
2. **Doktor Elif** (`src/virus/elif.ts`, renkler `:root` tokenı): dört poz onaylandı.
3. **Kapsüller** (`src/virus/art.ts`): pembe, leylak, turkuaz, şeftali; birleşik yarılarda düz orta kenar, tek kalan yarı yuvarlak hap; virüsler hücrenin 1,18 katı. Onaylandı.

## 3. Mimari

| Dosya                                                 | Görev                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/virus/rules.ts`, `config.ts`                     | Saf kurallar: renksiz 4'lü, düşme adımı, virüs yerleşimi (başlangıçta 4'lü yok), bölüm parametreleri |
| `src/virus/VirusGame.ts`                              | Motor: kapsül, kilit, silme/düşme zinciri, süre, bölüm geçişi, öğretici tahtası (bölüm 0)            |
| `src/virus/VirusView.ts`, `art.ts`                    | Ayrı Pixi kabı: hücre havuzu, düşen + sıradaki kapsül, silme ve parçacık efekti                      |
| `src/virus/hud.ts`, `copy.ts`                         | Mod görünürlüğü (`#app[data-mode]`), lens, süre/kalan kartı, bütün görünür metinler                  |
| `src/virus/tutorial.ts`, `tutorialView.ts`, `elif.ts` | Elif öğreticisi ve anlatıcı (değiştirilebilir `NARRATOR`)                                            |
| `src/virus/session.ts`, `over.ts`                     | Oturum (başlat/mola/devam/menü/oyun sonu), yerel kayıt, oyun sonu ekranı                             |
| `src/virus/modeRouter.ts`                             | Klasik ↔ Virüs Avı: ortak düğmeler, girişler, Pixi kapları                                           |
| `src/input/InputController.ts`                        | `Controls` arayüzü: girişler aktif modun motoruna gider (klasik davranış aynı)                       |

Klasik `Game.ts`, oda/atak/Spray/sıklamen kuralları ve çok oyunculu protokol değişmedi. Çok oyunculu tur her zaman klasik modda başlar.

## 4. Geliştirme araçları

Yalnızca development: `__fn.virus.setTime(ms)`, `almostWin()`, `level(n)`, `state()`.

## 5. Analitik (etiket yöneticisine eklenecek)

`virus_start {tutorial}`, `virus_level_clear {level, dur_s, bonus}`, `virus_game_over {reason: blockout|lockout|time|complete, score, level, viruses, dur_s}`, `virus_tutorial {action: started|step|completed|skipped, step}`.

## 6. Hukuk / içerik inceleme listesine eklenenler

- **Doktor figürü** (Doktor Elif) ve bütün cümleleri (`VIRUS_TUT_COPY`, `VIRUS_TUT_CHEER`): ilaç tanıtımında sağlık mesleği mensubu kullanımı riski. Elif ürün, tedavi ya da iyileşmeden söz etmez; itiraz olursa `NARRATOR` başka bir anlatıcıyla değiştirilir.
- **Oyun sonu eşleşmesi:** Elif (oops/alkış) oyun sonu ekranında sinüzit sağlık metni ve "Rahat nefes rehberini aç" bağlantısıyla aynı kartta. Doktorun portala yönlendirdiği izlenimi verebilir; karar kullanıcıda (Elif kaldırılır ya da sağlık kutusu bu modda gizlenir).
- "Virüs Avı" adı, lens ve kart metinleri, "Bölüm temiz!", "Süre doldu", "Tahta doldu", "Bütün virüsler temiz!", "Nasıl oynanır"daki Virüs Avı maddeleri.

## 7. Doğrulama

- `npm run check`: typecheck, lint, format, test, build temiz (yeni testler `tests/virus/*`, güncellenen anlık görüntüler: başlangıç ekranı butonları, öğretici sekme sırası, Nasıl oynanır / oyun sonu metinleri, skor tablosu başlıkları, analitik şeması, içerik envanteri).
- Tarayıcı (headless Edge): 390×844, 844×390, 1366×768, 1920×1080; ilk giriş öğreticisi (Devam, Atla), ikinci girişte öğretici yok, bölüm sonu, süre bitimi, final, mola/devam, klasik moda dönüş; konsol hatası yok.

## 8. Denge notu

Renk şartı olmadığından ilk bölümler bilerek kolaydır. Ayar düğmeleri tek yerde: `levelParams` ve `VIRUS_CFG` (`src/virus/config.ts`). Gerekirse sonraki bölümlerde 5'li kural da eklenebilir. Kullanıcı denemesinden sonra birlikte ayarlanacak.

## 9. Oyun denemesi sonrası (2026-11-11)

Kullanıcı geri bildirimiyle (spec §11). Belli bir oyunun ilaç şişesi tahtası, hap fırlatan doktoru ve virüs dansı birebir kopyalanmadı; özgün karşılıkları yapıldı.

- **Renkler:** yeşil (tek gözlü), kırmızı, sarı (canlı güneş sarısı). Kaynaklar `art/virusler/` (build'e girmez).
- **Animasyonlu virüsler:** `tools/viruses/sheet.py` her türe kol, bacak, beyaz eldiven ve ayakkabı ekler; 6 karelik şerit (`virus-{n}-sheet.webp`): 4 dans, göz kırpma, irkilme. Kollu bacaklı dans **yalnızca soldaki lenste** (CSS şerit; hareketi azaltta dans yok); tahtadaki virüsler sade görsellerdir (kullanıcı kararı).
- **Öğretici:** selam (4 sn) ve lens (5 sn) kendiliğinden geçer; "Devam" isteğe bağlı. Mola sayacı durdurur.
- **Bir sıra indirme:** ↓ bir kez = tam bir sıra; basılı: 170 ms sonra her 70 ms'de bir sıra (`SOFT_DELAY_MS`, `SOFT_REPEAT_MS`).
- **Yerleşim:** yatayda sol sütun: skor kartı üstte, lens altında. Portrede değişmedi.
- **Laboratuvar beheri:** tahta ağzı açık, ölçü çizgili bir cam behere oturur (`src/virus/stage.ts`). Üst ortada damlalık; her yeni kapsülde sıkışır.
- **Yan Elif:** yatayda sağ sütunda, portrede alt şeritte. Kapsül bırakırken basar (`goster`), bölüm sonunda alkışlar, son 15 sn'de telaşlanır (`oops` + titreme), aksi hâlde bekler (yeni `bekle` pozu). Öğretici açıkken gizli.
- **Müzik:** `TRACKS.virus` (Sol majör, 126 bpm; zıplayan bas, 8'lik arpej, kick/şıklatma, seyrek melodi). Son 15 sn'de +14 bpm ve 16'lık shaker (`Sound.setHurry`). Bu modda boğuk ses süzgeci kapalı.
- **Oyun sonu:** Elif kalır (kullanıcı kararı); sağlık bağlantısıyla eşleşmesi hukuk listesinde.

## 10. İkinci oyun denemesi (2026-11-11)

- **Elif sağ üstte**, "Sıradaki" paneli kalktı. Sıradaki kapsül Elif'in kaldırdığı işaret parmağının ucunda durur (yeni poz `tut`). Yeni kapsül gerekince parmaktan **damlalığa** yay çizerek zıplar (260 ms; yukarıda yer kadar yay), damlalık sıkışır, kapsül ucundan tahtadaki yerine iner (140 ms). Yalnızca görsel: oyun zamanlaması değişmez; uçuş sürerken gerçek kapsül görünmez. Hareketi azaltta uçuş yok. Doktorun kapsülü doğrudan tahtaya fırlatması kopyalanmadı (damlalık üzerinden özgün karşılık). Öğretici kartındaki küçük Elif kalktı; kart sağ üstteki Elif'in konuşma balonudur.
- **Lens:** kendi türünden biri patlayınca o virüs **yere yığılıp ağlar** (kare 6, 1,6 sn, gözyaşı ve gölcük); arada **dalga geçer** (kare 7: gözler gülerek kısılı, eller başın yanında; ~6,5 sn'de bir, son saniyelerde ~2,4 sn'de bir). Türün sonuncusu önce ağlar, sonra kaybolur. Tür sayısı rozetleri kalktı.
- **Süre / kalan virüs** yazıları büyüdü; portrede kart tek satır.
- **Uzuvlar yeniden (kullanıcı):** kollar ve bacaklar gövdenin dilinden: gövde renginde, kıvrımlı, uca doğru incelen parlak tüpler; eller dikenlerin topuzu gibi yuvarlak avuç + üç topuz parmak (beyaz eldiven yok), ayaklar gövde renginde yuvarlak taban (koyu ayakkabı yok). Dalga karesinde **dil dışarıda** (ağız genişliğine oranlı, kontur + orta çizgi + parlama), eller başın iki yanında.

## 11. Açık küçük konular (bir sonraki oturumda ele alınacak)

Bağımsız kod incelemelerinde "küçük" diye ertelenen, 2026-11-11 itibarıyla hâlâ geçerli maddeler. Hepsi Virüs Avı'na özgü; klasik modu etkilemez.

**Oynanış / his**

1. **↓ basılıyken kapsül kilitlenince tutarsızlık:** `VirusGame.lock()` `softDrop`'u kapatır; işletim sisteminin tuş tekrarı başlamışsa yeni kapsül hemen bir sıra iner, başlamamışsa inmez, araya silme girerse 170 ms bekler. Tek kural seçilmeli: ya ↓ yeniden basılmalı ya da basılı tutma kilitten sonra da sürmeli (`spawn()`'da `softHeld/softNext` sıfırlanır). Dosyalar: `src/virus/VirusGame.ts`, `src/input/InputController.ts`.
2. **Bölüm kutlamasında müzik "acele"de kalıyor:** `levelclear` sırasında süre donar; son 15 sn'de bitirilen bölümde kutlama boyunca müzik hızlı tempoda çalar. Çözüm: `bootstrap.ts`'teki `warn`'a `&& vgame.state !== 'levelclear'`.
3. **Öğretici adımı nadiren "Devam"ı bekleyebilir:** okuma süresi dolduğu anda (zamanlayıcı daha çalışmadan) mola verilirse `autoLeft` 0 kalır, devamda yeniden kurulmaz. Çözüm: `onResume`'da `autoLeft` 0 ise hemen ilerlet. Dosya: `src/virus/tutorial.ts`.
4. **Damlalık sıkışması duvar saatiyle:** `stage.ts` `onSpawn` `setTimeout(FLIGHT_IN_MS)` kullanır; uçuş sırasında mola verilirse sıkışma mola ekranının arkasında olur. Çözüm: sıkışmayı `VirusView` uçuşu `FLIGHT_IN_MS`'i geçtiğinde tetiklesin.
5. **Dalga geçme temposu geç hızlanıyor:** son 15 sn başlayınca ilk hızlı dalga 6–9 sn sonra gelebilir; moladan dönünce gecikmiş türler aynı anda dalga geçer. Çözüm: tempo değişince `nextTaunt` en geç `now + hurry aralığı`na çekilsin. Dosya: `src/virus/hud.ts`.

**Kayıt / analitik**

6. **Kaydedilen süreye öğretici süresi ekleniyor:** `session.onTutorialFinish` `startLevel(1)` öncesi `game.elapsedMs`'i sıfırlamıyor; yerel skordaki `durationSeconds` ve `virus_game_over.dur_s` öğreticiyi de sayıyor.

**Görünüm (cihazda doğrulanmalı)**

7. **Küçük telefonda süre kartı sıkışık olabilir:** 360×640'ta portre tek satırlık kart ~196×26 px; "Süre 0:00 Kalan virüs NN" sığmayabilir (hesap, cihazda görülmedi).

**Temizlik**

8. Kullanılmayan `VirusGame.fill()` (ve açıklamasındaki eski "lens gülmesi" notu).
9. `tutorialView.ts` gizlenen `#vt-elif`'e hâlâ Elif çiziyor (gereksiz iş).
10. `tutorial.ts` başlık yorumu hâlâ "selam ve lens Devam ister" diyor (artık kendiliğinden geçiyor).
11. Bu raporun §9'undaki "yan Elif … öğreticide gizli, goster/oops" anlatımı §10 ile geçersiz; §9 güncellenmeli.

**Ortam ve karar bekleyenler**

- `npm run check`'in `format:check` adımı Windows'ta (`core.autocrlf=true`) 50 dosyada yalnızca satır sonu (CRLF) uyarısı verir; `npx prettier --check --end-of-line auto .` temizdir. İstenirse `.gitattributes` ile `eol=lf` sabitlenebilir.
- Hukuk: Elif oyun sonu ekranında sağlık bağlantısıyla aynı kartta (kullanıcı kararıyla kalıyor; YOL-HARITASI §3.4).
- Dal: `feat/ns4-44-virus-avi` birleştirme / PR kararı bekliyor.
