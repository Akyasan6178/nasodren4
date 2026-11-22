# NS4-47 · Tam temizlikle bölüm geçişi, yavaşlayan sinüzit atağı ve geri sayım

Tarih: 2026-11-22. Kural seti: `sinus-dalga-v2` (önceki `sinus-dalga-v1`). Çok oyunculu protokol sürümü 4.

## 1. Kural

- **Bölüm bitişi:** bölüm, tahtadaki bütün yerleşmiş bloklar temizlenince açılır. Sayılanlar: oda grisi, renkli blok, tek kare, virüs; gizli sıralar dahil.
  - Düşen parça tahtada değildir, sayılmaz.
  - Kontrol yalnızca bekleyen satır temizleme, drenaj ve çökme bittikten sonra yapılır (`Game.finishPending`).
  - Geçiş tek bir yoldan, bir kez tetiklenir.
  - Kod: `Game.roomGoalGray()` ve `Game.roomCleared()`.
- **"% açık" göstergesi:** kalan yerleşmiş hücre / bölüm başındaki hücre. Kilitte de güncellenir. Kalan hücre başlangıçtan fazlaysa %0'da durur.
- **Satır temizlemesiyle biten bölüm:** her zaman mevcut Tam Ferahlık bonusunu da alır (puan formülü değişmedi).
- **Oda geçişinde taşıma:** tahta boşken açıldığı için yeni odaya taşınan dalga hücresi kalmaz. `carryAttackCells` kodu yerinde ama oyunda devreye girmez.
- **Bölüm saati:** ilk adım bölüme girdikten 45 sn sonra, sonraki adımlar her 60 sn (`PRESSURE.firstStepMs` ve `PRESSURE.stepMs`, `src/game/pressure.ts`).
  - Dalga / hızlanma sırası, dalga içeriği, virüs bonusu ve Spray değişmedi.
  - Saat yalnızca aktif oynanışta ilerler ve her bölümde baştan başlar; Serbest nefeste sürer.

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
  - 8 bölüm ve tam temizlik kuralı;
  - yeni madde (sinüzit atağı sayacı, Spray yalnızca sinüzit atağıyla gelen hücreleri temizler);
  - kısayol `1 · 2 · 3` (Sıklamen özütü · hapşırık · Spray).
- **Sağlık içerik kaydı (`src/content/health.ts`):** `how.rooms` güncellendi, `how.attack` eklendi.
- **Oda başı ipucu:** "Tahtadaki bütün blokları temizle".
- **İlk bulutçuk ipucu:** "Bulutçuk uçtu! Bütün blokları temizle, bölüm açılsın."

## 4. Kural seti ve yayın

`sinus-dalga-v2` (`supabase/functions/_shared/scoreRules.ts`). Bölüm bitişi, tempo ve her bölüm sonundaki Tam Ferahlık bonusu skorları `sinus-dalga-v1` ile karşılaştırılamaz kılıyor. Eski kayıtlar silinmedi; yerel listede ayrı tutulur.

Yayın adımları (panelden):

1. SQL Editor'da `supabase/migrations/20261122000000_tetris_ruleset_sinus_dalga_v2.sql` dosyasını çalıştırın. Yalnızca okuma RPC'sinin varsayılanını değiştirir.
2. `tetris-submit-score` fonksiyonunu yeniden yayınlayın (`node tools/bundle-functions.mjs` → `supabase/.dashboard/tetris-submit-score.ts`). Bu adıma kadar yeni istemcinin global gönderimleri reddedilir.
3. `tetris-room` değişmedi.

Çok oyunculu protokol sürümü 4: eski sürümdeki sekmelerin iletisi reddedilir ("Çok oyunculu şu an kullanılamıyor.").

## 5. Bilinen zorluk notu

Tahtanın tamamen boşalması için kalan hücre sayısının satır temizlemeyle sıfıra inebilmesi gerekir:

- Her parça 4 hücre ekler, her satır 10 hücre siler; satır temizleme ve parça eklemek hücre sayısının tekliğini değiştirmez.
- Hücre sayısı tekse yalnızca satır temizlemeyle sıfıra inemez. Tekliği yalnızca dalga, Spray, hapşırık, Sıklamen gücü ve çekirdek drenajı değiştirir.
- Örnek: 1. bölüm (2 gri sıra, 18 hücre) en az 3 parça ve bir tam ek sıra ister; tek dikey I ile artık açılmaz.

Tempo ve zorluk gerçek cihazda denenmelidir (`PRESSURE`, `ROOMS`).
