# NS4-47 · Bölüm hedefi: gri + sinüzit atağı hücreleri; yavaşlayan sinüzit atağı ve geri sayım

Tarih: 2026-11-22. Kural seti: `sinus-dalga-v2` (önceki `sinus-dalga-v1`). Çok oyunculu protokol sürümü 4.

## 1. Kural

**Bölüm hedefi:** oda grileri ve sinüzit atağıyla gelen hücrelerin (tek kare, virüs) hepsi. Bunlar tahtada gri (8) olarak tutulur ve `Game.roomGoalGray()` gizli sıralar dahil hepsini sayar.

- Oyuncunun yerleştirdiği renkli bloklar hedefte sayılmaz.
- Düşen parça tahtada değildir, sayılmaz.

**Bölüm açılınca:**

- Kalan renkli bloklar "Sinüs açıldı" geçişinde söner.
- Yeni bölüm boş tahtayla, yalnızca kendi gri sıralarıyla başlar (`enterRoom`).
- Bu otomatik temizlik puan, satır, kombo, B2B, Tam Ferahlık ya da Spray şarjı vermez.
- Oda bonusu (production kuralı) aynen kalır.

**Kontrol zamanı:**

- Yalnızca bekleyen satır temizleme, drenaj ve çökme bittikten sonra yapılır (`Game.finishPending`).
- Geçiş tek bir yoldan, bir kez tetiklenir.
- Kod: `Game.roomCleared()`.

**"% açık" göstergesi:** temizlenen hedef hücresi / bölüm başındaki hedef hücresi.

- Dalga hücreleri hedefe eklenir.
- Hedef başlangıçtan fazlaysa gösterge %0'da durur.

**Taşıma kaldırıldı:** bölüm yalnızca dalga hücresi kalmayınca açıldığı için yeni bölüme taşınacak hücre olmaz. `carryAttackCells`, `Game.attackCarry` ve taşıma sayaçları kaldırıldı.

**Bölüm saati:**

- İlk adım bölüme girdikten 45 sn sonra, sonraki adımlar her 60 sn (`PRESSURE.firstStepMs` ve `PRESSURE.stepMs`, `src/game/pressure.ts`).
- Dalga / hızlanma sırası, dalga içeriği, virüs bonusu ve Spray değişmedi.
- Saat yalnızca aktif oynanışta ilerler ve her bölümde baştan başlar; Serbest nefeste sürer.

**İlk denemeden ders:** ilk deneme (`27c0b06`) tahtanın tamamen boşalmasını şart koşuyordu. Bu kural matematiksel olarak sorunlu:

- Her parça 4 hücre ekler, her satır 10 hücre siler; satır temizleme hücre sayısının tekliğini değiştirmez.
- Hücre sayısı tekse tahta yalnızca satır silerek boşalamaz.
- Simülasyonda hiç bölüm açılmadı (bölüm 3).

## 2. Geri sayım

- **Kaldırılan:** dikey bölüm saati barı (`#attack-bar`).
- **Yeni:** `#attack-timer` (`src/ui/sinusHud.ts`), metni "Sonraki sinüzit atağı: N sn".
  - Kalan süre `Game.stepRemainingMs()`'ten gelir (tek kaynak).
  - Gösterilen değer yukarı yuvarlanmış tam saniyedir (en az 1; 0, negatif ve NaN gösterilmez).
  - Sayı saniyede bir yazılır.
- **Yerleşim:**
  - yatay düzende sağ sütunda, tıkanıklık kartıyla Spray arasında kart;
  - portrede tahtanın altında tek satır (tahta ile butonlar arasında her boyda en az ~23 px);
  - satır 300 px'ten darsa ikincil tür adı ("Virüs dalgası" / "Hızlanma") gizlenir.
- **Davranış:**
  - son 5 saniyede sayı tehlike renginde (hareketsiz);
  - molada sayı sabit;
  - oyun sonunda sayaç gizlenir.
- **Erişilebilirlik:** `role="timer"`, adı "Sonraki sinüzit atağı"; canlı anons yok.

## 3. Metinler

- **"Nasıl oynanır":**
  - 8 bölüm;
  - hedef: bütün gri bulutçuklar, virüsler ve tek kareler; kalan bloklar bölüm açılınca temizlenir;
  - yeni madde: sinüzit atağı sayacı; Spray yalnızca sinüzit atağıyla gelen hücreleri temizler;
  - kısayol `1 · 2 · 3`.
- **Sağlık içerik kaydı (`src/content/health.ts`):** `how.rooms` güncellendi, `how.attack` eklendi.
- **Oda başı ipucu:** "Gri bulutçukları ve virüsleri temizle".

## 4. Kural seti ve yayın

`sinus-dalga-v2` (`supabase/functions/_shared/scoreRules.ts`). Bölüm hedefi, tempo ve bölüm geçişindeki puansız temizlik skorları `sinus-dalga-v1` ile karşılaştırılamaz kılıyor. Eski kayıtlar silinmedi; yerel listede ayrı tutulur.

Yayın adımları (panelden):

1. SQL Editor'da `supabase/migrations/20261122000000_tetris_ruleset_sinus_dalga_v2.sql` dosyasını çalıştırın. Yalnızca okuma RPC'sinin varsayılanını değiştirir.
2. `tetris-submit-score` fonksiyonunu yeniden yayınlayın (`node tools/bundle-functions.mjs` → `supabase/.dashboard/tetris-submit-score.ts`). Bu adıma kadar yeni istemcinin global gönderimleri reddedilir.
3. `tetris-room` değişmedi.

Çok oyunculu protokol sürümü 4: eski sürümdeki sekmelerin iletisi reddedilir ("Çok oyunculu şu an kullanılamıyor.").

## 5. Simülasyon sonuçları

Aynı sezgisel bot (parça başına 1,1 sn düşünme, 100 ms adım), aynı 20 tohum, oyun başına 10 dakika. Bot tam temizliği ya da dalga hücrelerini özellikle hedeflemez; sonuçlar kıyas içindir.

|                                     | Eski v1 (`7ce9acc`) | Hatalı tam temizlik (`27c0b06`) | Düzeltilmiş v2 |
| ----------------------------------- | ------------------- | ------------------------------- | -------------- |
| En az bir bölüm açan oyun           | %95                 | %0                              | %90            |
| Ortalama açılan bölüm               | 2,9                 | 0                               | 2,1            |
| Açılan bölüm dağılımı (0/1/2/3/4/5) | 1/3/2/8/4/2         | 20/0/0/0/0/0                    | 2/4/6/6/2/0    |
| Ortalama ulaşılan bölüm             | 3,9                 | 1                               | 3,1            |
| İlk bölümü açma (medyan)            | 85 sn               | —                               | 36 sn          |
| Game over (10 dk içinde)            | %0                  | %0                              | %0             |
| Ortalama dalga sayısı               | 10,9                | 5                               | 5,1            |
| Ortalama Spray kullanımı            | 5,2                 | 3,6                             | 3,4            |
| Ortalama skor                       | 26.383              | 4.228                           | 13.038         |

- **Hedef karşılandı:** oyunların çoğunda (%90) en az bir bölüm açılıyor ve eski sistemden kolay değil (2,9'a karşı 2,1 bölüm).
- **Ölüm süresi ölçülemedi:** üç kuralda da bot 10 dakikada hiç kaybetmedi. Ölüm süresini görmek için daha uzun süre ya da zayıf oyuncu profili gerekir.
- **Daha az dalga:** 45 / 60 sn tempo eski 15 / 30 sn'ye göre yaklaşık yarı yarıya dalga getiriyor.
- **Gerçek cihaz testi:** tempo ve zorluk gerçek cihazda denenmelidir (`PRESSURE`, `ROOMS`).
