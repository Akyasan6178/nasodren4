# NS4-44 · Virüs Avı modu

Tarih: 2026-11-10. Dal: `feat/ns4-44-virus-avi`. Tasarım: [`docs/superpowers/specs/2026-11-10-virus-avi-design.md`](superpowers/specs/2026-11-10-virus-avi-design.md), plan: [`docs/superpowers/plans/2026-11-10-virus-avi.md`](superpowers/plans/2026-11-10-virus-avi.md).

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
- "Virüs Avı" adı, lens ve kart metinleri, "Bölüm temiz!", "Süre doldu", "Tahta doldu", "Bütün virüsler temiz!", "Nasıl oynanır"daki Virüs Avı maddeleri.

## 7. Doğrulama

- `npm run check`: typecheck, lint, format, test, build temiz (yeni testler `tests/virus/*`, güncellenen anlık görüntüler: başlangıç ekranı butonları, öğretici sekme sırası, Nasıl oynanır / oyun sonu metinleri, skor tablosu başlıkları, analitik şeması, içerik envanteri).
- Tarayıcı (headless Edge): 390×844, 844×390, 1366×768, 1920×1080; ilk giriş öğreticisi (Devam, Atla), ikinci girişte öğretici yok, bölüm sonu, süre bitimi, final, mola/devam, klasik moda dönüş; konsol hatası yok.

## 8. Denge notu

Renk şartı olmadığından ilk bölümler bilerek kolaydır. Ayar düğmeleri tek yerde: `levelParams` ve `VIRUS_CFG` (`src/virus/config.ts`). Gerekirse sonraki bölümlerde 5'li kural da eklenebilir. Kullanıcı denemesinden sonra birlikte ayarlanacak.
